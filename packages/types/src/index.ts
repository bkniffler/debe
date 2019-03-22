export interface IInsertOptions {
  explain?: boolean;
  keepRev?: boolean;
}
export interface IInsertItem {
  [k: string]: any;
  id?: string;
}
export interface IGetItem {
  id: string;
  rev: string;
}
export interface IItem {
  [s: string]: any;
  id: string;
  rev: string;
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

export interface ISQLightClient<TBase = IItem> {
  // protected ev: EventEmitter()
  schema: any;
  destroy(): Promise<void>;
  connect(): Promise<any>;
  use<T = IItem>(model: string): ISQLightClientUse<T>;
  insert<T = any>(
    model: string,
    value: (T & IInsertItem)[] | T & IInsertItem,
    options?: IInsertOptions
  ): Promise<T & IGetItem>;
  remove<T = any>(model: string, query: IAllQuery): Promise<void>;
  all<T = TBase>(model: string, queryArgs: IAllQuery): Promise<T[]>;
  all<T = TBase>(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T[]>
  ): () => void;
  all<T = TBase>(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(model: string, queryArgs: IAllQuery): Promise<number>;
  count(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<number>
  ): () => void;
  count(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get<T = TBase>(model: string, queryArgs: IAllQuery): Promise<T>;
  get<T = TBase>(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T>
  ): () => void;
  get<T = TBase>(
    model: string,
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void);
}

export interface ISQLightClientUse<T> {
  all(queryArgs: IAllQuery): Promise<T[]>;
  all(queryArgs: IAllQuery, cb?: IObserverCallback<T[]>): () => void;
  all(
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(queryArgs: IAllQuery): Promise<number>;
  count(queryArgs: IAllQuery, cb?: IObserverCallback<number>): () => void;
  count(
    queryArgs: IAllQuery,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get(queryArgs: IAllQuery): Promise<T>;
  get(queryArgs: IAllQuery, cb?: IObserverCallback<T>): () => void;
  get(
    queryArgs: IAllQuery,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void);
  remove(query: IAllQuery): Promise<void>;
  insert<T = any>(
    value: (T & IInsertItem)[] | T & IInsertItem,
    options?: IInsertOptions
  ): Promise<T & IGetItem>;
}
