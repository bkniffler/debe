import { generate, fieldTypes, IInsertInput, IMiddleware } from 'debe';
import * as Automerge from 'automerge';

Automerge.uuid.setFactory(generate);

export interface IDelta {
  id: string;
  changes: Automerge.Change[];
  item: IInsertInput;
}
export interface IMergePluginOptions {
  submitDelta?: (deltas: IDelta[]) => void;
  getMessage?: () => string;
  automergeField?: string;
  actorField?: string;
}
export const delta: IMiddleware<IMergePluginOptions> = (options = {}) => db => {
  const {
    automergeField = 'merge',
    actorField = 'actor',
    getMessage,
    submitDelta
  } = options;
  return {
    collection(collection) {
      collection.specialFields.automerge = automergeField;
      collection.fields[automergeField] = fieldTypes.STRING;
      collection.specialFields.actor = automergeField;
      collection.fields[actorField] = fieldTypes.STRING;
      collection.index[actorField] = fieldTypes.STRING;
      return collection;
    },
    async beforeInsert(collection, items, options) {
      let { message } = options;
      if (!message && getMessage && typeof getMessage === 'function') {
        message = getMessage();
      }
      const delta: IDelta[] = [];
      const needFetch = items.filter(item => {
        return (
          !item[automergeField] && options.existing.indexOf(item.id + '') >= 0
        );
      });

      const map = {};
      if (needFetch.length) {
        (await db.all(collection.name, {
          id: needFetch.map(x => x.id + '')
        })).forEach(item => {
          map[item.id] = item;
        });

        // Deactivate update since we patch items here
        options.update = false;
      }
      const newItems: any[] = items.map((i: any) => {
        if (map[i.id + '']) {
          i = Object.assign({}, map[i.id + ''], i);
        }
        const {
          rev,
          id,
          rem,
          [automergeField]: automerge,
          [actorField]: actor,
          ...item
        } = i;
        const doc = automerge ? Automerge.load(automerge) : Automerge.init();
        const newDoc = Automerge.change(doc, message, (change: any) => {
          for (var key in item) {
            change[key] = item[key];
          }
        });
        const changes = Automerge.getChanges(doc, newDoc);
        const latestActor = changes.length
          ? changes[changes.length - 1].actor
          : actor;
        delta.push({ id, changes, item });
        return {
          ...item,
          [actorField]: latestActor,
          id,
          rem,
          rev,
          [automergeField]: Automerge.save(newDoc)
        };
      });

      if (submitDelta) {
        submitDelta(delta);
      }

      return newItems;
    }
  };
};
