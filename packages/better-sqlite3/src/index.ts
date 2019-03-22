import {
  DebeSQLiteJSONEngine,
  IDebeSQLiteJSONEngineOptions,
  IModelCreate,
  DebeClient
} from '@debe/core';

export function createBetterSQLite3Client(
  dbSchema: IModelCreate[],
  options: IDebeSQLiteJSONEngineOptions
): DebeClient {
  return new DebeClient(new BetterSQLite3Engine(dbSchema, options));
}
export class BetterSQLite3Engine extends DebeSQLiteJSONEngine {
  db: any;
  constructor(
    dbSchema: IModelCreate[],
    options: IDebeSQLiteJSONEngineOptions
  ) {
    super(dbSchema, options);
    const sqlite3 = require('better-sqlite3');
    this.db = sqlite3(options.dbPath, {});
  }
  destroy() {
    this.db.close();
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
