import {
  Debe,
  coreSkill,
  changeListenerSkill,
  softDeleteSkill,
  ISkill,
  types
} from 'debe';
import { jsonBodySkill } from './plugins';

export class SQLDebe extends Debe {
  dbPath: string;
  db: any;
  schema: any;
  constructor(schema: any[], db: any, { softDelete = false, jsonBody = true }) {
    super();
    this.addSkill([changeListenerSkill(), coreSkill()]);
    if (jsonBody) {
      this.addSkill(jsonBodySkill({ merge: false }));
    }
    if (softDelete) {
      this.addSkill(softDeleteSkill());
    }
    this.db = db;
    this.schema = schema.reduce((store, x) => {
      if (!x.columns) {
        x.columns = [];
      }
      return { ...store, [x.name]: x };
    }, {});
    this.addSkill('sql', sqlSkill(this));
  }
  async initialize() {
    await super.initialize();
    return Promise.all(
      Object.keys(this.schema).map(key => this.db.createTable(this.schema[key]))
    );
  }
}

export function sqlSkill(debe: SQLDebe): ISkill {
  return async function sqlSkill(type, payload, flow) {
    if (type === types.INITIALIZE) {
      const { indices = [], columns = [] } = payload;
      indices.forEach((col: string) => {
        if (debe.db.indices.indexOf(col) === -1) {
          debe.db.indices = [...debe.db.indices, col];
          debe['indices'] = [...debe.db.indices, col];
        }
      });
      columns.forEach((col: string) => {
        if (debe.db.columns.indexOf(col) === -1) {
          debe.db.columns = [...debe.db.columns, col];
          debe['columns'] = [...debe.db.columns, col];
        }
      });
      flow.return(payload);
    } else if (type === types.INSERT) {
      const [model, value] = payload;
      flow.return(await debe.db.insert(debe.schema[model], value));
    } else if (type === types.COUNT) {
      const [model, value] = payload;
      flow.return(await debe.db.query(debe.schema[model], value, 'count'));
    } else if (type === types.GET) {
      const [model, value] = payload;
      flow.return(await debe.db.query(debe.schema[model], value, 'get'));
    } else if (type === types.ALL) {
      const [model, value] = payload;
      flow.return(await debe.db.query(debe.schema[model], value, 'all'));
    } else {
      flow(payload);
    }
  };
}
