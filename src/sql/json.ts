import { SQLCore } from './core';
import { ICollection, ensureArray } from 'debe';

export abstract class SQLJsonCore extends SQLCore {
  getCollectionBodyField(collection: ICollection) {
    return collection.specialFields.body;
  }
  abstract selectJSONField(collection: ICollection, field: string): string;
  createWhere(collection: ICollection, where: string[] | string): any[] {
    where = ensureArray(where);
    let [clause, ...args] = where;
    if (clause) {
      for (var key in collection.index) {
        let field = collection.index[key];
        clause = clause.replace(
          new RegExp(`${field} `, 'g'),
          this.selectJSONField(collection, field)
        );
      }
      return [`WHERE ${clause}`, ...args];
    }
    return [``, ...args];
  }
}
