import { Debe } from 'debe';
import { IAddress } from './types';
import { ISocket, create, IConnectionState } from 'asyngular-client';
import { DebeBackend } from 'debe-adapter';
export * from './types';
export * from './constants';
export * from './utils';
import { SyncState } from './state';
import { listenToDatabase, initialSync, listenToSync } from './sync';
import { ensureSync } from './ensure-sync';

export class Sync {
  syncState: SyncState;
  socket: ISocket;
  db: Debe;
  where?: string[];
  constructor(db: Debe, [hostname = 'localhost', port = 8000]: IAddress = []) {
    this.db = db;
    this.syncState = new SyncState(db);
    ensureSync(this.db);
    this.db['sync'] = this;
    this.socket = create({
      hostname,
      port
    });
  }
  async initialize() {
    await this.db.initialize();
    this.loop();
    return this;
  }
  forceSync() {
    return new Promise(yay => setTimeout(yay, 3000));
  }
  async close() {
    if (this['_close']) {
      await this['_close']();
    }
    this.socket.disconnect();
    await this.db.close();
  }
  async disconnect() {
    if (this['_close']) {
      await this['_close']();
    }
    this.socket.disconnect();
  }
  initialSyncComplete = Promise.resolve();
  async connect() {
    await this.db.initialize();
    await this.syncState.init();
    // console.log(this.syncState);
    let cancels: Function[] = [];
    const { collections } = this.db.dispatcher as DebeBackend;
    const isDelta = (key: string) => collections[key]['sync'] === 'delta';
    const keys = Object.keys(collections).filter(x => collections[x]['sync']);
    initialSync(keys, isDelta, this.socket, this.db, this.syncState);
    cancels.push(
      listenToDatabase(
        keys,
        isDelta,
        this.db,
        this.socket,
        this.initialSyncComplete
      )
    );

    cancels.push(listenToSync(this.socket, this.db, this.syncState));
    this['_close'] = async () => {
      await Promise.all((cancels as any[]).map(x => x()));
    };
  }
  listener() {}
  get state() {
    return this.socket.state;
  }
  onConnectionState(func: (state: IConnectionState) => void) {
    let cancel = false;
    (async () => {
      for await (let event of this.socket.listener('connect')) {
        event;
        if (cancel) {
          return;
        }
        func(this.state);
      }
    })();
    (async () => {
      for await (let event of this.socket.listener('disconnect')) {
        event;
        if (cancel) {
          return;
        }
        func(this.state);
      }
    })();
    return () => (cancel = true);
  }
  async loop() {
    if (this.state !== 'open') {
      await this.socket.listener('connect').once();
    }
    if (this.state !== 'open') {
      this.loop();
    } else {
      this.connect();
    }
  }
}
