import {
  Debe,
  IGetItem,
  types,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill
} from 'debe';
import { createFilter, sort } from './filter';
export * from './filter';

interface IStore {
  [s: string]: Map<string, IGetItem>;
}

export class MemoryDebe extends Debe {
  constructor({ changeListener = true, softDelete = false } = {}) {
    super();
    if (changeListener) {
      this.addSkill(changeListenerSkill());
    }
    this.addSkill(coreSkill());
    if (softDelete) {
      this.addSkill(softDeleteSkill());
    }
    this.addSkill(memorySkill());
    // this.tracker = x => console.log(x);
  }
}

export const memorySkill = (): ISkill => {
  const store: IStore = {};
  function handle(type: string, item: IGetItem) {
    store[type].set(item.id, item);
    return item;
  }
  function ensureModel(model: string) {
    if (model && !store[model]) {
      store[model] = new Map();
    }
  }

  return function memory(type, payload, flow) {
    if (type === types.INSERT) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(arg.map((x: any) => handle(model, x)));
    } else if (type === types.COUNT) {
      const [model] = payload;
      ensureModel(model);
      flow.return(Array.from(store[model].keys()).length);
    } else if (type === types.REMOVE) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(store[model].delete(arg.id));
    } else if (type === types.GET) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(store[model].get(arg.id));
    } else if (type === types.ALL) {
      const [model, query] = payload;
      ensureModel(model);
      const filter =
        query && query.where ? createFilter(query.where) : undefined;
      const orderBy = query && query.orderBy;
      let arr = Array.from(store[model].values());
      if (filter) {
        arr = arr.filter(filter);
      }
      if (orderBy) {
        arr = sort(arr, orderBy);
      }
      flow.return(arr);
    } else {
      flow(payload);
    }
  };
};
