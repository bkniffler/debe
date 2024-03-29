import { Debe } from 'debe';
import { DebeBackend } from 'debe-adapter';
import { AGServer } from 'debe-socket-server';
import { CHANNELS } from 'debe-sync';

export async function databaseListener(
  server: AGServer,
  db: Debe,
  id: string
) {
  const { collections } = db.dispatcher as DebeBackend;
  // this.serverCollectionListener(collection);
  db.listen('*', (error, items, options, type) => {
    if (error) {
      throw error;
    }
    const collection = type ? collections[type] : undefined;
    if (!collection || !collection['sync'] || options.synced === id) {
      return;
    }
    server.exchange.invokePublish(CHANNELS.SUBSCRIBE_CHANGES, [
      options.synced,
      collection.name,
      items
    ]);
    if (options['delta']) {
      server.exchange.invokePublish(CHANNELS.SUBSCRIBE_DELTA_CHANGES, [
        options.synced,
        collection.name,
        options['delta']
      ]);
    }
  });
}
