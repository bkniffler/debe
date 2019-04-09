import { Debe, generate } from 'debe';
import * as http from 'http';
import { attach } from 'asyngular-server';
import { createServerChannels, createSocketChannels } from './server';
import { SyncClient } from 'debe-sync';

export class SyncServer {
  id = generate();
  port: number;
  httpServer = http.createServer();
  agServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe, port: number = 8000, syncTo: [string, number][] = []) {
    this.db = db;
    this.port = port;
    syncTo.forEach(([hostname, port]) => new SyncClient(db, hostname, port));
  }
  async initialize() {
    await this.db.initialize();
    this.serverListener();
    this.socketListener();
    setTimeout(() => this.httpServer.listen(this.port));
  }
  async serverListener() {
    createServerChannels(this.id, this.db, this.agServer);
  }
  async socketListener() {
    for await (let { socket } of this.agServer.listener('connection')) {
      createSocketChannels(this.db, socket, this.agServer);
    }
  }
  close() {
    this.httpServer.close();
  }
}
