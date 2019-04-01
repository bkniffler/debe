import { Debe, IItem, IGetItem, generate } from 'debe';
import { IService, IBroker } from 'rpc1';
import { createSocket } from 'rpc1-socket';
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

interface ISyncInitialResponse {
  items: IItem[];
  request: string[];
}
interface ISync {
  initialFetchChanges: (
    model: string,
    state?: any,
    where?: string[]
  ) => Promise<ISyncInitialResponse>;
  sendChanges: (model: string, items?: IItem[], options?: any) => Promise<void>;
  listenToChanges: (
    table: string,
    clientID: string,
    emit: (err: any, model: string, items: IItem[]) => void
  ) => () => void;
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
      service.addMethod(
        'initialFetchChanges',
        (table: string, state: any = {}, where?: string[]) => {
          return client
            .all(table, { where, orderBy: ['rev ASC', 'id ASC'] })
            .then(result => {
              const response: ISyncInitialResponse = {
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
              return response;
            });
        }
      );
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

      // LOgic
      let cancels: false | any[] = [];
      others.forEach(name => {
        const sync = service.use<ISync>(name);
        tables.forEach(async table => {
          const currentState = await client.all(table, {
            where,
            orderBy: ['rev ASC', 'id ASC']
          });
          const stateObject = currentState.reduce((state, item) => {
            state[item.id] = item.rev;
            return state;
          }, {});
          log.info(
            `Starting sync ${name}:${table}: ${
              currentState.length
            } initial items`
          );
          const changes = await sync.initialFetchChanges(
            table,
            stateObject,
            where
          );
          log.info(
            `Remote sync state ${name}:${table}: ${
              changes.items.length
            } remote items to get, ${
              changes.request.length
            } remote items missing`
          );
          if (!cancels) {
            return;
          }
          cancels.push(
            sync.listenToChanges(
              table,
              clientID,
              async (err, model, changes) => {
                await isInitialDone;
                log.info(
                  `Sync to ${name}:${table} reporting ${
                    changes.length
                  } new change(s)`
                );
                return client.insert(model, changes, {
                  keepRev: true,
                  syncFrom: name
                });
              }
            )
          );
          cancels.push(
            client.listen(
              table,
              async (value: IGetItem[], options: any = {}) => {
                await isInitialDone;
                if (options.syncFrom === name) {
                  return;
                }
                sync.sendChanges(table, value, {
                  keepRev: true,
                  syncFrom: clientID
                });
              }
            )
          );
          const isInitialDone = await Promise.all([
            client.insert(table, changes.items, {
              keepRev: true,
              syncFrom: name
            }),
            client.all(table, { id: changes.request }).then(items =>
              sync.sendChanges(table, items, {
                keepRev: true,
                syncFrom: clientID
              })
            )
          ]);
          if (!cancels) {
            return;
          }
          log.info(`Sync to ${name}:${table} is completed`);
        });
        return () => {};
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
