import { Debe, IGetItem, ILog, ICollection } from 'debe';
import {
  ICountInitialChanges,
  IInitialFetchChanges,
  ISendChanges
} from './types';
import { ISocket, IChannel } from 'asyngular-client';
import { batchSize } from './constants';
import { batchTransfer } from './utils';

export function initiateSync(
  client: Debe,
  socket: ISocket,
  collection: ICollection,
  where: any,
  log: ILog
) {
  log.info(`Initiate sync of ${collection.name}`);
  // const { rev } = collection.specialFields;
  //const syncState = getSyncState(`${name}-${collection.name}`, client);

  const unlisteners: Function[] = [];

  // Fetch remote changes and return a function that persists them locally
  async function fetchRemote() {
    const remoteChanges = await batchTransfer(
      async () =>
        socket.invoke<ICountInitialChanges, number>('countInitialChanges', {
          type: collection.name,
          //since: (await syncState.get()).remote,
          where
        }),
      async page =>
        socket.invoke<IInitialFetchChanges, IGetItem[]>('initialFetchChanges', {
          type: collection.name,
          //since: (await syncState.get()).remote,
          where,
          page
        })
    );
    return !remoteChanges.length
      ? () => Promise.resolve()
      : () =>
          client
            .insert(collection.name, remoteChanges, {
              synced: 'client'
            } as any)
            .catch(x => console.error('Error while client.insert', x) as any);
  }

  // Publish all local changes to a channel
  async function publishLocal() {
    return batchTransfer(
      () =>
        client.count(collection.name, {
          where
        }),
      page =>
        client.all(collection.name, {
          where,
          limit: batchSize,
          offset: page * batchSize
        }),
      items =>
        socket.invoke<ISendChanges>('sendChanges', {
          items,
          type: collection.name
        })
    );
  }

  // Listen to channel changes, but wait until initial publish/fetch complete
  async function listenToSubscription(channel: IChannel<[string, IGetItem[]]>) {
    for await (let data of channel) {
      const [id, payload] = data;
      if (id !== socket.id) {
        await isComplete;
        await client
          .insert(collection.name, payload, { synced: 'client' } as any)
          .catch(x => console.error('Error while client.insert', x) as any);
      }
    }
  }

  // Listen to channel changes, but wait until initial publish/fetch complete
  async function listenToLocalInsert() {
    let queue = Promise.resolve();
    client.listen(collection.name, (items: any, options: any = {}) => {
      if (options.synced !== 'client') {
        queue = queue.then(() =>
          batchTransfer(
            () => isComplete.then(() => items.length),
            page =>
              Promise.resolve(
                ((items as any) as IGetItem[]).slice(
                  page * batchSize,
                  (page + 1) * batchSize
                )
              ),
            items =>
              socket.invoke<ISendChanges>('sendChanges', {
                items,
                type: collection.name
              })
          ).catch(err => console.error(err))
        );
      }
    });
  }

  const channel = socket.subscribe<[string, IGetItem[]]>(collection.name);
  const isComplete = (async () => {
    // Get Remote Changes
    const persist = await fetchRemote();
    await publishLocal();
    // Publish local changes
    await persist();
    log.info(`Sync to ${name}:${collection.name} is completed`);
  })();
  listenToSubscription(channel);
  listenToLocalInsert();

  return () => {
    unlisteners.forEach(x => x());
  };
}
