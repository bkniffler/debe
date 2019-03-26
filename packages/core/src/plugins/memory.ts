import { IGetItem, types } from '../types';
import { IPluginCreator } from '../dispatcher';
import { corePlugin } from './core';

interface IStore {
  [s: string]: IGetItem[];
}
export const memoryPlugin: IPluginCreator = client => {
  const store: IStore = {};
  client.addPlugin(corePlugin);
  function handle(type: string, item: any) {
    const index = item.id ? store[type].findIndex(x => x.id === item.id) : -1;
    if (index === -1) {
      store[type].push(item);
    } else {
      store[type][index] = item;
    }
    return item;
  }
  function ensureModel(model: string) {
    if (model && !store[model]) {
      store[model] = [];
    }
  }

  return function(type, payload, flow) {
    if (type === types.INSERT) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(arg.map((x: any) => handle(model, x)));
    } else if (type === types.COUNT) {
      const [model] = payload;
      ensureModel(model);
      flow.return(store[model].length);
    } else if (type === types.GET) {
      const [model, arg] = payload;
      ensureModel(model);
      flow.return(store[model].find(x => x.id === arg.id));
    } else if (type === types.ALL) {
      const [model] = payload;
      ensureModel(model);
      flow.return([...store[model]]);
    } else {
      flow(payload);
    }
  };
};
