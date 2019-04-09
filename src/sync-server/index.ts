import { Debe } from 'debe';
import * as http from 'http';
import { attach } from 'asyngular-server';
import { createServerChannels, createSocketChannels } from './server';

export class SyncServer {
  port: number;
  httpServer = http.createServer();
  agServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe, port: number = 8000) {
    this.db = db;
    this.port = port;
  }
  async initialize() {
    await this.db.initialize();
    this.listen2();
    this.listen();
    setTimeout(() => this.httpServer.listen(this.port));
  }
  async listen2() {
    createServerChannels(this.db, this.agServer);
  }
  async listen() {
    for await (let { socket } of this.agServer.listener('connection')) {
      createSocketChannels(this.db, socket, this.agServer);
    }
  }
  close() {
    this.httpServer.close();
  }
}
