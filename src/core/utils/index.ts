export * from './ensure-array';
export * from './time';
export * from './generate';
export * from './query';
export * from './log';
// Do function arguments contain a cb function?
export function isArgsWithCallback(args: any[]) {
  return typeof args[args.length - 1] === 'function';
}
// Return last arg and rest args
export function extractCallback(args: any[]): [Function | undefined, ...any[]] {
  if (isArgsWithCallback(args)) {
    return [args[args.length - 1], ...args.splice(0, args.length - 1)];
  } else {
    return [undefined, ...args];
  }
}

interface IHasName {
  name: string;
  [s: string]: any;
}
export interface IObject<T> {
  [s: string]: T;
}
export function objectify<T, T2 = T>(
  array: (T & IHasName)[],
  map: (v: T) => T2
): IObject<T2> {
  return array.reduce((store, x) => {
    store[x.name] = map ? map(x) : x;
    return store;
  }, {});
}

const isNullOrUndefined = (x: any) => x === null || x === undefined;
export function isEqual(
  rowsA: any[] | any | null,
  rowsB: any[] | any | null,
  revisionField = 'rev'
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
  if (isNullOrUndefined(rowsA) && isNullOrUndefined(rowsB)) {
    return true;
  }
  if ((!rowsA && rowsB) || (rowsA && !rowsB)) {
    return false;
  }
  if (
    typeof rowsA === 'bigint' ||
    typeof rowsA === 'boolean' ||
    typeof rowsA === 'number' ||
    typeof rowsA === 'string'
  ) {
    return rowsA === rowsB;
  }
  if (rowsA instanceof Date) {
    if (!(rowsB instanceof Date)) {
      return false;
    }
    return +rowsA === +rowsB;
  }
  function extrapolate(item: any) {
    return `${item.id}|${item[revisionField]}`;
  }
  function isEqualSingle(itemA: any | null, itemB: any | null) {
    if (itemA === itemB) {
      return true;
    }
    if (!itemA && !itemB) {
      return true;
    }
    if ((!itemA && itemB) || (itemA && !itemB)) {
      return false;
    }
    return extrapolate(itemA as any) === extrapolate(itemB as any);
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
  close() {
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
