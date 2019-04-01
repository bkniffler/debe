import { Flowzilla, ITracker } from 'flowzilla';
import { createLog } from './utils';
import {
  IObserverCallback,
  IQuery,
  IItem,
  IGetItem,
  IInsertItem,
  types
} from './types';

export class Debe<TBase = IItem> extends Flowzilla {
  createLog(name: string) {
    return createLog(name);
  }
  tracker: ITracker | undefined;
  constructor({ tracker }: { tracker?: boolean } = {}) {
    super();
    if (tracker) {
      this.tracker = args => {
        console.log(args);
      };
    }
  }
  public destroy() {
    return this.run(types.DESTROY);
  }
  public async initialize(arg?: any) {
    return await this.run<any>(
      types.INITIALIZE,
      { indices: [], columns: [] },
      this
    );
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
  public listen(model: string, callback: any): any {
    return this.runSync(types.LISTEN, [model], { ...this, callback });
  }
  public insert<T = IInsertItem>(
    model: string,
    value: (T & IInsertItem)[],
    options?: any
  ): Promise<(T & IGetItem)[]>;
  public insert<T = IInsertItem>(
    model: string,
    value: T & IInsertItem,
    options?: any
  ): Promise<T & IGetItem>;
  public insert<T = IInsertItem>(
    model: string,
    value: (T & IInsertItem)[] | (T & IInsertItem),
    options: any = {}
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    return this.run(types.INSERT, [model, value], {
      ...options,
      ...this
    });
  }
  // remove
  public remove<T = any>(
    model: string,
    value: string | string[]
  ): Promise<void> {
    return this.run(types.REMOVE, [model, value]);
  }
  // all
  public all<T = TBase>(
    model: string,
    value?: IQuery
  ): Promise<(T & IGetItem)[]>;
  public all<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): () => void;
  public all<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): Promise<T[]> | (() => void) {
    if (callback && typeof callback === 'function') {
      return this.runSync(types.ALL, [model, value], {
        ...this,
        callback
      });
    }
    return this.run(types.ALL, [model, value], this);
  }
  // count
  public count(model: string, args?: IQuery): Promise<number>;
  public count(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<number>
  ): () => void;
  public count(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<number>
  ): Promise<number> | (() => void) {
    if (callback) {
      return this.runSync(types.COUNT, [model, value], { ...this, callback });
    }
    return this.run(types.COUNT, [model, value], this);
  }
  // get
  public get<T = TBase>(model: string, args?: IQuery): Promise<T & IGetItem>;
  public get<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<T & IGetItem>
  ): () => void;
  public get<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<T & IGetItem>
  ): Promise<T> | (() => void) {
    if (callback) {
      return this.runSync(types.GET, [model, value], { ...this, callback });
    }
    return this.run(types.GET, [model, value], this);
  }
}

export interface IDebeUse<T> {
  all(queryArgs: IQuery): Promise<T[]>;
  all(queryArgs: IQuery, cb?: IObserverCallback<T[]>): () => void;
  all(
    queryArgs: IQuery,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(queryArgs: IQuery): Promise<number>;
  count(queryArgs: IQuery, cb?: IObserverCallback<number>): () => void;
  count(
    queryArgs: IQuery,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get(queryArgs: IQuery): Promise<T>;
  get(queryArgs: IQuery, cb?: IObserverCallback<T>): () => void;
  get(queryArgs: IQuery, cb?: IObserverCallback<T>): Promise<T> | (() => void);
  remove(query: IQuery): Promise<void>;
  insert<T = any>(
    value: (T & IInsertItem)[] | T & IInsertItem
  ): Promise<T & IGetItem>;
}
