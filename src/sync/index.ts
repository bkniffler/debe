import { Debe } from 'debe';
import { IAddress } from './types';
import { ISocket, create, IConnectionState } from 'asyngular-client';
import { DebeBackend } from 'debe-adapter';
export * from './types';
export * from './constants';
export * from './utils';
import { SyncState } from './state';
import { SyncEngine } from './sync';
import { ensureSync } from './ensure-sync';

export class Sync {
  syncState: SyncState;
  engine: SyncEngine;
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
  get initialSync() {
    return this.engine.initialSyncComplete;
  }
  get isSyncing() {
    return this.engine.isSyncing;
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
  async connect() {
    await this.db.initialize();
    await this.syncState.init();
    this.engine = new SyncEngine(this.socket, this.db, this.syncState);
    // console.log(this.syncState);
    const { collections } = this.db.dispatcher as DebeBackend;
    const isDelta = (key: string) => collections[key]['sync'] === 'delta';
    const keys = Object.keys(collections).filter(x => collections[x]['sync']);
    this.engine.initial(keys, isDelta);
    this['_close'] = async () => this.engine.close();
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
