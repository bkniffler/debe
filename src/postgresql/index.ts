import { SQLDebe, SQLJsonCore } from 'debe-sql';
//@ts-ignore
import { Pool } from 'pg';

export class PostgreSQLDebe extends SQLDebe {
  constructor(
    schema: any[],
    { softDelete = false, jsonBody = true, connectionString = '' }
  ) {
    super(schema, new PostgreSQL(connectionString), {
      softDelete,
      jsonBody
    });
  }
}

export class PostgreSQL extends SQLJsonCore {
  pool: any;
  constructor(connectionString: string) {
    super();
    this.pool = new Pool({
      connectionString
    });
  }
  selectJSONField(field: string) {
    return `${this.bodyField} ->> '${field}' `;
  }
  createTableIndex(model: string, field: string) {
    if (this.columns.indexOf(field) !== -1) {
      return super.createTableIndex(model, field);
    }
    return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" ((${
      this.bodyField
    } ->> '${field}'))`;
  }
  async exec<T>(
    sql: string,
    args: any[],
    type?: 'all' | 'get' | 'count' | 'insert'
  ): Promise<T> {
    sql = sql
      .split('?')
      .reduce((state, part, i) => (i === 0 ? part : `${state}$${i}${part}`));
    if (type === 'count') {
      return this.pool
        .query(sql, args)
        .then((x: any) => parseInt(x.rows[0].count));
    } else if (type === 'get') {
      return this.pool.query(sql, args).then((x: any) => x.rows[0]);
    } else if (type === 'all') {
      return this.pool.query(sql, args).then((x: any) => x.rows);
    } else if (type === 'insert') {
      const client = await this.pool.connect();
      try {
        await Promise.all(args.map(arg => client.query(sql, arg)));
        client.release();
      } catch (err) {
        client.release();
        throw err;
      }
      return {} as T;
    } else {
      const client = await this.pool.connect();
      try {
        await Promise.all(args.map(arg => client.query(arg)));
        client.release();
      } catch (err) {
        client.release();
        throw err;
      }
      return {} as T;
    }
  }
}
