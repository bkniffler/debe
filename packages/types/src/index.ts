export interface IOptions {
  verbose?: boolean;
  additionalColumns?: string[];
  idField?: string;
  bodyField?: string;
  removedField?: string;
  revisionField?: string;
}
export interface IModel {
  name: string;
  index?: string[];
  columns?: string[];
}
export interface IInsertOptions {
  explain?: boolean;
  keepRev?: boolean;
}
export interface IInsertItem {
  id?: string;
}
export interface IGetItem {
  id: string;
  rev: string;
}
export interface IItem {
  id: string;
  rev: string;
  [s: string]: any;
}
export interface IDBItem {
  id: string;
  rev: string;
  json: any;
}
export interface IAllQuery {
  id?: string[] | string;
  explain?: boolean;
  limit?: number | [number] | [number, number];
  offset?: number;
  includeBody?: boolean;
  where?: string[] | string;
  orderBy?: string[] | string;
  additionalColumns?: string[];
}
export interface IListenerObject {
  change: any;
  model: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  properties: string[];
  newValue: IItem;
  oldValue?: IItem;
}
export type IListenerCallback = (value: IListenerObject) => void;
export type IObserverCallback<T = IItem> = (
  items: T,
  reason: 'INITIAL' | 'CHANGE'
) => void;

export interface ISQLightClient {
  schema: IModel[];
  addSchema: (model: IModel) => Promise<any>;
  insert: <T = IItem>(
    model: string,
    item: T & IInsertItem,
    options?: IInsertOptions
  ) => Promise<T & IGetItem>;
  remove: (model: string, param: IAllQuery) => Promise<void>;
  all: <T = IItem>(
    model: string,
    param: IAllQuery
  ) => Promise<(T & IGetItem)[]>;
  allSubscription: <T = IItem>(
    model: string,
    param: IAllQuery,
    cb: IObserverCallback<T[]>
  ) => () => void;
  get: <T = IItem>(model: string, param: IAllQuery) => Promise<T & IGetItem>;
  getSubscription: <T = IItem>(
    model: string,
    param: IAllQuery,
    cb: IObserverCallback<T>
  ) => () => void;
  count: (model: string, param: IAllQuery) => Promise<number>;
  countSubscription: (
    model: string,
    param: IAllQuery,
    cb: IObserverCallback<number>
  ) => () => void;
  countListeners: (model: string) => number;
  addListener: (model: string, cb: IListenerCallback) => void;
  removeListener: (model: string, cb: IListenerCallback) => void;
  removeAllListeners: (model?: string) => void;
  close: () => void;
  use: <T = IItem>(model: string) => ISQLightClientUse<T>;
}

export interface ISQLightClientUse<T = IItem> {
  schema: IModel;
  insert: (
    item: T & IInsertItem,
    options?: IInsertOptions
  ) => Promise<T & IGetItem>;
  remove: (param: IAllQuery) => Promise<void>;
  all: (param: IAllQuery) => Promise<(T & IGetItem)[]>;
  allSubscription: (param: IAllQuery, cb: IObserverCallback<T[]>) => () => void;
  get: (param: IAllQuery) => Promise<T & IGetItem>;
  getSubscription: (param: IAllQuery, cb: IObserverCallback<T>) => () => void;
  count: (param: IAllQuery) => Promise<number>;
  countSubscription: (
    param: IAllQuery,
    cb: IObserverCallback<number>
  ) => () => void;
  countListeners: () => number;
  addListener: (cb: IListenerCallback) => void;
  removeListener: (cb: IListenerCallback) => void;
  removeAllListeners: () => void;
}
