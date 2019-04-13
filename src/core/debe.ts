import { ensureArray, objectify } from './utils';
import {
  IObserverCallback,
  IItem,
  IGetItem,
  IInsertItem,
  ICollectionInput,
  IQueryInput,
  IInsertInput,
  IQuery,
  IUnlisten,
  ICollection,
  fieldTypes,
  IInsert,
  IDebeUse
} from './types';
import { DebeDispatcher } from './dispatcher';
import { DebeAdapter, DebeAdapterDispatcher } from './adapter';

export function ensureCollection(collection: ICollectionInput): ICollection {
  if (!collection.fields) {
    collection.fields = {};
  } else if (Array.isArray(collection.fields)) {
    collection.fields = collection.fields.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.index) {
    collection.index = {};
  } else if (Array.isArray(collection.index)) {
    collection.index = collection.index.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.plugins) {
    collection.plugins = [];
  }
  if (!collection.specialFields) {
    collection.specialFields = {};
  }
  return collection as ICollection;
}

interface IOptions {
  [s: string]: any;
}

export class Debe<TBase = IItem> {
  dispatcher: DebeDispatcher<TBase>;
  initializing: Promise<void>;
  constructor(
    adapterOrAdapter: DebeDispatcher | DebeAdapter,
    collections: ICollectionInput[],
    options: IOptions = {}
  ) {
    if (adapterOrAdapter instanceof DebeAdapter) {
      const collectionsObj = objectify<ICollectionInput, ICollection>(
        collections,
        ensureCollection
      );
      this.dispatcher = new DebeAdapterDispatcher(
        this,
        adapterOrAdapter,
        collectionsObj,
        options
      );
    } else {
      this.dispatcher = adapterOrAdapter;
    }
  }
  async close() {
    await this.dispatcher.close();
  }
  async initialize() {
    if (!this.initializing) {
      this.initializing = this.dispatcher.initialize();
    }
    await this.initializing;
  }
  use<T = IItem>(collection: string): IDebeUse<T> {
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
  listen<T = IGetItem>(
    collection: string,
    callback: IObserverCallback<(T & IGetItem)[]>
  ): IUnlisten {
    return this.dispatcher.listen('insert', callback, { collection });
  }
  insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[],
    options?: IInsertInput
  ): Promise<(T & IGetItem)[]>;
  insert<T = IInsertItem>(
    collection: string,
    value: T & IInsertItem,
    options?: IInsertInput
  ): Promise<T & IGetItem>;
  insert<T = IInsertItem>(
    collection: string,
    value: (T & IInsertItem)[] | (T & IInsertItem),
    optionsInput: IInsertInput = {}
  ): Promise<(T & IGetItem)[] | T & IGetItem> {
    const options: IInsert = {
      refetchResult: false,
      update: true,
      ...optionsInput
    } as any;
    if (Array.isArray(value)) {
      return this.dispatcher.run<T & IGetItem>(
        'insert',
        collection,
        value,
        options
      );
    }
    return this.dispatcher
      .run<(T & IGetItem)[]>('insert', collection, [value], options)
      .then(([x]) => x);
  }
  // remove
  remove<T = any>(
    collection: string,
    value: string | string[]
  ): Promise<string | string[]> {
    if (Array.isArray(value)) {
      return this.dispatcher.run('remove', collection, value);
    }
    return this.dispatcher.run('remove', collection, [value]).then(x => x[0]);
  }
  // all
  all<T = TBase>(collection: string): Promise<(T & IGetItem)[]>;
  all<T = TBase>(
    collection: string,
    value: string | string[] | IQueryInput
  ): Promise<(T & IGetItem)[]>;
  all<T = TBase>(
    collection: string,
    callback: IObserverCallback<(T & IGetItem)[]>
  ): IUnlisten;
  all<T = TBase>(
    collection: string,
    value: string[] | string | IQueryInput,
    callback: IObserverCallback<(T & IGetItem)[]>
  ): IUnlisten;
  all<T = TBase>(
    collection: string,
    value?:
      | string
      | string[]
      | IQueryInput
      | IObserverCallback<(T & IGetItem)[]>,
    callback?: IObserverCallback<(T & IGetItem)[]>
  ): Promise<T[]> | IUnlisten {
    if (value && typeof value === 'function') {
      callback = value;
      value = undefined;
    }
    if (value && typeof value === 'string') {
      value = { id: value };
    } else if (value && Array.isArray(value)) {
      value = { id: value };
    } else if (value && typeof value === 'object' && Array.isArray(value.id)) {
      value = { id: value.id };
    }
    const query = cleanQuery(value);
    if (callback) {
      return this.dispatcher.listen<T[]>('all', callback, {
        collection,
        query
      });
    }
    return this.dispatcher.run<T[]>('all', collection, query);
  }
  // count
  count(collection: string): Promise<number>;
  count(
    collection: string,
    value: string | string[] | IQueryInput
  ): Promise<number>;
  count(collection: string, callback: IObserverCallback<number>): IUnlisten;
  count(
    collection: string,
    value: IQueryInput,
    callback: IObserverCallback<number>
  ): IUnlisten;
  count(
    collection: string,
    value?: string | string[] | IQueryInput | IObserverCallback<number>,
    callback?: IObserverCallback<number>
  ): Promise<number> | IUnlisten {
    if (value && typeof value === 'function') {
      callback = value;
      value = undefined;
    }
    if (value && typeof value === 'string') {
      value = { id: value };
    } else if (value && Array.isArray(value)) {
      value = { id: value };
    } else if (value && typeof value === 'object' && Array.isArray(value.id)) {
      value = { id: value.id };
    }
    const query = cleanQuery(value);
    if (callback) {
      return this.dispatcher.listen<number>('count', callback, {
        collection,
        query
      });
    }
    return this.dispatcher.run<number>('count', collection, query);
  }
  // get
  get<T = TBase>(
    collection: string,
    args?: IQueryInput | string
  ): Promise<T & IGetItem>;
  get<T = TBase>(
    collection: string,
    value?: IQueryInput | string,
    callback?: IObserverCallback<T & IGetItem>
  ): IUnlisten;
  get<T = TBase>(
    collection: string,
    value?: IQueryInput | string,
    callback?: IObserverCallback<T & IGetItem>
  ): Promise<T & IGetItem> | IUnlisten {
    if (value && typeof value === 'function') {
      callback = value;
      value = undefined;
    }
    if (
      value &&
      typeof value === 'object' &&
      value.id &&
      !Array.isArray(value.id)
    ) {
      value = value.id;
    }
    if (value && typeof value === 'string') {
      if (callback) {
        return this.dispatcher.listen<T>('get', callback, {
          collection,
          query: value
        });
      }
      return this.dispatcher.run<T & IGetItem>('get', collection, value);
    }
    if (value && Array.isArray(value)) {
      value = { id: value };
    } else if (value && typeof value === 'object' && Array.isArray(value.id)) {
      value = { id: value.id };
    }
    const query = cleanQuery(value);
    if (callback !== undefined) {
      const cb = callback;
      return this.dispatcher.listen<T[]>(
        'all',
        result => cb(result[0] as any),
        {
          collection,
          query
        }
      );
    }
    return this.dispatcher
      .run<(T & IGetItem)[]>('all', collection, query)
      .then(x => x[0]);
  }
}

function cleanQuery(value: IQueryInput | any): IQuery {
  if (!value) {
    value = {};
  }
  if (value.id) {
    if (Array.isArray(value.id)) {
      value.where = [`id IN (?)`, value.id];
    } else {
      value.where = [`id = ?`, value.id];
    }
  }
  if (Array.isArray(value.limit) && value.limit.length === 2) {
    value.offset = value.limit[1];
    value.limit = value.limit[0];
  } else if (Array.isArray(value.limit) && value.limit.length === 1) {
    value.limit = value.limit[0];
  }
  value.select = value.select ? ensureArray(value.select) : undefined;
  value.orderBy = value.orderBy ? ensureArray(value.orderBy) : undefined;
  value.id = value.id ? ensureArray(value.id) : undefined;
  return value as IQuery;
}
