import { Flowzilla, ITracker } from 'flowzilla';
import { createLog } from './utils';
import {
  IObserverCallback,
  IQuery,
  IItem,
  IGetItem,
  IInsertItem,
  types,
  ICollections,
  ICollectionInput
} from './types';

function throwIfNotInitialized(db: Debe) {
  if (!db.isInitialized) {
    throw new Error(
      'Not yet initialized, did you call and wait for db.initialize()?'
    );
  }
}

export class Debe<TBase = IItem> extends Flowzilla {
  isInitialized = false;
  collections: ICollections;
  createLog(name: string) {
    return createLog(name);
  }
  tracker: ITracker | undefined;
  constructor(
    collections: ICollectionInput[],
    { tracker }: { tracker?: boolean } = {}
  ) {
    super();
    this.collections = collections as any;
    if (tracker) {
      this.tracker = args => {
        console.log(args);
      };
    }
  }
  public destroy() {
    return this.run(types.DESTROY);
  }
  public async initialize() {
    const state = await this.run<any>(
      types.INITIALIZE,
      { collections: this.collections },
      this
    );
    this.collections = state.collections;
    this.isInitialized = true;
    return state;
  }
  public use<T = IItem>(collection: string): IDebeUse<T> {
    const proxy = this;
    return new Proxy<any>(
      {},
      {
        get: function(t: string, methodName: string) {
          return (...args: [any]) => {
            return proxy[methodName](collection, ...args);
          };
        }
      }
    );
  }
  public listen(collection: string, callback: any): any {
    throwIfNotInitialized(this);
    return this.runSync(types.LISTEN, [collection], { ...this, callback });
  }
  public insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[],
    options?: any
  ): Promise<(T & IGetItem)[]>;
  public insert<T = IInsertItem>(
    collection: string,
    value: T & IInsertItem,
    options?: any
  ): Promise<T & IGetItem>;
  public insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[] | (T & IInsertItem),
    options: any = {}
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    throwIfNotInitialized(this);
    return this.run(types.INSERT, [collection, value], {
      ...options,
      ...this
    });
  }
  // remove
  public remove<T = any>(
    collection: string,
    value: string | string[]
  ): Promise<void> {
    throwIfNotInitialized(this);
    return this.run(types.REMOVE, [collection, value]);
  }
  // all
  public all<T = TBase>(
    collection: string,
    value?: IQuery
  ): Promise<(T & IGetItem)[]>;
  public all<T = TBase>(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): () => void;
  public all<T = TBase>(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): Promise<T[]> | (() => void) {
    throwIfNotInitialized(this);
    if (callback && typeof callback === 'function') {
      return this.runSync(types.ALL, [collection, value], {
        ...this,
        callback
      });
    }
    return this.run(types.ALL, [collection, value], this);
  }
  // count
  public count(collection: string, args?: IQuery): Promise<number>;
  public count(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<number>
  ): () => void;
  public count(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<number>
  ): Promise<number> | (() => void) {
    throwIfNotInitialized(this);
    if (callback) {
      return this.runSync(types.COUNT, [collection, value], {
        ...this,
        callback
      });
    }
    return this.run(types.COUNT, [collection, value], this);
  }
  // get
  public get<T = TBase>(
    collection: string,
    args?: IQuery
  ): Promise<T & IGetItem>;
  public get<T = TBase>(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<T & IGetItem>
  ): () => void;
  public get<T = TBase>(
    collection: string,
    value?: IQuery,
    callback?: IObserverCallback<T & IGetItem>
  ): Promise<T> | (() => void) {
    throwIfNotInitialized(this);
    if (callback) {
      return this.runSync(types.GET, [collection, value], {
        ...this,
        callback
      });
    }
    return this.run(types.GET, [collection, value], this);
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
