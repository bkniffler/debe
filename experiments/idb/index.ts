import { IQuery, DebeAdapter, ICollection, IInsert } from 'debe';
import { createMemoryFilter } from 'debe-memory';
import { IDBPDatabase } from 'idb';
const idb = require('idb/with-async-ittr-cjs');

/*const filter = new FilterReducer<Table<any, IndexableType>>({
  '!=': (col, field, value) => col.where(field).notEqual(value) as any,
  '<': (col, field, value) => col.where(field).below(value) as any,
  '<=': (col, field, value) => col.where(field).belowOrEqual(value) as any,
  '=': (col, field, value) => col.where(field).equals(value) as any,
  '>': (col, field, value) => col.where(field).above(value) as any,
  '>=': (col, field, value) => col.where(field).aboveOrEqual(value) as any,
  IN: (col, field, value) => col.where(field).anyOf(value) as any,
  'NOT IN': (col, field, value) => col.where(field).noneOf(value) as any,
  'IS NULL': (col, field) => col.where(field).equals(null). as any
});*/

export class IDBAdapter extends DebeAdapter {
  chunks = 10000;
  filter = createMemoryFilter().filter;
  db: IDBPDatabase<any>;
  name: string;
  constructor(name = 'debe') {
    super();
    this.name = name;
  }
  close() {
    this.db.close();
    return Promise.resolve();
  }
  async initialize() {
    const collections = this.collections;
    this.db = await idb.openDB(this.name, 1, {
      upgrade(db: IDBPDatabase) {
        for (var key in collections) {
          const collection = collections[key];
          const store = db.createObjectStore(collection.name, {
            keyPath: collection.specialFields.id,
            autoIncrement: false
          });
          for (var key in collection.index) {
            store.createIndex(key, collection.index[key] || 'string');
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
    const tx = this.db.transaction(collection.name, 'readwrite');
    for (var item of items) {
      tx.store.add(item);
    }
    await tx.done;
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
    /*let result = await this.baseQuery(collection.name, query).toArray();
    if (query.select) {
      result = result.map(x => pluck(x, query.select));
    }*/
    const tx = this.db.transaction(collection.name, 'readwrite');
    let values = [];
    for await (const cursor of tx.store) {
      values.push(cursor.value);
    }
    await tx.done;
    return values;
  }
  count(collection: ICollection, query: IQuery) {
    return 0; // this.baseQuery(collection.name, query).count();
  }
  /*private baseQuery(
    collection: string,
    { where, offset, limit, orderBy }: IQuery
  ) {
    let cursor = this.db.table(collection);
    if (orderBy && orderBy.length) {
      const [key, dir] = orderBy[0].split(' ');
      cursor = cursor.orderBy(key) as any;
      if (dir === 'DESC') {
        cursor = cursor.reverse() as any;
      }
    }
    /*if (where) {
      //const filter = createFilter(where);
      if (filter) {
        cursor = cursor.filter(filter) as any;
      }
      // cursor = filter.reduce(cursor, where);
    }*
    if (where) {
      cursor = cursor.filter(this.filter(where)) as any;
    }
    if (offset) {
      cursor = cursor.offset(offset) as any;
    }
    if (limit) {
      cursor = cursor.limit(limit) as any;
    }
    return cursor;
  }*/
}
