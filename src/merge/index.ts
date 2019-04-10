import {
  Debe,
  generate,
  IPlugin,
  ICollection,
  types,
  fieldTypes,
  IInsertItem,
  IInsertInput
} from 'debe';
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
export const mergePlugin = (options: IMergePluginOptions = {}): IPlugin => (
  client: Debe
) => {
  const {
    automergeField = 'merge',
    actorField = 'actor',
    getMessage,
    submitDelta
  } = options;
  client.addPlugin(
    'mergePlugin',
    (type, payload, flow) => {
      if (type === types.COLLECTION) {
        (payload as ICollection).specialFields.automerge = automergeField;
        (payload as ICollection).fields[automergeField] = fieldTypes.STRING;
        (payload as ICollection).specialFields.actor = automergeField;
        (payload as ICollection).fields[actorField] = fieldTypes.STRING;
        (payload as ICollection).index[actorField] = fieldTypes.STRING;
        return flow(payload);
      } else if (type === types.INSERT) {
        const [collection, items, options = {}] = payload as [
          string,
          IInsertItem[],
          IInsertInput
        ];
        let message = flow.get<string | undefined>('message', options.message);
        if (!message && getMessage && typeof getMessage === 'function') {
          message = getMessage();
        }
        const delta: IDelta[] = [];
        const newItems = items.map(
          ({
            rev,
            id,
            rem,
            [automergeField]: automerge,
            [actorField]: actor,
            ...item
          }: any) => {
            const doc = automerge
              ? Automerge.load(automerge)
              : Automerge.init();
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
          }
        );

        if (submitDelta) {
          submitDelta(delta);
        } else {
          flow.set('delta', delta);
        }
        flow([collection, newItems]);
      } else {
        flow(payload);
      }
    },
    'AFTER',
    'corePlugin'
  );
};
