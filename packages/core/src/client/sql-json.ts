import { IModel, IDebeSQLEngineOptions } from './base';
import { DebeSQLEngine } from './sql';

export abstract class DebeSQLJSONEngine extends DebeSQLEngine {
  constructor(options?: IDebeSQLEngineOptions) {
    super(options);
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

  transformForStorage(model: IModel, item: any): [any, any] {
    const [obj, rest] = super.transformForStorage(model, item);
    obj[this.bodyField] = JSON.stringify(rest);
    return [obj, undefined];
  }

  transformFromStorage(model: IModel, item: any): [any, any] {
    const [obj] = super.transformFromStorage(model, item);
    const body =
      obj[this.bodyField] && typeof obj[this.bodyField] === 'string'
        ? JSON.parse(obj[this.bodyField])
        : obj[this.bodyField];
    delete obj[this.bodyField];
    return [{ ...body, ...obj }, undefined];
  }
}
