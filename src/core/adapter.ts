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
import { IObject, generate, chunkWork } from './utils';

export const PARALLEL_CHUNKS = 250000;
export const CHUNKS = 10000;
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
export abstract class DebeAdapter<TBase = IItem> {
  options: IAdapterOptions;
  collections: IObject<ICollection> = {};
  middlewares: IMiddlewareInner[] = [];
  collection(name: string) {
    return this.collections[name];
  }
  $close() {
    this.close();
  }
  async $initialize(
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

  // Abstract
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
  $transformItemIn<T = TBase>(
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
  $transformItemOut<T = TBase>(collection: ICollection, item: T) {
    for (var middleware of this.middlewares) {
      if (middleware.transformItemOut) {
        item = middleware.transformItemOut<T>(collection, item);
      }
    }
    return item;
  }
  $listener<T = TBase>(
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
  private $query(collection: ICollection, value: IQuery) {
    for (var middleware of this.middlewares) {
      if (middleware.query) {
        value = middleware.query(collection, value);
      }
    }
    return value;
  }
  async $insert<T = TBase>(
    collection: string,
    value: (T & IInsertItem)[],
    options: IInsert
  ): Promise<(T & IGetItem)[]> {
    if (value.length > CHUNKS) {
      return chunkWork<T & IInsertItem, T & IGetItem>(
        value,
        [PARALLEL_CHUNKS, CHUNKS],
        items => this.$insert(collection, items, { ...options })
      );
    }

    if (!options.new) {
      options.new = [];
      options.existing = [];
    }

    const c = this.collection(collection);
    let input = value.map(x => this.$transformItemIn(c, x, options));
    for (var middleware of this.middlewares) {
      if (middleware.beforeInsert) {
        const result = middleware.beforeInsert(c, input, options);
        if (result && (await result)) {
          input = (await result) as any;
        }
      }
    }

    const result = await this.insert(c, input, options);
    const transformed = result.map(x => this.$transformItemOut(c, x));
    for (var middleware of this.middlewares) {
      if (middleware.afterInsert) {
        middleware.afterInsert(c, input, options, transformed);
      }
    }
    return result;
  }
  async $remove(collection: string, value: string[]): Promise<string[]> {
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
  async $all<T = TBase>(
    collection: string,
    value: IQuery
  ): Promise<(T & IGetItem)[]> {
    const c = this.collection(collection);
    value = this.$query(c, value);
    const result = await this.all(c, value);
    return this.$transformItemOut(c, result);
  }
  async $count(collection: string, value: IQuery): Promise<number> {
    const c = this.collection(collection);
    value = this.$query(c, value);
    const result = await this.count(c, value);
    return result;
  }
  async $get<T = TBase>(
    collection: string,
    value: string
  ): Promise<T & IGetItem> {
    const c = this.collection(collection);
    const result = await this.get(c, value);
    return this.$transformItemOut(c, result);
  }
}
