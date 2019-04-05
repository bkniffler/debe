import { createBroker } from 'rpc1';
import { pluginSocketBroker } from 'rpc1-socket-server';
import { Debe } from 'debe';

export const createSocketServer = (db: Debe, port: number) => {
  let local: any;
  const destroy = createBroker(async broker => {
    await db.initialize();
    broker.plugin(pluginSocketBroker({ port }));
    local = broker.local('debe', service => {
      service.addMethod('run', (type: string, payload: any) =>
        db[type](...payload)
      );
      service.addSubscription(
        'subscribe',
        (emit: any, type: string, payload: any) => db[type](...payload, emit)
      );
    });
  });
  return async function unmount() {
    destroy();
    if (local) {
      local();
    }
    await new Promise(yay => setTimeout(yay, 200));
  };
};
