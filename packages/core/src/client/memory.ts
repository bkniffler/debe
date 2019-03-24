import { DebeEngine, IModel, IInsertOptions } from './base';
import { toISO } from '../utils';
import { IQuery, IGetItem, IInsertItem } from '@debe/types';

interface IStore {
  [s: string]: IGetItem[];
}
export class DebeMemoryEngine extends DebeEngine {
  store: IStore = {};

  constructor() {
    super();
  }

  addModel(model: IModel) {
    super.addModel(model);
    this.store[model.name] = [];
    return Promise.resolve();
  }

  query<T>(
    model: IModel,
    queryArgs: IQuery,
    queryType: 'all' | 'get' | 'count'
  ): Promise<T> {
    if (queryType === 'count') {
      return Promise.resolve(this.store[model.name].length) as any;
    } else if (queryType === 'get') {
      const [essential, body] = this.transformFromStorage(
        model,
        this.store[model.name].find(x => x.id === queryArgs.id)
      );
      return Promise.resolve({ ...body, ...essential });
    } else {
      return Promise.resolve(
        this.store[model.name]
          .filter(x => !x[this.removedField])
          .map(i => {
            const [essential, body] = this.transformFromStorage(model, i);
            return { ...body, ...essential };
          })
      ) as any;
    }
  }
  remove(model: IModel, id: string[]) {
    return this.insert(
      model,
      id.map(id => ({
        id,
        [this.removedField]: toISO(new Date())
      }))
    ).then(x => {});
  }
  async insert<T>(
    model: IModel,
    value: (T & IInsertItem)[],
    options: IInsertOptions = {}
  ): Promise<(T & IGetItem)[]> {
    const items = value.map(item => {
      const [essential, body] = this.transformForStorage(model, item);
      const index = essential.id
        ? this.store[model.name].findIndex(x => x.id === essential.id)
        : -1;
      const newItem = { ...body, ...essential };
      if (index === -1) {
        this.store[model.name].push(newItem);
      } else {
        this.store[model.name][index] = newItem;
      }
      return newItem;
    });
    this.notifyChange(model, value, items);
    return items as any;
  }
}
