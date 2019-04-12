import {
  IGetItem,
  IQuery,
  FilterReducer,
  ensureArray,
  ICollection,
  IInsert,
  DebeAdapter
} from 'debe';

interface IStore {
  [s: string]: Map<string, IGetItem>;
}

export function pluck(sourceObject: IGetItem, keys: string[] = []): IGetItem {
  if (!sourceObject) {
    return sourceObject;
  }
  const newObject = {
    id: sourceObject.id,
    rev: sourceObject.rev
  };
  for (var key of keys) {
    newObject[key] = sourceObject[key];
  }
  return newObject;
}

export class MemoryAdapter extends DebeAdapter {
  private store: IStore = {};
  filter = createMemoryFilter().filter;
  initialize() {
    for (var key in this.collections) {
      const collection = this.collections[key];
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
    if (!this.store[collection.name]) {
      console.log(Object.keys(this.store), collection.name);
    }
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

export const createMemoryFilter = () =>
  new FilterReducer<any, boolean>({
    '!=': (col, field, value) => (col[field] || null) != (value || null),
    '<': (col, field, value) => col[field] < value,
    '<=': (col, field, value) => col[field] <= value,
    '=': (col, field, value) => (col[field] || null) == (value || null),
    '>': (col, field, value) => col[field] > value,
    '>=': (col, field, value) => col[field] >= value,
    IN: (col, field, value) => ensureArray(value).indexOf(col[field]) >= 0,
    'NOT IN': (col, field, value) => ensureArray(value).indexOf(col[field]) < 0,
    'IS NULL': (col, field) => (col[field] || null) === null
  });

export function sortArray(arr: any[], orderer: string | string[]): any[] {
  if (Array.isArray(orderer)) {
    return orderer.reduce((arr, str) => sortArray(arr, str), arr);
  }
  const [fieldName = '', direction = ''] = (orderer || '').split(' ');
  if (fieldName) {
    const isDesc = direction.toUpperCase() === 'DESC';
    const compare = (a: any, b: any) => {
      if (a[fieldName] < b[fieldName]) return isDesc ? 1 : -1;
      if (a[fieldName] > b[fieldName]) return isDesc ? -1 : 1;
      return 0;
    };
    return arr.sort(compare);
  }
  return arr;
}
