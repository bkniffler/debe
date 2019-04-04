import {
  ICollection,
  IInsertItem,
  IGetItem,
  IQuery,
  ensureArray,
  IFieldTypes
} from 'debe';

export abstract class SQLCore {
  abstract exec<T>(
    sql: string,
    args: any[],
    type?: 'all' | 'get' | 'count' | 'insert' | 'remove'
  ): Promise<T>;

  getColumnType(type: IFieldTypes, secondType?: IFieldTypes): string {
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
    type;
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
  createTable(collection: ICollection) {
    return this.exec('', [
      `CREATE TABLE IF NOT EXISTS "${collection.name}" (${[
        ...Object.keys(collection.fields).map(
          key =>
            `${key} ${this.getColumnType(collection.fields[key])}${
              collection.specialFields.id === key ? ' PRIMARY KEY' : ''
            }`
        )
      ].join(', ')})`,
      ...Object.keys(collection.index).map(key =>
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
    fields = fields.length ? fields : Object.keys(collection.fields);
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
  createOrderBy(orderBy: string[] | string): string {
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
          ${this.createSelect(collection)}
          FROM "${collection.name}" 
          ${whereStatement}
        `.trim();
      return [queryType === 'count' ? this.makeCount(sql) : sql, ...args];
    } else {
      const {
        where = [],
        orderBy = [],
        limit = undefined,
        offset = undefined
      } = queryArgs;
      const [whereStatement, ...args] = this.createWhere(collection, where);
      const sql = `
          ${this.createSelect(collection)}
          FROM "${collection.name}" 
          ${whereStatement}
          ${this.createOrderBy(orderBy)}
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
    queryArgs: IQuery | string | string[],
    queryType: 'all' | 'get' | 'count'
  ): Promise<T> {
    const [sql, ...args] = this.createQueryStatement(
      collection,
      queryArgs,
      queryType
    );

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
    value: (T & IInsertItem)[]
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
    return null as any;
  }
}
