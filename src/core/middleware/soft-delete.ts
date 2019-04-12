import { fieldTypes, IMiddleware } from '../types';
import { toISO, isNull, and } from '../utils';

export interface ISoftDeleteOptions {
  removedField: string;
}

export const softDeletePlugin: IMiddleware<ISoftDeleteOptions> = ({
  removedField = 'rem'
}) => db => ({
  collection(collection) {
    collection.specialFields.rem = removedField;
    collection.fields[removedField] = fieldTypes.STRING;
    collection.index[removedField] = fieldTypes.STRING;
    return collection;
  },
  query(collection, query) {
    collection;
    return { ...query, where: and(query.where, isNull(removedField)) };
  },
  async beforeRemove(collection, ids) {
    await db.insert(
      collection.name,
      ids.map(id => ({
        id: id,
        [removedField]: toISO(new Date())
      }))
    );
    return ids;
  }
});
