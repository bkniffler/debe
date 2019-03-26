import { IItem, types } from '../types';
import { Debe } from '../client';
import { IPluginCreator } from '../dispatcher';

export const changeListenerPlugin: IPluginCreator<Debe> = (
  client,
  options = {}
) => {
  const { revField = 'rev' } = options;
  client.indexFields.push(revField);
  const emitter = new Emitter();

  function addRev(item: any, keepRev: boolean = false): [any, any] {
    if (!item) {
      return item;
    }
    if (!keepRev || !item[revField]) {
      item[revField] = new Date().getTime() / 1000 + '';
    }
    return item;
  }

  return function({ callback, ...action }: any, flow) {
    const { type, model, value } = action;
    if (callback) {
      let lastResult: any = undefined;
      const listener = async () => {
        let isInitial = lastResult === undefined;
        const newValue = await client.dispatch(action);
        // Check is results changed
        if (!isEqual(lastResult, newValue as any, revField)) {
          callback(
            (newValue || undefined) as any,
            isInitial ? 'INITIAL' : 'CHANGE'
          );
        }
        lastResult = newValue || null;
      };
      listener();
      return emitter.on(model.name || model, listener);
    }
    if (type === types.INSERT) {
      if (Array.isArray(value)) {
        action.value = value.map((x: any) => addRev(x, action['keepRev']));
      } else {
        action.value = addRev(value, action['keepRev']);
      }
      flow(
        action,
        (res, back) => {
          emitter.emit(model.name || model);
          back(res);
        }
      );
    }
    return flow(action);
  };
};

function isEqual(
  rowsA: IItem[] | IItem | null,
  rowsB: IItem[] | IItem | null,
  revisionField: string
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
class Emitter {
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
