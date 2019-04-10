import { Debe, IPlugin, types } from 'debe';
import { generate } from 'debe';
import { create, ISocket } from 'asyngular-client';

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];
export class SocketAdapter {
  socket: ISocket;
  constructor(hostname: string, port: number = 8000) {
    this.socket = create({
      hostname,
      port
    });
  }
  async close() {
    await Promise.race([
      this.socket.listener('disconnect')['once'](),
      this.socket.listener('connectAbort')['once']()
    ]);
    this.socket.disconnect();
  }
  connect(debe: Debe) {
    this.listen();
    socketPlugin(this)(debe);
  }
  async listen() {
    for await (let event of this.socket.listener('connect')) {
      event;
      // console.log('Socket is connected');
    }
  }
}

export const socketPlugin = (adapter: SocketAdapter): IPlugin => client => {
  client.addPlugin('socket', function adapterPlugin(type, payload, flow) {
    if (type === types.CLOSE) {
      adapter.close().then(() => flow(payload));
    } else if (allowedMethods.includes(type)) {
      const callback = flow.get('callback');
      const { socket } = adapter;
      if (callback) {
        /*let channel = adapter.socket.subscribe('foo');
        setTimeout(() => channel.unsubscribe(), 3000);
        for await (let data of channel) {
          console.log(data, channel);
        }*/
        let channelId = generate();
        const listen = async () => {
          for await (let data of socket.receiver(channelId)) {
            try {
              callback(data);
            } catch (err) {
              console.log(err);
            }
          }
        };
        listen();
        socket
          .invoke(`subscribe:${type}`, [channelId, payload])
          .catch((err: any) => {
            close();
            flow.return(undefined);
          });
        const close = () => {
          setTimeout(() => socket.closeReceiver(channelId));
        };
        return close;
      } else {
        socket
          .invoke(type, payload)
          .then((result: any) => {
            flow.return(result);
          })
          .catch((err: any) => {
            console.log(err);
            flow.return(undefined);
          });
      }
    } else {
      flow(payload);
    }
    return;
  });
};
