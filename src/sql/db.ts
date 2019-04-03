import {
  Debe,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  types,
  ICollectionInput
} from 'debe';
import { jsonBodySkill } from './plugins';

export class SQLDebe extends Debe {
  dbPath: string;
  db: any;
  constructor(
    collections: ICollectionInput[],
    db: any,
    { softDelete = false, jsonBody = true }
  ) {
    super(collections);
    this.addSkill([changeListenerSkill(), coreSkill()]);
    if (jsonBody) {
      this.addSkill(jsonBodySkill({ merge: false }));
    }
    if (softDelete) {
      this.addSkill(softDeleteSkill());
    }
    this.db = db;
    this.addSkill('sql', sqlSkill(this));
  }
  async initialize() {
    const state = await super.initialize();
    return Promise.all(
      Object.keys(state.collections).map(key =>
        this.db.createTable(this.collections[key])
      )
    );
  }
}

export function sqlSkill(debe: SQLDebe): ISkill {
  return async function sqlSkill(type, payload: [string, any], flow) {
    if (type === types.INSERT) {
      const [collection, value] = payload;
      flow.return(await debe.db.insert(debe.collections[collection], value));
    } else if (type === types.COUNT) {
      const [collection, value] = payload;
      flow.return(
        await debe.db.query(debe.collections[collection], value, 'count')
      );
    } else if (type === types.GET) {
      const [collection, value] = payload;
      flow.return(
        await debe.db.query(debe.collections[collection], value, 'get')
      );
    } else if (type === types.ALL) {
      const [collection, value] = payload;
      flow.return(
        await debe.db.query(debe.collections[collection], value, 'all')
      );
    } else {
      flow(payload);
    }
  };
}
