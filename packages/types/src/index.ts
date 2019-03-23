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
export interface IQuery {
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
export interface IDebeClient<TBase = IItem> {
  // protected ev: EventEmitter()
  schema: any;
  destroy(): Promise<void>;
  connect(): Promise<any>;
  use<T = IItem>(model: string): IDebeClientUse<T>;
  insert<T = any>(
    model: string,
    value: (T & IInsertItem)[] | T & IInsertItem
  ): Promise<T & IGetItem>;
  remove<T = any>(model: string, query: IQuery): Promise<void>;
  all<T = TBase>(model: string, queryArgs: IQuery): Promise<T[]>;
  all<T = TBase>(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<T[]>
  ): () => void;
  all<T = TBase>(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(model: string, queryArgs: IQuery): Promise<number>;
  count(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<number>
  ): () => void;
  count(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get<T = TBase>(model: string, queryArgs: IQuery): Promise<T>;
  get<T = TBase>(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<T>
  ): () => void;
  get<T = TBase>(
    model: string,
    queryArgs: IQuery,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void);
}

export interface IDebeClientUse<T> {
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
