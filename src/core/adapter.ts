import { changeListenerPlugin, corePlugin } from './plugins';
import { ICollections, IQuery, types } from './types';
import { Debe, IPlugin } from './client';

export abstract class DebeAdapter {
  connect(debe: Debe) {
    debe.addPlugin(changeListenerPlugin());
    debe.addPlugin(corePlugin());
    debe.addPlugin(adapterPlugin(this));
  }
  abstract initialize(collections: ICollections): Promise<void> | void;
  abstract get(collection: string, id: string): Promise<any>;
  abstract remove(collection: string, ids: string[]): Promise<string[]>;
  abstract all(collection: string, query: IQuery): Promise<any[]>;
  abstract count(collection: string, query: IQuery): Promise<number>;
  abstract insert(collection: string, items: any[]): Promise<any[]>;
}

export const adapterPlugin = (adapter: DebeAdapter): IPlugin => {
  return async function adapterPlugin(type, payload, flow) {
    if (type === types.COLLECTIONS) {
      adapter.initialize(payload);
      flow(payload);
    } else if (type === types.INSERT) {
      const [collection, arg] = payload;
      await adapter.insert(collection, arg);
      flow.return(arg);
    } else if (type === types.REMOVE) {
      const [collection, ids] = payload;
      await adapter.remove(collection, ids);
      flow.return(ids);
    } else if (type === types.GET) {
      const [collection, id] = payload;
      flow.return(await adapter.get(collection, id));
    } else if (type === types.ALL) {
      const [collection, query] = payload;
      flow.return(await adapter.all(collection, query));
    } else if (type === types.COUNT) {
      const [collection, query] = payload;
      flow.return(await adapter.count(collection, query));
    } else {
      flow(payload);
    }
  };
};
