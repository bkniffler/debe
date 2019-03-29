import { Debe, IItem, IGetItem } from '@debe/core';
//@ts-ignore
import * as Automerge from 'automerge';

export function debeAutomerge(client: Debe) {
  async function edit<T = IItem>(
    table: string,
    cb: (doc: T & IGetItem) => void
  ): Promise<T & IGetItem>;
  async function edit<T = IItem>(
    table: string,
    id: string | undefined,
    cb: (doc: T & IGetItem) => void
  ): Promise<T & IGetItem>;
  async function edit<T = IItem>(
    table: string,
    idOrCb: string | undefined | ((doc: T & IGetItem) => void),
    cbOrUndefined?: (doc: T & IGetItem) => void
  ) {
    const id = typeof idOrCb === 'string' ? idOrCb : undefined;
    const cb = typeof idOrCb === 'string' ? cbOrUndefined : idOrCb;
    try {
      let item: any;
      if (id) {
        item = await client.get(table, {
          id,
          additionalColumns: ['automerge']
        });
        if (!item) {
          return Promise.reject(new Error('Could not find item with id ' + id));
        }
      }
      const originalChanges = parseInt((item ? item.changes : 0) || 0);
      const wasDel = item ? item.isRemoved : undefined;
      let doc;
      if (item && item.automerge) {
        doc = Automerge.load(item.automerge);
      }
      if (!doc) {
        doc = Automerge.init();
      }
      doc = Automerge.change(doc, (doc: any) => {
        if (item && !item.automerge) {
          Object.keys(item).forEach(key => {
            if (key === 'id' || key === 'revision' || key === 'isRemoved') {
              return;
            }
            if (item[key] !== undefined && item[key] !== null) {
              doc[key] = item[key];
            }
          });
        }
        if (cb) {
          cb(doc);
        }
      });
      const history = Automerge.getHistory(doc);
      item = JSON.parse(JSON.stringify(history[history.length - 1].snapshot));
      item.changes = originalChanges + 1;
      item.id = id;
      if (wasDel) {
        item.isRemoved = wasDel;
      }
      item.automerge = Automerge.save(doc);
      item = await client.insert(table, item);
      return item;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return edit;
}
