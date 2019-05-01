import * as Automerge from 'automerge';
import { generate, DebeBackend } from 'debe-adapter';
import { Debe } from 'debe';
import { IDelta } from 'debe-delta';

Automerge.uuid.setFactory(generate);

export async function merge(
  db: Debe,
  collectionName: string,
  delta: IDelta[],
  options: any = {}
) {
  const map = {};
  const collection = (db.dispatcher as DebeBackend).collections[collectionName];

  (await db.all(collection.name, {
    id: delta.map(x => x[0] + '')
  })).forEach(item => {
    map[item.id] = item;
  });

  const unsuccessful: string[] = [];
  const updated: string[] = [];
  // const updatedDelta: any[] = [];

  const newItems: any[] = delta
    .map(([id, changes]) => {
      if (!changes) {
        return;
      }
      let docOld = undefined;
      const isUpdate = map[id + ''] && map[id + ''].merge;
      if (isUpdate) {
        docOld = Automerge.load(map[id + ''].merge);
        updated.push(id);
      } else {
        docOld = Automerge.init();
      }
      const docInt =
        typeof changes === 'string' ? Automerge.load(changes) : undefined;

      const docNew = docInt
        ? Automerge.merge(docOld, docInt)
        : Automerge.applyChanges(docOld, changes);
      if (Object.keys(Automerge.getMissingDeps(docNew)).length) {
        unsuccessful.push(id);
        return;
      }

      /* if (!history.length) {
      return {
        ...snapshot,
        actor: undefined,
        id,
        merge: Automerge.save(docNew)
      };
    }*/
      const history = Automerge.getHistory(docNew);
      const { change, snapshot } = history[history.length - 1];
      return {
        ...snapshot,
        actor: change.actor,
        id,
        merge: Automerge.save(docNew)
      };
    })
    .filter(x => x);
  options['skipMerge'] = true;
  options['delta'] = delta;
  options['updated'] = updated;
  options['unsucessful'] = unsuccessful;
  return db.insert(collection.name, newItems, options);
}
