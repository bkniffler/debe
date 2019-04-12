import {
  types,
  DebeAdapter,
  IListenerOptions,
  IObserverCallback,
  IInsert,
  IGetItem,
  chunkWork,
  IInsertItem,
  generate
} from 'debe';
import { create, ISocket } from 'asyngular-client';

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];
export class SocketAdapter extends DebeAdapter {
  socket: ISocket;
  constructor(hostname: string, port: number = 8000) {
    super();
    this.socket = create({
      hostname,
      port
    });
  }

  async $initialize() {
    this.middlewares = [];
    this.initialize();
  }
  initialize() {
    this.listen();
  }

  async close() {
    const promise = Promise.race([
      this.socket.listener('disconnect')['once'](),
      this.socket.listener('connectAbort')['once']()
    ]);
    this.socket.disconnect();
    return promise;
  }

  async listen() {
    for await (let event of this.socket.listener('connect')) {
      event;
    }
  }

  $all(...args: any[]) {
    return this.socket.invoke('all', args);
  }
  $count(...args: any[]) {
    return this.socket.invoke('count', args);
  }
  $get(...args: any[]) {
    return this.socket.invoke('get', args);
  }
  async $insert<T>(
    collection: string,
    items: (T & IGetItem)[],
    options: IInsert
  ) {
    return chunkWork<T & IInsertItem, T & IGetItem>(
      items,
      [250000, 10000],
      items => this.socket.invoke('insert', [collection, items, options])
    );
  }
  /*$insert(...args: any[]) {
    return this.socket.invoke('insert', args);
  }*/
  $remove(...args: any[]) {
    return this.socket.invoke('remove', args);
  }
  $listener<T>(options: IListenerOptions, callback: IObserverCallback<T>) {
    let channelId = generate();
    const listen = async () => {
      for await (let data of this.socket.receiver(channelId)) {
        callback(data);
      }
    };
    listen();
    this.socket.transmit('subscribe', [channelId, options]);
    const close = () => {
      setTimeout(() => this.socket.closeReceiver(channelId));
    };
    return close;
  }

  //
  get() {
    throw new Error('Not implemented');
  }
  remove() {
    throw new Error('Not implemented');
    return null as any;
  }
  all() {
    throw new Error('Not implemented');
    return null as any;
  }
  count() {
    throw new Error('Not implemented');
    return null as any;
  }
  insert() {
    throw new Error('Not implemented');
    return null as any;
  }
}
