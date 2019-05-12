import { Emitter, isEqual } from '../utils';
import { DebeBackend } from '../backend';
import { addMiddleware } from '../utils';

export interface IChangeListenerOptions {
  emitter?: Emitter;
  revField?: string;
}

const defaultRevisionField = 'rev';

let counter = -1;
let lastTime = '';
let getTime = () => {
  let newTime = new Date().toISOString();
  if (newTime === lastTime) {
    counter = counter + 1;
    return newTime + `${counter}`.padStart(5, '0');
  }
  counter = -1;
  lastTime = newTime;
  return lastTime + '00000';
};
export function changeListenerPlugin(
  adapter: DebeBackend,
  { emitter = new Emitter(), revField = defaultRevisionField }
) {
  const addRev = (item: any): [any, any] => {
    if (!item) {
      return item;
    }
    item[revField] = getTime();
    return item;
  };

  addMiddleware(adapter, {
    listener(method = 'insert', { collection = '*', query }, callback) {
      if (method === 'insert') {
        return emitter.on(collection, callback);
      }
      let lastResult: any = undefined;
      const listener = async () => {
        // let isInitial = lastResult === undefined;
        try {
          const newValue = await (adapter.db[method] as any)(collection, query);
          if (!isEqual(lastResult, newValue as any, revField)) {
            callback(null, (newValue === null ? undefined : newValue) as any);
          }
          lastResult = newValue || null;
        } catch (err) {
          callback(err, undefined as any);
        }
      };
      listener();
      return emitter.on(collection, listener);
    },
    transformItemIn(collection, item) {
      return addRev(item) as any;
    },
    afterInsert(collection, items, options: any = {}) {
      emitter.emit(collection.name, items, options, collection.name);
    },
    afterRemove(collection, items, options: any = {}) {
      emitter.emit(collection.name, items, options, collection.name);
    },
    collection(collection) {
      collection.specialFields.rev = revField;
      collection.fields[revField] = 'string';
      collection.index[revField] = 'string';
      return collection;
    }
  });
}
