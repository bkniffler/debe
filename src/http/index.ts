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

export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];

export class HttpDebe extends Debe {
  constructor(uri: string) {
    super(new HttpAdapter(uri));
  }
}

export class HttpAdapter extends DebeDispatcher {
  uri = '';
  constructor(uri: string) {
    super();
    this.uri = uri;
  }

  async initialize() {
    // await this.socket.listener('connect').once();
    this.start();
  }

  async close() {}

  async start() {}

  private _run<T>(
    action: actionTypes,
    collection: string,
    payload: any,
    options: any
  ) {
    return fetch(`${this.uri}/${collection}/${action}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: payload,
        options
      })
    }).then(response => response.json());
  }
  queries: { [s: string]: Function[] } = {};
  run<T>(action: actionTypes, collection: string, payload: any, options: any) {
    if (action === 'insert') {
      return chunkWork<T & IInsertItem, T & IGetItem>(
        payload,
        [250000, 10000],
        items => this._run('insert', collection, items, options)
      ).then(() => {
        if (this.queries[collection]) {
          this.queries[collection].forEach(x => x());
        }
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
      const interval = setInterval(fetch, 5000);
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
