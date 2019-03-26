import { ensureArray, toISO } from '../utils';
import { types } from '../types';
import { IPluginCreator } from '../dispatcher';

export const softDeletePlugin: IPluginCreator = (client, options = {}) => {
  const { removedField = 'rem' } = options;
  client['indexFields'].push(removedField);

  return function(action, flow) {
    const { type, value = {} } = action;
    if (type === 'all' || type === 'count') {
      if (!value.where) {
        value.where = [];
      }
      value.where.push({ [removedField]: null });
      action.value = value;
      flow(action);
    } else if (type === 'remove') {
      flow.restart({
        $action: {},
        type: types.INSERT,
        value: ensureArray(value).map(id => ({
          id,
          [removedField]: toISO(new Date())
        }))
      });
    } else {
      flow(action);
    }
  };
};
