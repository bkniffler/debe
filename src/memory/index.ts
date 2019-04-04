import { IGetItem, IQuery, DebeAdapter, ICollections } from 'debe';
import { createFilter, sort } from './filter';
export * from './filter';

interface IStore {
  [s: string]: Map<string, IGetItem>;
}

export class MemoryAdapter extends DebeAdapter {
  private store: IStore = {};
  initialize(collections: ICollections) {
    for (var key in collections) {
      const collection = collections[key];
      this.store[collection.name] = new Map();
    }
  }
  get(collection: string, id: string) {
    const item = this.store[collection].get(id);
    return Promise.resolve(item ? { ...item } : item);
  }
  all(collection: string, query: IQuery) {
    return Promise.resolve([
      ...this.filter(Array.from(this.store[collection].values()), query)
    ]);
  }
  count(collection: string, query: IQuery) {
    return Promise.resolve(
      this.filter(Array.from(this.store[collection].values()), query).length
    );
  }
  insert(collection: string, items: any[]) {
    items.forEach((x: any) => this.handle(collection, x));
    return Promise.resolve(items);
  }
  remove(collection: string, ids: string[]) {
    ids.forEach(id => this.store[collection].delete(id));
    return Promise.resolve(ids);
  }
  // Helpers
  private handle(type: string, item: IGetItem) {
    this.store[type].set(item.id, item);
    return item;
  }
  private filter(array: any[], query: IQuery) {
    const filter = query && query.where ? createFilter(query.where) : undefined;
    const orderBy = query && query.orderBy;
    if (filter) {
      array = array.filter(filter);
    }
    if (orderBy) {
      array = sort(array, orderBy);
    }
    return array;
  }
}
