import { ISQLightClient } from '@sqlight/types';
const Automerge = require('automerge');

export function sqlightAutomerge(client: ISQLightClient) {
  return async function edit(
    table: string,
    id: string | undefined,
    cb: (doc: any) => void
  ) {
    let item: any;
    if (id) {
      item = await client.get(table, { id });
      if (!item) {
        return Promise.reject();
      }
    }
    const originalChanges = (item ? item.changes : 0) || 0;
    const wasDel = item ? item.del : false;
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
          if (key === 'id' || key === 'rev' || key === 'del') {
            return;
          }
          if (item[key] !== undefined && item[key] !== null) {
            doc[key] = item[key];
          }
        });
      }
      cb(doc);
    });
    const history = Automerge.getHistory(doc);
    item = JSON.parse(JSON.stringify(history[history.length - 1].snapshot));
    console.log('CHANGES', originalChanges, item);
    item.changes = originalChanges + 1;
    item.id = id;
    if (wasDel) {
      item.del = true;
    }
    item.automerge = Automerge.save(doc);
    await client.insert(table, item);
    return item;
  };
}
