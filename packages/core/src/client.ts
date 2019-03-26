import {
  IObserverCallback,
  IQuery,
  IItem,
  IGetItem,
  IInsertItem,
  types
} from './types';
import { Dispatcher } from './dispatcher';

interface IDebeAction {
  model: string;
}
export class Debe<TBase = IItem> extends Dispatcher<IDebeAction> {
  indexFields: string[] = [];
  public destroy() {
    return this.dispatch({ type: types.DESTROY, model: '' });
  }
  public initialize(arg?: any) {
    return this.dispatch({ type: types.INITIALIZE, model: '', value: arg });
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
    return this.dispatch({ type: types.INSERT, model, value });
  }
  // remove
  public remove<T = any>(
    model: string,
    value: string | string[]
  ): Promise<void> {
    return this.dispatch({ type: types.REMOVE, model, value });
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
    if (callback) {
      return this.dispatchSync({ type: 'all', model, value, callback });
    }
    return this.dispatch({ type: types.ALL, model, value });
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
      return this.dispatchSync({ type: 'all', model, value, callback });
    }
    return this.dispatch({ type: types.COUNT, model, value });
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
      return this.dispatchSync({ type: 'all', model, value, callback });
    }
    return this.dispatch({ type: types.GET, model, value });
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
