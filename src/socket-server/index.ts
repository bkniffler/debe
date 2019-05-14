import { Debe, IListenerOptions, listenTypes } from 'debe';
import * as http from 'http';
import { allowedMethods, ISocketBase } from 'debe-socket';
import { IAttach } from './types';
export * from './types';

export const attach = require('asyngular-server').attach as IAttach;

export class SocketServer {
  externalServer = false;
  httpServer = http.createServer();
  agServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe);
  constructor(db: Debe, port: number);
  constructor(db: Debe, server: http.Server);
  constructor(db: Debe, arg?: http.Server | number) {
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
    this.connect();
  }
  async close() {
    await this.agServer.close();
    if (!this.externalServer) {
      this.httpServer.close();
    }
  }
  async connect() {
    for await (let { socket } of this.agServer.listener('connection')) {
      allowedMethods.forEach(method => this.handleMethods(socket, method));
      this.handleSubscriptions(socket);
    }
  }
  async handleMethods(socket: ISocketBase, method: string) {
    for await (let req of socket.procedure(method)) {
      this.db[method](req.data[0], req.data[1])
        .then((result: any) => {
          req.end(result);
        })
        .catch((err: any) => req.error(err));
    }
  }
  async handleSubscriptions(socket: ISocketBase) {
    for await (let d of socket.receiver<
      [string, listenTypes, IListenerOptions]
    >('subscribe')) {
      const [id, action, options] = d as [
        string,
        listenTypes,
        IListenerOptions
      ];
      this.spawnListener(id, action, options, socket);
    }
  }
  spawnListener(
    id: string,
    action: listenTypes,
    options: IListenerOptions,
    socket: ISocketBase
  ) {
    const handleSub = (error: any, data: any) => {
      socket.transmit(id, [error ? error.message : undefined, data]);
    };
    this.db.dispatcher.listen(action, handleSub, options);
  }
}
