import { ICollections, queryToArray, IQuery, DebeAdapter } from 'debe';
import Dexie, { Table, IndexableType } from 'dexie';

export class DexieAdapter extends DebeAdapter {
  constructor({ version = 1, name = 'debe' } = {}) {
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
  all(collection: string, query: IQuery) {
    return this.baseQuery(collection, query).toArray();
  }
  count(collection: string, query: IQuery) {
    return this.baseQuery(collection, query).count();
  }
  private baseQuery(collection: string, { where, offset, limit }: IQuery) {
    let cursor = this.db.table(collection);
    if (where) {
      cursor = this.filter(cursor, where);
    }
    if (offset) {
      cursor = cursor.offset(offset) as any;
    }
    if (limit) {
      cursor = cursor.limit(limit) as any;
    }
    return cursor;
  }
  private filter(
    collection: Table<any, IndexableType>,
    query?: [string, ...any[]]
  ): Table<any, IndexableType> {
    const filterMap = {
      '>=': 'aboveOrEqual',
      '>': 'above',
      '<=': 'belowOrEqual',
      '<': 'below',
      IN: 'anyOf',
      'NOT IN': 'noneOf',
      '=': 'equals',
      '==': 'equals',
      '!=': 'notEqual'
    };

    if (!query || !query.length) {
      return collection;
    }
    const array = queryToArray(query);
    for (var i = 0; i < array.length; i++) {
      let [left, operand, right] = array[i];
      if (filterMap[operand]) {
        collection = collection.where(left)[filterMap[operand]](right) as any;
      }
    }
    return collection;
  }
}
