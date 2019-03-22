import { IModelCreate, IModel, ISQLightSQLEngineOptions } from './base';
import { SQLightSQLJSONEngine } from './sql-json';

export interface ISQLightSQLiteJSONEngineOptions
  extends ISQLightSQLEngineOptions {
  dbPath: string;
}

export abstract class SQLightSQLiteJSONEngine extends SQLightSQLJSONEngine {
  constructor(
    dbSchema: IModelCreate[],
    options?: ISQLightSQLiteJSONEngineOptions
  ) {
    super(dbSchema, options);
  }

  createSelect(columns: string[]) {
    const defaultColumns = columns.slice(0, this.defaultColumns().length);
    const restColumns = columns.slice(this.defaultColumns().length);
    return `${super.createSelect(defaultColumns)}, ${restColumns.map(
      field => `json_extract(${this.bodyField}, '$.${field}') as '${field}'`
    )}`;
  }

  createTableIndex(model: string, field: string) {
    // If is default field, return default operation
    if (this.defaultColumns().indexOf(field) !== -1) {
      return super.createTableIndex(model, field);
    }
    //
    return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" (json_extract(${
      this.bodyField
    }, '$.${field}'))`;
  }

  createInsertStatement(model: IModel, columns?: string[]) {
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
  }
}
