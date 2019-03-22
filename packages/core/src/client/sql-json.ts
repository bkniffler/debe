import { IModelCreate, IModel, ISQLightSQLEngineOptions } from './base';
import { SQLightSQLEngine } from './sql';

export abstract class SQLightSQLJSONEngine extends SQLightSQLEngine {
  constructor(dbSchema: IModelCreate[], options?: ISQLightSQLEngineOptions) {
    super(dbSchema, options);
  }

  public get bodyField() {
    return this.getDefaultFieldName('body');
  }

  defaultColumns() {
    return super.defaultColumns().concat([this.bodyField]);
  }

  getColumnType(field: string) {
    if (field === this.bodyField) {
      return 'JSON';
    }
    return super.getColumnType(field);
  }

  transform(columns: string[], item: any) {
    const { [this.bodyField]: body = {}, ...rest } = super.transform(
      columns,
      item
    );
    return { ...body, ...rest };
  }

  transformForStorage(model: IModel, item: any, keepRev = false): [any, any] {
    const [obj, rest] = super.transformForStorage(model, item, keepRev);
    obj[this.bodyField] = JSON.stringify(rest);
    return [obj, undefined];
  }
}
