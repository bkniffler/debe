import { IItem, types, fieldTypes } from '../types';
import { ensureCollection } from './core';
import { IPlugin } from '../client';

export const CHANGE_LISTENER_PLUGIN = 'changeListenerPlugin';
const defaultRevisionField = 'rev';
export const changeListenerPlugin = (options: any = {}): IPlugin => client => {
  const { revField = defaultRevisionField } = options;
  const queryEmitter = new Emitter();

  function addRev(item: any): [any, any] {
    if (!item) {
      return item;
    }
    item[revField] = new Date().getTime();
    return item;
  }

  client.addPlugin(CHANGE_LISTENER_PLUGIN, function changeListenerPlugin(
    type,
    payload,
    flow
  ) {
    if (type === types.COLLECTION) {
      const collection = ensureCollection(payload);
      collection.specialFields.rev = revField;
      collection.fields[revField] = fieldTypes.NUMBER;
      collection.index[revField] = fieldTypes.NUMBER;
      return flow(payload);
    }
    const callback = flow.get('callback');
    if (callback) {
      const [collection] = payload;
      if (type === types.LISTEN) {
        return queryEmitter.on(collection, callback);
      }
      let lastResult: any = undefined;
      const listener = async () => {
        let isInitial = lastResult === undefined;
        try {
          const newValue = await flow.run(type, payload, {
            callback: undefined
          });
          // Check is results changed
          if (!isEqual(lastResult, newValue as any, revField)) {
            callback(
              undefined,
              (newValue || undefined) as any,
              isInitial ? 'INITIAL' : 'CHANGE'
            );
          }
          lastResult = newValue || null;
        } catch (err) {
          callback(err);
        }
      };
      listener();
      return queryEmitter.on(collection, listener);
    } else if (type === types.INSERT) {
      const syncFrom = flow.get('syncFrom');
      const [collection, items] = payload;
      return flow(
        [collection, Array.isArray(items) ? items.map(addRev) : addRev(items)],
        (res, back) => {
          queryEmitter.emit(collection, Array.isArray(res) ? res : [res], {
            syncFrom
          });
          back(res);
        }
      );
    } else {
      return flow(payload);
    }
  });
};

export function isEqual(
  rowsA: IItem[] | IItem | null,
  rowsB: IItem[] | IItem | null,
  revisionField = defaultRevisionField
) {
  if (Array.isArray(rowsA) && rowsA.length === 0) {
    rowsA = null;
  }
  if (Array.isArray(rowsB) && rowsB.length === 0) {
    rowsB = null;
  }
  if (rowsA === rowsB) {
    return true;
  }
  if (!rowsA && !rowsB) {
    return true;
  }
  if ((!rowsA && rowsB) || (rowsA && !rowsB)) {
    return false;
  }
  function extrapolate(item: IItem) {
    return `${item.id}|${item[revisionField]}`;
  }
  function isEqualSingle(itemA: IItem | null, itemB: IItem | null) {
    if (itemA === itemB) {
      return true;
    }
    if (!itemA && !itemB) {
      return true;
    }
    if ((!itemA && itemB) || (itemA && !itemB)) {
      return false;
    }
    return extrapolate(itemA as IItem) === extrapolate(itemB as IItem);
  }
  if (!Array.isArray(rowsA) && !Array.isArray(rowsB)) {
    return isEqualSingle(rowsA, rowsB);
  }
  if ((rowsA as any[]).length !== (rowsB as any[]).length) {
    return false;
  }

  if (
    (rowsA as any[]).map(extrapolate).join('|') !==
    (rowsB as any[]).map(extrapolate).join('|')
  ) {
    return false;
  }
  return true;
}

interface IListeners {
  [s: string]: Function[];
}
export class Emitter {
  listeners: IListeners = {};
  get numberOfListeners() {
    return Object.keys(this.listeners).reduce(
      (state, key) => state + this.listeners[key].length,
      0
    );
  }
  proxyTo(obj: any) {
    obj.once = this.once;
    obj.on = this.on;
    obj.emit = this.emit;
    obj.listeners = this.listeners;
    obj.$args = this.$args;
    obj.$o = this.$o;
  }
  private $args(
    nameOrListener: string | Function,
    mayBeListener?: Function
  ): [string, Function] {
    if (!mayBeListener && typeof nameOrListener === 'function') {
      return ['*', nameOrListener];
    } else if (mayBeListener && typeof nameOrListener === 'string') {
      return [nameOrListener, mayBeListener];
    } else {
      throw new Error(
        'Please provide either name and listener or only listener to on function'
      );
    }
  }
  private $o(name: string, listener: Function): () => void {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(listener);
    return () => {
      var index = this.listeners[name].indexOf(listener);
      if (index !== -1) {
        this.listeners[name].splice(index, 1);
      }
    };
  }
  on(listener: Function): () => void;
  on(name: string, listener: Function): () => void;
  on(nameOrListener: string | Function, mayBeListener?: Function): () => void {
    const [name, listener] = this.$args(nameOrListener, mayBeListener);
    return this.$o(name, listener);
  }
  once(listener: Function): () => void;
  once(name: string, listener: Function): () => void;
  once(
    nameOrListener: string | Function,
    mayBeListener?: Function
  ): () => void {
    const [name, listener] = this.$args(nameOrListener, mayBeListener);
    const unlisten = this.$o(name, (...args: any) => {
      unlisten();
      listener(...args);
    });
    return unlisten;
  }
  destroy() {
    this.listeners = {};
  }
  emit(name: string, ...args: any[]) {
    const listeners = [
      ...(this.listeners[name] || []),
      ...(this.listeners['*'] || [])
    ];
    let i = listeners.length;
    const promises = [];
    if (listeners.length) {
      while (i--) {
        let result = listeners[i](...args);
        if (result && result.then) {
          promises.push(result);
        }
      }
    }
    return Promise.all(promises);
  }
}
