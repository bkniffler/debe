import {
  ICollection,
  IItem,
  IListenerOptions,
  IObserverCallback,
  IGetItem,
  IInsertItem,
  IQuery,
  IInsert,
  IMiddlewareInner,
  fieldTypes
} from './types';
import { IObject, generate } from './utils';

/*
function throwIfNotInitialized(db: Debe) {
  if (!db.isInitialized) {
    throw new Error(
      'Not yet initialized, did you call and wait for db.initialize()?'
    );
  }
}
*/

interface IAdapterOptions {
  idField: string;
}
interface IAdapterOptionsInput {
  idField?: string;
}
export abstract class DebeAdapter {
  dispatcher: Dispatcher;
  collections: IObject<ICollection> = {};
  options: IAdapterOptions;
  run() {}
  abstract initialize(): Promise<void> | void;
  abstract close(): Promise<void> | void;
  abstract get(collection: ICollection, id: string): Promise<any> | any;
  abstract remove(
    collection: ICollection,
    ids: string[]
  ): Promise<string[]> | string[];
  abstract all(collection: ICollection, query: IQuery): Promise<any[]> | any[];
  abstract count(
    collection: ICollection,
    query: IQuery
  ): Promise<number> | number;
  abstract insert(
    collection: ICollection,
    items: any[],
    options: IInsert
  ): Promise<any[]> | any[];
  // Inner
}

function dispatch(store: any, action: string, payload: any[] = []) {
  switch (action) {
    case 'close':
      return store.close.apply(store, payload);
    case 'initialize':
      return store.initialize.apply(store, payload);
    case 'transformItemIn':
      return store.transformItemIn.apply(store, payload);
    case 'transformItemOut':
      return store.transformItemOut.apply(store, payload);
    case 'listener':
      return store.listener.apply(store, payload);
    case 'query':
      return store.query.apply(store, payload);
    case 'insert':
      return store.insert.apply(store, payload);
    case 'all':
      return store.all.apply(store, payload);
    case 'remove':
      return store.remove.apply(store, payload);
    case 'count':
      return store.count.apply(store, payload);
    case 'get':
      return store.get.apply(store, payload);
  }
}

class Dispatcher {
  middlewares: IMiddlewareInner[] = [];
  public close() {
    this.close();
  }
  public async initialize(
    collections: IObject<ICollection>,
    options: IAdapterOptionsInput = {}
  ) {
    this.options = { idField: options.idField || 'id' };
    for (var middleware of this.middlewares) {
      if (middleware.collections) {
        middleware.collections(collections);
      }
    }
    for (var key in collections) {
      collections[key].fields[this.options.idField] = fieldTypes.STRING;
      collections[key].index[this.options.idField] = fieldTypes.STRING;
      collections[key].specialFields.id = this.options.idField;
      for (var middleware of this.middlewares) {
        if (middleware.collection) {
          middleware.collection(collections[key]);
        }
      }
    }
    this.collections = collections;
    await this.initialize();
  }
  public listener<T>(
    options: IListenerOptions,
    callback: IObserverCallback<T>
  ) {
    for (var middleware of this.middlewares) {
      if (middleware.listener) {
        return middleware.listener<T>(options, callback);
      }
    }
    throw new Error('No listener attached');
  }
  public async insert<T>(
    collection: string,
    value: (T & IInsertItem)[],
    options: IInsert
  ): Promise<(T & IGetItem)[]> {
    if (!options.new) {
      options.new = [];
      options.existing = [];
    }
    const c = this.collection(collection);
    let input = value.map(x => this.transformItemIn(c, x, options));
    for (var middleware of this.middlewares) {
      if (middleware.beforeInsert) {
        const result = middleware.beforeInsert(c, input, options);
        if (result && (await result)) {
          input = (await result) as any;
        }
      }
    }

    const result = await this.insert(c, input, options);
    const transformed = result.map(x => this.transformItemOut(c, x));
    for (var middleware of this.middlewares) {
      if (middleware.afterInsert) {
        middleware.afterInsert(c, input, options, transformed);
      }
    }
    return result;
  }
  public async remove(collection: string, value: string[]): Promise<string[]> {
    const c = this.collection(collection);
    for (var middleware of this.middlewares) {
      if (middleware.beforeRemove) {
        const v = middleware.beforeRemove(c, value) as any;
        if (v && v.then && (await v)) {
          return await v;
        }
      }
    }
    const result = await this.remove(c, value);
    for (var middleware of this.middlewares) {
      if (middleware.afterRemove) {
        middleware.afterRemove(c, value, result);
      }
    }
    return result;
  }
  public async all<T = TBase>(
    collection: string,
    value: IQuery
  ): Promise<(T & IGetItem)[]> {
    const c = this.collection(collection);
    value = this.query(c, value);
    const result = await this.all(c, value);
    return this.transformItemOut(c, result);
  }
  public async count(collection: string, value: IQuery): Promise<number> {
    const c = this.collection(collection);
    value = this.query(c, value);
    const result = await this.count(c, value);
    return result;
  }
  public async get<T = TBase>(
    collection: string,
    value: string
  ): Promise<T & IGetItem> {
    const c = this.collection(collection);
    const result = await this.get(c, value);
    return this.transformItemOut(c, result);
  }
  // ---------------
  // Private
  // ---------------
  protected collection(name: string) {
    return this.collections[name];
  }
  protected query(collection: ICollection, value: IQuery) {
    for (var middleware of this.middlewares) {
      if (middleware.query) {
        value = middleware.query(collection, value);
      }
    }
    return value;
  }
  protected transformItemIn<T>(
    collection: ICollection,
    item: T,
    options: IInsert
  ) {
    const { idField } = this.options;
    if (!item) {
      return item;
    }
    if (item[idField] === undefined || item[idField] === null) {
      item[idField] = generate();
      options.new.push(item[idField]);
    } else {
      options.existing.push(item[idField]);
    }
    if (typeof item[idField] !== 'string') {
      item[idField] = item[idField] + '';
    }
    for (var middleware of this.middlewares) {
      if (middleware.transformItemIn) {
        item = middleware.transformItemIn<T>(collection, item);
      }
    }
    return item;
  }
  protected transformItemOut<T = TBase>(collection: ICollection, item: T) {
    for (var middleware of this.middlewares) {
      if (middleware.transformItemOut) {
        item = middleware.transformItemOut<T>(collection, item);
      }
    }
    return item;
  }
}
