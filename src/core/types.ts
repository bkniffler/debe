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
export type fieldType = 'number' | 'boolean' | 'string' | 'json';
export const fieldTypes = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  JSON: 'json'
};
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
  where?: [string, ...any[]] | undefined | null;
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

export type IObserverCallback<T> = (
  error: any,
  value: T,
  options?: any,
  collection?: string
) => void;
export type IUnlisten = () => void;

export interface IObject<T> {
  [key: string]: T;
}
export interface ICollection {
  name: string;
  index: IObject<fieldType>;
  fields: IObject<fieldType>;
  specialFields: IObject<string>;
  plugins: string[];
}

export interface ICollectionInput {
  name: string;
  index?: IObject<fieldType> | string[];
  fields?: IObject<fieldType> | string[];
  plugins?: string[];
  specialFields?: IObject<string>;
}

export interface ICollections extends IObject<ICollection> {}

export interface IListenerOptions {
  collection?: string;
  query?: string | string[] | IQuery;
}

export interface IDebeUse<T> {
  all(queryArgs?: string[] | IQueryInput): Promise<T[]>;
  all(
    queryArgs?: string[] | IQueryInput,
    cb?: IObserverCallback<T[]>
  ): () => void;
  all(
    queryArgs?: string[] | IQueryInput,
    cb?: IObserverCallback<T[]>
  ): Promise<T[]> | (() => void);
  count(queryArgs?: IQueryInput): Promise<number>;
  count(queryArgs?: IQueryInput, cb?: IObserverCallback<number>): () => void;
  count(
    queryArgs?: IQueryInput,
    cb?: IObserverCallback<number>
  ): Promise<number> | (() => void);
  get(queryArgs?: IQueryInput | string): Promise<T>;
  get(queryArgs?: IQueryInput | string, cb?: IObserverCallback<T>): () => void;
  get(
    queryArgs?: IQueryInput | string,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void);
  remove(query: string | string[]): Promise<void>;
  insert<T = any>(
    value: (T & IInsertItem)[] | T & IInsertItem,
    options?: IInsertInput
  ): Promise<T & IGetItem>;
}
