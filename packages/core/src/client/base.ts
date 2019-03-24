import { IObserverCallback, IQuery, IGetItem, IInsertItem } from '@debe/types';
import { isEqual, ensureArray } from '../utils';
import { Emitter, generate } from '../common';

export interface ISchema {
  [key: string]: IModel;
}
export interface IInsertOptions {
  explain?: boolean;
  keepRev?: boolean;
}
export interface IDefaultColumns {
  id: string;
  rev: string;
  body: string;
  removed: string;
}
export interface IColumn {
  name: string;
  type: 'text' | 'number';
}
export interface IDebeSQLEngineOptions {
  verbose?: boolean;
  defaultColumnNames?: IDefaultColumns;
  additionalColumns?: IColumn[];
}
export interface IModelCreate {
  name: string;
  index?: string[];
  columns?: string[];
}

export interface IModel {
  name: string;
  index: string[];
  columns: string[];
}

export abstract class DebeEngine extends Emitter {
  protected schema: ISchema = {};
  protected options: IDebeSQLEngineOptions;
  protected defaultColumns() {
    return [this.idField, this.revField, this.removedField];
  }

  constructor(options: IDebeSQLEngineOptions = {}) {
    super();
    this.options = options;
  }

  public initialize(models: IModelCreate[] = []) {
    const schema = models.reduce((obj: any, model: any) => {
      if (!model.columns) {
        model.columns = [];
      }
      if (!model.index) {
        model.index = [];
      }
      return { ...obj, [model.name]: model };
    }, {});
    return Promise.all(
      Object.keys(schema).map(key => this.addModel(schema[key]))
    );
  }
  public destroy() {}
  public run<T>(
    modelName: string,
    type: 'insert',
    args?: IInsertItem | IInsertItem[]
  ): Promise<T>;
  public run<T>(
    modelName: string,
    type: 'remove',
    args?: string | string[],
    cb?: IObserverCallback<T>
  ): Promise<T>;
  public run<T>(
    modelName: string,
    type: 'all' | 'get' | 'count',
    args?: IQuery
  ): Promise<T>;
  public run<T>(
    modelName: string,
    type: 'all' | 'get' | 'count',
    args: IQuery,
    cb: IObserverCallback<T>
  ): () => void;
  public run<T>(
    modelName: string,
    type: 'all' | 'get' | 'count',
    args?: IQuery,
    cb?: IObserverCallback<T>
  ): () => void;
  public run<T>(
    modelName: string,
    type: 'insert' | 'remove' | 'all' | 'get' | 'count',
    args?:
      | IQuery
      | IInsertItem
      | IInsertItem[]
      | string
      | string[]
      | IObserverCallback<T>,
    cb?: IObserverCallback<T>
  ): Promise<T> | (() => void) {
    const model = this.getModel(modelName);
    if (type === 'insert') {
      const wasArray = Array.isArray(args);
      return this.insert(model, ensureArray(args)).then(items =>
        wasArray ? items : items[0]
      );
    } else if (type === 'remove') {
      return this.remove(model, ensureArray(args)) as any;
    } else {
      if (typeof args === 'function') {
        cb = args;
        args = {};
      } else {
        args = args || {};
      }
      if (cb) {
        return this.listenToQuery(model, type, args as any, cb);
      } else {
        return this.query(model, args as any, type);
      }
    }
  }

  protected listenToQuery<T>(
    model: IModel,
    type: 'all' | 'get' | 'count',
    args: IQuery,
    cb: IObserverCallback<T>
  ): Promise<T> | (() => void) {
    let lastResult: any = undefined;
    const listener = async () => {
      let isInitial = lastResult === undefined;
      let newValue = await this.query<T>(model, args as any, type);
      // Check is results changed
      if (isEqual(lastResult, newValue as any, this.revField)) {
        return;
      }
      lastResult = newValue || null;
      cb((newValue || undefined) as any, isInitial ? 'INITIAL' : 'CHANGE');
    };
    listener();
    return this.on(model.name, listener);
  }

  protected get idField() {
    return this.getDefaultFieldName('id');
  }
  protected get revField() {
    return this.getDefaultFieldName('rev');
  }
  protected get removedField() {
    return this.getDefaultFieldName('removed');
  }
  protected getDefaultFieldName(name: string, defaultName?: string) {
    return this.options.defaultColumnNames &&
      this.options.defaultColumnNames[name]
      ? this.options.defaultColumnNames[name]
      : defaultName || name;
  }
  protected getModel(name: string | IModel) {
    if (typeof name !== 'string') {
      return name;
    }
    if (!this.schema[name]) {
      throw new Error(`Could not find model ${name}`);
    }
    return this.schema[name];
  }
  protected addModel(model: IModel): Promise<any> {
    this.schema[model.name] = model;
    return Promise.resolve();
  }

  // Abstract
  protected abstract query<T>(
    model: IModel,
    queryArgs: IQuery,
    queryType: 'all' | 'get' | 'count'
  ): Promise<T>;
  protected abstract remove(model: IModel, id: string[]): Promise<void>;
  protected abstract insert<T = any>(
    model: IModel,
    value: (T & IInsertItem)[],
    options?: IInsertOptions
  ): Promise<(T & IGetItem)[]>;

  protected notifyChange(model: IModel, changes: any[], result: any[]) {
    result.forEach((newValue, i: number) => {
      const change = {
        newValue,
        change: changes[i],
        oldValue: undefined,
        properties: Object.keys(changes[i]),
        type: changes[i][this.idField] ? 'UPDATE' : 'CREATE',
        model: model.name
      };
      this.emit(model.name, change);
    });
  }
  protected filterItem(model: IModel, item: any): [any, any] {
    const rest = {};
    return [
      Object.keys(item).reduce((state: any, key: string) => {
        if (
          this.defaultColumns().indexOf(key) !== -1 ||
          (model.columns || []).indexOf(key) !== -1
        ) {
          state[key] = item[key] || state[key];
        } else {
          rest[key] = item[key] || state[key];
        }
        return state;
      }, {}),
      rest
    ];
  }
  protected transformForStorage(
    model: IModel,
    item: any,
    keepRev = false
  ): [any, any] {
    if (!item) {
      return [undefined, {}];
    }
    const [obj, rest] = this.filterItem(model, item);
    if (!keepRev || !obj[this.revField]) {
      obj[this.revField] = new Date().getTime() / 1000 + '';
    }
    if (!obj[this.idField]) {
      obj[this.idField] = generate();
    }
    return [obj, rest];
  }
  protected transformFromStorage(model: IModel, item: any): [any, any] {
    if (!item) {
      return [undefined, {}];
    }
    const [obj, rest] = this.filterItem(model, item);
    return [obj, rest];
  }
}
