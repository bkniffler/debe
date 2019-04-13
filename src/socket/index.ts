import {
  types,
  IListenerOptions,
  IObserverCallback,
  IGetItem,
  chunkWork,
  IInsertItem,
  generate,
  actionTypes,
  listenTypes,
  DebeDispatcher,
  Debe
} from 'debe';
import { create, ISocket } from 'asyngular-client';

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];

export class SocketDebe extends Debe {
  constructor(
    [hostname, port = 8000]: [string, number],
    options: {
      [s: string]: any;
    } = {}
  ) {
    super(new SocketAdapter(hostname, port), [], options);
  }
}

export class SocketAdapter extends DebeDispatcher {
  socket: ISocket;
  constructor(hostname: string, port: number = 8000) {
    super();
    this.socket = create({
      hostname,
      port
    });
  }

  async initialize() {
    this.start();
  }

  async close() {
    const promise = Promise.race([
      this.socket.listener('disconnect')['once'](),
      this.socket.listener('connectAbort')['once']()
    ]);
    this.socket.disconnect();
    return promise;
  }

  async start() {
    for await (let event of this.socket.listener('connect')) {
      event;
    }
  }

  run<T>(action: actionTypes, collection: string, payload: any, options: any) {
    if (action === 'insert') {
      return chunkWork<T & IInsertItem, T & IGetItem>(
        payload,
        [250000, 10000],
        items => this.socket.invoke('insert', [collection, items, options])
      );
    }
    return this.socket.invoke(action, [collection, payload, options]);
  }
  listen<T>(
    action: listenTypes,
    callback: IObserverCallback<T>,
    options: IListenerOptions
  ) {
    let channelId = generate();
    const listen = async () => {
      for await (let data of this.socket.receiver(channelId)) {
        callback(data);
      }
    };
    listen();
    this.socket.transmit('subscribe', [channelId, action, options]);
    const close = () => {
      setTimeout(() => this.socket.closeReceiver(channelId));
    };
    return close;
  }
}
