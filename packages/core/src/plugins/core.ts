import { ensureArray } from '../utils';
import { generate } from '../common';
import { types } from '../types';
import { IPluginCreator } from '../dispatcher';

export const corePlugin: IPluginCreator = (client, options = {}) => {
  const { idField = 'id' } = options;
  client.indexFields.push(idField);
  function transformForStorage(item: any) {
    if (!item) {
      return item;
    }
    if (item[idField] === undefined || item[idField] === null) {
      item[idField] = generate();
    }
    item[idField] = item[idField] + '';
    return item;
  }
  return function(action, flow) {
    const { type, value, model } = action;

    action.model = { name: model };
    if (type === types.INSERT) {
      const isArray = Array.isArray(value);
      action.value = ensureArray(value).map(transformForStorage);
      return flow(
        action,
        (result: any, flow: any) => {
          return flow(isArray ? result : result[0]);
        }
      );
    }
    return flow(action);
  };
};
