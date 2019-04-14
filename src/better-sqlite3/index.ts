import { SQLJsonCore } from 'debe-sql';
//@ts-ignore
import * as _sql from 'better-sqlite3';
import { ICollection, Debe, ICollectionInput } from 'debe';
import { DebeBackend } from 'debe-adapter';
const sql = _sql;

export class BetterSqlite3Debe extends Debe {
  constructor(dbPath: string, collections: ICollectionInput[], options?: any) {
    super(
      new DebeBackend(new BetterSqlite3Adapter(dbPath), collections, options)
    );
  }
}

export class BetterSqlite3Adapter extends SQLJsonCore {
  db: any;
  chunks = 50 * 10000;
  constructor(dbPath: string) {
    super();
    this.db = sql(dbPath);
  }
  close() {
    return this.db.close();
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
