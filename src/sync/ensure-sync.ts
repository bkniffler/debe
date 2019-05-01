import { Debe, ensureCollection } from 'debe';
import { DebeBackend, addMiddleware, addPlugin } from 'debe-adapter';
import { syncstateTable } from './constants';
import { deltaPlugin } from 'debe-delta';

export function ensureSync(db: Debe) {
  const backend = db.dispatcher as DebeBackend;
  if (backend.middlewares) {
    addMiddleware(backend, {
      name: 'sync',
      collection(collection) {
        if (collection['sync'] && collection['sync'] === 'delta') {
          addPlugin(collection, 'delta');
        }
        return collection;
      },
      collections(collections) {
        collections[syncstateTable] = ensureCollection({
          name: syncstateTable,
          fields: {
            state: 'json'
          }
        });
        return collections;
      }
    });

    deltaPlugin(backend);
  }
}
