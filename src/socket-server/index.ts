import { Debe } from 'debe';
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
      allowedMethods.forEach(method =>
        this.handleSubscriptions(socket, method)
      );
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
  async handleSubscriptions(socket: ISocketBase, method: string) {
    for await (let req of socket.procedure<[string, any]>(
      `subscribe:${method}`
    )) {
      const [id, data] = req.data;
      const handleSub = (error: any, data: any) => {
        socket.transmit(id, data);
      };
      this.db[method](data[0], data[1], handleSub);
      req.end(id);
    }
  }
}
