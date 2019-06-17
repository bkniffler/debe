import { SQLJsonCore } from 'debe-sql';
//@ts-ignore
import { Pool, Client } from 'pg';
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
  pool?: Pool;
  chunks = 50 * 1000;
  chunkMode = 'sequencial';
  connection: any;
  constructor(connection: string | object, pooling = true) {
    super();
    this.connection = connection;
    if (pooling) {
      this.pool = new Pool(
        typeof connection === 'string'
          ? {
              connectionString: connection
            }
          : connection
      );
    }
  }
  close() {
    if (this.pool) {
      return this.pool.end();
    }
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
    const client = this.pool || new Client(this.connection); // await this.pool.connect();
    let result;
    let error;
    try {
      if (type === 'count') {
        const x = await client.query(sql, args);
        result = parseInt(x.rows[0].count) as any;
      } else if (type === 'get') {
        const x = await client.query(sql, args);
        result = x.rows[0];
      } else if (type === 'all') {
        const x = await client.query(sql, args);
        result = x.rows;
      } else if (type === 'insert') {
        result = await Promise.all(args.map(arg => client.query(sql, arg)));
      } else {
        result = await Promise.all(args.map(arg => client.query(arg)));
      }
    } catch (err) {
      // client.release(true);
      error = err;
    }
    if (!this.pool) {
      client.end();
    }
    if (error) {
      throw error;
    }
    // client.release(true);
    return result as any;
  }
}
