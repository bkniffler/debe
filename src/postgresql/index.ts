import {
  Debe,
  types,
  coreSkill,
  changeListenerSkill,
  jsonBodySkill,
  softDeleteSkill
} from 'debe';
import { PostgreSQL } from './pg';
import { ISkill } from 'service-dog';

export class PostgreSQLDebe extends Debe {
  dbPath: string;
  db: PostgreSQL;
  schema: any;
  constructor(
    schema: any[],
    { softDelete = false, jsonBody = true, connectionString = '' }
  ) {
    super();
    this.skill([changeListenerSkill(), coreSkill()]);
    if (jsonBody) {
      this.skill(jsonBodySkill({ merge: false }));
    }
    if (softDelete) {
      this.skill(softDeleteSkill());
    }
    this.db = new PostgreSQL(connectionString);
    this.schema = schema.reduce((store, x) => {
      if (!x.columns) {
        x.columns = [];
      }
      return { ...store, [x.name]: x };
    }, {});
    this.skill('postgresql', this.postgreSQLSkill);
  }
  async initialize() {
    await super.initialize();
    return Promise.all(
      Object.keys(this.schema).map(key => this.db.createTable(this.schema[key]))
    );
  }
  postgreSQLSkill: ISkill = async (type, payload, flow) => {
    if (type === types.INITIALIZE) {
      const { indices = [], columns = [] } = payload;
      indices.forEach((col: string) => {
        if (this.db.indices.indexOf(col) === -1) {
          this.db.indices = [...this.db.indices, col];
          this['indices'] = this.db.indices;
        }
      });
      columns.forEach((col: string) => {
        if (this.db.columns.indexOf(col) === -1) {
          this.db.columns = [...this.db.columns, col];
          this['columns'] = this.db.columns;
        }
      });
      flow.return(payload);
    } else if (type === types.INSERT) {
      const [model, value] = payload;
      flow.return(await this.db.insert(this.schema[model], value));
    } else if (type === types.COUNT) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'count'));
    } else if (type === types.GET) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'get'));
    } else if (type === types.ALL) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'all'));
    } else {
      flow(payload);
    }
  };
}

/*import { DebeSQLJSONEngine, IDebeSQLEngineOptions, IModel } from '@debe-core';

export class PostgreSQLEngine extends DebeSQLJSONEngine {
  pool: any;
  constructor(pool: any, options?: IDebeSQLEngineOptions) {
    super(options);
    this.pool = pool;
  }
  createSelect(model: IModel) {
    return `${super.createSelect(model, [
      ...this.defaultColumns(),
      ...model.columns
    ])}, ${model.index.map(
      field => `${this.bodyField} -> '${field}' AS ${field}`
    )}`;
  }
  createTableIndex(model: string, field: string) {
    // If is default field, return default operation
    if (this.defaultColumns().indexOf(field) !== -1) {
      return super.createTableIndex(model, field);
    }
    //
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
}*/

/*
export function postgres(connectionString: string): IDB {
  return {
    close: () => {},
    transaction: async cb => {
      let resolved = false;
      return new Promise(async (yay, nay) => {
        try {
          const client = await pool.connect();
          const results: any[] = [];
          let count = 0;
          const exec = async (statement: string, ...args: any[]) => {
            count = count + 1;
            try {
              statement = statement
                .split('?')
                .reduce((state, part, i) =>
                  i === 0 ? part : `${state} $${i} ${part}`
                );
              statement = statement
                .split(`json_extract(json, '$.`)
                .join(`(json->'`);
              statement = statement.split(`ON CONFLICT(id)`)[0];
              const [callback, ...rest] = extractCallback(args);
              console.log(statement, rest);
              const result = await client.query({
                text: statement,
                values: rest
              });
              count = count - 1;
              if (callback) {
                callback(result.rows);
                if (count === 0 && !resolved) {
                  yay(results as any);
                }
              }
            } catch (err) {
              nay(err);
            }
          };
          const resolve = (value: any) => {
            results.push(value);
          };
          cb(exec, resolve);
          if (count === 0) {
            resolved = true;
            yay(results as any);
          }
        } catch (err) {
          nay(err);
        }
      });
    }
  };
}
*/
