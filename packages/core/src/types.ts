export const types = {
  LISTEN: 'listen',
  INSERT: 'insert',
  GET: 'get',
  ALL: 'all',
  COUNT: 'count',
  DESTROY: 'destroy',
  REMOVE: 'remove',
  INITIALIZE: 'initialize'
};
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

export interface ISchema {
  [key: string]: IModel;
}
export interface IInsertOptions {
  explain?: boolean;
  keepRev?: boolean;
}
export interface IDefaultColumns {
  id: string;
  rev: string;
  body: string;
  removed: string;
}
export interface IColumn {
  name: string;
  type: 'text' | 'number';
}
export interface IDebeSQLEngineOptions {
  verbose?: boolean;
  defaultColumnNames?: IDefaultColumns;
  additionalColumns?: IColumn[];
}
export interface IModelCreate {
  name: string;
  index?: string[];
  columns?: string[];
}

export interface IModel {
  name: string;
  index: string[];
  columns: string[];
}
