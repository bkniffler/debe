export * from '@sqlight/types';
export * from './utils';
export * from './common';
// import { createLog, log as l } from './common';
export * from './client/base';
export * from './client/sql';
export * from './client/sql-json';
export * from './client/sqlite-json';
/*l.enable();
const log = createLog('sqlight');
const logPad = '----';*/

/*function softDeletePlugin(db: ISQLightClient) {
  return (action: string, payload: any) => {
    if (action === 'remove') {
      payload = toISO(new Date());
      return payload;
    }
    if (action === 'prepareQuery') {
      const where = ensureArray(payload.where);
      where.push(`${removedField} IS NULL`);
      payload.where = where;
      return payload;
    }
    return payload;
  };
}*/
/*
function logAndExplain(
  model: IModel,
  func: string,
  sql: string,
  args: any[],
  override = false
) {
  if (verbose || override) {
    log.info(`${logPad}Querying ${func} ${model.name}`);
    log.info(
      sql
        .split('\n')
        .map(x => x.trim())
        .join('\n'),
      ...args
    );
    /*logInner(
      'Explain:',
      db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args)[0].detail
    );*
  }
}
*/
