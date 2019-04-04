import {
  Debe,
  IItem,
  IGetItem,
  generate,
  ILog,
  addToQuery,
  types,
  ICollection
} from 'debe';
import { IService, IBroker } from 'rpc1';
import { createSocket } from 'rpc1-socket';
import { ISync, ISyncItem } from './types';

const syncstateTable = 'syncstate';

function getLastItemRev(items: IGetItem[] = [], revField: string) {
  return items[items.length - 1]
    ? items[items.length - 1][revField]
    : undefined;
}

async function createServerChannels(client: Debe, service: IService) {
  service.addMethod('initialFetchChanges', (
    table: string,
    // state: any = {},
    since?: string,
    where?: [string, ...any[]]
  ) => {
    const collection = client.collections[table];
    if (since) {
      where = addToQuery(
        where,
        'AND',
        `${collection.specialFields.rev} > ?`,
        since
      );
    }
    return client.all(table, { where });
  });
  service.addMethod(
    'sendChanges',
    async (table: string, items: IItem[], options: any = {}) => {
      const collection = client.collections[table];
      const newItems = await client.insert(table, items, options);
      return getLastItemRev(newItems, collection.specialFields.rev);
    }
  );
  service.addSubscription(
    'listenToChanges',
    (emit, table: string, clientID: string) => {
      const collection = client.collections[table];
      return client.listen(
        collection.name,
        (value: IGetItem[], options: any = {}) => {
          if (options.syncFrom === clientID) {
            return;
          }
          emit(null, value);
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
  collection: ICollection,
  where: any,
  log: ILog
) {
  const { rev } = collection.specialFields;
  const id = `${name}-${collection.name}`;
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
    collection.name,
    syncState.remote,
    where
  );
  const localChanges = await client.all(collection.name, {
    where: syncState.local ? [`${rev} > ?`, syncState.local] : undefined
  });
  log.info(
    `Remote sync state ${name}:${collection.name}: ${
      remoteChanges.length
    } remote items to get, ${localChanges.length} local items to send`
  );
  const destroyServerListener = server.listenToChanges(
    collection.name,
    clientID,
    async (err, changes) => {
      await isInitialDone;
      log.info(
        `Sync to ${name}:${collection.name} reporting ${
          changes.length
        } new change(s)`
      );
      if (changes.length === 0) {
        return;
      }
      const newItems = await client.insert(collection.name, changes, {
        syncFrom: name
      } as any);
      updateSyncState(
        getLastItemRev(newItems, collection.specialFields.rev),
        getLastItemRev(changes, collection.specialFields.rev)
      );
    }
  );
  const destroyClientListener = client.listen(
    collection.name,
    async (value: IGetItem[], options: any = {}) => {
      await isInitialDone;
      if (options.syncFrom === name || value.length === 0) {
        return;
      }
      const lastFetch = await server.sendChanges(collection.name, value, {
        syncFrom: clientID
      });
      updateSyncState(
        getLastItemRev(value, collection.specialFields.rev),
        lastFetch
      );
    }
  );

  const isInitialDone = await Promise.all([
    remoteChanges.length > 0
      ? client.insert(collection.name, remoteChanges, {
          syncFrom: name
        } as any)
      : Promise.resolve(undefined),
    localChanges.length > 0
      ? server.sendChanges(collection.name, localChanges, {
          syncFrom: clientID
        })
      : Promise.resolve(undefined)
  ]);
  updateSyncState(
    getLastItemRev(isInitialDone[0], collection.specialFields.rev) ||
      getLastItemRev(localChanges, collection.specialFields.rev),
    isInitialDone[1] ||
      getLastItemRev(remoteChanges, collection.specialFields.rev)
  );
  log.info(`Sync to ${name}:${collection.name} is completed`);
  return [destroyServerListener, destroyClientListener];
}

/*const syncTypes = {
  SYNC_RECEIVE_INITIAL_REQUEST: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_RECEIVE_CHANGES: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_REQUEST_LISTENER: 'SYNC_REQUEST_LISTENER'
};*/

export function sync(client: Debe, others: string[] = [], where?: string[]) {
  const log = client.createLog('sync');
  const clientID = generate();

  client.addPlugin(
    'sync',
    (type, payload, flow) => {
      if (type === types.INITIALIZE) {
        payload.collections = [
          ...payload.collections,
          { name: syncstateTable }
        ];
      }
      return flow(payload);
    },
    'AFTER',
    'changeListenerPlugin'
  );

  return {
    connect: (service: IService) => {
      createServerChannels(client, service);
      // LOgic
      let cancels: false | any[] = [];
      others.forEach(name => {
        Object.keys(client.collections)
          .filter(x => x !== syncstateTable)
          .forEach(table =>
            initiateSync(
              client,
              clientID,
              service,
              name,
              client.collections[table],
              where,
              log
            )
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

export function createSocketClient(db: Debe, url: string) {
  const syncer = sync(db, ['debe']);
  return createSocket(url, syncer.connect);
}

export function createLocalClient(db: Debe, broker: IBroker) {
  const syncer = sync(db, ['debe']);
  const local = broker.local('debe-sync1', syncer.connect);
  return local;
}
