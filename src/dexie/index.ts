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

import Dexie, { Table, IndexableType } from 'dexie';

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
      collections[collection.name] = [
        collection.specialFields.id,
        ...Object.keys(collection.index)
      ].join(', ');
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
    } else if (type === types.ALL) {
      const [collection, arg] = payload;
      if (arg && arg.where) {
        flow.return(await filter(db.table(collection), arg.where).toArray());
      }
      flow.return(await db.table(collection).toArray());
    } else {
      flow(payload);
    }
  };
};

function filter(
  collection: Table<any, IndexableType>,
  query: [string, ...any[]]
): Table<any, IndexableType> {
  if (!query.length) {
    return collection;
  }
  let questions: number = 0;
  const q = query[0].split('AND').map((part: string) =>
    part.split(' ').reduce<string[]>((arr, x) => {
      x = x.trim();
      if (x === '?') {
        arr.push(query[(questions += 1)]);
      } else if (x) {
        arr.push(x);
      }
      return arr;
    }, [])
  );
  for (var i = 0; i < q.length; i++) {
    const [left, operand, right] = q[i];
    if (operand === '>=') {
      collection = collection.where(left).aboveOrEqual(right) as any;
    } else if (operand === '>') {
      collection = collection.where(left).above(right) as any;
    } else if (operand === '<=') {
      collection = collection.where(left).belowOrEqual(right) as any;
    } else if (operand === '<') {
      collection = collection.where(left).below(right) as any;
    } else if (operand === 'IN') {
      collection = collection.where(left).anyOf(right) as any;
    } else if (operand === '=' || operand === '==') {
      collection = collection.where(left).equals(right) as any;
    } else if (operand === '!=') {
      collection = collection.where(left).notEqual(right) as any;
    }
  }
  return collection;
}
