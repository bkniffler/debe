import { isNull, and } from 'debe';
import { DebeBackend } from '../backend';
import { addMiddleware } from '../utils';

export interface ISoftDeleteOptions {
  removedField: string;
}

export function softDeletePlugin(
  adapter: DebeBackend,
  { removedField = 'rem' }: ISoftDeleteOptions
) {
  addMiddleware(adapter, {
    name: 'softDelete',
    collection(collection) {
      collection.specialFields.rem = removedField;
      collection.fields[removedField] = 'string';
      collection.index[removedField] = 'string';
      return collection;
    },
    query(collection, query) {
      collection;
      return { ...query, where: and(query.where, isNull(removedField)) };
    },
    async beforeRemove(collection, ids) {
      await adapter.db.insert(
        collection.name,
        ids.map(id => ({
          id: id,
          [removedField]: new Date().toISOString()
        }))
      );
      return ids;
    }
  });
}
