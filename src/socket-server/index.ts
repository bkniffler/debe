import { Broker, LocalAdapter, Service } from 'rpc1';
import { pluginSocketBroker } from 'rpc1-socket-server';
import { Debe } from 'debe';

export const createSocketServer = (db: Debe, port: number) => {
  const broker = new Broker();
  broker.plugin(pluginSocketBroker({ port }));
  const service = new Service('debe', new LocalAdapter(broker));
  attachSocketService(service, db);
  return async function unmount() {
    broker.close();
    service.close();
    await new Promise(yay => setTimeout(yay, 200));
  };
};

export const attachSocketService = (service: Service, db: Debe) => {
  service.addMethod('run', (type: string, payload: any) =>
    db[type](...payload)
  );
  service.addSubscription(
    'subscribe',
    (emit: any, type: string, payload: any) => db[type](...payload, emit)
  );
};
