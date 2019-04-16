import { Debe } from 'debe';
import * as http from 'http';
import { attach } from 'asyngular-server';
import { createSocketChannels } from './server';
import { SyncClient, IAddress } from 'debe-sync';
import { DebeBackend } from 'debe-adapter';

export class SyncServer {
  id = `${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  port: number;
  sockets: SyncClient[] = [];
  httpServer = http.createServer();
  agServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe, port: number = 8000, syncTo?: IAddress[] | IAddress) {
    this.db = db;
    this.port = port;
    if (syncTo && syncTo.length) {
      if (!Array.isArray(syncTo[0])) {
        syncTo = [syncTo] as any;
      }
      this.sockets = (syncTo as IAddress[]).map(
        (pair: IAddress) => new SyncClient(db, pair)
      );
    }

    this.agServer.setMiddleware(
      this.agServer.MIDDLEWARE_OUTBOUND,
      async middlewareStream => {
        for await (let action of middlewareStream) {
          // Don't publish back to origin socket
          if (
            action.type === action.PUBLISH_OUT &&
            action.data[0] === action.socket.id
          ) {
            action.block();
            continue;
          }
          action.allow();
        }
      }
    );
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
    this.socketListener();
    this.serverListener();
    setTimeout(() => this.httpServer.listen(this.port));
    return this;
  }
  async socketListener() {
    for await (let { socket } of this.agServer.listener('connection')) {
      createSocketChannels(this.db, socket);
    }
  }
  async serverListener() {
    const collections = (this.db.dispatcher as DebeBackend).collections;
    for (let key in collections) {
      const collection = collections[key];
      // this.serverCollectionListener(collection);
      this.db.listen(collection.name, (items, options) => {
        this.agServer.exchange.invokePublish(collection.name, [
          options.synced || this.id,
          items
        ]);
      });
    }
  }
  /*async serverCollectionListener(collection: ICollection) {
    const channel = this.agServer.exchange.subscribe<[string, IGetItem[]]>(
      collection.name
    );
    for await (let data of channel) {
      const [id, payload] = data;
      if (id === this.id) continue;
      await this.db
        .insert(collection.name, payload, { synced: 'master' } as any)
        .catch(x => console.error('Error while client.insert', x) as any);
    }
  }*/
  async disconnect() {
    await Promise.all(this.sockets.map(socket => socket.close()));
    await this.agServer.close();
    this.httpServer.close();
  }
  async close() {
    await Promise.all(this.sockets.map(socket => socket.close()));
    await this.agServer.close();
    this.httpServer.close();
    await this.db.close();
  }
}
