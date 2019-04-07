import { Debe, IPlugin, types } from 'debe';
import { SocketAdapter as RPCSocketAdapter } from 'rpc1-socket';
import { waitFor, Service } from 'rpc1';

interface IDebeRpc {
  run: (type: string, payload: [string, any]) => Promise<any>;
  subscribe: (
    type: string,
    payload: [string, any],
    callback: any
  ) => () => void;
}
export class SocketAdapter {
  proxy: IDebeRpc;
  constructor(url: string) {
    const service = new Service(new RPCSocketAdapter(url));
    this.proxy = service.use<IDebeRpc>('debe');
  }
  async destroy() {}
  connect(debe: Debe) {
    socketPlugin(this)(debe);
  }
}

export const socketPlugin = (adapter: SocketAdapter): IPlugin => client => {
  client.addPlugin('socket', function adapterPlugin(type, payload, flow) {
    if (type === types.DESTROY) {
      adapter.destroy().then(() => flow(payload));
    } else if (type === types.INITIALIZE) {
      waitFor(() => !!adapter.proxy).then(x => {
        if (!adapter.proxy) {
          throw new Error('Could not connect to proxy');
        }
        flow(payload);
      });
    } else if (
      [types.INSERT, types.REMOVE, types.GET, types.ALL, types.COUNT].includes(
        type
      )
    ) {
      const callback = flow.get('callback');
      if (callback) {
        try {
          return adapter.proxy.subscribe(type, payload, callback);
        } catch (err) {
          console.log(err);
        }
      } else {
        adapter.proxy
          .run(type, payload)
          .then(result => {
            flow.return(result);
          })
          .catch(err => {
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
