import {
  IGetItem,
  IQuery,
  ICollection,
  IInsert,
  ICollections,
  Debe,
  ICollectionInput
} from 'debe';
import {
  DebeAdapter,
  createMemoryFilter,
  sortArray,
  pluck,
  DebeBackend
} from 'debe-adapter';

export class MemoryDebe extends Debe {
  constructor(collections: ICollectionInput[], options?: any) {
    super(new DebeBackend(new MemoryAdapter(), collections, options));
  }
}

interface IStore {
  [s: string]: Map<string, IGetItem>;
}

export class MemoryAdapter extends DebeAdapter {
  private store: IStore = {};
  filter = createMemoryFilter().filter;
  initialize(collections: ICollections) {
    for (var key in collections) {
      const collection = collections[key];
      this.store[collection.name] = new Map();
    }
  }
  get(collection: ICollection, id: string) {
    const item = this.store[collection.name].get(id);
    return item ? { ...item } : item;
  }
  close() {
    this.store = {};
  }
  all(collection: ICollection, query: IQuery) {
    let items = Array.from(this.store[collection.name].values());
    if (query.where) {
      items = items.filter(this.filter(query.where));
    }
    if (query.orderBy) {
      items = sortArray(items, query.orderBy);
    }
    if (query.offset) {
      items = items.slice(query.offset);
    }
    if (query.limit) {
      items = items.slice(0, query.limit);
    }
    if (query.select) {
      items = items.map(x => pluck(x, query.select));
    }
    return [...items];
  }
  count(collection: ICollection, query: IQuery) {
    delete query.orderBy;
    const { length } = this.all(collection, query);
    return length;
  }
  insert(collection: ICollection, items: any[], options: IInsert) {
    for (var item of items) {
      const update = options.existing.indexOf(item.id) !== -1 && options.update;
      this.handle(collection.name, item, update);
    }
    return items;
  }
  remove(collection: ICollection, ids: string[]) {
    for (var id of ids) {
      this.store[collection.name].delete(id);
    }
    return ids;
  }
  // Helpers
  private handle(type: string, item: IGetItem, update: boolean) {
    if (update && this.store[type].has(item.id)) {
      this.store[type].set(item.id, {
        ...this.store[type].get(item.id),
        ...item
      });
    } else {
      this.store[type].set(item.id, item);
    }
    return item;
  }
}
