import { ITracker, ISkill, IPosition, Flowzilla } from 'flowzilla';
import { createLog } from './utils';
import { DebeAdapter } from './adapter';
import {
  IObserverCallback,
  IItem,
  IGetItem,
  IInsertItem,
  types,
  ICollections,
  ICollectionInput,
  IQueryInput,
  IInsertInput
} from './types';

export interface IPlugin extends ISkill {}
function throwIfNotInitialized(db: Debe) {
  if (!db.isInitialized) {
    throw new Error(
      'Not yet initialized, did you call and wait for db.initialize()?'
    );
  }
}

export class Debe<TBase = IItem> {
  private flow = new Flowzilla();
  isInitialized = false;
  collections: ICollections;
  createLog(name: string) {
    return createLog(name);
  }
  tracker: ITracker;
  constructor(
    adapter: DebeAdapter,
    collections: ICollectionInput[],
    { tracker }: { tracker?: boolean } = {}
  ) {
    adapter.connect(this);
    this.collections = collections as any;
    if (tracker) {
      this.tracker = args => {
        console.log(args);
      };
    }
  }
  addPlugin<T = any>(
    plugin: IPlugin | IPlugin[],
    position?: IPosition,
    anchor?: IPlugin | IPlugin[] | string | string[]
  ): void;
  addPlugin<T = any>(
    name: string,
    plugin: IPlugin | IPlugin[],
    position?: IPosition,
    anchor?: IPlugin | IPlugin[] | string | string[]
  ): void;
  addPlugin<T = any>(
    n: string | IPlugin | IPlugin[] | undefined,
    s?: IPlugin | IPlugin[] | IPosition,
    p?: IPosition | IPlugin | IPlugin[],
    o?: IPlugin | IPlugin[] | string | string[]
  ) {
    return this.flow.addSkill(n as any, s as any, p as any, o as any);
  }
  public destroy() {
    return this.flow.run(types.DESTROY);
  }
  public async initialize() {
    const state = await this.flow.run<any>(
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
    return this.flow.runSync(types.LISTEN, [collection], {
      ...this,
      callback
    });
  }
  public insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[],
    options?: IInsertInput
  ): Promise<(T & IGetItem)[]>;
  public insert<T = IInsertItem>(
    collection: string,
    value: T & IInsertItem,
    options?: IInsertInput
  ): Promise<T & IGetItem>;
  public insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[] | (T & IInsertItem),
    options: IInsertInput = {}
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    throwIfNotInitialized(this);
    return this.flow.run(types.INSERT, [collection, value], {
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
    return this.flow.run(types.REMOVE, [collection, value]);
  }
  // all
  public all<T = TBase>(
    collection: string,
    value?: string[] | IQueryInput
  ): Promise<(T & IGetItem)[]>;
  public all<T = TBase>(
    collection: string,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): () => void;
  public all<T = TBase>(
    collection: string,
    value?: string[] | IQueryInput,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): () => void;
  public all<T = TBase>(
    collection: string,
    value?: string[] | IQueryInput | IObserverCallback<(T & IGetItem)[]>,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): Promise<T[]> | (() => void) {
    throwIfNotInitialized(this);
    if (value && typeof value === 'function') {
      callback = value;
      value = undefined;
    }
    if (callback && typeof callback === 'function') {
      return this.flow.runSync(types.ALL, [collection, value], {
        ...this,
        callback
      });
    }
    return this.flow.run(types.ALL, [collection, value], this);
  }
  // count
  public count(collection: string, args?: IQueryInput): Promise<number>;
  public count(
    collection: string,
    value?: IQueryInput,
    callback?: IObserverCallback<number>
  ): () => void;
  public count(
    collection: string,
    value?: IQueryInput,
    callback?: IObserverCallback<number>
  ): Promise<number> | (() => void) {
    throwIfNotInitialized(this);
    if (callback) {
      return this.flow.runSync(types.COUNT, [collection, value], {
        ...this,
        callback
      });
    }
    return this.flow.run(types.COUNT, [collection, value], this);
  }
  // get
  public get<T = TBase>(
    collection: string,
    args?: IQueryInput | string
  ): Promise<T & IGetItem>;
  public get<T = TBase>(
    collection: string,
    value?: IQueryInput | string,
    callback?: IObserverCallback<T & IGetItem>
  ): () => void;
  public get<T = TBase>(
    collection: string,
    value?: IQueryInput | string,
    callback?: IObserverCallback<T & IGetItem>
  ): Promise<T> | (() => void) {
    throwIfNotInitialized(this);
    if (callback) {
      return this.flow.runSync(types.GET, [collection, value], {
        ...this,
        callback
      });
    }
    return this.flow.run(types.GET, [collection, value], this);
  }
}

export interface IDebeUse<T> {
  all(queryArgs: string[] | IQueryInput): Promise<T[]>;
  all(
    queryArgs: string[] | IQueryInput,
    cb?: IObserverCallback<T[]>
  ): () => void;
  all(
    queryArgs: string[] | IQueryInput,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(queryArgs: IQueryInput): Promise<number>;
  count(queryArgs: IQueryInput, cb?: IObserverCallback<number>): () => void;
  count(
    queryArgs: IQueryInput,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get(queryArgs: IQueryInput | string): Promise<T>;
  get(queryArgs: IQueryInput | string, cb?: IObserverCallback<T>): () => void;
  get(
    queryArgs: IQueryInput | string,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void);
  remove(query: string | string[]): Promise<void>;
  insert<T = any>(
    value: (T & IInsertItem)[] | T & IInsertItem,
    options?: IInsertInput
  ): Promise<T & IGetItem>;
}
