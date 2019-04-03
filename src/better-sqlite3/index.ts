import { SQLJsonCore, SQLDebe } from 'debe-sql';
//@ts-ignore
import * as _sql from 'better-sqlite3';
import { ICollection } from 'debe';
const sql = _sql;

export class Sqlite3Debe extends SQLDebe {
  constructor(
    schema: any[],
    { softDelete = false, jsonBody = true, dbPath = '' }
  ) {
    super(schema, new SQLite3(dbPath), { softDelete, jsonBody });
  }
}

export class SQLite3 extends SQLJsonCore {
  db: any;
  constructor(dbPath: string) {
    super();
    this.db = sql(dbPath);
  }
  selectJSONField(collection: ICollection, field: string) {
    return `json_extract(${this.getCollectionBodyField(
      collection
    )}, '$.${field}')`;
  }
  createTableIndex(collection: ICollection, field: string, type?: string) {
    if (collection.fields[field]) {
      return super.createTableIndex(collection, field);
    }
    return `CREATE INDEX IF NOT EXISTS "${collection.name}_${field}" ON "${
      collection.name
    }" (json_extract(${this.getCollectionBodyField(
      collection
    )}, '$.${field}'))`;
  }
  exec<T>(
    sql: string,
    args: any[],
    type?: 'all' | 'get' | 'count' | 'insert'
  ): Promise<T> {
    return new Promise((yay, nay) => {
      try {
        this.db
          .transaction(() => {
            if (type === 'count') {
              yay(this.db.prepare(sql).all(...args)[0].count);
            } else if (type === 'get') {
              yay(this.db.prepare(sql).get(...args));
            } else if (type === 'all') {
              yay(this.db.prepare(sql).all(...args));
            } else if (type === 'insert') {
              const prepare = this.db.prepare(sql);
              yay(args.map(arg => prepare.run(arg)) as any);
            } else {
              if (sql) {
                this.db.prepare(sql).run();
              }
              args.forEach(arg => this.db.prepare(arg).run());
              yay();
            }
          })
          .immediate();
      } catch (err) {
        nay(err);
      }
    });
  }
}
