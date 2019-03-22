import {
  SQLightEngine,
  IModelCreate,
  IModel,
  ISQLightSQLEngineOptions
} from './base';
import { generate } from '../common';
import { toISO, ensureArray } from '../utils';
import {
  IInsertOptions,
  IAllQuery,
  IGetItem,
  IInsertItem
} from '@sqlight/types';

export abstract class SQLightSQLEngine extends SQLightEngine {
  constructor(dbSchema: IModelCreate[], options?: ISQLightSQLEngineOptions) {
    super(dbSchema, options);
  }

  addModel(model: IModel) {
    super.addModel(model);
    return this.createTable(model);
  }

  abstract exec<T>(
    sql: string,
    args: any[],
    type?: 'all' | 'get' | 'count' | 'insert'
  ): Promise<T>;

  createTableIndex(model: string, field: string) {
    return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" (${field})`;
  }

  getColumnType(field: string): string {
    if (field === this.idField) {
      return 'TEXT PRIMARY KEY';
    } else if (field === this.revField) {
      return 'TEXT';
    } else if (field === this.removedField) {
      return 'TEXT';
    }
    return 'TEXT';
  }

  createTable(model: IModel) {
    return this.exec('', [
      `CREATE TABLE IF NOT EXISTS "${model.name}" (${[
        ...this.defaultColumns().map(
          field => `${field} ${this.getColumnType(field)}`
        ),
        ...model.columns
      ].join(', ')})`,
      this.createTableIndex(model.name, this.revField),
      this.createTableIndex(model.name, this.removedField),
      ...model.index.map((field: string) =>
        this.createTableIndex(model.name, field)
      )
    ]);
  }

  // Query construction
  makeCount(statement: string): string {
    return `SELECT COUNT(*) AS count FROM (${statement}) AS src`;
  }
  createSelect(columns: string[]): string {
    return `SELECT ${columns.join(', ')}`;
  }
  createOffset(offset?: number): string {
    return offset !== undefined ? `OFFSET ${offset}` : '';
  }
  createLimit(limit?: number | [number] | [number, number]): string {
    if (limit !== undefined && !Array.isArray(limit)) {
      return `LIMIT ${limit}`;
    }
    if (limit !== undefined && Array.isArray(limit) && limit.length === 1) {
      return `LIMIT ${limit[0]}`;
    }
    if (limit !== undefined && Array.isArray(limit) && limit.length === 2) {
      return `LIMIT ${limit[0]} OFFSET ${limit[1]}`;
    }
    return '';
  }
  createOrderBy(orderBy: string[] | string): string {
    orderBy = ensureArray(orderBy);
    return orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : '';
  }
  createQueryStatement(
    model: IModel,
    queryArgs: IAllQuery,
    queryType: string
  ): [string, ...any[]] {
    const {
      id = undefined,
      where = [],
      orderBy = [],
      limit = undefined,
      offset = undefined
    } = queryArgs;
    const [whereStatement, ...args] =
      id && typeof id === 'string'
        ? this.createWhereId(id)
        : this.createWhere(where, this.removedField);
    const sql = `
      ${this.createSelect([...this.defaultColumns(), ...(model.index || [])])}
      FROM "${model.name}" 
      ${whereStatement}
      ${this.createOrderBy(orderBy)}
      ${this.createLimit(queryType === 'get' ? 1 : limit)}
      ${this.createOffset(offset)}
    `.trim();
    return [queryType === 'count' ? this.makeCount(sql) : sql, ...args];
  }
  createInsertStatement(model: IModel, columns?: string[]) {
    columns = columns || [...this.defaultColumns(), ...model.columns];
    return `INSERT INTO "${model.name}" (${columns.join(
      ', '
    )}) VALUES (${columns.map(() => '?').join(', ')})`;
  }
  createWhere(where: string[] | string, removedField: string): any[] {
    where = ensureArray(where);
    const [clause, ...args] = where;
    return [
      clause
        ? `WHERE ${clause} AND ${removedField} IS NULL`
        : `WHERE ${removedField} IS NULL`,
      ...args
    ];
  }
  createWhereId(id: string[] | string): any[] {
    id = ensureArray(id);
    if (id.length === 0) {
      return [''];
    } else if (id.length === 1) {
      return [`WHERE id = ?`, id[0]];
    }
    return [`WHERE id IN (?)`, ...id];
  }
  transform<T>(columns: string[], item: any) {
    if (!item) {
      return item;
    }
    return columns.reduce((state, key) => {
      state[key] = item[key];
      return state;
    }, {}) as any;
  }
  transformForStorage(model: IModel, item: any, keepRev = false): [any, any] {
    const rest = {};
    return [
      Object.keys(item).reduce(
        (state: any, key: string) => {
          if (key === this.revField || key === this.idField) {
            return state;
          }
          if (
            this.defaultColumns().indexOf(key) !== -1 ||
            (model.columns || []).indexOf(key) !== -1
          ) {
            state[key] = item[key] || state[key];
          } else {
            rest[key] = item[key] || state[key];
          }
          return state;
        },
        {
          [this.idField]: (item.id || generate()) + '',
          [this.revField]:
            keepRev && item.rev ? item.rev : new Date().getTime() / 1000 + ''
        }
      ),
      rest
    ];
  }
  query<T>(
    model: IModel,
    queryArgs: IAllQuery,
    queryType: 'all' | 'get' | 'count'
  ): Promise<T> {
    const [sql, ...args] = this.createQueryStatement(
      model,
      queryArgs,
      queryType
    );

    const columns = queryArgs.includeBody
      ? [...this.defaultColumns(), ...model.columns]
      : [this.idField, this.revField];
    if (queryType === 'count') {
      return this.exec<any>(sql, args, queryType);
    } else if (queryType === 'get') {
      return this.exec<any>(sql, args, queryType).then((x: any) =>
        this.transform(columns, x)
      );
    } else {
      return this.exec<any>(sql, args, queryType).then(r =>
        r.map((i: any) => this.transform(columns, i))
      );
    }
  }
  remove(model: IModel, id: string[]) {
    return this.insert(
      model,
      id.map(id => ({
        id,
        [this.removedField]: toISO(new Date())
      }))
    ).then(x => {});
  }
  async insert<T>(
    model: IModel,
    value: (T & IInsertItem)[],
    options: IInsertOptions = {}
  ): Promise<(T & IGetItem)[]> {
    const columns = [...this.defaultColumns(), ...model.columns];
    const statement = this.createInsertStatement(model, columns);
    const ids: string[] = [];
    const items = value.map(item => {
      const [obj] = this.transformForStorage(model, item, options.keepRev);
      ids.push(obj.id);
      return columns.map(key => obj[key]);
    });
    await this.exec(statement, items, 'insert');
    const result = await this.query<T[]>(
      model,
      {
        where: [`${this.idField} IN (?)`, ids.join(', ')]
      },
      'all'
    );

    this.notifyChange(model, value, result);
    return result as any;
  }
}
