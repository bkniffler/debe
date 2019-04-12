import { IQuery, DebeAdapter, ICollection, IInsert } from 'debe';
import Dexie from 'dexie';
import { sortArray, createMemoryFilter, pluck } from 'debe-memory';

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

export class DexieAdapter extends DebeAdapter {
  filter = createMemoryFilter().filter;
  constructor(name = 'debe', version = 1) {
    super();
    this.db = new Dexie(name);
    this.version = version;
  }
  db: Dexie;
  version: number;
  close() {
    this.db.close();
    return Promise.resolve();
  }
  initialize() {
    const schema: any = {};
    for (var key in this.collections) {
      const collection = this.collections[key];
      schema[collection.name] = [
        collection.specialFields.id,
        ...Object.keys(collection.index)
      ].join(', ');
    }
    this.db.version(this.version).stores(schema);
  }
  async insert(collection: ICollection, items: any[], options: IInsert) {
    const map = {};
    if (options.existing.length && options.update) {
      (await this.all(collection, {
        where: [`id IN (?)`, options.existing]
      })).forEach(item => {
        map[item.id] = item;
      });
      items = items.map(item => {
        if (map[item.id]) {
          return Object.assign({}, map[item.id], item);
        }
        return item;
      });
    }
    await this.db.table(collection.name).bulkPut(items);
    return items;
  }
  remove(collection: ICollection, ids: string[]) {
    return this.db
      .table(collection.name)
      .bulkDelete(ids)
      .then(() => ids);
  }
  get(collection: ICollection, id: string) {
    return this.db.table(collection.name).get(id);
  }
  async all(collection: ICollection, query: IQuery) {
    let result = await this.baseQuery(collection.name, query).toArray();
    if (query.select) {
      result = result.map(x => pluck(x, query.select));
    }
    if (query.orderBy) {
      result = sortArray(result, query.orderBy);
    }
    return result;
  }
  count(collection: ICollection, query: IQuery) {
    return this.baseQuery(collection.name, query).count();
  }
  private baseQuery(collection: string, { where, offset, limit }: IQuery) {
    let cursor = this.db.table(collection);
    /*if (where) {
      //const filter = createFilter(where);
      if (filter) {
        cursor = cursor.filter(filter) as any;
      }
      // cursor = filter.reduce(cursor, where);
    }*/
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
  }
}
