import { SQLJsonCore } from 'debe-sql';
//@ts-ignore
import * as sqlite3 from 'better-sqlite3';

export class SQLite3 extends SQLJsonCore {
  db: any;
  constructor(dbPath: string) {
    super();
    this.db = sqlite3(dbPath);
  }
  selectJSONField(field: string) {
    return `json_extract(${this.bodyField}, '$.${field}')`;
  }
  createTableIndex(model: string, field: string) {
    // If is default field, return default operation
    if (this.columns.indexOf(field) !== -1) {
      return super.createTableIndex(model, field);
    }
    //
    return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" (json_extract(${
      this.bodyField
    }, '$.${field}'))`;
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
