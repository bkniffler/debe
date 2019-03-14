export * from '@sqlight/types';
export * from './utils';
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
  createWhereId,
  toISO
} from './utils';
import {
  IModel,
  IObserverCallback,
  IOptions,
  IAllQuery,
  IItem,
  IListenerCallback,
  ISQLightClient,
  ISQLightClientUse
} from '@sqlight/types';
l.enable();
const log = createLog('sqlight');
const logPad = '----';

const idField = 'id';
const bodyField = 'json';
const removedField = 'del';
const revisionField = 'rev';
const defaultColumns = [
  `${idField} TEXT PRIMARY KEY`,
  `${revisionField} TEXT`,
  `${removedField} TEXT`,
  `${bodyField} JSON`
];

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
    const { name, index = [], columns = [] } = model;
    return db.transaction(exec => {
      let sql = [
        `CREATE TABLE IF NOT EXISTS "${name}" (${[
          ...defaultColumns,
          ...columns
        ].join(', ')})`
      ];
      sql.push(
        `CREATE INDEX IF NOT EXISTS "${name}_${revisionField}" ON "${name}" (${revisionField})`
      );
      sql.push(
        `CREATE INDEX IF NOT EXISTS "${name}_${removedField}" ON "${name}" (${removedField})`
      );
      index.forEach((field: string) => {
        // db.prepare(`CREATE INDEX ${name}_${field} ON ${name} (${field})`).run();
        sql.push(
          `CREATE INDEX IF NOT EXISTS "${name}_${field}" ON "${name}" (json_extract(${bodyField}, '$.${field}'))`
        );
      });
      if (verbose) {
        log.info(`${logPad}Creating table ${name}`);
        log.info(sql.join('\n'));
      }
      sql.forEach(s => exec(s));
    });
  }

  function remove(model: IModel, { id = undefined }: IAllQuery) {
    return insert(model, { id, [removedField]: toISO(new Date()) } as any).then(
      () => {}
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
      includeBody = true,
      additionalColumns = []
    } = queryArgs;
    const [whereStatement, ...args] =
      id && typeof id === 'string'
        ? createWhereId(id)
        : createWhere(where, removedField);
    const columns = [...defaultColumns, ...additionalColumns].map(
      x => x.split(' ')[0]
    );
    const sql = `
      ${createSelect(
        columns,
        model.index || [],
        bodyField,
        queryType === 'count'
      )}
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
          const t = transform(
            includeBody ? columns : ['id', revisionField],
            bodyField
          );
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
        if (isEqual(lastResult, newValue, revisionField)) {
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

      const columns = [...defaultColumns, ...(model.columns || [])].map(
        x => x.split(' ')[0]
      );
      const statement = `INSERT INTO "${model.name}" (${columns.join(
        ', '
      )}) VALUES (${columns
        .map(() => '?')
        .join(', ')}) ON CONFLICT(id) DO UPDATE SET ${columns
        .filter(x => x !== 'id')
        .map(key => {
          return key === bodyField
            ? `${bodyField}=json_patch(${bodyField}, excluded.${bodyField})`
            : `${key}=excluded.${key}`;
        })
        .join(', ')}`;

      const rowIds = await db.transaction<[string, string][]>(
        (exec, resolve) => {
          value
            .filter((x: IItem) => x)
            .map((item: IItem) => {
              const obj = Object.keys(item).reduce(
                (state: any, key: string) => {
                  if (columns.indexOf(key) !== -1) {
                    if (key === revisionField) {
                      return;
                    }
                    state[key] = item[key] || state[key];
                  } else {
                    state[bodyField][key] = item[key];
                  }
                  return state;
                },
                {
                  [idField]: generate(),
                  [revisionField]: new Date().getTime() / 1000 + '',
                  [bodyField]: {}
                }
              );
              obj[idField] = obj[idField] + '';
              obj[bodyField] = JSON.stringify(obj[bodyField]);
              const args = columns.map(key => obj[key]);
              logAndExplain(model, 'insert', statement, args, options.explain);
              exec(statement, ...args, (x: any) =>
                resolve([x.lastInsertRowid || '__', item[idField] || '__'])
              );
            });
        }
      );
      const result = await query<T>(
        model,
        {
          where: [
            `rowid IN (?) OR ${idField} IN (?)`,
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
            type: value[index][idField] ? 'UPDATE' : 'CREATE'
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
    use: <T = IItem>(model: string) => {
      return new Proxy<any>(
        {},
        {
          get: function(t: string, methodName: string) {
            return (...args: [any]) => {
              return instance[methodName](model, ...args);
            };
          }
        }
      ) as ISQLightClientUse<T>;
    },
    insert: (model, item) => insert(getModel(model), item as any),
    remove: (model: string, param) => remove(getModel(model), param),
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
