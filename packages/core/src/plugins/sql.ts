/*import {
  DebeEngine,
  IModel,
  IDebeSQLEngineOptions,
  IInsertOptions,
  IQuery,
  IGetItem,
  IInsertItem
} from './base';
import { ensureArray } from '../utils';

export function changeListenerPlugin(config: any) {
  const { idField, revField, removedField, defaultColumns } = config;
  const sql = {
    createTableIndex(model: string, field: string) {
      return `CREATE INDEX IF NOT EXISTS "${model}_${field}" ON "${model}" (${field})`;
    },

    getColumnType(field: string): string {
      if (field === idField) {
        return 'TEXT PRIMARY KEY';
      } else if (field === revField) {
        return 'TEXT';
      } else if (field === removedField) {
        return 'TEXT';
      }
      return 'TEXT';
    },

    createInsertStatement(model: IModel, columns?: string[]) {
      columns = columns || [...defaultColumns(), ...model.columns];
      const base = `INSERT INTO "${model.name}" (${columns.join(
        ', '
      )}) VALUES (${columns.map(() => '?').join(', ')})`;
      const conflict = columns
        .filter(x => x !== idField)
        .map(key => `${key}=EXCLUDED.${key}`)
        .join(', ');
      return `${base} ON CONFLICT(${idField}) DO UPDATE SET ${conflict}`;
    },

    createTable(model: IModel) {
      return this.exec('', [
        `CREATE TABLE IF NOT EXISTS "${model.name}" (${[
          ...this.defaultColumns().map(
            field => `${field} ${sql.getColumnType(field)}`
          ),
          ...model.columns.map(field => `${field} ${sql.getColumnType(field)}`)
        ].join(', ')})`,
        sql.createTableIndex(model.name, this.revField),
        sql.createTableIndex(model.name, this.removedField),
        ...model.index.map((field: string) =>
          sql.createTableIndex(model.name, field)
        )
      ]);
    },

    // Query construction
    makeCount(statement: string): string {
      return `SELECT COUNT(*) AS count FROM (${statement}) AS src`;
    },
    createSelect(model: IModel, columns?: string[]): string {
      if (!columns) {
        columns = [...defaultColumns(), ...model.columns];
      }
      return `SELECT ${columns.join(', ')}`;
    },
    createOffset(offset?: number): string {
      return offset !== undefined ? `OFFSET ${offset}` : '';
    },
    createLimit(limit?: number | [number] | [number, number]): string {
      if (limit !== undefined && !Array.isArray(limit)) {
        return `LIMIT ${limit}`;
      }
      if (limit !== undefined && Array.isArray(limit) && limit.length === 1) {
        return `LIMIT ${limit[0]}`;
      }
      if (limit !== undefined && Array.isArray(limit) && limit.length === 2) {
        return `LIMIT ${limit[0]} OFFSET ${limit[1]}`;
      }
      return '';
    },
    createOrderBy(orderBy: string[] | string): string {
      orderBy = ensureArray(orderBy);
      return orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : '';
    },
    createQueryStatement(
      model: IModel,
      queryArgs: IQuery,
      queryType: string
    ): [string, ...any[]] {
      const {
        id = undefined,
        where = [],
        orderBy = [],
        limit = undefined,
        offset = undefined
      } = queryArgs;
      const [whereStatement, ...args] =
        id && typeof id === 'string'
          ? sql.createWhereId(id)
          : sql.createWhere(where, sql.removedField);
      const statement = `
      ${this.createSelect(model)}
      FROM "${model.name}" 
      ${whereStatement}
      ${this.createOrderBy(orderBy)}
      ${this.createLimit(queryType === 'get' ? 1 : limit)}
      ${this.createOffset(offset)}
    `.trim();
      return [
        queryType === 'count' ? this.makeCount(statement) : statement,
        ...args
      ];
    },
    createWhere(where: string[] | string, removedField: string): any[] {
      where = ensureArray(where);
      const [clause, ...args] = where;
      return [
        clause
          ? `WHERE ${clause} AND ${removedField} IS NULL`
          : `WHERE ${removedField} IS NULL`,
        ...args
      ];
    },
    createWhereId(id: string[] | string): any[] {
      id = ensureArray(id);
      if (id.length === 0) {
        return [''];
      } else if (id.length === 1) {
        return [`WHERE id = ?`, id[0]];
      }
      return [`WHERE id IN (?)`, ...id];
    },
    ...(config.sql || {})
  };

  return function(action: any, flow: Function) {
    const { type, value } = action;
    if (type === 'all') {
      const [statement, ...args] = sql.createQueryStatement(
        model,
        queryArgs,
        queryType
      );
      return sql.exec<any>(statement, args, queryType);
    }
    if (type === 'get') {
      const [statement, ...args] = sql.createQueryStatement(
        model,
        queryArgs,
        queryType
      );
      return sql.exec<any>(statement, args, queryType);
    }
    if (type === 'count') {
      const [statement, ...args] = this.createQueryStatement(
        model,
        queryArgs,
        queryType
      );
      return sql.exec<any>(statement, args, queryType);
    }
    if (type === 'insert') {
      const columns = [...defaultColumns(), ...model.columns];
      const statement = sql.createInsertStatement(model, columns);
      const ids: string[] = [];
      const items = value.map(item => {
        return columns.map(key => item[key]);
      });
      await sql.exec(statement, items, 'insert');
      return result as any;
    }
    return flow(action);
  };
}
*/
