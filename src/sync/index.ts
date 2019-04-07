import {
  Debe,
  IItem,
  IGetItem,
  generate,
  ILog,
  addToQuery,
  types,
  ICollection,
  softDeletePlugin,
  createLog
} from 'debe';
import { Service, Broker, LocalAdapter } from 'rpc1';
import { SocketAdapter as RPCSocketAdapter } from 'rpc1-socket';
import { ISync, ISyncItem } from './types';
const log = createLog('sync');

const syncstateTable = 'syncstate';

function getLastItemRev(
  items: IGetItem[] = [],
  revField: string,
  comparer?: string
) {
  const result = items[items.length - 1]
    ? items[items.length - 1][revField]
    : undefined;
  if (!comparer || result > comparer) {
    return result;
  }
  return comparer;
}

function getBigger(comparer0?: string, comparer1?: string) {
  if (!comparer0 || !comparer1) {
    return undefined;
  }
  if (!comparer1 || comparer0 > comparer1) {
    return comparer0;
  }
  return comparer1;
}

async function createServerChannels(client: Debe, service: Service) {
  service.addMethod(
    'countInitialChanges',
    (table: string, since?: string, where?: [string, ...any[]]) => {
      const collection = client.collections[table];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      return client.count(table, { where });
    }
  );
  service.addMethod(
    'initialFetchChanges',
    (table: string, since?: string, where?: [string, ...any[]], page = 0) => {
      const collection = client.collections[table];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      return client.all(table, {
        where,
        orderBy: ['rev ASC', 'id ASC'],
        limit: 1000,
        offset: page * 1000
      });
    }
  );
  service.addMethod(
    'sendChanges',
    async (table: string, items: IItem[], options: any = {}) => {
      const collection = client.collections[table];
      const newItems = await client
        .insert(table, items, options)
        .catch(x => console.error('Error while client.insert', x) as any);
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
          if (options.syncFrom === clientID || !value || !value.length) {
            return;
          }
          emit(null, value);
        }
      );
    }
  );
}

function initiateSync(
  client: Debe,
  clientID: string,
  service: Service,
  name: string,
  collection: ICollection,
  where: any,
  log: ILog
) {
  log.info(`Initiate sync of ${collection.name}`);
  const { rev } = collection.specialFields;
  const id = `${name}-${collection.name}`;
  const server = service.use<ISync>(name);

  let syncState: any = client
    .get<ISyncItem>(syncstateTable, { id })
    .catch(err => log.error(`Can't fetch syncstate`));
  let insertPromise: Promise<any> = Promise.resolve();
  // Allow update syncstate, but take care of parallel access
  const updateSyncState = async (local?: string, remote?: string) => {
    const currentState = (await syncState) || {};
    return (insertPromise = insertPromise.then(() =>
      client
        .insert<ISyncItem>(syncstateTable, {
          id,
          rev: currentState ? currentState.rev : '',
          local: getBigger(local, currentState.local),
          remote: getBigger(remote, currentState.remote)
        })
        .then(i => (syncState = i))
        .catch(x => console.error('Error while insertPromise', x))
    ));
  };

  const unlisteners: Function[] = [];
  let allowListenToServer = false;
  function listenToServer() {
    unlisteners.push(
      server.listenToChanges(
        collection.name,
        clientID,
        async (err, changes) => {
          if (!allowListenToServer || !changes || changes.length === 0) {
            return;
          }
          log.info(
            `Sync to ${name}:${collection.name} reporting ${
              changes.length
            } new change(s)`
          );
          client
            .insert(collection.name, changes, {
              syncFrom: name
            } as any)
            .then(newItems => {
              updateSyncState(
                getLastItemRev(newItems, collection.specialFields.rev),
                getLastItemRev(changes, collection.specialFields.rev)
              );
            })
            .catch(x => console.error('Error while client.insert', x));
        }
      )
    );
  }

  let allowListenToLocalChanges = false;
  function listenToLocalChanges() {
    unlisteners.push(
      client.listen(
        collection.name,
        async (value: IGetItem[], options: any = {}) => {
          if (
            !allowListenToLocalChanges ||
            options.syncFrom === name ||
            !value ||
            !value.length
          ) {
            return;
          }
          server
            .sendChanges(collection.name, value, {
              syncFrom: clientID
            })
            .then(lastFetch => {
              updateSyncState(
                getLastItemRev(value, collection.specialFields.rev),
                lastFetch
              );
            })
            .catch(x => console.error('Error while server.sendChanges2', x));
        }
      )
    );
  }

  const fetchRemote = async (): Promise<any> => {
    const remoteChangesCount = await server
      .countInitialChanges(collection.name, syncState.remote, where)
      .catch(x => console.error('Error while server.countInitialChanges', x));
    listenToServer();
    if (remoteChangesCount) {
      const currentState = (await syncState) || {};
      const inner = async (page = 0, remoteItems: any[] = []): Promise<any> => {
        log.info(`Syncing page ${page} from remote, from ${clientID}`);
        const remoteChanges = await server.initialFetchChanges(
          collection.name,
          currentState.remote,
          where,
          page
        );
        if (remoteChanges.length) {
          return inner(page + 1, remoteItems.concat(remoteChanges));
        }
        return Promise.resolve(remoteItems);
      };
      return inner(0);
    } else {
      return Promise.resolve([]);
    }
  };
  const fetchLocal = async (remoteItems: any[]) => {
    allowListenToServer = true;
    listenToLocalChanges();
    const currentState = (await syncState) || {};
    const localChanges = await client.all(collection.name, {
      where: currentState.local ? [`${rev} > ?`, syncState.local] : undefined
    });
    allowListenToLocalChanges = true;
    log.info(
      `Syncing page with ${localChanges.length} to remote, from ${clientID}`
    );
    const local = localChanges.length
      ? await server
          .sendChanges(collection.name, localChanges, {
            syncFrom: clientID
          })
          .catch(
            x => console.error('Error while server.sendChanges1', x) as any
          )
      : undefined;
    const remoteState = remoteItems.length
      ? await client
          .insert(collection.name, remoteItems, {
            syncFrom: name
          } as any)
          .catch(x => console.error('Error while client.insert', x) as any)
      : undefined;
    updateSyncState(
      getLastItemRev(remoteState, collection.specialFields.rev) ||
        getLastItemRev(localChanges, collection.specialFields.rev),
      local || getLastItemRev(remoteItems, collection.specialFields.rev)
    );
    updateSyncState(
      getLastItemRev(localChanges, collection.specialFields.rev),
      local
    );
    return Promise.resolve();
  };

  fetchRemote()
    .then(fetchLocal)
    .catch(err => {
      log.error(`Error while syncing ${collection.name}`, err);
    });
  log.info(`Sync to ${name}:${collection.name} is completed`);
  return () => {
    unlisteners.forEach(x => x());
  };
}

/*const syncTypes = {
  SYNC_RECEIVE_INITIAL_REQUEST: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_RECEIVE_CHANGES: 'SYNC_RECEIVE_INITIAL_REQUEST',
  SYNC_REQUEST_LISTENER: 'SYNC_REQUEST_LISTENER'
};*/

export function sync(client: Debe, others: string[] = [], where?: string[]) {
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
      /*if (type === types.COLLECTION) {
        (payload as ICollection).specialFields.ver = 'ver';
        (payload as ICollection).fields['ver'] = fieldTypes.STRING;
        (payload as ICollection).index['ver'] = fieldTypes.STRING;
      }
      if (type === types.INSERT) {
        const collections = flow.get('collections', {});
        const [m, value, x = {}] = payload as [string, any[], any];
        if (!x.syncFrom) {
          const collection = collections[m] as ICollection;
          if (collection.specialFields.ver) {
            return flow([
              m,
              value.map(x => {
                x.ver = toISO(new Date());
                return x;
              }),
              x
            ]);
          }
        }
      }*/
      return flow(payload);
    },
    'AFTER',
    'corePlugin'
  );
  softDeletePlugin()(client);

  return {
    connect: (service: Service) => {
      createServerChannels(client, service);
      // LOgic
      let cancels: Function[] = [];
      others.map(name => {
        Object.keys(client.collections)
          .filter(x => x !== syncstateTable)
          .forEach(table => {
            cancels.push(
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
      });
      return () => {
        if (!cancels) {
          return;
        }
        (cancels as any[]).map(x => x());
      };
    },
    forceSync: () => {
      return new Promise(yay => setTimeout(yay, 1000));
    }
  };
}

export function createSyncClient(db: Debe, url: string) {
  const syncer = sync(db, ['debe']);
  const service = new Service(new RPCSocketAdapter(url));
  setTimeout(() => syncer.connect(service), 100);
  return () => service.close();
}

export function createLocalSyncClient(db: Debe, broker: Broker) {
  const syncer = sync(db, ['debe']);
  const service = new Service(new LocalAdapter(broker));
  setTimeout(() => syncer.connect(service), 100);
  return () => service.close();
}
