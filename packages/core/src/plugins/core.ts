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
  return function(type, payload, flow) {
    if (type === types.INSERT) {
      const [model, value] = payload;
      const isArray = Array.isArray(value);
      flow(
        [model, ensureArray(value).map(transformForStorage)],
        (result: any, flow: any) => flow(isArray ? result : result[0])
      );
    } else {
      flow(payload);
    }
  };
};
