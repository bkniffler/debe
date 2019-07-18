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
import fetch from 'cross-fetch';

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];

export type IHttpDebeHandler = (
  method: actionTypes,
  collection: string,
  query: any,
  options: any
) => Promise<any>;
export class HttpDebe extends Debe {
  constructor(handler: IHttpDebeHandler | string) {
    super(new HttpAdapter(handler));
  }
}

export function createDefaultHandler(uri: string) {
  return (
    method: actionTypes,
    collection: string,
    query: any,
    options: any
  ) => {
    return fetch(uri, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection,
        method,
        query,
        options
      })
    })
      .then(response => response.json())
      .then(x => {
        if (x.err) {
          throw x.err;
        }
        return x;
      });
  };
}

export class HttpAdapter extends DebeDispatcher {
  uri = '';
  handler: IHttpDebeHandler;
  constructor(handler: IHttpDebeHandler | string) {
    super();
    if (typeof handler === 'string') {
      this.handler = createDefaultHandler(handler);
    } else {
      this.handler = handler;
    }
  }

  async initialize() {
    // await this.socket.listener('connect').once();
    this.start();
  }

  async close() {}

  async start() {}

  private _run<T>(
    method: actionTypes,
    collection: string,
    query: any,
    options: any
  ) {
    return this.handler(method, collection, query, options);
  }
  queries: { [s: string]: Function[] } = {};
  run<T>(action: actionTypes, collection: string, payload: any, options: any) {
    if (action === 'insert') {
      return chunkWork<T & IInsertItem, T & IGetItem>(
        payload,
        [250000, 10000],
        items => this._run('insert', collection, items, options)
      ).then(x => {
        if (this.queries[collection]) {
          this.queries[collection].forEach(x => x());
        }
        return x;
      });
    }
    return this._run(action, collection, payload, options);
  }
  listen<T>(
    action: listenTypes,
    callback: IObserverCallback<T>,
    options: IListenerOptions = {}
  ) {
    const { collection, query } = options;
    if (collection) {
      const fetch = () =>
        this.run(action, collection || '', query, {})
          .then(x => callback(undefined, x))
          .catch(x => callback(x, undefined as any));
      const interval = setInterval(
        fetch,
        process.env.NODE_ENV === 'test' ? 10 : 5000
      );
      fetch();
      if (!this.queries[collection]) {
        this.queries[collection] = [];
      }
      this.queries[collection].push(fetch);
      return () => {
        const index = this.queries[collection].indexOf(fetch);
        if (index >= 0) {
          this.queries[collection].splice(index, 1);
        }
        clearInterval(interval);
      };
    }
    return () => {};
    /*let channelId = `${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const listen = async () => {
      for await (let data of this.socket.receiver(channelId)) {
        callback(data[0], data[1]);
      }
    };
    listen();
    this.socket.transmit('subscribe', [channelId, action, options]);
    const close = () => {
      setTimeout(() => this.socket.closeReceiver(channelId));
    };
    return close;*/
  }
}
