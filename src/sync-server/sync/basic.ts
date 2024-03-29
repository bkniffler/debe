import { addToQuery, Debe } from 'debe';
import { AGServerSocket } from 'socketcluster-server';
import {
  batchSize,
  CHANNELS
} from 'debe-sync';
import { DebeBackend } from 'debe-adapter';
const { COUNT_INITIAL, FETCH_INITIAL, SEND } = CHANNELS;

export function createBasicProcedures(client: Debe, socket: AGServerSocket) {
  let stop = false;
  const collections = (client.dispatcher as DebeBackend).collections;

  // Get a count of all items that need to be synced with client
  (async () => {
    for await (let req of socket.procedure(
      COUNT_INITIAL
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
        const count = await client.count(type, { where });
        req.end(count);
      } catch (err) {
        req.error(err);
      }
    }
  })();

  // Fetch all changes and send back
  (async () => {
    for await (let req of socket.procedure(FETCH_INITIAL)) {
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
          orderBy: ['rev ASC', 'id ASC'],
          limit: batchSize,
          offset: page * batchSize
        });
        req.end(result);
      } catch (err) {
        req.error(err);
      }
    }
  })();

  // Receive changes
  (async () => {
    for await (let req of socket.procedure(SEND)) {
      if (stop) {
        return;
      }
      let [type, items, options = {}] = req.data;
      const collection = collections[type];
      try {
        const newItems = await client.insert(collection.name, items, {
          ...options,
          synced: socket.id
        } as any);
        req.end(
          newItems.length ? newItems[newItems.length - 1].rev : undefined
        );
      } catch (err) {
        console.log('Err on insert, was DB closed?', err);
        req.end(err);
      }
    }
  })();

  return () => {
    stop = true;
  };
}
