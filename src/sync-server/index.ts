import { Debe, generate } from 'debe';
import * as http from 'http';
import { attach } from 'asyngular-server';
import { createServerChannels, createSocketChannels } from './server';
import { SyncClient, IAddress } from 'debe-sync';

export class SyncServer {
  id = generate();
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
  }
  async initialize() {
    await this.db.initialize();
    this.serverListener();
    this.socketListener();
    setTimeout(() => this.httpServer.listen(this.port));
    return this;
  }
  async serverListener() {
    createServerChannels(this.id, this.db, this.agServer);
  }
  async socketListener() {
    for await (let { socket } of this.agServer.listener('connection')) {
      createSocketChannels(this.db, socket, this.agServer);
    }
  }
  async close() {
    await Promise.all(this.sockets.map(socket => socket.close()));
    await this.agServer.close();
    this.httpServer.close();
    await this.db.close();
  }
}
