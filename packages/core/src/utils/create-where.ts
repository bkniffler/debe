import { ensureArray } from './ensure-array';

export function createWhere<T>(where: T[] | T): any[] {
  where = ensureArray(where);
  const [clause, ...args] = where;
  return [
    clause ? `WHERE ${clause} AND del IS NULL` : 'WHERE del IS NULL',
    ...args
  ];
}

export function createWhereId<T>(id: T[] | T): any[] {
  id = ensureArray(id);
  return [id.length ? `WHERE 'id' IN (?)` : '', ...id];
}
