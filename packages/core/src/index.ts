export * from '@debe/types';
export * from './utils';
export * from './common';
// import { createLog, log as l } from './common';
export * from './client/base';
export * from './client/memory';
export * from './client/sql';
export * from './client/sql-json';
export * from './client/sqlite-json';

import {
  IObserverCallback,
  IQuery,
  IItem,
  IGetItem,
  IInsertItem,
  IDebeUse
} from '@debe/types';
import { DebeEngine } from './client/base';
import { Emitter } from './common';

export class Debe<TBase = IItem> extends Emitter {
  private engine: DebeEngine;
  constructor(engine: DebeEngine) {
    super();
    this.engine = engine;
    engine.proxyTo(this);
  }
  public destroy() {
    return this.engine.destroy();
  }
  public initialize(arg?: any) {
    return this.engine.initialize(arg);
  }
  public use<T = IItem>(model: string): IDebeUse<T> {
    const proxy = this;
    return new Proxy<any>(
      {},
      {
        get: function(t: string, methodName: string) {
          return (...args: [any]) => {
            return proxy[methodName](model, ...args);
          };
        }
      }
    );
  }
  public insert<T = IInsertItem>(
    model: string,
    value: (T & IInsertItem)[]
  ): Promise<(T & IGetItem)[]>;
  public insert<T = IInsertItem>(
    model: string,
    value: T & IInsertItem
  ): Promise<T & IGetItem>;
  public insert<T = IInsertItem>(
    model: string,
    value: (T & IInsertItem)[] | (T & IInsertItem)
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    return this.engine.run(model, 'insert', value);
  }
  // remove
  public remove<T = any>(model: string, id: string | string[]): Promise<void> {
    return this.engine.run(model, 'remove', id);
  }
  // all
  public all<T = TBase>(
    model: string,
    args?: IQuery
  ): Promise<(T & IGetItem)[]>;
  public all<T = TBase>(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<(T & IGetItem)[]>
  ): () => void;
  public all<T = TBase>(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<(T & IGetItem)[]>
  ): Promise<T[]> | (() => void) {
    return this.engine.run<T[]>(model, 'all', args, cb);
  }
  // count
  public count(model: string, args?: IQuery): Promise<number>;
  public count(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<number>
  ): () => void;
  public count(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void) {
    return this.engine.run<number>(model, 'count', args, cb);
  }
  // get
  public get<T = TBase>(model: string, args?: IQuery): Promise<T & IGetItem>;
  public get<T = TBase>(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<T & IGetItem>
  ): () => void;
  public get<T = TBase>(
    model: string,
    args?: IQuery,
    cb?: IObserverCallback<T & IGetItem>
  ): Promise<T> | (() => void) {
    return this.engine.run<T>(model, 'get', args, cb);
  }
}

/*l.enable();
const log = createLog('debe');
const logPad = '----';*/

/*function softDeletePlugin(db: IDebe) {
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
