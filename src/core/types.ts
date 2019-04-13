import { Debe } from './debe';

export const types = {
  LISTEN: 'listen',
  INSERT: 'insert',
  GET: 'get',
  ALL: 'all',
  COUNT: 'count',
  CLOSE: 'close',
  REMOVE: 'remove',
  INITIALIZE: 'initialize',
  COLLECTION: 'collection',
  COLLECTIONS: 'collections'
};
interface IFieldTypeHolder {
  [s: string]: IFieldTypes;
}
export const fieldTypes: IFieldTypeHolder = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  JSON: 'json'
};
export type IFieldTypes = 'number' | 'boolean' | 'string' | 'json';
export interface IInsertItem {
  [k: string]: any;
  id?: string;
}
export interface IGetItem {
  id: string;
  rev: string;
}
export interface IItem extends IGetItem {
  [s: string]: any;
}
export interface IQueryInput {
  id?: string[] | string;
  limit?: number | [number] | [number, number];
  offset?: number;
  where?: [string, ...any[]];
  select?: string[] | string;
  orderBy?: string[] | string;
}
export interface IQuery {
  limit?: number;
  offset?: number;
  where?: [string, ...any[]];
  select?: string[];
  orderBy?: string[];
}
export interface IInsertInput {
  refetchResult?: boolean;
  update?: boolean;
  [s: string]: any;
}
export interface IInsert {
  refetchResult: boolean;
  update: boolean;
  new: string[];
  existing: string[];
  [s: string]: any;
}

export type IObserverCallback<T> = (value: T) => void;
export type IUnlisten = () => void;

export interface ICollection {
  name: string;
  index: IFields;
  fields: IFields;
  specialFields: ISpecialFields;
  plugins: string[];
}

export interface ICollectionInput {
  name: string;
  index?: IFields | string[];
  fields?: IFields | string[];
  plugins?: string[];
  specialFields?: ISpecialFields;
}

export interface ISpecialFields {
  [key: string]: string;
}
export interface ICollections {
  [key: string]: ICollection;
}

export interface IFields {
  [key: string]: IFieldTypes;
}

export interface IPlugins {
  [key: string]: any[];
}

export interface IListenerOptions {
  collection?: string;
  query?: string | string[] | IQuery;
}

export type listenTypes = 'get' | 'count' | 'all' | 'insert';
export type actionTypes = 'get' | 'count' | 'all' | 'insert' | 'remove';
export type IMiddleware<T = any> = (options: T) => IMiddleware2;
export type IMiddleware2 = (db: Debe) => IMiddlewareInner;
export interface IMiddlewareInner {
  // Lifecycle
  initialize?: () => void;
  collection?: (collection: ICollection) => ICollection;
  collections?: (collections: ICollections) => ICollections;
  close?: () => void | Promise<void>;
  // Listen
  listener?: <T>(
    type: listenTypes,
    options: IListenerOptions,
    callback: IObserverCallback<T>
  ) => () => void;
  // Transformers
  transformItemIn?: <T>(collection: ICollection, item: T) => T;
  transformItemOut?: <T>(collection: ICollection, item: T) => T;
  // Fetch
  query?: (collection: ICollection, query: IQuery) => IQuery;
  beforeGet?: (collection: ICollection, id: string) => void;
  afterGet?: (collection: ICollection, id: string, item: IGetItem) => void;
  beforeCount?: (collection: ICollection, query: IQuery) => void;
  afterCount?: (collection: ICollection, query: IQuery, result: number) => void;
  beforeAll?: (collection: ICollection, query: IQuery) => void;
  afterAll?: (collection: ICollection, query: IQuery, result: any[]) => void;
  // Manipulate
  beforeRemove?: (collection: ICollection, ids: string[]) => void;
  afterRemove?: (
    collection: ICollection,
    ids: string[],
    result: string[]
  ) => void;
  beforeInsert?: <T = IInsertItem>(
    collection: ICollection,
    items: (T & IInsertItem)[],
    options: IInsert
  ) => Promise<T[]> | T[] | void;
  afterInsert?: (
    collection: ICollection,
    items: IInsertItem[],
    options: IInsert,
    result: IGetItem[]
  ) => void;
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

export interface IAdapterOptions {
  idField: string;
  [s: string]: any;
}
export interface IAdapterOptionsInput {
  idField?: string;
  [s: string]: any;
}
