import { IQuery, DebeAdapter, ICollection, IInsert, FilterReducer } from 'debe';
import { nanoSQL } from '@nano-sql/core/lib/index-node';
import {
  InanoSQLTableConfig,
  InanoSQLQueryBuilder
} from '@nano-sql/core/lib/interfaces';

const filter = new FilterReducer<InanoSQLQueryBuilder>({
  '!=': (col, field, value) => col.where([field, '!=', value]),
  '<': (col, field, value) => col.where([field, '<', value]),
  '<=': (col, field, value) => col.where([field, '<=', value]),
  '=': (col, field, value) => col.where([field, '=', value]),
  '>': (col, field, value) => col.where([field, '>', value]),
  '>=': (col, field, value) => col.where([field, '>=', value]),
  IN: (col, field, value) => col.where([field, 'IN', value]),
  'NOT IN': (col, field, value) => col.where([field, 'NOT IN', value]),
  'IS NULL': (col, field) => col.where([field, '=', 'NULL'])
});

export class NanoSQLAdapter extends DebeAdapter {
  chunks = 100000;
  adapter: 'TEMP' | 'LS' | 'WSQL' | 'IDB' | 'RKS' | 'LVL';
  path: string;
  name: string;
  bodyField = 'body';
  constructor(
    path: string,
    name = 'debe',
    adapter?: 'TEMP' | 'LS' | 'WSQL' | 'IDB' | 'RKS' | 'LVL'
  ) {
    super();
    if (adapter) {
      this.adapter = adapter;
    }
    if (typeof window !== 'undefined') {
      this.adapter = 'IDB';
    } else {
      this.adapter = 'RKS';
    }
    this.path = path;
    this.name = name;
    this.db = new nanoSQL();
  }
  db: nanoSQL;
  async close() {
    await this.db.disconnect();
  }
  async initialize() {
    const tables: InanoSQLTableConfig[] = [];
    for (var key in this.collections) {
      const collection = this.collections[key];
      collection.fields[this.bodyField] = 'json';
      collection.specialFields.body = this.bodyField;
      tables.push({
        name: collection.name,
        model: Object.keys(collection.fields).reduce((state, key) => {
          const base: any = {};
          if (collection.specialFields.id === key) {
            base.pk = true;
          }
          if (collection.fields[key] === 'number') {
            state[`${key}:int`] = base;
          } else if (collection.fields[key] === 'boolean') {
            state[`${key}:boolean`] = base;
          } else if (collection.fields[key] === 'json') {
            state[`${key}:obj`] = base;
          } else {
            state[`${key}:string`] = base;
          }
          return state;
        }, {}),
        indexes: Object.keys(collection.index).reduce((state, key) => {
          if (key === collection.specialFields.id) {
            return state;
          }
          const fieldName = !collection.fields[key]
            ? `${this.bodyField}.${key}`
            : key;
          if (collection.index[key] === 'number') {
            state[`${fieldName}:int`] = {};
          } else if (collection.index[key] === 'boolean') {
            state[`${fieldName}:boolean`] = {};
          } else {
            state[`${fieldName}:string`] = {};
          }
          return state;
        }, {})
      });
    }
    /*
      case 'TEMP':
      case 'LS':
      case 'WSQL':
      case 'IDB':
      case 'RKS':
      case 'LVL':
    */
    await this.db.connect({
      id: this.name,
      mode: 'RKS',
      path: this.path,
      tables: tables
    });
  }
  async insert(collection: ICollection, items: any[], options: IInsert) {
    if (options.existing.length && options.update) {
      const map = {};
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

    await this.db
      .selectTable(collection.name)
      .query('upsert', items.map(x => this.transformForStorage(collection, x)))
      .exec();

    return items;
  }
  remove(collection: ICollection, ids: string[]) {
    return this.db
      .selectTable(collection.name)
      .query('delete')
      .where(['id', 'IN', ids])
      .exec()
      .then(() => ids);
  }
  get(collection: ICollection, id: string) {
    return this.db
      .selectTable(collection.name)
      .query('select')
      .where(['id', '=', id])
      .exec()
      .then(r => this.transformForFrontend(collection, r[0]));
  }
  cleanField(collection: ICollection, as = false) {
    return (field: string) =>
      collection.fields[field.trim()]
        ? field
        : `${this.bodyField}.${field}${as ? ` AS ${field}` : ''}`;
  }
  cleanQuery(collection: ICollection, query: IQuery) {
    if (query.orderBy) {
      query.orderBy = query.orderBy.map(key => {
        const [name] = key.split(' ');
        return this.cleanField(collection)(name);
      });
    }
    if (query.select) {
      query.select = query.select.map(this.cleanField(collection, true));
    }
    return query;
  }
  async all(collection: ICollection, query: IQuery) {
    query = this.cleanQuery(collection, query);
    let q = this.db.selectTable(collection.name).query('select', query.select);
    if (query.limit) {
      q = q.limit(query.limit);
    }
    if (query.offset) {
      q = q.offset(query.offset);
    }
    if (query.orderBy) {
      q = q.orderBy(query.orderBy);
    }
    if (query.where) {
      q = filter.reduce(q, query.where, this.cleanField(collection));
    }
    return q.exec().then(x => this.transformForFrontend(collection, x));
  }
  count(collection: ICollection, query: IQuery) {
    query = this.cleanQuery(collection, query);
    let q = this.db
      .selectTable(collection.name)
      .query('select', ['COUNT(*) as count']);
    if (query.limit) {
      q = q.limit(query.limit);
    }
    if (query.offset) {
      q = q.offset(query.offset);
    }
    if (query.orderBy) {
      q = q.orderBy(query.orderBy);
    }
    if (query.where) {
      q = filter.reduce(q, query.where, this.cleanField(collection));
    }
    return q.exec().then(x => x[0].count);
  }
  filterItem(collection: ICollection, item: any): [any, any] {
    const rest = {};
    return [
      Object.keys(item).reduce((state: any, key: string) => {
        if (collection.fields[key]) {
          state[key] = item[key];
        } else {
          rest[key] = item[key];
        }
        return state;
      }, {}),
      rest
    ];
  }
  transformForFrontend(collection: ICollection, result: any): any {
    if (Array.isArray(result)) {
      return result.map(x => this.transformForFrontend(collection, x));
    }
    if (!result) {
      return result;
    }
    const [obj, rest] = this.filterItem(collection, result);
    const body = obj[this.bodyField];
    delete obj[this.bodyField];
    return { ...rest, ...body, ...obj };
  }
  transformForStorage(collection: ICollection, result: any): any {
    if (Array.isArray(result)) {
      return result.map(x => this.transformForStorage(collection, x));
    }
    if (!result) {
      return result;
    }
    const [obj, rest] = this.filterItem(collection, result);
    obj[this.bodyField] = rest;
    return obj;
  }
  /*private baseQuery(collection: string, { where, offset, limit }: IQuery) {
    let cursor = this.db.table(collection);
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
