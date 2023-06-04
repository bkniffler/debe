import { Debe, IUnlisten } from 'debe';
import { AGClientSocket } from 'debe-socket';
import { CHANNELS } from '../types';
import { delta } from './delta';
import { basic } from './basic';
import { SyncState } from '../state';
import { IListenReturn } from './type';

export class SyncEngine {
  syncState: SyncState;
  socket: AGClientSocket;
  db: Debe;
  constructor(socket: AGClientSocket, db: Debe, state: SyncState) {
    this.socket = socket;
    this.db = db;
    this.syncState = state;
  }

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

  initial(collections: string[], isDelta: Function) {
    const release = this.registerTask('initial');
    this.initialSyncComplete = this.initialSync(collections, isDelta).finally(
      () => {
        release();
      }
    );
    this.cancels.push(this.listenToDatabase(collections, isDelta));
    this.listenToSync();
  }

  close() {
    this.isClosing = true;
    this['_close'] = async () => {
      await Promise.all((this.cancels as any[]).map(x => x()));
    };
  }

  listenToSync() {
    const cancels: IListenReturn[] = [];
    cancels.push(delta.listen(this));
    cancels.push(basic.listen(this));
  }

  async getRemoteChangeCount(
    socket: AGClientSocket,
    collections: string[],
    syncState: SyncState
  ) {
    const remoteCounts = {};
    await Promise.all(
      collections.map(key => {
        return socket
          .invoke(CHANNELS.COUNT_INITIAL_DELTA, {
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

  listenToDatabase(collections: string[], isDelta: Function): IUnlisten {
    // this.serverCollectionListener(collection);
    return this.db.listen('*', async (error, items, options, key) => {
      if (error) {
        throw error;
      }
      await this.initialSyncComplete;
      if (this.socket.state !== 'open') {
        return;
      }
      const release = this.registerTask();
      if (
        !key ||
        collections.indexOf(key) === -1 ||
        options.synced === this.socket.id
      ) {
        return;
      }
      if (isDelta(key)) {
        delta.up(key, items, options, this);
      } else {
        basic
          .up(key, items, options, this)
          .catch(err => console.log('ERR', err, err.stack, this.socket.state))
          .finally(() => {
            release();
          });
      }
    });
  }

  async initialSync(collections: string[], isDelta: Function) {
    // Get all counts of changes
    const remoteCounts = await this.getRemoteChangeCount(
      this.socket,
      collections,
      this.syncState
    );
    const localCounts = await this.getLocalChangeCount(
      this.db,
      collections,
      this.syncState
    );
    for (var key of collections) {
      const down = isDelta(key) ? delta.initialDown : basic.initialDown;
      const persist = await down(
        key,
        this.syncState.remote(key),
        remoteCounts[key],
        this
      );
      const up = isDelta(key) ? delta.initialUp : basic.initialUp;
      const [local2, remote2] = await up(
        key,
        this.syncState.local(key),
        localCounts[key],
        this
      );
      const [local, remote] = await persist();
      this.syncState.update(key, local, remote);
      this.syncState.update(key, local2, remote2);
    }
  }
}
