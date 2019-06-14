import Automerge from 'automerge';
import { generate, addMiddleware, DebeBackend, hasPlugin } from 'debe-adapter';
export * from './merge';

Automerge.uuid.setFactory(generate);

export type IChange = Automerge.Change;
export type IChanges = IChange[];
export type IDelta = [string, IChanges] | [string, IChanges, string];
export interface IMergePluginOptions {
  submitDelta?: (collection: string, deltas: IDelta[], options?: any) => void;
  getMessage?: () => string;
  mergeField?: string;
  actorField?: string;
}

export function deltaPlugin(
  adapter: DebeBackend,
  options: IMergePluginOptions = {}
) {
  const {
    mergeField = 'merge',
    actorField = 'actor',
    getMessage,
    submitDelta
  } = options;
  addMiddleware(adapter, {
    name: 'delta',
    collection(collection) {
      if (hasPlugin(collection, 'delta')) {
        collection.specialFields.merge = mergeField;
        collection.fields[mergeField] = 'string';
        collection.specialFields.actor = mergeField;
        collection.fields[actorField] = 'string';
        collection.index[actorField] = 'string';
      }
      return collection;
    },
    async beforeInsert(collection, items, options) {
      if (!collection.specialFields.merge || options['skipMerge']) {
        return;
      }
      let { message } = options;
      if (!message && getMessage && typeof getMessage === 'function') {
        message = getMessage();
      }

      const delta: IDelta[] = [];
      const needFetch = items.filter(item => {
        return !item[mergeField] && options.existing.indexOf(item.id + '') >= 0;
      });

      const map = {};
      if (needFetch.length) {
        (await adapter.db.all(collection.name, {
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
          // rem,
          [mergeField]: automerge,
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
        delta.push([id, changes, rev]);
        return {
          ...item,
          [actorField]: latestActor,
          id,
          // rem,
          rev,
          [mergeField]: Automerge.save(newDoc)
        };
      });

      options['delta'] = delta;
      if (submitDelta) {
        submitDelta(collection.name, delta, options);
      }

      return newItems;
    }
  });
}
