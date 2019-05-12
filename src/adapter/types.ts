import {
  IQuery,
  ICollections,
  ICollection,
  IInsertItem,
  IInsert,
  IGetItem,
  listenTypes
} from 'debe';

export type IObserverCallback<T> = (error: any, value: T) => void;
export type IUnlisten = () => void;

export interface IListenerOptions {
  collection?: string;
  query?: string | string[] | IQuery;
}

export interface IMiddleware {
  name?: string;
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
  ) => Promise<T[] | void | undefined> | T[] | void | undefined;
  afterInsert?: (
    collection: ICollection,
    items: IInsertItem[],
    options: IInsert,
    result: IGetItem[]
  ) => void;
}

export interface IAdapterOptions {
  idField: string;
  [s: string]: any;
}
export interface IAdapterOptionsInput {
  idField?: string;
  [s: string]: any;
}
