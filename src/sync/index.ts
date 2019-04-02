import { Debe, IItem, IGetItem, generate, ILog, addToQuery } from 'debe';
import { IService, IBroker } from 'rpc1';
import { createSocket } from 'rpc1-socket';
import { ISync, ISyncItem } from './types';

/*function createCache(onSubmit: (items: any[]) => Promise<void>, limit = 100) {
  let items: any[] = [];
  function submit() {
    const itemsToSend = items.slice(0, limit);
    onSubmit(itemsToSend).then(() => {
      items = items.slice(itemsToSend.length);
    });
  }
  return function add(item: any) {
    items.push(item);
    if (items.length >= limit) {
      submit();
    }
  };
}*/

const syncstateTable = 'syncstate';

async function createServerChannels(client: Debe, service: IService) {
  service.addMethod('initialFetchChanges', (
    table: string,
    // state: any = {},
    since?: string,
    where?: [string, ...any[]]
  ) => {
    if (since) {
      where = addToQuery(where, 'AND', 'rev >= ?', since);
    }
    return client
      .all(table, { where, orderBy: ['rev ASC', 'id ASC'] })
      .then(result => {
        return result;
        /*const response: ISyncInitialResponse = {
          items: [],
          request: []
        };
        result.forEach(item => {
          if (!state[item.id]) {
            response.items.push(item);
            return;
          }
          const comp = state[item.id].localeCompare(item.rev);
          delete state[item.id];
          if (comp === -1) {
            response.items.push(item);
          } else if (comp === 1) {
            response.request.push(item.id);
          }
        });
        Object.keys(state).forEach(x => response.request.push(x));
        return response;*/
      });
  });
  service.addMethod(
    'sendChanges',
    (table: string, items: IItem[], options: any = {}) => {
      return client.insert(table, items, options);
    }
  );
  service.addSubscription(
    'listenToChanges',
    (emit, model: string, clientID: string) => {
      return client.listen(
        model || '*',
        (value: IGetItem[], options: any = {}) => {
          if (options.syncFrom === clientID) {
            return;
          }
          emit(null, model, value);
        }
      );
    }
  );
}

async function initiateSync(
  client: Debe,
  clientID: string,
  service: IService,
  name: string,
  table: string,
  where: any,
  log: ILog
) {
  const id = `${name}-${table}`;
  const server = service.use<ISync>(name);
  const syncState = await client.get<ISyncItem>(syncstateTable, { id });
  // const x = await client.insert(syncstateTable, { id });
  /*const currentState = await client.all(table, {
    where: syncState ? ['rev >= ?', syncState.lastSync] : undefined,
    orderBy: ['rev ASC', 'id ASC']
  });
  const stateObject = currentState.reduce((state, item) => {
    state[item.id] = item.rev;
    return state;
  }, {});
  log.info(
    `Starting sync ${name}:${table}: ${currentState.length} initial items`
  );*/
  const remoteChanges = await server.initialFetchChanges(
    table,
    syncState ? syncState.remote : undefined,
    where
  );
  const localChanges = await client.all(table, {
    where: syncState ? ['rev >= ?', syncState.local] : undefined,
    orderBy: ['rev ASC', 'id ASC']
  });
  log.info(
    `Remote sync state ${name}:${table}: ${
      remoteChanges.length
    } remote items to get, ${localChanges.length} local items to send`
  );
  const destroyServerListener = server.listenToChanges(
    table,
    clientID,
    async (err, model, changes) => {
      await isInitialDone;
      log.info(
        `Sync to ${name}:${table} reporting ${changes.length} new change(s)`
      );
      if (changes.length === 0) {
        return;
      }
      return client.insert(model, changes, {
        syncFrom: name
      });
    }
  );
  const destroyClientListener = client.listen(
    table,
    async (value: IGetItem[], options: any = {}) => {
      await isInitialDone;
      if (options.syncFrom === name || value.length === 0) {
        return;
      }
      server.sendChanges(table, value, {
        syncFrom: clientID
      });
    }
  );
  /*const isInitialDone = await Promise.all([
    client.insert(table, changes.items, {
      keepRev: true,
      syncFrom: name
    }),
    client.all(table, { id: changes.request }).then(items =>
      server.sendChanges(table, items, {
        keepRev: true,
        syncFrom: clientID
      })
    )
  ]);*/
  const isInitialDone = await Promise.all([
    client.insert(table, remoteChanges, {
      syncFrom: name
    }),
    server.sendChanges(table, localChanges, {
      syncFrom: clientID
    })
  ]);
  const lastRemoteItem = remoteChanges[remoteChanges.length - 1] || {
    rev: syncState ? syncState.remote : undefined
  };
  const lastLocalItem = localChanges[localChanges.length - 1] || {
    rev: syncState ? syncState.local : undefined
  };
  await client.insert<ISyncItem>(syncstateTable, {
    id,
    rev: syncState ? syncState.rev : '',
    remote: lastRemoteItem.rev,
    local: lastLocalItem.rev
  });
  log.info(`Sync to ${name}:${table} is completed`);
  return [destroyServerListener, destroyClientListener];
}

/*const syncTypes = {
  SYNC_RECEIVE_INITIAL_REQUEST: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_RECEIVE_CHANGES: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_REQUEST_LISTENER: 'SYNC_REQUEST_LISTENER'
};*/

export function sync(
  client: Debe,
  tables: string[] = [],
  others: string[] = [],
  where?: string[]
) {
  const log = client.createLog('sync');
  const clientID = generate();

  return {
    connect: (service: IService) => {
      createServerChannels(client, service);
      // LOgic
      let cancels: false | any[] = [];
      others.forEach(name => {
        tables.forEach(table =>
          initiateSync(client, clientID, service, name, table, where, log)
        );
      });
      return () => {
        if (!cancels) {
          return;
        }
        (cancels as any[]).forEach(x => x());
        cancels = false;
      };
    },
    forceSync: () => {
      return new Promise(yay => setTimeout(yay, 1000));
    }
  };
}

export function createSocketClient(db: Debe, url: string, models: string[]) {
  const syncer = sync(db, models, ['debe']);
  return createSocket(url, syncer.connect);
}

export function createLocalClient(db: Debe, broker: IBroker, models: string[]) {
  const syncer = sync(db, models, ['debe']);
  const local = broker.local('debe-sync1', syncer.connect);
  return local;
}
