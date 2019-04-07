import { Debe } from 'debe';
import { Broker, LocalAdapter, Service } from 'rpc1';
import { pluginSocketBroker } from 'rpc1-socket-server';
import { sync } from 'debe-sync';

export function createSyncServer(db: Debe, { port = 5555 } = {}) {
  const broker = new Broker();
  broker.plugin(pluginSocketBroker({ port }));
  const syncer = sync(db);
  const local = new Service('debe', new LocalAdapter(broker));
  syncer.connect(local);
  return () => {
    broker.close();
    local.close();
  };
}
