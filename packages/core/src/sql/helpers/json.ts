import { SQLCore } from './core';
import { IModel } from '../../types';

export abstract class SQLJsonCore extends SQLCore {
  bodyField = 'body';
  createSelect(model: IModel): string {
    return `${super.createSelect(model, [
      ...this.columns,
      ...model.columns
    ])}, ${model.index.map(
      field => `json_extract(${this.bodyField}, '$.${field}') as "${field}"`
    )}`;
  }
  createTableIndex(model: string, field: string) {
    // If is default field, return default operation
    if (this.columns.indexOf(field) !== -1) {
      return super.createTableIndex(model, field);
    }
    //
    return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" (json_extract(${
      this.bodyField
    }, '$.${field}'))`;
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
