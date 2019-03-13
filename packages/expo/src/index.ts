import { extractCallback, IDB } from '@sqlight/core';
const SQLite = require('expo').SQLite;

export function expoSqlite(dbPath: string): IDB {
  const db = SQLite.openDatabase(dbPath);
  return {
    close: db.close,
    transaction: cb => {
      return new Promise(async (yay, nay) => {
        try {
          const results: any[] = [];
          const promises: Promise<any>[] = [];
          db.transaction((tx: any) => {
            const exec = (statement: string, ...args: any[]) => {
              promises.push(
                new Promise((yay, nay) => {
                  const [callback, ...rest] = extractCallback(args);
                  tx.executeSql(
                    statement,
                    rest,
                    (_: any, { rows: { _array } }: any) => {
                      if (callback) {
                        callback(_array);
                      }
                      if (_) {
                        nay();
                      } else {
                        yay(_array);
                      }
                    }
                  );
                })
              );
            };
            const resolve = (value: any) => {
              results.push(value);
            };
            cb(exec, resolve);
          }).immediate();
          await Promise.all(promises);
          yay(results as any);
        } catch (err) {
          nay(err);
        }
      });
    }
  };
}
