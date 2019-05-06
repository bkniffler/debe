import { batchSize } from '../constants';
import { CHANNELS } from '../types';
import { batchTransfer } from '../utils';
import { IItem } from 'debe';
import { ISyncType } from './type';

export const basic: ISyncType = {
  async initialDown(collection, since, count, sync) {
    const [remoteChanges] = await batchTransfer({
      fetchCount: () => count,
      fetchItems: async page => {
        return sync.socket.invoke<any, any[]>(CHANNELS.FETCH_INITIAL, {
          type: collection,
          since,
          page
        });
      },
      shouldCancel: () => sync.isClosing
    });
    return async () => {
      if (remoteChanges.length && !sync.isClosing) {
        const options = {
          synced: 'client'
        };
        await sync.db.insert(collection, remoteChanges, options);
        const o = remoteChanges[remoteChanges.length - 1];
        return [undefined, o && o[2]];
      }
      return [undefined, undefined];
    };
  },
  async initialUp(collection, since, count, sync) {
    let latestResult: any = undefined;
    let latestUpload: any = undefined;
    try {
      await batchTransfer<any, any>({
        fetchCount: () => count,
        fetchItems: async page =>
          sync.db
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
        transferItems: items => basic.up(collection, items, {}, sync),
        shouldCancel: () => sync.isClosing
      });
      return [latestUpload, latestResult ? latestResult.latestRev : undefined];
    } catch (err) {
      return [undefined, undefined];
    }
  },
  listen(sync) {
    const channel = sync.socket.subscribe<[string, IItem[], any?]>(
      CHANNELS.SUBSCRIBE_CHANGES
    );
    (async () => {
      for await (let data of channel) {
        if (sync.isClosing) {
          return;
        }
        await sync.initialSyncComplete;
        let [type, items, options = {}] = data;
        const release = sync.registerTask();
        options.synced = sync.socket.id;
        const lastRemoteRev =
          items[items.length - 1] && items[items.length - 1].rev;
        const newItems = await sync.db.insert(type, items, options);
        const lastLocalRev =
          newItems[newItems.length - 1] && newItems[newItems.length - 1].rev;
        sync.syncState.update(type, lastLocalRev, lastRemoteRev);
        release();
      }
    })();
    return {
      wait: new Promise(yay => setTimeout(yay, 10))
    };
  },
  up(collection, items, options, sync) {
    if (sync.isClosing) {
      return Promise.resolve();
    }
    return sync.socket
      .invoke<[string, IItem[]], any>(CHANNELS.SEND, [collection, items])
      .catch(err => {
        if (!sync.isClosing) {
          throw err;
        }
      });
  }
};
