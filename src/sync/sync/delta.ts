import { batchSize } from '../constants';
import { CHANNELS } from '../types';
import { IChange, merge, IChanges } from 'debe-delta';
import { batchTransfer } from '../utils';
import { ISocket } from 'asyngular-client';
import { Debe } from 'debe';
import { IUpdateState } from '../state';
import { ISyncType } from './type';
const { SEND_DELTA, FETCH_MISSING_DELTA } = CHANNELS;

export const delta: ISyncType = {
  async initialDown(
    collection: string,
    since: string | undefined,
    count: number,
    socket: ISocket,
    db: Debe
  ) {
    const [remoteChanges] = await batchTransfer({
      fetchCount: () => count,
      fetchItems: async page =>
        socket.invoke<any, any[]>(CHANNELS.FETCH_INITIAL_DELTA, {
          type: collection,
          since,
          page
        })
    });
    /*const where = (serverLastRev
      ? [`${collections[key].specialFields.rev} > ?`, serverLastRev]
      : undefined) as any;*/
    if (remoteChanges.length) {
      // const serverLastRev = remoteChanges[remoteChanges.length - 1].rev;
      const options = {
        synced: 'client'
      };
      await merge(db, collection, remoteChanges, options).catch(
        x => console.error('Error while client.insert', x) as any
      );
      const o = remoteChanges[remoteChanges.length - 1];
      return [undefined, o && o[2]];
    }
    return [undefined, undefined];
  },
  async initialUp(
    collection: string,
    since: string | undefined,
    count: number,
    socket: ISocket,
    db: Debe
  ) {
    let latestResult: any = undefined;
    let latestUpload: any = undefined;
    try {
      await batchTransfer<any, any>({
        fetchCount: () => count,
        fetchItems: async page =>
          db
            .all(collection, {
              where: since ? ['rev > ?', since] : undefined,
              orderBy: ['rev ASC', 'id ASC'],
              limit: batchSize,
              offset: page * batchSize
            })
            .then(x => {
              if (x.length) {
                latestUpload = x[x.length - 1].rev;
              }
              return x;
            }),
        transferItems: items =>
          delta
            .up(collection, db, socket, items, {
              delta: items.map(x => [x.id, x['merge'], x.rev])
            })
            .then(x => {
              latestResult = x;
              return x;
            })
      });
      return [latestUpload, latestResult ? latestResult.latestRev : undefined];
    } catch (err) {
      return [undefined, undefined];
    }
  },
  listen(socket: ISocket, db: Debe, updateState: IUpdateState) {
    let cancel = false;
    const channel = socket.subscribe<[string, [string, IChanges][], any?]>(
      CHANNELS.SUBSCRIBE_DELTA_CHANGES
    );
    (async () => {
      for await (let data of channel) {
        if (cancel) {
          return;
        }
        let [type, items, options = {}] = data;
        options.synced = socket.id;
        let newItems = await merge(db, type, items, options).catch(
          x => console.error('Error while client.insert', x) as any
        );
        if (options.unsucessful.length) {
          const result = await socket.invoke(FETCH_MISSING_DELTA, [
            type,
            options.unsucessful
          ]);
          newItems = await merge(db, type, result, options).catch(
            x => console.error('Error while client.insert', x) as any
          );
        }
        const o0 = newItems[newItems.length - 1];
        const o = items[items.length - 1];
        updateState(type, o0 ? o0.rev : undefined, o && (o as any)[2]);
      }
    })();
    return {
      cancel: () => (cancel = true),
      wait: new Promise(yay => setTimeout(yay, 10))
    };
  },
  async up(
    collection: string,
    db: Debe,
    socket: ISocket,
    items: any[],
    options: any
  ) {
    let { failed = [], latestRev } = await socket.invoke<
      [string, IChange],
      any
    >(SEND_DELTA, [collection, options['delta']]);
    if (failed.length) {
      const missing = await db.all(collection, {
        id: failed,
        select: ['id', 'merge']
      });
      latestRev = await socket
        .invoke(SEND_DELTA, [collection, missing.map(x => [x.id, x['merge']])])
        .then(x => (x.latestRev > latestRev ? x.latestRev : latestRev));
    }
    return latestRev;
  }
};
