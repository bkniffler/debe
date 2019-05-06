import { batchSize } from '../constants';
import { CHANNELS } from '../types';
import { batchTransfer } from '../utils';
import { ISocket } from 'asyngular-client';
import { Debe, IItem } from 'debe';
import { IUpdateState } from '../state';
import { ISyncType } from './type';

export const basic: ISyncType = {
  async initialDown(
    collection: string,
    since: string | undefined,
    count: number,
    socket: ISocket,
    db: Debe
  ) {
    const [remoteChanges] = await batchTransfer({
      fetchCount: () => count,
      fetchItems: async page => {
        return socket.invoke<any, any[]>(CHANNELS.FETCH_INITIAL, {
          type: collection,
          since,
          page
        });
      }
    });
    if (remoteChanges.length) {
      const options = {
        synced: 'client'
      };
      await db.insert(collection, remoteChanges, options);
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
        transferItems: items => basic.up(collection, db, socket, items, {})
      });
      return [latestUpload, latestResult ? latestResult.latestRev : undefined];
    } catch (err) {
      return [undefined, undefined];
    }
  },
  listen(socket: ISocket, db: Debe, updateState: IUpdateState) {
    let cancel = false;
    const channel = socket.subscribe<[string, IItem[], any?]>(
      CHANNELS.SUBSCRIBE_CHANGES
    );
    (async () => {
      for await (let data of channel) {
        if (cancel) {
          return;
        }
        let [type, items, options = {}] = data;
        options.synced = socket.id;
        const lastRemoteRev =
          items[items.length - 1] && items[items.length - 1].rev;
        const newItems = await db.insert(type, items, options);
        const lastLocalRev =
          newItems[newItems.length - 1] && newItems[newItems.length - 1].rev;
        updateState(type, lastLocalRev, lastRemoteRev);
      }
    })();
    return {
      cancel: () => (cancel = true),
      wait: new Promise(yay => setTimeout(yay, 10))
    };
  },
  up(
    collection: string,
    db: Debe,
    socket: ISocket,
    items: IItem[],
    options: any
  ) {
    return socket.invoke<[string, IItem[]], any>(CHANNELS.SEND, [
      collection,
      items
    ]);
  }
};
