import { SQLJsonCore } from 'debe-sql';
//@ts-ignore
import { Pool } from 'pg';
import { ICollection, Debe, ICollectionInput } from 'debe';
import { DebeBackend } from 'debe-adapter';

export class PostgreSQLDebe extends Debe {
  constructor(
    connection: string | object,
    collections: ICollectionInput[],
    options?: any
  ) {
    super(
      new DebeBackend(new PostgreSQLAdapter(connection), collections, options)
    );
  }
}

export class PostgreSQLAdapter extends SQLJsonCore {
  pool: Pool;
  constructor(connection: string | object) {
    super();
    this.pool = new Pool(
      typeof connection === 'string'
        ? {
            connectionString: connection
          }
        : connection
    );
  }
  close() {
    return this.pool.end();
  }
  selectJSONField(collection: ICollection, field: string) {
    return `${this.getCollectionBodyField(collection)} ->> '${field}' `;
  }
  createTableIndex(collection: ICollection, field: string, type?: string) {
    if (collection.fields[field]) {
      return super.createTableIndex(collection, field, type);
    }
    return `CREATE INDEX IF NOT EXISTS "${collection.name}_${field}" ON "${
      collection.name
    }" ((${this.getCollectionBodyField(collection)} ->> '${field}'))`;
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
