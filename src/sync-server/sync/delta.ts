import { addToQuery, Debe } from 'debe';
import { ISocketBase } from 'asyngular-client';
import {
  ICountInitialChanges,
  batchSize,
  ISendDelta,
  CHANNELS
} from 'debe-sync';
import { DebeBackend } from 'debe-adapter';
import { IAGServer } from 'asyngular-server';
import { merge } from 'debe-delta';
const {
  SEND_DELTA,
  COUNT_INITIAL_DELTA,
  FETCH_INITIAL_DELTA,
  FETCH_MISSING_DELTA
} = CHANNELS;

export function createDeltaProcedures(
  client: Debe,
  socket: ISocketBase,
  server: IAGServer
) {
  let stop = false;
  const collections = (client.dispatcher as DebeBackend).collections;
  const select = ['id', 'actor', 'merge', 'rev'];

  // Get a count of all items that need to be synced with client
  (async () => {
    for await (let req of socket.procedure<ICountInitialChanges, number>(
      COUNT_INITIAL_DELTA
    )) {
      if (stop) {
        return;
      }
      let { type, since, where } = req.data;
      const collection = collections[type];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      try {
        req.end(await client.count(type, { where, select }));
      } catch (err) {
        req.error(err);
      }
    }
  })();

  // Fetch all changes and send back
  (async () => {
    for await (let req of socket.procedure<any, any[]>(FETCH_INITIAL_DELTA)) {
      if (stop) {
        return;
      }
      let { type, since, where, page = 0 } = req.data;
      const collection = collections[type];
      if (since) {
        where = addToQuery(
          where,
          'AND',
          `${collection.specialFields.rev} > ?`,
          since
        );
      }
      try {
        const result = await client.all(type, {
          where,
          select,
          orderBy: ['rev ASC', 'id ASC'],
          limit: batchSize,
          offset: page * batchSize
        });
        req.end(result.map(x => [x.id, x['merge'], x.rev]));
      } catch (err) {
        req.error(err);
      }
    }
  })();

  // Receive change
  (async () => {
    for await (let req of socket.procedure<ISendDelta>(SEND_DELTA)) {
      if (stop) {
        return;
      }
      let [type, items, options = {}] = req.data;
      // console.log('RECEIVE DELTA', items.length);

      const collection = collections[type];
      options.synced = socket.id;
      const newItems = await merge(
        client,
        collection.name,
        items,
        options
      ).catch(x => console.error('Error while client.insert', x) as any);
      req.end({
        failed: options.unsucessful || [],
        success: newItems.length,
        latestRev: newItems.length
          ? newItems[newItems.length - 1].rev
          : undefined
      });
    }
  })();

  // Get missing change
  (async () => {
    for await (let req of socket.procedure(FETCH_MISSING_DELTA)) {
      if (stop) {
        return;
      }
      let [type, items] = req.data;
      const missing = await client.all(type, {
        id: items,
        select: ['id', 'rev', 'merge']
      });
      req.end(missing.map(x => [x.id, x['merge'], x.rev]));
    }
  })();

  return () => {
    stop = true;
  };
}
