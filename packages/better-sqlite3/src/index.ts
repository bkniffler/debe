import { extractCallback, IDB } from '@sqlight/core';
const sqlite3 = require('better-sqlite3');

export function betterSQLite3(dbPath: string): IDB {
  const db = sqlite3(dbPath, {});
  return {
    close: db.close,
    transaction: cb => {
      return new Promise((yay, nay) => {
        try {
          const results: any[] = [];
          db.transaction(() => {
            const exec = (statement: string, ...args: any[]) => {
              const [callback, ...rest] = extractCallback(args);
              const method = statement.indexOf('SELECT') === 0 ? 'all' : 'run';
              const result = db.prepare(statement)[method](...rest);
              if (callback) {
                callback(result);
              }
            };
            const resolve = (value: any) => {
              results.push(value);
            };
            cb(exec, resolve);
          }).immediate();
          yay(results as any);
        } catch (err) {
          nay(err);
        }
      });
    }
  };
}
