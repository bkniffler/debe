import { createBroker, IService } from 'rpc1';
import { pluginSocketBroker } from 'rpc1-socket-server';
import { Debe } from 'debe';

export const createSocketServer = (db: Debe, port: number) => {
  let local: any;
  const destroy = createBroker(async broker => {
    broker.plugin(pluginSocketBroker({ port }));
    local = broker.local('debe', service => attachSocketService(service, db));
  });
  return async function unmount() {
    destroy();
    if (local) {
      local();
    }
    await new Promise(yay => setTimeout(yay, 200));
  };
};

export const attachSocketService = (service: IService, db: Debe) => {
  service.addMethod('run', (type: string, payload: any) =>
    db[type](...payload)
  );
  service.addSubscription(
    'subscribe',
    (emit: any, type: string, payload: any) => db[type](...payload, emit)
  );
};
