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

  return function(action: any, flow: Function) {
    const { type, model, value } = action;

    if (model && !store[model.name]) {
      store[model.name] = [];
    }
    if (type === types.INSERT) {
      return flow(value.map((x: any) => handle(model.name, x)));
    } else if (type === types.COUNT) {
      return flow(store[model.name].length);
    } else if (type === types.GET) {
      return flow(store[model.name].find(x => x.id === value.id));
    } else if (type === types.ALL) {
      return flow([...store[model.name]]);
    }
    return flow(action);
  };
};
