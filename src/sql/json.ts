import { SQLCore } from './core';
import { ICollection, ensureArray, Debe } from 'debe';
import { jsonBodyPlugin } from './plugins';

export abstract class SQLJsonCore extends SQLCore {
  initialize(debe: Debe, options?: any): Promise<void> {
    jsonBodyPlugin(options)(debe);
    return Promise.resolve();
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
          clause = clause.replace(
            new RegExp(`${key} `, 'g'),
            this.selectJSONField(collection, key)
          );
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
          clause = clause.replace(
            new RegExp(`${key} `, 'g'),
            this.selectJSONField(collection, key)
          );
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
}
