import {
  types,
  IListenerOptions,
  IObserverCallback,
  actionTypes,
  listenTypes,
  DebeDispatcher,
  Debe
} from 'debe';
import { generate } from 'debe-adapter';
import fetch from 'cross-fetch';

/*

Listen
  => Manual query
  => Query every x ms
Manual Query

Query
Attach to queue
Wait x ms for closing batch
Refresh
Send
Respond

*/

export const batchTimeout = 100;
export const refetchInterval = 5000;
export const allowedMethods = [
  types.INSERT,
  types.REMOVE,
  types.GET,
  types.ALL,
  types.COUNT
];

export type IHttpDebeHandler = (args: IHandlerArgs[]) => Promise<any[]>;
export class HttpDebe extends Debe {
  constructor(handler: IHttpDebeHandler | string) {
    super(new HttpAdapter(handler) as any);
  }
}

export interface IHandlerArgs {
  method: actionTypes;
  collection: string;
  query: any;
  options: any;
}

export function createDefaultHandler(uri: string) {
  return (args: IHandlerArgs[]) => {
    return fetch(uri, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
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
  refetchInterval: NodeJS.Timeout;
  // Refetch listeners
  refetcher() {
    Object.keys(this.queries).forEach(key => {
      Object.keys(this.queries[key]).forEach(id => {
        this.queries[key][id]();
      });
    });
  }

  async initialize() {
    // await this.socket.listener('connect').once();
    this.start();
  }

  async start() {
    this.refetchInterval = setInterval(this.refetcher, refetchInterval);
  }

  async close() {
    clearInterval(this.refetchInterval);
  }

  queries: { [s: string]: { [s: string]: Function } } = {};
  queue?: {
    args: {
      [key: string]: {
        args: IHandlerArgs;
        resolvers: ((result: any) => void)[];
      };
    };
    timeout: any;
    refetchers: { [key: string]: boolean };
  };
  run<T>(
    action: actionTypes,
    collection: string,
    payload: any,
    options: any,
    queryId?: string
  ) {
    const queryKey =
      action === 'insert'
        ? generate()
        : `${collection}${action}${JSON.stringify(payload)}`;
    /*if (action === 'insert' && payload.length > 10000) {
      console.log('LENGTH', payload.length);
      return chunkWork<T & IInsertItem, T & IGetItem>(
        payload,
        [250000, 10000],
        items => this.run(action, collection, items, options)
      ).then(x => {
        if (this.queries[collection]) {
          this.queries[collection].forEach(x => x());
        }
        return x[0];
      });
    }*/
    if (!this.queue) {
      this.queue = {
        args: {},
        timeout: undefined,
        refetchers: {}
      };
    }
    let y: (result: any) => void;
    let n: (err: any) => any;
    if (!this.queue.args[queryKey]) {
      this.queue.args[queryKey] = {
        args: {
          method: action,
          collection,
          query: payload,
          options
        },
        resolvers: []
      };
    }
    // Add query id to refetchers so it doesnt get refetched again (listener)
    if (queryId) {
      this.queue.refetchers[queryId] = true;
    }
    if (action === 'insert') {
      // Refetch inserted collections
      if (this.queries[collection]) {
        const { refetchers } = this.queue;
        Object.keys(this.queries[collection]).forEach(key => {
          // Has already been queued? Then skip
          if (refetchers[key]) {
            return;
          }
          refetchers[key] = true;
          const func = this.queries[collection][key];
          func();
        });
      }
    }
    this.queue.args[queryKey].resolvers.push(result => {
      if (result.error) {
        n(result);
      } else {
        y(result);
      }
    });
    clearTimeout(this.queue.timeout);
    const { args } = this.queue;
    this.queue.timeout = setTimeout(() => {
      this.queue = undefined;
      const keys = Object.keys(args);
      this.handler(keys.map(key => args[key].args)).then(results => {
        results.forEach((result, index) => {
          const key = keys[index];
          args[key].resolvers.forEach(resolver => resolver(result));
        });
      });
    }, batchTimeout);
    return new Promise<T>((yay, nay) => {
      y = yay;
      n = nay;
    });
  }

  listen<T>(
    action: listenTypes,
    callback: IObserverCallback<T>,
    options: IListenerOptions = {}
  ) {
    const { collection, query } = options;
    if (collection) {
      const queryId = generate();
      const fetch = () => {
        return this.run(action, collection || '', query, {}, queryId)
          .then(x => callback(undefined, x as any))
          .catch(x => callback(x, undefined as any));
      };
      fetch();
      if (!this.queries[collection]) {
        this.queries[collection] = {};
      }
      this.queries[collection][queryId] = fetch;
      return () => {
        delete this.queries[collection][queryId];
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
