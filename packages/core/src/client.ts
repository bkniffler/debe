import {
  IObserverCallback,
  IQuery,
  IItem,
  IGetItem,
  IInsertItem,
  types
} from './types';
import { Dispatcher } from './dispatcher';

export class Debe<TBase = IItem> extends Dispatcher {
  indexFields: string[] = [];
  public destroy() {
    return this.dispatch(types.DESTROY);
  }
  public initialize(arg?: any) {
    return this.dispatch(types.INITIALIZE, arg);
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
    value: (T & IInsertItem)[],
    context?: any
  ): Promise<(T & IGetItem)[]>;
  public insert<T = IInsertItem>(
    model: string,
    value: T & IInsertItem,
    context?: any
  ): Promise<T & IGetItem>;
  public insert<T = IInsertItem>(
    model: string,
    value: (T & IInsertItem)[] | (T & IInsertItem),
    context: any = {}
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    return this.dispatch(types.INSERT, [model, value], context);
  }
  // remove
  public remove<T = any>(
    model: string,
    value: string | string[]
  ): Promise<void> {
    return this.dispatch(types.REMOVE, [model, value]);
  }
  // all
  public all<T = TBase>(
    model: string,
    value?: IQuery,
    context?: any
  ): Promise<(T & IGetItem)[]>;
  public all<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>,
    context?: any
  ): () => void;
  public all<T = TBase>(
    model: string,
    value?: IQuery,
    callback?: IObserverCallback<(T & IGetItem)[]>,
    context: any = {}
  ): Promise<T[]> | (() => void) {
    if (callback && typeof callback === 'function') {
      return this.dispatchSync(types.ALL, [model, value], {
        ...context,
        callback
      });
    }
    return this.dispatch(types.ALL, [model, value], context);
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
      return this.dispatchSync(types.COUNT, [model, value], { callback });
    }
    return this.dispatch(types.COUNT, [model, value]);
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
      return this.dispatchSync(types.GET, [model, value], { callback });
    }
    return this.dispatch(types.GET, [model, value]);
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
