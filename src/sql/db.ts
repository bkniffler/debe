import { DebeAdapter, ICollections, IQuery, Debe } from 'debe';
import { jsonBodySkill } from './plugins';
import { SQLCore } from './core';

export class SQLAdapter extends DebeAdapter {
  dbPath: string;
  db: SQLCore;
  collections: ICollections;
  constructor(db: SQLCore) {
    super();
    this.db = db;
  }
  connect(debe: Debe) {
    super.connect(debe);
    jsonBodySkill()(debe);
  }
  async initialize(collections: ICollections) {
    this.collections = collections;
    await Promise.all(
      Object.keys(collections).map(key => this.db.createTable(collections[key]))
    );
  }
  insert(collection: string, items: any[]) {
    return this.db.insert(this.collections[collection], items);
  }
  count(collection: string, query: IQuery) {
    return this.db.query<number>(this.collections[collection], query, 'count');
  }
  get(collection: string, id: string) {
    return this.db.query(this.collections[collection], id, 'get');
  }
  all(collection: string, query: IQuery) {
    return this.db.query<any>(this.collections[collection], query, 'all');
  }
  remove(collection: string, ids: string[]) {
    return this.db.remove(this.collections[collection], ids).then(x => ids);
  }
}
