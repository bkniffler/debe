import {
  ICollection,
  IInsertItem,
  IGetItem,
  IQuery,
  ensureArray,
  IInsert,
  ICollections,
  fieldType
} from 'debe';
import { DebeAdapter } from 'debe-adapter';

export abstract class SQLCore extends DebeAdapter {
  abstract exec<T>(
    sql: string,
    args: any[],
    type?: 'all' | 'get' | 'count' | 'insert' | 'remove'
  ): Promise<T>;

  async initialize(collections: ICollections, options: any) {
    await Promise.all(
      Object.keys(collections).map(key => this.createTable(collections[key]))
    );
  }
  close() {}
  getColumnType(type: fieldType, secondType?: fieldType): string {
    if (type === 'boolean') {
      return 'BOOLEAN';
    } else if (type === 'json') {
      return 'JSON';
    } else if (type === 'number') {
      return 'BIGINT';
    } else if (type === 'string') {
      return 'TEXT';
    } else if (secondType) {
      return this.getColumnType(secondType);
    }
    return 'TEXT';
  }
  createTableIndex(collection: ICollection, field: string, type?: string) {
    return `CREATE INDEX IF NOT EXISTS "${collection.name}_${field}" ON "${
      collection.name
    }" (${field})`;
  }
  createInsertStatement(collection: ICollection, fields: string[] = []) {
    fields = fields.length ? fields : Object.keys(collection.fields);
    const base = `INSERT INTO "${collection.name}" (${fields.join(
      ', '
    )}) VALUES (${fields.map(() => '?').join(', ')})`;
    const conflict = fields
      .filter(x => x !== collection.specialFields.id)
      .map(key => `${key}=EXCLUDED.${key}`)
      .join(', ');
    return `${base} ON CONFLICT(${
      collection.specialFields.id
    }) DO UPDATE SET ${conflict}`;
  }
  /*createInsertStatement(collection: ICollection, columns?: string[]) {
      columns = columns || [...this.defaultColumns(), ...collection.columns];
      return `INSERT INTO "${collection.name}" (${columns.join(
        ', '
      )}) VALUES (${columns.map(() => '?').join(', ')})`;
    }*/
  async createTable(collection: ICollection) {
    // Table
    await this.exec('', [
      `CREATE TABLE IF NOT EXISTS "${collection.name}" (${[
        ...Object.keys(collection.fields).map(
          key =>
            `${key} ${this.getColumnType(collection.fields[key])}${
              collection.specialFields.id === key ? ' PRIMARY KEY' : ''
            }`
        )
      ].join(', ')})`
    ]);
    // Force creating of all columns
    await Promise.all(
      Object.keys(collection.fields).map(key =>
        this.exec('', [
          `ALTER TABLE "${collection.name}" ADD ${key} ${this.getColumnType(
            collection.fields[key]
          )}${collection.specialFields.id === key ? ' PRIMARY KEY' : ''}`
        ]).catch(() => {})
      )
    ).catch(() => {});
    // Indexes
    await this.exec('', [
      ...Object.keys(collection.index)
        .filter(x => x !== collection.specialFields.id)
        .map(key =>
          this.createTableIndex(
            collection,
            key,
            this.getColumnType(collection.index[key], collection.fields[key])
          )
        )
    ]);
  }
  // Query construction
  makeCount(statement: string): string {
    return `SELECT COUNT(*) AS count FROM (${statement}) AS src`;
  }
  createSelect(collection: ICollection, fields: string[] = []): string {
    fields = fields.length
      ? [...new Set([...fields, 'id', 'rev'])]
      : Object.keys(collection.fields);
    return `SELECT ${fields.join(', ')}`;
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
  createOrderBy(collection: ICollection, orderBy: string[] | string): string {
    orderBy = ensureArray(orderBy);
    return orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : '';
  }
  createQueryStatement(
    collection: ICollection,
    queryArgs: IQuery | string | string[] = {},
    queryType: string
  ): [string, ...any[]] {
    if (typeof queryArgs === 'string' || Array.isArray(queryArgs)) {
      const [whereStatement, ...args] = this.createWhereId(queryArgs);
      const sql = `
          ${ queryType === 'remove' ? 'DELETE ' : this.createSelect(collection)}
          FROM "${collection.name}" 
          ${whereStatement}
        `.trim();
      return [queryType === 'count' ? this.makeCount(sql) : sql, ...args];
    } else {
      const {
        where = [],
        orderBy = [],
        limit = undefined,
        offset = undefined,
        select
      } = queryArgs;
      const [whereStatement, ...args] = this.createWhere(collection, where);
      const sql = `
          ${this.createSelect(collection, select)}
          FROM "${collection.name}" 
          ${whereStatement}
          ${this.createOrderBy(collection, orderBy)}
          ${this.createLimit(queryType === 'get' ? 1 : limit)}
          ${this.createOffset(offset)}
        `.trim();
      return [queryType === 'count' ? this.makeCount(sql) : sql, ...args];
    }
  }
  createWhere(collection: ICollection, where: string[] | string): any[] {
    where = ensureArray(where);
    const [clause, ...args] = where;
    return [clause ? `WHERE ${clause}` : ``, ...args];
  }
  /*createWhere(where: string[] | string, removedField: string): any[] {
    where = ensureArrICollectionre);
    const [clause, ...args] = where;
    return [
      clause
        ? `WHERE ${clause} AND ${removedField} IS NULL`
        : `WHERE ${removedField} IS NULL`,
      ...args
    ];
  }*/
  createWhereId(id: string[] | string): any[] {
    id = ensureArray(id);
    if (id.length === 0) {
      return [''];
    } else if (id.length === 1) {
      return [`WHERE id = ?`, id[0]];
    }
    return [`WHERE id IN (?)`, ...id];
  }
  query<T>(
    collection: ICollection,
    queryArgs: any,
    queryType: 'all' | 'get' | 'count' | 'remove',
    skip = false
  ): Promise<T> {
    let [sql, ...args] =
      skip === false
        ? this.createQueryStatement(collection, queryArgs, queryType)
        : queryArgs;

    // Hack to expand array (like 'id IN ?', [1, 2, 3])
    const newArgs = [];
    const splitSQL = sql.split('?');
    let newSQL = '';
    if (splitSQL.length !== args.length + 1) {
      throw new Error('Length of args != length of "?" in sql statement');
    }
    newSQL = splitSQL[0];
    for (var i = 0; i < args.length; i++) {
      let arg = args[i];
      const splitIndex = i + 1;
      if (Array.isArray(arg)) {
        const chunkSize = 500;
        if (arg.length > chunkSize) {
          arg = arg.slice(0, chunkSize);
        }
        const questionmarks = [...Array(arg.length).keys()].map(() => '?');
        newSQL += questionmarks.join(', ') + splitSQL[splitIndex];
        newArgs.push(...arg);
      } else {
        newArgs.push(arg);
        newSQL += '?' + splitSQL[splitIndex];
      }
    }
    sql = newSQL;
    args = newArgs;

    if (queryType === 'count') {
      return this.exec<any>(sql, args, queryType);
    } else if (queryType === 'get') {
      return this.exec<any>(sql, args, queryType);
    } else {
      return this.exec<any>(sql, args, queryType);
    }
  }
  async insert<T>(
    collection: ICollection,
    value: (T & IInsertItem)[],
    options: IInsert
  ): Promise<(T & IGetItem)[]> {
    const statement = this.createInsertStatement(collection);
    const items = value.map(item => {
      return Object.keys(collection.fields).map(key => item[key]);
    });
    await this.exec(statement, items, 'insert');
    return value as any;
  }
  async remove<T>(
    collection: ICollection,
    value: string[]
  ): Promise<(T & IGetItem)[]> {
    collection;
    value;
    return this.query(collection, value, 'remove');
  }
  count(collection: ICollection, query: IQuery) {
    return this.query<number>(collection, query, 'count');
  }
  get(collection: ICollection, id: string) {
    return this.query(collection, id, 'get');
  }
  all(collection: ICollection, query: IQuery) {
    return this.query<any>(collection, query, 'all');
  }
}
