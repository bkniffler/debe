import { addToQuery, Debe, IItem, IGetItem } from 'debe';
import { ISocketBase } from 'asyngular-client';
import {
  ICountInitialChanges,
  IInitialFetchChanges,
  batchSize,
  ISendChanges,
  batchTransfer
} from 'debe-sync';
import { IAGServer } from 'asyngular-server';

export function createServerChannels(
  serverId: string,
  client: Debe,
  server: IAGServer
) {
  for (let key in client.adapter.collections) {
    const collection = client.adapter.collections[key];
    (async () => {
      const channel = server.exchange.subscribe<[string, IGetItem[]]>(
        collection.name
      );
      let queue = Promise.resolve();
      client.listen(collection.name, (items: any, options: any = {}) => {
        if (options.synced !== 'master') {
          queue = queue.then(() =>
            batchTransfer(
              () => Promise.resolve(items.length),
              page =>
                Promise.resolve(
                  ((items as any) as IGetItem[]).slice(
                    page * batchSize,
                    (page + 1) * batchSize
                  )
                ),
              items => {
                return server.exchange.invokePublish(collection.name, [
                  serverId,
                  items
                ]);
              }
            ).catch(err => console.error(err))
          );
        }
      });
      for await (let data of channel) {
        const [id, payload] = data;
        if (id !== serverId) {
          await client
            .insert(collection.name, payload, { synced: 'master' } as any)
            .catch(x => console.error('Error while client.insert', x) as any);
        }
      }
    })();
  }
}

export async function createSocketChannels(
  client: Debe,
  socket: ISocketBase,
  server: IAGServer
) {
  (async () => {
    for await (let req of socket.procedure<ICountInitialChanges, number>(
      'countInitialChanges'
    )) {
      let { type, since, where } = req.data;
      const collection = client.adapter.collections[type];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      await client
        .count(type, { where })
        .then(count => req.end(count))
        .catch(err => req.error(err));
    }
  })();

  (async () => {
    for await (let req of socket.procedure<
      IInitialFetchChanges,
      (IItem & IGetItem)[]
    >('initialFetchChanges')) {
      let { type, since, where, page = 0 } = req.data;
      const collection = client.adapter.collections[type];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      await client
        .all(type, {
          where,
          orderBy: ['rev ASC', 'id ASC'],
          limit: batchSize,
          offset: page * batchSize
        })
        .then(x => req.end(x));
    }
  })();

  (async () => {
    for await (let req of socket.procedure<ISendChanges>('sendChanges')) {
      let { type, items } = req.data;
      const collection = client.adapter.collections[type];
      await server.exchange.invokePublish(collection.name, [
        req.socket.id,
        items
      ]);
      req.end(true);
    }
  })();

  /*for await (let req of socket.procedure<ISendChanges>('listenToChanges')) {
    let { table, items, options = {} } = req.data;
    const collection = client.collections[table];
    const newItems = await client
      .insert(table, items, options)
      .catch(x => console.error('Error while client.insert', x) as any);
    req.end(getLastItemRev(newItems, collection.specialFields.rev));
  }
  const funcs = {
    listenToChanges: (
      emit: (err: any, value: any) => void,
      table: string,
      clientID: string
    ) => {
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
    }*/
}
