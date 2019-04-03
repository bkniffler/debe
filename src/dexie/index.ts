import {
  Debe,
  types,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  ICollectionInput,
  ICollection
} from 'debe';
import Dexie from 'dexie';

export class DexieDebe extends Debe {
  constructor(
    collections: ICollectionInput[],
    { changeListener = true, softDelete = false, name = 'debe' } = {}
  ) {
    super(collections);
    if (changeListener) {
      this.addSkill(changeListenerSkill());
    }
    this.addSkill(coreSkill());
    if (softDelete) {
      this.addSkill(softDeleteSkill());
    }
    this.addSkill(dexieSkill(name));
    // this.tracker = x => console.log(x);
  }
}

export const dexieSkill = (name: string): ISkill => {
  const db = new Dexie(name);
  let count = 0;
  const collections = {};
  return async function dexie(type, payload, flow) {
    if (type === types.INITIALIZE) {
      count = payload.collections.length;
      flow(payload);
    } else if (type === types.COLLECTION) {
      const collection = payload as ICollection;
      collections[collection.name] = `++${[
        collection.specialFields.id,
        ...Object.keys(collection.index)
      ].join(', ')}`;
      count = count - 1;
      if (count === 0) {
        db.version(1).stores(collections);
      }
      flow(payload);
    } else if (type === types.INSERT) {
      const [collection, arg] = payload;
      flow.return(await db.table(collection).bulkPut(arg));
    } else if (type === types.COUNT) {
      const [collection] = payload;
      flow.return(await db.table(collection).count());
    } else if (type === types.REMOVE) {
      const [collection, arg] = payload;
      flow.return(await db.table(collection).delete(arg.id));
    } else if (type === types.GET) {
      const [collection, arg] = payload;
      flow.return(await db.table(collection).get(arg.id));
    } else if (type === 'console.log') {
      flow.return(null);
    } else if (type === types.ALL) {
      const [collection] = payload;
      flow.return(await db.table(collection).toArray());
    } else {
      flow(payload);
    }
  };
};
