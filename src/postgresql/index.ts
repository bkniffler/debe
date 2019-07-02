import { SQLJsonCore } from 'debe-sql';
//@ts-ignore
import { Pool, Client } from 'pg';
import { ICollection, Debe, ICollectionInput } from 'debe';
import { DebeBackend } from 'debe-adapter';

interface IOptions {
  pooling?: number | boolean;
  types: any;
}
export class PostgreSQLDebe extends Debe {
  adapter: PostgreSQLAdapter;
  raw<T>(sql: string, args: any[], type?: 'all' | 'get' | 'count' | 'insert') {
    return this.adapter.exec<T>(sql, args, type);
  }
  constructor(
    connection: string | object,
    collections: ICollectionInput[],
    options: IOptions = { pooling: true, types: {} }
  ) {
    const adapter = new PostgreSQLAdapter(
      connection,
      options.pooling,
      options.types
    );
    super(new DebeBackend(adapter, collections, options));
    this.adapter = adapter;
  }
}

export class PostgreSQLAdapter extends SQLJsonCore {
  pool?: Pool;
  chunks = 50 * 1000;
  chunkMode = 'sequencial';
  connection: any;
  types: any;
  constructor(
    connection: string | any,
    pooling: number | boolean = true,
    types: any = {}
  ) {
    super();
    this.types = types;
    this.connection = connection;
    if (pooling) {
      const opt: { connectionString: string; min?: number; max?: number } =
        typeof connection === 'string'
          ? {
              connectionString: connection
            }
          : { ...connection };
      if (typeof pooling === 'number') {
        opt.min = 1;
        opt.max = 1;
      }
      this.pool = new Pool(opt);
    }
  }
  close() {
    if (this.pool) {
      return this.pool.end();
    }
  }
  selectJSONField(collection: ICollection, field: string) {
    if (this.types && this.types[`${collection.name}.${field}`]) {
      return `(${this.getCollectionBodyField(collection)} ->> '${field}')::${
        this.types[`${collection.name}.${field}`]
      } `;
    }
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
