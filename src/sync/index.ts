import { Debe, createLog, ensureCollection } from 'debe';
import { syncstateTable } from './constants';
import { initiateSync } from './sync';
import { IAddress } from './types';
import { ISocket, create, IConnectionState } from 'asyngular-client';
import { DebeBackend } from 'debe-adapter';

export * from './sync';
export * from './types';
export * from './constants';
export * from './utils';
const log = createLog('sync');

export class Sync {
  socket: ISocket;
  db: Debe;
  where?: string[];
  constructor(db: Debe, [hostname = 'localhost', port = 8000]: IAddress = []) {
    this.db = db;
    // this.where = where;
    const backend = this.db.dispatcher as DebeBackend;
    if (backend.middlewares) {
      (db.dispatcher as DebeBackend).middlewares.push({
        collections(collections) {
          collections[syncstateTable] = ensureCollection({
            name: syncstateTable
          });
          return collections;
        }
      });
    }
    this.db['sync'] = this;
    this.socket = create({
      hostname,
      port
    });
  }
  async initialize() {
    await this.db.initialize();
    this.loop();
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
  async connect() {
    await this.db.initialize();
    // LOgic
    let cancels: Function[] = [];
    const collections = (this.db.dispatcher as DebeBackend).collections;
    Object.keys(collections)
      .filter(x => x !== syncstateTable)
      .forEach(table => {
        cancels.push(
          initiateSync(
            this.db,
            this.socket,
            collections[table],
            this.where,
            log
          )
        );
      });
    this['_close'] = async () => {
      await Promise.all((cancels as any[]).map(x => x()));
    };
  }
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
    await this.socket.listener('connect').once();
    this.connect();
  }
}
