import {
  DebeSQLiteJSONEngine,
  IDebeSQLEngineOptions,
  IModelCreate,
  DebeClient
} from '@debe/core';

export function createBetterSQLite3Client(
  db: any,
  schema: IModelCreate[],
  options?: IDebeSQLEngineOptions
): DebeClient {
  return new DebeClient(new BetterSQLite3Engine(db, schema, options));
}
export class BetterSQLite3Engine extends DebeSQLiteJSONEngine {
  db: any;
  constructor(
    db: any,
    schema: IModelCreate[],
    options?: IDebeSQLEngineOptions
  ) {
    super(schema, options);
    this.db = db;
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
