import { createLog, DebeClient } from '@debe/core';
import { IListenerCallback, IItem } from '@debe/types';
import { IService } from '@service-tunnel/core';
const log = createLog('sync');
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
  sendChanges: (model: string, items?: IItem[]) => Promise<void>;
  listenToChanges: (
    table: string,
    emit: (err: any, model: string, items: IItem[]) => void
  ) => () => void;
}
export function sync(
  client: DebeClient,
  tables: string[],
  others: string[],
  where?: string[]
) {
  return {
    connect: (service: IService) => {
      const noRep = {};
      service.addMethod(
        'initialFetchChanges',
        (table: string, state: any = {}, where?: string[]) => {
          return client
            .all(table, { where, orderBy: 'rev ASC' })
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
      service.addMethod('sendChanges', (table: string, items: IItem[]) => {
        return client.insert(table, items);
      });
      service.addSubscription('listenToChanges', (emit, model: string) => {
        const listener: IListenerCallback = value => {
          if (noRep[value.newValue.id] === value.newValue.rev) {
            delete noRep[value.newValue.id];
            return;
          }
          emit(null, value.model, [value.newValue]);
        };
        return client.on(model || '*', listener);
      });

      // LOgic
      let cancels: false | any[] = [];
      others.forEach(name => {
        const sync = service.use<ISync>(name);
        tables.forEach(async table => {
          const currentState = await client.all(table, {
            where,
            orderBy: 'rev ASC'
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
          await Promise.all([
            client.insert(table, changes.items, {
              keepRev: true
            }),
            client
              .all(table, { id: changes.request })
              .then(items => sync.sendChanges(table, items))
          ]);
          if (!cancels) {
            return;
          }
          log.info(`Sync to ${name}:${table} is completed`);
          cancels.push(
            sync.listenToChanges(table, (err, model, changes) => {
              changes.forEach(x => (noRep[x.id] = x.rev));
              log.info(
                `Sync to ${name}:${table} reporting ${
                  changes.length
                } new change(s)`
              );
              return client.insert(model, changes, { keepRev: true });
            })
          );
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
