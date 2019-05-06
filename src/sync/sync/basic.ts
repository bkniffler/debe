import { batchSize } from '../constants';
import { CHANNELS } from '../types';
import { batchTransfer } from '../utils';
import { IItem } from 'debe';
import { ISyncType } from './type';

export const basic: ISyncType = {
  async initialDown(collection, since, count, socket, db, isClosing) {
    const [remoteChanges] = await batchTransfer({
      fetchCount: () => count,
      fetchItems: async page => {
        return socket.invoke<any, any[]>(CHANNELS.FETCH_INITIAL, {
          type: collection,
          since,
          page
        });
      },
      shouldCancel: isClosing
    });
    if (remoteChanges.length && !isClosing()) {
      const options = {
        synced: 'client'
      };
      await db.insert(collection, remoteChanges, options);
      const o = remoteChanges[remoteChanges.length - 1];
      return [undefined, o && o[2]];
    }
    return [undefined, undefined];
  },
  async initialUp(collection, since, count, socket, db, isClosing) {
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
          basic.up(collection, db, socket, items, {}, isClosing),
        shouldCancel: isClosing
      });
      return [latestUpload, latestResult ? latestResult.latestRev : undefined];
    } catch (err) {
      return [undefined, undefined];
    }
  },
  listen(socket, db, updateState, registerTask, isClosing) {
    const channel = socket.subscribe<[string, IItem[], any?]>(
      CHANNELS.SUBSCRIBE_CHANGES
    );
    (async () => {
      for await (let data of channel) {
        if (isClosing()) {
          return;
        }
        let [type, items, options = {}] = data;
        const task = registerTask();
        options.synced = socket.id;
        const lastRemoteRev =
          items[items.length - 1] && items[items.length - 1].rev;
        const newItems = await db.insert(type, items, options);
        const lastLocalRev =
          newItems[newItems.length - 1] && newItems[newItems.length - 1].rev;
        updateState(type, lastLocalRev, lastRemoteRev);
        task();
      }
    })();
    return {
      wait: new Promise(yay => setTimeout(yay, 10))
    };
  },
  up(collection, db, socket, items, options, isClosing) {
    if (isClosing()) {
      return Promise.resolve();
    }
    return socket
      .invoke<[string, IItem[]], any>(CHANNELS.SEND, [collection, items])
      .catch(err => {
        if (!isClosing()) {
          throw err;
        }
      });
  }
};
