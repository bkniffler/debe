import { Debe } from 'debe';
import { ISocket } from 'asyngular-client';
import { CHANNELS } from '../types';
import { delta } from './delta';
import { basic } from './basic';
import { SyncState } from '../state';
import { IListenReturn } from './type';

export class SyncEngine {
  initialSyncComplete = Promise.resolve();
  get isInitialComplete() {
    return this.tasks['initial'] !== true;
  }
  get isSyncing() {
    return Object.keys(this.tasks).length > 0;
  }
  private cancels: Function[] = [];
  private tasks = {};
  isClosing = false;
  initial(
    collections: string[],
    isDelta: Function,
    socket: ISocket,
    db: Debe,
    syncState: SyncState
  ) {
    const release = this.registerTask('initial');
    this.initialSyncComplete = this.initialSync(
      collections,
      isDelta,
      socket,
      db,
      syncState
    ).finally(() => {
      release();
    });
    this.cancels.push(
      this.listenToDatabase(
        collections,
        isDelta,
        db,
        socket,
        this.initialSyncComplete
      )
    );
    this.listenToSync(socket, db, syncState);
  }
  close() {
    this.isClosing = true;
    this['_close'] = async () => {
      await Promise.all((this.cancels as any[]).map(x => x()));
    };
  }

  listenToSync(socket: ISocket, db: Debe, syncState: SyncState) {
    const cancels: IListenReturn[] = [];
    cancels.push(
      delta.listen(
        socket,
        db,
        syncState.update,
        () => this.registerTask(),
        () => this.isClosing
      )
    );
    cancels.push(
      basic.listen(
        socket,
        db,
        syncState.update,
        () => this.registerTask(),
        () => this.isClosing
      )
    );
  }

  async getRemoteChangeCount(
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

  async getLocalChangeCount(db: Debe, collections: string[], syncState: any) {
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

  getTaskKey() {
    let key = new Date().getTime();
    let count = 0;
    while (this.tasks[`${key}-${count}`] !== undefined) {
      count = count + 1;
    }
    return `${key}-${count}`;
  }

  registerTask(initialKey?: string) {
    const key = initialKey || this.getTaskKey();
    this.tasks[key] = true;
    return () => {
      delete this.tasks[key];
    };
  }

  listenToDatabase(
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
      const release = this.registerTask();
      if (
        !key ||
        collections.indexOf(key) === -1 ||
        options.synced === socket.id
      ) {
        return;
      }
      if (isDelta(key)) {
        delta.up(key, db, socket, items, options, () => this.isClosing);
      } else {
        basic
          .up(key, db, socket, items, options, () => this.isClosing)
          .catch(err => console.log('ERR', err, err.stack, socket.state))
          .finally(() => {
            release();
          });
      }
    });
  }

  async initialSync(
    collections: string[],
    isDelta: Function,
    socket: ISocket,
    db: Debe,
    syncState: SyncState
  ) {
    // Get all counts of changes
    const remoteCounts = await this.getRemoteChangeCount(
      socket,
      collections,
      syncState
    );
    const localCounts = await this.getLocalChangeCount(
      db,
      collections,
      syncState
    );
    for (var key of collections) {
      const down = isDelta(key) ? delta.initialDown : basic.initialDown;
      const [local, remote] = await down(
        key,
        syncState.remote(key),
        remoteCounts[key],
        socket,
        db,
        () => this.isClosing
      );
      syncState.update(key, local, remote);
      const up = isDelta(key) ? delta.initialUp : basic.initialUp;
      const [local2, remote2] = await up(
        key,
        syncState.local(key),
        localCounts[key],
        socket,
        db,
        () => this.isClosing
      );
      syncState.update(key, local2, remote2);
    }
  }
}
