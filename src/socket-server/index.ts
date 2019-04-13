import { Debe, IListenerOptions, listenTypes } from 'debe';
import * as http from 'http';
import { allowedMethods } from 'debe-socket';
import { attach, ISocketBase } from 'asyngular-server';

export class SocketServer {
  httpServer = http.createServer();
  agServer = attach(this.httpServer);
  db: Debe;
  constructor(db: Debe, port: number = 8000) {
    this.httpServer.listen(port);
    this.db = db;
    this.connect();
  }
  async close() {
    await this.agServer.close();
    this.httpServer.close();
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
    const handleSub = (data: any) => {
      socket.transmit(id, data);
    };
    this.db.adapter.listen(action, handleSub, options);
  }
}
