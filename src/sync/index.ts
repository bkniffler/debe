import { Debe, createLog, ensureCollection } from 'debe';
import { syncstateTable } from './constants';
import { initiateSync } from './sync';
import { IAddress } from './types';
import { ISocket, create } from 'asyngular-client';
import { DebeBackend } from 'debe-adapter';

export * from './sync';
export * from './types';
export * from './constants';
export * from './utils';
const log = createLog('sync');

export class Sync {
  db: Debe;
  where?: string[];
  constructor(db: Debe, where?: string[]) {
    this.db = db;
    this.where = where;
    (db.dispatcher as DebeBackend).middlewares.push({
      collections(collections) {
        collections[syncstateTable] = ensureCollection({
          name: syncstateTable
        });
        return collections;
      }
    });
  }
  async initialize() {
    await this.db.initialize();
    return this;
  }
  forceSync() {
    return new Promise(yay => setTimeout(yay, 3000));
  }
  async close() {
    if (this['_close']) {
      await this['_close']();
    }
  }
  async connect(socket: ISocket) {
    await this.db.initialize();
    // LOgic
    let cancels: Function[] = [];
    const collections = (this.db.dispatcher as DebeBackend).collections;
    Object.keys(collections)
      .filter(x => x !== syncstateTable)
      .forEach(table => {
        cancels.push(
          initiateSync(this.db, socket, collections[table], this.where, log)
        );
      });
    this['_close'] = async () => {
      await Promise.all((cancels as any[]).map(x => x()));
    };
  }
}

export class SyncClient extends Sync {
  socket: ISocket;
  constructor(db: Debe, [hostname = 'localhost', port = 8000]: IAddress = []) {
    super(db);
    this.socket = create({
      hostname,
      port
    });
    this.loop();
  }
  async loop() {
    for await (let event of this.socket.listener('connect')) {
      event;
      this.connect(this.socket);
    }
  }
  async close() {
    await super.close();
    /*const promise = Promise.race([
      this.socket.listener('disconnect')['once'](),
      this.socket.listener('connectAbort')['once']()
    ]);*/
    this.socket.disconnect();
    // await promise;
    await this.db.close();
  }
}
