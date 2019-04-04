import {
  Debe,
  IGetItem,
  types,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  ICollectionInput,
  ICollection,
  IQuery
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
      const [collection, query] = payload as [string, IQuery];
      flow.return(filter(Array.from(store[collection].values()), query).length);
    } else if (type === types.REMOVE) {
      const [collection, ids] = payload as [string, string[]];
      flow.return(ids.map(id => store[collection].delete(id)));
    } else if (type === types.GET) {
      const [collection, id] = payload as [string, string];
      flow.return(store[collection].get(id));
    } else if (type === 'console.log') {
      flow.return(null);
    } else if (type === types.ALL) {
      const [collection, query] = payload as [string, IQuery];
      flow.return(filter(Array.from(store[collection].values()), query));
    } else {
      flow(payload);
    }
  };
};

function filter(array: any[], query: IQuery) {
  const filter = query && query.where ? createFilter(query.where) : undefined;
  const orderBy = query && query.orderBy;
  if (filter) {
    array = array.filter(filter);
  }
  if (orderBy) {
    array = sort(array, orderBy);
  }
  return array;
}
