export interface IOptions {
  verbose?: boolean;
}
export interface IModel {
  name: string;
  index: string[];
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
}
export interface IListenerObject {
  change: any;
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
  insert: <T = IItem>(model: string, item: T) => Promise<T>;
  del: (model: string, param: IAllQuery) => Promise<void>;
  all: <T = IItem>(model: string, param: IAllQuery) => Promise<T[]>;
  allSubscription: <T = IItem>(
    model: string,
    param: IAllQuery,
    cb: IObserverCallback<T[]>
  ) => () => void;
  get: <T = IItem>(model: string, param: IAllQuery) => Promise<T>;
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
}
