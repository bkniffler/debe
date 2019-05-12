import { SQLCore } from './core';
import {
  ICollection,
  ensureArray,
  IInsertItem,
  IGetItem,
  IQuery,
  IInsert,
  ICollections
} from 'debe';

export abstract class SQLJsonCore extends SQLCore {
  chunks = 10000;
  bodyField = 'body';
  async initialize(collections: ICollections, options: any) {
    for (var key in collections) {
      collections[key].fields[this.bodyField] = 'json';
      collections[key].specialFields.body = this.bodyField;
    }
    await super.initialize(collections, options);
  }
  getCollectionBodyField(collection: ICollection) {
    return collection.specialFields.body;
  }
  abstract selectJSONField(collection: ICollection, field: string): string;
  createWhere(collection: ICollection, where: string[] | string): any[] {
    where = ensureArray(where);
    let [clause, ...args] = where;
    if (clause) {
      for (var key in collection.index) {
        if (!collection.fields[key]) {
          clause = clause
            .split(key)
            .join(this.selectJSONField(collection, key));
        }
      }
      return [`WHERE ${clause}`, ...args];
    }
    return [``, ...args];
  }
  createOrderBy(collection: ICollection, orderBy: string[] | string): string {
    let clause = super.createOrderBy(collection, orderBy);
    if (clause) {
      for (var key in collection.index) {
        if (!collection.fields[key]) {
          clause = clause
            .split(key)
            .join(this.selectJSONField(collection, key));
        }
      }
    }
    return clause;
  }
  createSelect(collection: ICollection, fields: string[] = []) {
    if (fields) {
      fields = fields.map(key => {
        if (collection.fields[key]) {
          return key;
        }
        return `${this.selectJSONField(collection, key)} as "${key}"`;
      });
    }
    return super.createSelect(collection, fields);
  }
  async insert<T>(
    collection: ICollection,
    value: (T & IInsertItem)[],
    options: IInsert
  ): Promise<(T & IGetItem)[]> {
    const statement = this.createInsertStatement(collection);

    let items: any[] | undefined = undefined;
    if (options.update && options.existing.length) {
      const existing = await this.query<T & IGetItem[]>(
        collection,
        {
          where: [`id IN (?)`, options.existing]
        },
        'all',
        true
      );
      if (existing.length) {
        const map = existing.reduce(
          (state, { id = '' }, i) => ({ ...state, [id || '']: i }),
          {}
        );
        items = value.map(item => {
          if (item.id && map[item.id] !== undefined) {
            const exItem = existing[map[item.id]];
            const body = exItem[collection.specialFields.body];
            item = Object.assign(
              typeof body === 'string' ? JSON.parse(body) : body,
              item
            );
          }
          item = this.transformForStorage(collection, item);
          return Object.keys(collection.fields).map(key => item[key]);
        });
      }
    }
    if (!items) {
      items = value.map(item => {
        item = this.transformForStorage(collection, item);
        return Object.keys(collection.fields).map(key => item[key]);
      });
    }

    await this.exec(statement, items, 'insert');
    return value as any;
  }
  async query<T>(
    collection: ICollection,
    queryArgs: IQuery | string | string[],
    queryType: 'all' | 'get' | 'count',
    skipTransform = false
  ): Promise<T> {
    const result = await super.query<T>(collection, queryArgs, queryType);
    if (!skipTransform) {
      if (queryType === 'get' || queryType === 'all') {
        return this.transformForFrontend(collection, result);
      }
    }
    return result;
  }
  // Helpers
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
    const body =
      obj[this.bodyField] && typeof obj[this.bodyField] === 'string'
        ? JSON.parse(obj[this.bodyField])
        : obj[this.bodyField];
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
    obj[this.bodyField] = JSON.stringify(rest);
    return obj;
  }
}
