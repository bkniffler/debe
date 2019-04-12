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
  IListenerOptions,
  IUnlisten,
  ICollection,
  fieldTypes,
  IInsert,
  IMiddleware2
} from './types';
import { DebeAdapter } from './adapter';
import { changeListenerPlugin, softDeletePlugin } from './middleware';

const createListenerOptions = (
  method: 'all' | 'count' | 'get' | 'insert',
  collection: string,
  query: any
): IListenerOptions => ({ method, collection, query });

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

export class Debe<TBase = IItem> {
  adapter: DebeAdapter<TBase>;
  initializing: Promise<void>;
  private temp: any = {};
  constructor(
    adapter: DebeAdapter | any,
    collections: ICollectionInput[],
    options: {
      middlewares?: IMiddleware2[];
      changeListener?: boolean;
      softDelete?: boolean;
      [s: string]: any;
    } = {}
  ) {
    const {
      middlewares = [],
      softDelete = false,
      changeListener = true,
      ...rest
    } = options;
    this.adapter = adapter;
    if (changeListener) {
      this.adapter.middlewares.push(changeListenerPlugin(rest as any)(this));
    }
    if (softDelete) {
      this.adapter.middlewares.push(softDeletePlugin(rest as any)(this));
    }
    for (var middleware of middlewares) {
      this.adapter.middlewares.push(middleware(this));
    }
    this.temp = { collections, rest };
  }
  close() {
    return this.adapter.$close();
  }
  async initialize() {
    if (!this.initializing) {
      const { collections, rest } = this.temp;
      this.initializing = this.adapter.$initialize(
        objectify<ICollectionInput, ICollection>(collections, ensureCollection),
        rest
      );
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
    return this.adapter.$listener({ collection }, callback);
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
      return this.adapter.$insert<T>(collection, value, options);
    }

    return this.adapter
      .$insert<T>(collection, [value], options)
      .then(([x]) => x);
  }
  // remove
  remove<T = any>(
    collection: string,
    value: string | string[]
  ): Promise<string | string[]> {
    if (Array.isArray(value)) {
      return this.adapter.$remove(collection, value);
    }
    return this.adapter.$remove(collection, [value]).then(x => x[0]);
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
      return this.adapter.$listener<T[]>(
        createListenerOptions('all', collection, query),
        callback
      );
    }
    return this.adapter.$all<T>(collection, query);
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
      return this.adapter.$listener<number>(
        createListenerOptions('count', collection, query),
        callback
      );
    }
    return this.adapter.$count(collection, query);
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
        return this.adapter.$listener<T>(
          createListenerOptions('get', collection, value),
          callback
        );
      }
      return this.adapter.$get<T>(collection, value);
    }
    if (value && Array.isArray(value)) {
      value = { id: value };
    } else if (value && typeof value === 'object' && Array.isArray(value.id)) {
      value = { id: value.id };
    }
    const query = cleanQuery(value);
    if (callback !== undefined) {
      const cb = callback;
      return this.adapter.$listener<T[]>(
        createListenerOptions('all', collection, query),
        result => cb(result[0] as any)
      );
    }
    return this.adapter.$all<T>(collection, query).then(x => x[0]);
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
