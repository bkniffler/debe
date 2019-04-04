import { ICollections, IQuery, DebeAdapter } from 'debe';
import Dexie from 'dexie';
import { sortArray, createMemoryFilter } from 'debe-memory';

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
  initialize(collections: ICollections) {
    const schema: any = {};
    for (var key in collections) {
      const collection = collections[key];
      schema[collection.name] = [
        collection.specialFields.id,
        ...Object.keys(collection.index)
      ].join(', ');
    }
    this.db.version(this.version).stores(schema);
  }
  insert(collection: string, items: any[]) {
    return this.db
      .table(collection)
      .bulkPut(items)
      .then(() => items);
  }
  remove(collection: string, ids: string[]) {
    return this.db
      .table(collection)
      .bulkDelete(ids)
      .then(() => ids);
  }
  get(collection: string, id: string) {
    return this.db.table(collection).get(id);
  }
  async all(collection: string, query: IQuery) {
    let result = await this.baseQuery(collection, query).toArray();
    if (query.orderBy) {
      result = sortArray(result, query.orderBy);
    }
    return result;
  }
  count(collection: string, query: IQuery) {
    return this.baseQuery(collection, query).count();
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
