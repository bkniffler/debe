import {
  Debe,
  IGetItem,
  types,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  ICollectionInput,
  ICollection
} from 'debe';
import { createFilter, sort } from './filter';
export * from './filter';

interface IStore {
  [s: string]: Map<string, IGetItem>;
}

export class MemoryDebe extends Debe {
  constructor(
    collections: ICollectionInput[],
    { changeListener = true, softDelete = false } = {}
  ) {
    super(collections);
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

  return function memory(type, payload, flow) {
    if (type === types.COLLECTION) {
      const collection = payload as ICollection;
      store[collection.name] = new Map();
      flow(payload);
    } else if (type === types.INSERT) {
      const [collection, arg] = payload;
      flow.return(arg.map((x: any) => handle(collection, x)));
    } else if (type === types.COUNT) {
      const [collection] = payload;
      flow.return(Array.from(store[collection].keys()).length);
    } else if (type === types.REMOVE) {
      const [collection, arg] = payload;
      flow.return(store[collection].delete(arg.id));
    } else if (type === types.GET) {
      const [collection, arg] = payload;
      flow.return(store[collection].get(arg.id));
    } else if (type === 'console.log') {
      flow.return(null);
    } else if (type === types.ALL) {
      const [collection, query] = payload;
      const filter =
        query && query.where ? createFilter(query.where) : undefined;
      const orderBy = query && query.orderBy;
      let arr = Array.from(store[collection].values());
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
