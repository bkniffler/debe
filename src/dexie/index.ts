import {
  Debe,
  types,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  ICollectionInput,
  ICollections,
  queryToArray,
  IQuery
} from 'debe';
import Dexie, { Table, IndexableType } from 'dexie';

export class DexieDebe extends Debe {
  constructor(
    collections: ICollectionInput[],
    {
      changeListener = true,
      softDelete = false,
      name = 'debe',
      version = 1
    } = {}
  ) {
    super(collections);
    if (changeListener) {
      this.addSkill(changeListenerSkill());
    }
    this.addSkill(coreSkill());
    if (softDelete) {
      this.addSkill(softDeleteSkill());
    }
    this.addSkill(dexieSkill(name, version));
    // this.tracker = x => console.log(x);
  }
}

export const dexieSkill = (name: string, version: number): ISkill => {
  const db = new Dexie(name);
  return async function dexie(type, payload, flow) {
    if (type === types.COLLECTIONS) {
      const collections = payload as ICollections;
      const schema: any = {};
      for (var key in collections) {
        const collection = collections[key];
        schema[collection.name] = [
          collection.specialFields.id,
          ...Object.keys(collection.index)
        ].join(', ');
      }
      db.version(version).stores(schema);
      flow(payload);
    } else if (type === types.INSERT) {
      const [collection, arg] = payload;
      flow.return(await db.table(collection).bulkPut(arg));
    } else if (type === types.COUNT) {
      const [collection, { where, offset, limit }] = payload as [
        string,
        IQuery
      ];
      let cursor = db.table(collection);
      if (where) {
        cursor = filter(cursor, where);
      }
      if (offset) {
        cursor = cursor.offset(offset) as any;
      }
      if (limit) {
        cursor = cursor.limit(limit) as any;
      }
      flow.return(await cursor.count());
    } else if (type === types.REMOVE) {
      const [collection, ids] = payload as [string, string[]];
      flow.return(await db.table(collection).bulkDelete(ids));
    } else if (type === types.GET) {
      const [collection, id] = payload as [string, string];
      flow.return(await db.table(collection).get(id));
    } else if (type === types.ALL) {
      const [collection, { where, offset, limit }] = payload as [
        string,
        IQuery
      ];
      let cursor = db.table(collection);
      if (where) {
        cursor = filter(cursor, where);
      }
      if (offset) {
        cursor = cursor.offset(offset) as any;
      }
      if (limit) {
        cursor = cursor.limit(limit) as any;
      }
      flow.return(await cursor.toArray());
    } else {
      flow(payload);
    }
  };
};

function filter(
  collection: Table<any, IndexableType>,
  query?: [string, ...any[]]
): Table<any, IndexableType> {
  const filterMap = {
    '>=': 'aboveOrEqual',
    '>': 'above',
    '<=': 'belowOrEqual',
    '<': 'below',
    IN: 'anyOf',
    '=': 'equals',
    '==': 'equals',
    '!=': 'notEqual'
  };

  if (!query || !query.length) {
    return collection;
  }
  const array = queryToArray(query);
  for (var i = 0; i < array.length; i++) {
    const [left, operand, right] = array[i];
    if (filterMap[operand]) {
      collection = collection.where(left)[filterMap[operand]](right) as any;
    }
  }
  return collection;
}
