import { Debe } from 'debe';
import { createBroker } from 'rpc1';
import { pluginSocketBroker } from 'rpc1-socket-server';
import { sync } from 'debe-sync';

export function createSocketServer(db: Debe, { port = 5555 } = {}) {
  return createBroker(async broker => {
    broker.plugin(pluginSocketBroker({ port }));
    const syncer = sync(db);
    const local = broker.local('debe', syncer.connect);
    return () => {
      local();
    };
  });
}
