import {
  Debe,
  IGetItem,
  types,
  coreSkill,
  changeListenerSkill,
  ISkill
} from 'debe';
import { createFilter } from './filter';

interface IStore {
  [s: string]: Map<string, IGetItem>;
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
    } else if (type === types.GET) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(store[model].get(arg.id));
    } else if (type === types.ALL) {
      const [model, query] = payload;
      ensureModel(model);
      const filter =
        query && query.where ? createFilter(query.where) : undefined;
      if (filter) {
        flow.return(Array.from(store[model].values()).filter(filter));
      } else {
        flow.return(Array.from(store[model].values()));
      }
    } else {
      flow(payload);
    }
  };
};

export class MemoryDebe extends Debe {
  constructor({ changeListener = true } = {}) {
    super();
    if (changeListener) {
      this.skill(changeListenerSkill());
    }
    this.skill([coreSkill(), memorySkill()]);
    // this.tracker = x => console.log(x);
  }
}