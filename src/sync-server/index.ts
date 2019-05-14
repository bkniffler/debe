import { Debe, ensureCollection } from 'debe';
import * as http from 'http';
import { ISocketBase } from 'debe-socket';
import { attach, IAGServer } from 'debe-socket-server';
import { Sync, IAddress, syncstateTable } from 'debe-sync';
import { DebeBackend, addMiddleware, addPlugin } from 'debe-adapter';
import { deltaPlugin } from 'debe-delta';
import {
  createDeltaProcedures,
  createBasicProcedures,
  databaseListener,
  addFilterMiddleware
} from './sync';

class SocketHandler {
  handlers: any[];
  constructor(db: Debe, socket: ISocketBase, agServer: IAGServer) {
    this.start(db, socket, agServer);
  }
  async start(db: Debe, socket: ISocketBase, agServer: IAGServer) {
    this.handlers = [
      createDeltaProcedures(db, socket, agServer),
      createBasicProcedures(db, socket)
    ];
  }
  stop() {
    this.handlers.forEach(x => x());
  }
}
export class SyncServer {
  externalServer = false;
  id = `${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  sockets: Sync[] = [];
  httpServer = http.createServer();
  agServer: IAGServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe, server?: http.Server, syncTo?: IAddress[] | IAddress);
  constructor(db: Debe, port?: number, syncTo?: IAddress[] | IAddress);
  constructor(
    db: Debe,
    arg?: number | http.Server,
    syncTo?: IAddress[] | IAddress
  ) {
    if (!arg) {
      arg = 8000;
    }
    if (typeof arg === 'number') {
      this.httpServer.listen(arg);
    } else {
      this.httpServer = arg;
      this.externalServer = true;
    }
    this.db = db;
    // this.port = port;

    const backend = this.db.dispatcher as DebeBackend;
    if (backend.middlewares) {
      addMiddleware(backend, {
        name: 'sync',
        collection(collection) {
          if (collection['sync'] && collection['sync'] === 'delta') {
            addPlugin(collection, 'delta');
          }
          return collection;
        },
        collections(collections) {
          collections[syncstateTable] = ensureCollection({
            name: syncstateTable
          });
          return collections;
        }
      });

      deltaPlugin(backend);
    }

    if (syncTo && syncTo.length) {
      if (!Array.isArray(syncTo[0])) {
        syncTo = [syncTo] as any;
      }
      this.sockets = (syncTo as IAddress[]).map(
        (pair: IAddress) => new Sync(db, pair)
      );
    }

    addFilterMiddleware(this.agServer);
    this.agServer.setMiddleware(
      this.agServer.MIDDLEWARE_INBOUND,
      async middlewareStream => {
        for await (let action of middlewareStream) {
          /*if (action.type === action.PUBLISH_IN) {
          let authToken = action.socket.authToken;
          if (
            !authToken ||
            !Array.isArray(authToken.channels) ||
            authToken.channels.indexOf(action.channel) === -1
          ) {
            let publishError = new Error(
              `You are not authorized to publish to the ${action.channel} channel`
            );
            publishError.name = 'PublishError';
            action.block(publishError);
    
            continue; // Go to the start of the loop to process the next inbound action.
          }
        }*/
          // Any unhandled case will be allowed by default.
          action.allow();
        }
      }
    );
  }
  async initialize() {
    await this.db.initialize();
    await Promise.all(this.sockets.map(socket => socket.initialize()));
    this.listen();
    databaseListener(this.agServer, this.db, this.id);
    return this;
  }
  clients: { [key: string]: SocketHandler } = {};
  async listen() {
    (async () => {
      for await (let { socket } of this.agServer.listener('connection')) {
        this.clients[socket.id] = new SocketHandler(
          this.db,
          socket,
          this.agServer
        );
      }
    })();
    (async () => {
      for await (let { socket } of this.agServer.listener('disconnection')) {
        this.clients[socket.id].stop();
      }
    })();
  }
  async disconnect() {
    await Promise.all(this.sockets.map(socket => socket.close()));
    await this.agServer.close();
    this.httpServer.close();
  }
  async close() {
    await Promise.all(this.sockets.map(socket => socket.close()));
    Object.keys(this.clients).map(key => this.clients[key].stop());
    this.agServer.closeAllListeners();
    await this.agServer.close();
    this.httpServer.close();
    await this.db.close();
  }
}
