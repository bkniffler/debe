import { SQLite3 } from './helpers';
import { types } from '../types';
import {
  coreSkill,
  changeListenerSkill,
  jsonBodySkill,
  softDeleteSkill
} from '../skills';
import { Debe } from '../client';
import { ISkill } from 'service-dog';

export class Sqlite3Debe extends Debe {
  dbPath: string;
  db: SQLite3;
  schema: any;
  constructor(
    schema: any[],
    { softDelete = false, jsonBody = true, sqlite3Db = {} }
  ) {
    super();
    this.skill([changeListenerSkill(), coreSkill()]);
    if (jsonBody) {
      this.skill(jsonBodySkill({ merge: false }));
    }
    if (softDelete) {
      this.skill(softDeleteSkill());
    }
    this.db = new SQLite3(sqlite3Db);
    this.schema = schema.reduce((store, x) => {
      if (!x.columns) {
        x.columns = [];
      }
      return { ...store, [x.name]: x };
    }, {});
    this.skill('sqlite3Skill', this.sqlite3Skill);
  }
  async initialize() {
    await super.initialize();
    return Promise.all(
      Object.keys(this.schema).map(key => this.db.createTable(this.schema[key]))
    );
  }
  sqlite3Skill: ISkill = async (type, payload, flow) => {
    if (type === types.INITIALIZE) {
      const { indices = [], columns = [] } = payload;
      indices.forEach((col: string) => {
        if (this.db.indices.indexOf(col) === -1) {
          this.db.indices = [...this.db.indices, col];
          this['indices'] = this.db.indices;
        }
      });
      columns.forEach((col: string) => {
        if (this.db.columns.indexOf(col) === -1) {
          this.db.columns = [...this.db.columns, col];
          this['columns'] = this.db.columns;
        }
      });
      flow.return(payload);
    } else if (type === types.INSERT) {
      const [model, value] = payload;
      flow.return(await this.db.insert(this.schema[model], value));
    } else if (type === types.COUNT) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'count'));
    } else if (type === types.GET) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'get'));
    } else if (type === types.ALL) {
      const [model, value] = payload;
      flow.return(await this.db.query(this.schema[model], value, 'all'));
    } else {
      flow(payload);
    }
  };
}
