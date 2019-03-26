import { ensureArray, toISO } from '../utils';
import { types } from '../types';
import { IPluginCreator } from '../dispatcher';

export const softDeletePlugin: IPluginCreator = (client, options = {}) => {
  const { removedField = 'rem' } = options;
  client['indexFields'].push(removedField);

  return function(type, payload, flow) {
    if (type === 'all' || type === 'count') {
      const [model, arg = {}] = payload;
      if (!arg.where) {
        arg.where = [];
      }
      arg.where.push({ [removedField]: null });
      flow([model, arg]);
    } else if (type === 'remove') {
      const [model, arg = {}] = payload;
      flow.restart(types.INSERT, [
        model,
        ensureArray(arg).map(id => ({
          id,
          [removedField]: toISO(new Date())
        }))
      ]);
    } else {
      flow(payload);
    }
  };
};
