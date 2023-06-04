import {
  types,
  IListenerOptions,
  IObserverCallback,
  IGetItem,
  chunkWork,
  IInsertItem,
  actionTypes,
  listenTypes,
  DebeDispatcher,
  Debe
} from 'debe';

import { AGClientSocket, create }  from 'socketcluster-client';

export { AGClientSocket, create }  from 'socketcluster-client';

 export { type IConnectionState } from './types';

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];

export class SocketDebe extends Debe {
  constructor([hostname, port = 8000]: [string, number]) {
    super(new SocketAdapter(hostname, port));
  }
}

export class SocketAdapter extends DebeDispatcher {
  socket: AGClientSocket;
  constructor(hostname: string, port: number = 8000, secure?: boolean) {
    super();
    this.socket = create({
      hostname,
      secure: secure === true || secure === false ? secure : port === 443,
      port,
      pingTimeoutDisabled: true,
    });
  }

  async initialize() {
    // await this.socket.listener('connect').once();
    this.start();
  }

  async close() {
    const promise = Promise.race([
      this.socket.listener('disconnect')['once'](),
      this.socket.listener('connectAbort')['once']()
    ]);
    this.socket.disconnect();
    await promise;
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
    let channelId = `${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const listen = async () => {
      for await (let data of this.socket.receiver(channelId)) {
        callback(data[0], data[1]);
      }
    };
    listen();
    this.socket.transmit('subscribe', [channelId, action, options]);
    const close = async () => {
      return this.socket.closeReceiver(channelId);
    };
    return close;
  }
}
