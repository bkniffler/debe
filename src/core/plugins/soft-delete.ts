import { types, fieldTypes, ICollection } from '../types';
import { ensureArray, addToQuery, toISO } from '../utils';
import { IPlugin, Debe } from '../client';

export const softDeletePlugin = (options: any = {}): IPlugin => (
  client: Debe
) => {
  const { removedField = 'rem' } = options;
  client.addPlugin(
    'softDeletePlugin',
    (type, payload, flow) => {
      if (type === types.COLLECTION) {
        (payload as ICollection).specialFields.rem = removedField;
        (payload as ICollection).fields[removedField] = fieldTypes.STRING;
        (payload as ICollection).index[removedField] = fieldTypes.STRING;
        return flow(payload);
      }
      if (type === 'all' || type === 'count') {
        const [collection, arg = {}] = payload;
        arg.where = addToQuery(arg.where, 'AND', `${removedField} IS NULL`);
        flow([collection, arg]);
      } else if (type === 'remove') {
        const [collection, arg = {}] = payload;
        flow.reset(types.INSERT, [
          collection,
          ensureArray(arg).map(id => ({
            id: id.id || id,
            [removedField]: toISO(new Date())
          }))
        ]);
      } else {
        flow(payload);
      }
    },
    'AFTER',
    'corePlugin'
  );
};
