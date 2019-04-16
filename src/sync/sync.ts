import { Debe, IGetItem, ILog, ICollection, IQueryInput } from 'debe';
import { ICountInitialChanges, IInitialFetchChanges } from './types';
import { ISocket, IChannel } from 'asyngular-client';
import { batchSize, syncstateTable } from './constants';
import { batchTransfer } from './utils';

export function initiateSync(
  client: Debe,
  socket: ISocket,
  collection: ICollection,
  where: any,
  log: ILog
) {
  log.info(`Initiate sync of ${collection.name}`);
  let state: any = {};
  let promise = Promise.resolve();
  async function updateState(
    local: string | void | undefined,
    remote?: string | void | undefined
  ) {
    if (local) {
      state.local = local;
    }
    if (remote) {
      state.remote = remote;
    }
    console.log('Update state', state);
    promise = promise.then(() => client.insert(syncstateTable, { ...state }));
  }
  // const { rev } = collection.specialFields;
  //const syncState = getSyncState(`${name}-${collection.name}`, client);

  const unlisteners: Function[] = [];

  // Fetch remote changes and return a function that persists them locally
  async function fetchRemote(
    lastRev?: string
  ): Promise<[string | undefined, () => Promise<string | void>]> {
    const remoteChanges = await batchTransfer(
      async () =>
        socket.invoke<ICountInitialChanges, number>('countInitialChanges', {
          type: collection.name,
          since: lastRev,
          where
        }),
      async page =>
        socket.invoke<IInitialFetchChanges, IGetItem[]>('initialFetchChanges', {
          type: collection.name,
          since: lastRev,
          where,
          page
        })
    );
    console.log('Downloaded items', remoteChanges.length);
    if (!remoteChanges.length) {
      return [undefined, () => Promise.resolve()];
    }
    const serverLastRev = remoteChanges[remoteChanges.length - 1].rev;
    return [
      serverLastRev,
      () =>
        client
          .insert(collection.name, remoteChanges, {
            synced: 'client'
          } as any)
          .then(o => o && o[o.length - 1] && o[o.length - 1].rev)
    ];
  }

  // Publish all local changes to a channel
  async function publishLocal(lastRev?: string) {
    const where = lastRev
      ? [`${collection.specialFields.rev} > ?`, lastRev]
      : undefined;
    const [items, ids] = await batchTransfer<IGetItem, string>(
      () =>
        client.count(collection.name, {
          where
        } as IQueryInput),
      page =>
        client.all(collection.name, {
          where,
          orderBy: ['rev ASC', 'id ASC'],
          limit: batchSize,
          offset: page * batchSize
        } as IQueryInput),
      items => socket.invoke('sendChanges', [collection.name, items])
    );
    console.log('Uploaded items', items.length);
    return [
      items.length && items[0] ? items[0].rev : undefined,
      ids.length ? ids[ids.length - 1] : undefined
    ];
  }

  // Listen to channel changes, but wait until initial publish/fetch complete
  async function listenToSubscription(channel: IChannel<[string, IGetItem[]]>) {
    for await (let data of channel) {
      const [id, remote] = data;
      if (id !== socket.id) {
        await isComplete;
        await client
          .insert(collection.name, remote, { synced: 'client' } as any)
          .then(local => {
            updateState(
              local.length ? local[local.length - 1].rev : undefined,
              remote.length ? remote[remote.length - 1].rev : undefined
            );
          })
          .catch(x => console.error('Error while client.insert', x) as any);
      }
    }
  }

  // Listen to channel changes, but wait until initial publish/fetch complete
  function listenToLocalInsert() {
    console.log('LISTEN');
    let queue: Promise<[IGetItem[], any[]] | void> = Promise.resolve();
    return client.listen(collection.name, (items: any, options: any = {}) => {
      console.log('NEW');
      if (options.synced === 'client') return;
      console.log('OK');
      queue = queue.then(() =>
        batchTransfer<IGetItem, string>(
          () => isComplete.then(() => items.length),
          page =>
            ((items as any) as IGetItem[]).slice(
              page * batchSize,
              (page + 1) * batchSize
            ),
          items => socket.invoke('sendChanges', [collection.name, items])
        )
          .then(([local, remote]) => {
            updateState(
              local.length ? local[local.length - 1].rev : undefined,
              remote.length ? remote[remote.length - 1] : undefined
            );
          })
          .catch(err => console.error(err))
      );
    });
  }

  const channel = socket.subscribe<[string, IGetItem[]]>(collection.name);
  const isComplete = (async () => {
    state = (await client.get(syncstateTable)) || {};
    // Get Remote Change
    console.log('Downloading changes since', state.remote);
    const [remoteState, persist] = await fetchRemote(state.remote);
    updateState(undefined, remoteState);
    console.log('Uploading changes since', state.local);
    const [uploadedRev, downloadedRev] = await publishLocal(state.local);
    updateState(uploadedRev, downloadedRev);
    // Publish local changes
    console.log('Persisting downloaded changes');
    updateState(await persist());
    log.info(`Sync of :${collection.name} is completed`);
  })();
  listenToSubscription(channel);
  unlisteners.push(listenToLocalInsert());

  return async () => {
    await Promise.all(unlisteners.map(x => x()));
  };
}
