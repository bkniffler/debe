import { Debe, types, softDeletePlugin, createLog } from 'debe';
import { syncstateTable } from './constants';
import { initiateSync } from './sync';
import { IAddress } from './types';
import { waitFor } from './utils';
import { ISocket, create } from 'asyngular-client';

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
    db.addPlugin(
      'sync',
      (type, payload, flow) => {
        if (type === types.INITIALIZE) {
          payload.collections = [
            ...payload.collections,
            { name: syncstateTable }
          ];
        }
        /*if (type === types.COLLECTION) {
          (payload as ICollection).specialFields.ver = 'ver';
          (payload as ICollection).fields['ver'] = fieldTypes.STRING;
          (payload as ICollection).index['ver'] = fieldTypes.STRING;
        }
        if (type === types.INSERT) {
          const collections = flow.get('collections', {});
          const [m, value, x = {}] = payload as [string, any[], any];
          if (!x.syncFrom) {
            const collection = collections[m] as ICollection;
            if (collection.specialFields.ver) {
              return flow([
                m,
                value.map(x => {
                  x.ver = toISO(new Date());
                  return x;
                }),
                x
              ]);
            }
          }
        }*/
        return flow(payload);
      },
      'AFTER',
      'corePlugin'
    );
    softDeletePlugin()(db);
  }
  forceSync() {
    return new Promise(yay => setTimeout(yay, 3000));
  }
  close() {
    if (this['_close']) {
      this['_close']();
    }
  }
  async connect(socket: ISocket) {
    const initialized = await waitFor(() => this.db.isInitialized);
    if (!initialized) {
      throw new Error('Please initialize the database');
    }
    // LOgic
    let cancels: Function[] = [];
    Object.keys(this.db.collections)
      .filter(x => x !== syncstateTable)
      .forEach(table => {
        cancels.push(
          initiateSync(
            this.db,
            socket,
            this.db.collections[table],
            this.where,
            log
          )
        );
      });
    this['_close'] = () => {
      if (!cancels) {
        return;
      }
      (cancels as any[]).map(x => x());
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
  close() {
    this.socket.disconnect();
  }
}
