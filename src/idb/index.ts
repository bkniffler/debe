import {
  IQuery,
  DebeAdapter,
  ICollection,
  IInsert,
  ICollections,
  chunkSequencial,
  IGetItem
} from 'debe';
import { createMemoryFilter, pluck } from 'debe-memory';
import { IDBPDatabase } from 'idb';
const idb = require('idb/with-async-ittr-cjs');

export class IDBAdapter extends DebeAdapter {
  filter = createMemoryFilter().filter;
  db: IDBPDatabase<any>;
  name: string;
  constructor(name = 'debe') {
    super();
    this.name = name;
  }
  async close() {
    this.db.close();
  }
  async initialize(collections: ICollections) {
    this.db = await idb.openDB(this.name, 1, {
      upgrade(db: IDBPDatabase) {
        for (var key in collections) {
          const collection = collections[key];
          const store = db.createObjectStore(collection.name, {
            keyPath: collection.specialFields.id,
            autoIncrement: false
          });
          for (var key in collection.index) {
            store.createIndex(key, key);
          }
        }
      }
    });
  }
  async insert(collection: ICollection, items: any[], options: IInsert) {
    const map = {};
    if (options.existing.length && options.update) {
      (await this.all(collection, {
        where: [`id IN (?)`, options.existing]
      })).forEach((item: any) => {
        map[item.id] = item;
      });
      items = items.map(item => {
        if (map[item.id]) {
          return Object.assign({}, map[item.id], item);
        }
        return item;
      });
    }

    await chunkSequencial<any>(items, 1000, async items => {
      const tx = this.db.transaction(collection.name, 'readwrite');
      for (var item of items) {
        tx.store.put(item);
      }
      await tx.done;
      return items;
    });
    return items;
  }
  async remove(collection: ICollection, ids: string[]) {
    const tx = this.db.transaction(collection.name, 'readwrite');
    for (var id of ids) {
      tx.store.delete(id);
    }
    await tx.done;
    return ids;
  }
  async get(collection: ICollection, id: string) {
    const item = await this.db.get(collection.name, id);
    return item;
  }
  async all(collection: ICollection, query: IQuery) {
    const tx = this.db.transaction(collection.name, 'readwrite');
    let values: IGetItem[] = [];
    let offset = query.offset || 0;
    const filter = query.where ? this.filter(query.where) : undefined;
    const [index]: [string?, string?] = query.orderBy
      ? (query.orderBy[0].split(' ') as any)
      : [];
    const iterable = index ? tx.store.index(index) : tx.store;
    tx.store.openCursor();
    for await (const cursor of iterable) {
      if (offset <= 0) {
        if (!filter || filter(cursor.value)) {
          values.push(
            query.select ? pluck(cursor.value, query.select) : cursor.value
          );
        }
        if (query.limit && values.length >= query.limit) {
          break;
        }
      } else {
        offset = offset - 1;
      }
    }
    await tx.done;
    return values;
  }
  async count(collection: ICollection, query: IQuery) {
    return this.all(collection, query).then(x => x.length);
  }
}
