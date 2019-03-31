import { IModel, IInsertItem, IGetItem, IQuery, ensureArray } from 'debe';

export abstract class SQLCore {
  idField = 'id';
  columns: string[] = [this.idField];
  indices: string[] = [];

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
    }
    return 'TEXT';
  }
  createInsertStatement(model: IModel, columns?: string[]) {
    columns = columns || [...this.columns, ...model.columns];
    const base = `INSERT INTO "${model.name}" (${columns.join(
      ', '
    )}) VALUES (${columns.map(() => '?').join(', ')})`;
    const conflict = columns
      .filter(x => x !== this.idField)
      .map(key => `${key}=EXCLUDED.${key}`)
      .join(', ');
    return `${base} ON CONFLICT(${this.idField}) DO UPDATE SET ${conflict}`;
  }
  /*createInsertStatement(model: IModel, columns?: string[]) {
      columns = columns || [...this.defaultColumns(), ...model.columns];
      return `INSERT INTO "${model.name}" (${columns.join(
        ', '
      )}) VALUES (${columns.map(() => '?').join(', ')})`;
    }*/
  createTable(model: IModel) {
    return this.exec('', [
      `CREATE TABLE IF NOT EXISTS "${model.name}" (${[
        ...this.columns.map(field => `${field} ${this.getColumnType(field)}`),
        ...model.columns.map(field => `${field} ${this.getColumnType(field)}`)
      ].join(', ')})`,
      ...this.indices.map((field: string) =>
        this.createTableIndex(model.name, field)
      ),
      ...model.index.map((field: string) =>
        this.createTableIndex(model.name, field)
      )
    ]);
  }
  // Query construction
  makeCount(statement: string): string {
    return `SELECT COUNT(*) AS count FROM (${statement}) AS src`;
  }
  createSelect(model: IModel, columns?: string[]): string {
    if (!columns) {
      columns = [...this.columns, ...model.columns];
    }
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
    queryArgs: IQuery = {},
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
        : this.createWhere(model, where);
    const sql = `
        ${this.createSelect(model)}
        FROM "${model.name}" 
        ${whereStatement}
        ${this.createOrderBy(orderBy)}
        ${this.createLimit(queryType === 'get' ? 1 : limit)}
        ${this.createOffset(offset)}
      `.trim();
    return [queryType === 'count' ? this.makeCount(sql) : sql, ...args];
  }
  createWhere(model: IModel, where: string[] | string): any[] {
    where = ensureArray(where);
    const [clause, ...args] = where;
    return [clause ? `WHERE ${clause}` : ``, ...args];
  }
  /*createWhere(where: string[] | string, removedField: string): any[] {
    where = ensureArray(where);
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
    model: IModel,
    queryArgs: IQuery,
    queryType: 'all' | 'get' | 'count'
  ): Promise<T> {
    const [sql, ...args] = this.createQueryStatement(
      model,
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
    model: IModel,
    value: (T & IInsertItem)[]
  ): Promise<(T & IGetItem)[]> {
    const columns = [...this.columns, ...model.columns];
    const statement = this.createInsertStatement(model, columns);
    const ids: string[] = [];
    const items = value.map(item => {
      ids.push(item[this.idField]);
      return columns.map(key => item[key]);
    });
    await this.exec(statement, items, 'insert');
    return value as any;
  }
}
