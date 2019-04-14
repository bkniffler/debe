import { IQueryInput, IQuery } from '../types';

export function ensureQuery(value: IQueryInput | any): IQuery {
  if (!value) {
    value = {};
  }
  if (value.id) {
    if (Array.isArray(value.id)) {
      value.where = [`id IN (?)`, value.id];
    } else {
      value.where = [`id = ?`, value.id];
    }
  }
  if (Array.isArray(value.limit) && value.limit.length === 2) {
    value.offset = value.limit[1];
    value.limit = value.limit[0];
  } else if (Array.isArray(value.limit) && value.limit.length === 1) {
    value.limit = value.limit[0];
  }
  value.select = value.select ? ensureArray(value.select) : undefined;
  value.orderBy = value.orderBy ? ensureArray(value.orderBy) : undefined;
  value.id = value.id ? ensureArray(value.id) : undefined;
  return value as IQuery;
}

export function ensureArray<T>(obj: T[] | T | undefined): T[] {
  if (obj && !Array.isArray(obj)) {
    return [obj];
  } else if (!obj) {
    return [];
  } else {
    return obj as any;
  }
}
