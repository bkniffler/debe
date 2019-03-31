import { SQLCore } from './core';
import { IModel, ensureArray } from 'debe';

export abstract class SQLJsonCore extends SQLCore {
  bodyField = 'body';
  getColumnType(field: string): string {
    if (field === this.bodyField) {
      return 'JSON';
    }
    return super.getColumnType(field);
  }
  abstract selectJSONField(field: string): string;
  createWhere(model: IModel, where: string[] | string): any[] {
    where = ensureArray(where);
    let [clause, ...args] = where;
    if (clause) {
      for (var i = 0; i < model.index.length; i++) {
        let field = model.index[i];
        clause = clause.replace(
          new RegExp(`${field} `, 'g'),
          this.selectJSONField(field)
        );
      }
      return [`WHERE ${clause}`, ...args];
    }
    return [``, ...args];
  }
}

/*createInsertStatement(model: IModel, columns?: string[]) {
    columns = columns || [...this.defaultColumns(), ...model.columns];
    const conflict = columns
      .filter(x => x !== this.idField)
      .map(key =>
        key === this.bodyField
          ? `${this.bodyField}=json_patch(${this.bodyField}, excluded.${
              this.bodyField
            })`
          : `${key}=excluded.${key}`
      )
      .join(', ');
    return `${super.createInsertStatement(model, columns)} ON CONFLICT(${
      this.idField
    }) DO UPDATE SET ${conflict}`;
  }*/
