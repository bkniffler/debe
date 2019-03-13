export * from '@sqlight/types';
export * from './common';
import { EventEmitter } from 'events';
import { IDB, generate, createLog, log as l } from './common';
import {
  createLimit,
  createOffset,
  createOrderBy,
  createSelect,
  createWhere,
  transform,
  isEqual,
  createWhereId
} from './utils';
import {
  IModel,
  IObserverCallback,
  IOptions,
  IAllQuery,
  IItem,
  IListenerCallback,
  ISQLightClient
} from '@sqlight/types';
l.enable();
const log = createLog('sqlight');
const logPad = '----';

export function sqlight(
  db: IDB,
  dbSchema: IModel[],
  { verbose = false }: IOptions = {}
) {
  const ev = new EventEmitter();

  dbSchema.reduce((obj: any, model: any) => {
    if (!model.index) {
      model.index = [];
    }
    createTable(model);
    return { ...obj, [model.name]: model };
  }, {});

  function logAndExplain(
    model: IModel,
    func: string,
    sql: string,
    args: any[],
    override = false
  ) {
    if (verbose || override) {
      log.info(`${logPad}Querying ${func} ${model.name}`);
      log.info(
        sql
          .split('\n')
          .map(x => x.trim())
          .join('\n'),
        ...args
      );
      /*logInner(
        'Explain:',
        db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args)[0].detail
      );*/
    }
  }
  // CREATE_TABLE
  function createTable(model: IModel) {
    const { name, index } = model;
    return db.transaction(exec => {
      let sql = [
        `CREATE TABLE IF NOT EXISTS "${name}" (id TEXT PRIMARY KEY, rev TEXT, del TEXT, json JSON)`
      ];
      sql.push(`CREATE INDEX IF NOT EXISTS "${name}_rev" ON "${name}" (rev)`);
      sql.push(`CREATE INDEX IF NOT EXISTS "${name}_del" ON "${name}" (del)`);
      index.forEach((field: string) => {
        // db.prepare(`CREATE INDEX ${name}_${field} ON ${name} (${field})`).run();
        sql.push(
          `CREATE INDEX IF NOT EXISTS "${name}_${field}" ON "${name}" (json_extract(json, '$.${field}'))`
        );
      });
      if (verbose) {
        log.info(`${logPad}Creating table ${name}`);
        log.info(sql.join('\n'));
      }
      sql.forEach(s => exec(s));
    });
  }

  function del(model: IModel, { id = undefined }: IAllQuery) {
    return insert(model, { id, del: new Date().toISOString() } as any).then(
      x => {}
    );
  }
  // ALL
  function query<T = IItem>(
    model: IModel,
    queryArgs: IAllQuery,
    queryType: 'all' | 'get' | 'count',
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void) {
    const {
      id = undefined,
      explain = false,
      where = [],
      orderBy = [],
      limit = undefined,
      offset = undefined,
      includeBody = true
    } = queryArgs;
    const [whereStatement, ...args] = id
      ? createWhereId(id)
      : createWhere(where);
    const sql = `
      ${createSelect(model.index, queryType === 'count')}
      FROM "${model.name}" 
      ${whereStatement}
      ${createOrderBy(orderBy)}
      ${createLimit(queryType === 'get' ? 1 : limit)}
      ${createOffset(offset)}
    `.trim();

    logAndExplain(model, queryType, sql, args, explain);

    const fetch = () =>
      db
        .transaction((exec, resolve) => {
          const t = transform(includeBody);
          if (queryType === 'count') {
            exec(sql, ...args, (r: any) => resolve(r[0]['COUNT(id)']));
          } else if (queryType === 'get') {
            exec(sql, ...args, (r: any) => resolve(t(r[0])));
          } else {
            exec(sql, ...args, (r: any) => resolve(r.map(t)));
          }
        })
        .then(x => x[0]);
    if (cb) {
      let lastResult: any = undefined;
      const listener = async () => {
        let isInitial = lastResult === undefined;
        let newValue = await fetch();
        // Check is results changed
        if (isEqual(lastResult, newValue)) {
          return;
        }
        lastResult = newValue || null;
        cb(newValue || undefined, isInitial ? 'INITIAL' : 'CHANGE');
      };
      ev.addListener(model.name, listener);
      listener();
      return () => ev.removeListener(model.name, listener);
    } else {
      return fetch();
    }
  }
  function insert<T = IItem>(
    model: IModel,
    value: IItem[] | IItem,
    options: any = {}
  ): Promise<T> {
    return new Promise(async yay => {
      let wasArray = Array.isArray(value);
      if (!Array.isArray(value)) {
        value = [value];
      }
      const statement = `INSERT INTO "${
        model.name
      }" (id, rev, del, json) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET rev=excluded.rev, del=excluded.del, json=json_patch(json, excluded.json)`;

      const rowIds = await db.transaction<[string, string][]>(
        (exec, resolve) => {
          value
            .filter((x: IItem) => x)
            .map((item: IItem) => {
              const { id, rev, del, ...rest } = item;
              const args = [
                id || generate(),
                new Date().getTime() / 1000 + '',
                del || undefined,
                JSON.stringify(rest)
              ];
              logAndExplain(model, 'insert', statement, args, options.explain);
              exec(statement, ...args, (x: any) =>
                resolve([x.lastInsertRowid || '__', id || '__'])
              );
            });
        }
      );
      const result = await query<T>(
        model,
        {
          where: [
            `rowid IN (?) OR id IN (?)`,
            rowIds.map(x => x[0]).join(', '),
            rowIds.map(x => x[1]).join(', ')
          ]
        },
        'all'
      );

      result['forEach']((newValue: IItem, index: number) => {
        if (value[index]) {
          ev.emit(model.name, {
            newValue,
            change: value[index],
            oldValue: undefined,
            properties: Object.keys(value[index]),
            type: value[index].id ? 'UPDATE' : 'CREATE'
          });
        }
      });

      return yay(wasArray ? result : result[0]);
    });
  }

  let _schema = {};
  function getModel(name: string) {
    const schema = _schema[name] || instance.schema.find(x => x.name === name);
    if (!schema) {
      throw new Error(`Could not find model ${name}`);
    }
    _schema[name] = schema;
    return schema;
  }

  const instance: ISQLightClient = {
    schema: dbSchema,
    addSchema: (schema: IModel) => {
      instance.schema.push(schema);
      _schema[schema.name] = schema;
      return createTable(schema);
    },
    insert: (model, item) => insert(getModel(model), item as any),
    del: (model: string, param) => del(getModel(model), param),
    all: (model, param) => query(getModel(model), param, 'all') as any,
    allSubscription: (model, param, cb) =>
      query(getModel(model), param, 'all', cb) as any,
    get: (model, param) => query(getModel(model), param, 'get') as any,
    getSubscription: (model, param, cb) =>
      query(getModel(model), param, 'get', cb) as any,
    count: (model, param) => query(getModel(model), param, 'count') as any,
    countSubscription: (model, param, cb) =>
      query(getModel(model), param, 'count', cb) as any,
    countListeners: (model: string) => ev.listenerCount(model || ''),
    addListener: (model: string, cb: IListenerCallback) =>
      ev.addListener(getModel(model), cb),
    removeListener: (model: string, cb: IListenerCallback) =>
      ev.removeListener(getModel(model), cb),
    removeAllListeners: (model?: string) =>
      ev.removeAllListeners(model ? getModel(model) : undefined),
    close: () => {
      db.close();
    }
  };
  return instance;
}
