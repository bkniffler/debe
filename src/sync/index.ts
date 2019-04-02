import { Debe, IItem, IGetItem, generate, ILog, addToQuery, types } from 'debe';
import { IService, IBroker } from 'rpc1';
import { createSocket } from 'rpc1-socket';
import { ISync, ISyncItem } from './types';

const syncstateTable = 'syncstate';

function getLastItemRev(items: IGetItem[] = []) {
  return items[items.length - 1] ? items[items.length - 1].rev : undefined;
}

async function createServerChannels(client: Debe, service: IService) {
  service.addMethod('initialFetchChanges', (
    table: string,
    // state: any = {},
    since?: string,
    where?: [string, ...any[]]
  ) => {
    if (since) {
      where = addToQuery(where, 'AND', 'rev > ?', since);
    }
    return client.all(table, { where });
  });
  service.addMethod(
    'sendChanges',
    async (table: string, items: IItem[], options: any = {}) => {
      const newItems = await client.insert(table, items, options);
      return getLastItemRev(newItems);
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
  let syncState = (await client.get<ISyncItem>(syncstateTable, { id })) || {};
  let insertPromise: Promise<any> = Promise.resolve();
  // Allow update syncstate, but take care of parallel access
  const updateSyncState = (local?: string, remote?: string) => {
    insertPromise = insertPromise.then(() =>
      client
        .insert<ISyncItem>(syncstateTable, {
          id,
          rev: syncState ? syncState.rev : '',
          local: local || syncState.local,
          remote: remote || syncState.remote
        })
        .then(i => (syncState = i))
    );
  };
  const remoteChanges = await server.initialFetchChanges(
    table,
    syncState.remote,
    where
  );
  const localChanges = await client.all(table, {
    where: syncState.local ? ['rev > ?', syncState.local] : undefined
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
      const newItems = await client.insert(model, changes, {
        syncFrom: name
      });
      updateSyncState(getLastItemRev(newItems), getLastItemRev(changes));
    }
  );
  const destroyClientListener = client.listen(
    table,
    async (value: IGetItem[], options: any = {}) => {
      await isInitialDone;
      if (options.syncFrom === name || value.length === 0) {
        return;
      }
      const lastFetch = await server.sendChanges(table, value, {
        syncFrom: clientID
      });
      updateSyncState(getLastItemRev(value), lastFetch);
    }
  );

  const isInitialDone = await Promise.all([
    remoteChanges.length > 0
      ? client.insert(table, remoteChanges, {
          syncFrom: name
        })
      : Promise.resolve(undefined),
    localChanges.length > 0
      ? server.sendChanges(table, localChanges, {
          syncFrom: clientID
        })
      : Promise.resolve(undefined)
  ]);
  updateSyncState(
    getLastItemRev(isInitialDone[0]) || getLastItemRev(localChanges),
    isInitialDone[1] || getLastItemRev(remoteChanges)
  );
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

  client.addSkill(
    'sync',
    (type, payload, flow) => {
      if (type === types.INITIALIZE && payload.schema) {
        payload.schema = [...payload.schema, { name: syncstateTable }];
      }
      return flow(payload);
    },
    'AFTER',
    'changeListener'
  );

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
