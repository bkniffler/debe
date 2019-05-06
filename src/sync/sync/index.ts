import { Debe } from 'debe';
import { ISocket } from 'asyngular-client';
import { CHANNELS } from '../types';
import { delta } from './delta';
import { basic } from './basic';
import { SyncState } from '../state';
import { IListenReturn } from './type';

export function listenToSync(socket: ISocket, db: Debe, syncState: SyncState) {
  const cancels: IListenReturn[] = [];
  cancels.push(delta.listen(socket, db, syncState.update));
  cancels.push(basic.listen(socket, db, syncState.update));
  return async () => {
    await Promise.all(cancels.map(x => x.cancel()));
  };
}

export async function getRemoteChangeCount(
  socket: ISocket,
  collections: string[],
  syncState: SyncState
) {
  const remoteCounts = {};
  await Promise.all(
    collections.map(key => {
      return socket
        .invoke<any, number>(CHANNELS.COUNT_INITIAL_DELTA, {
          type: key,
          since: syncState.remote(key)
        })
        .then(result => (remoteCounts[key] = result));
    })
  );
  return remoteCounts;
}

async function getLocalChangeCount(
  db: Debe,
  collections: string[],
  syncState: any
) {
  const localCounts = {};
  await Promise.all(
    collections.map(key => {
      const begin = syncState.local(key);
      return db
        .count(key, {
          where: begin ? ['rev > ?', begin] : undefined
        })
        .then(result => (localCounts[key] = result));
    })
  );
  return localCounts;
}

export function listenToDatabase(
  collections: string[],
  isDelta: Function,
  db: Debe,
  socket: ISocket,
  initialSyncComplete: Promise<any>
) {
  // this.serverCollectionListener(collection);
  return db.listen('*', async (items, options, key) => {
    await initialSyncComplete;
    if (socket.state !== 'open') {
      return;
    }
    if (
      !key ||
      collections.indexOf(key) === -1 ||
      options.synced === socket.id
    ) {
      return;
    }
    if (isDelta(key)) {
      delta.up(key, db, socket, items, options);
    } else {
      basic
        .up(key, db, socket, items, options)
        .catch(err => console.log('ERR', err, err.stack, socket.state));
    }
  });
}

export async function initialSync(
  collections: string[],
  isDelta: Function,
  socket: ISocket,
  db: Debe,
  syncState: SyncState
) {
  // Get all counts of changes
  const remoteCounts = await getRemoteChangeCount(
    socket,
    collections,
    syncState
  );
  const localCounts = await getLocalChangeCount(db, collections, syncState);
  for (var key of collections) {
    const down = isDelta(key) ? delta.initialDown : basic.initialDown;
    const [local, remote] = await down(
      key,
      syncState.remote(key),
      remoteCounts[key],
      socket,
      db
    );
    syncState.update(key, local, remote);
    const up = isDelta(key) ? delta.initialUp : basic.initialUp;
    const [local2, remote2] = await up(
      key,
      syncState.local(key),
      localCounts[key],
      socket,
      db
    );
    syncState.update(key, local2, remote2);
  }
}
