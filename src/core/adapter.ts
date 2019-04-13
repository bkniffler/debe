import {
  ICollection,
  IItem,
  IQuery,
  IInsert,
  IAdapterOptionsInput
} from './types';
import { IObject } from './utils';

export abstract class DebeAdapter<TBase = IItem> {
  chunks = 1000000;
  chunkMode = 'parallel';
  // Abstract
  abstract initialize(
    collections: IObject<ICollection>,
    options: IAdapterOptionsInput
  ): Promise<void> | void;
  abstract close(): Promise<void> | void;
  abstract get(collection: ICollection, id: string): Promise<any> | any;
  abstract remove(
    collection: ICollection,
    ids: string[]
  ): Promise<string[]> | string[];
  abstract all(collection: ICollection, query: IQuery): Promise<any[]> | any[];
  abstract count(
    collection: ICollection,
    query: IQuery
  ): Promise<number> | number;
  abstract insert(
    collection: ICollection,
    items: any[],
    options: IInsert
  ): Promise<any[]> | any[];
}
