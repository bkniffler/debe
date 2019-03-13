import { ensureArray } from './ensure-array';

export function createOrderBy<T>(orderBy: T[] | T): string {
  orderBy = ensureArray(orderBy);
  return orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : '';
}
