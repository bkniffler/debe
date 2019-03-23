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

export type ITransaction = <T = any>(
  cb: (
    exec: (statement: string, ...args: any[]) => any,
    resolve: (value: any) => void
  ) => void
) => Promise<T>;
export interface IDB {
  transaction: ITransaction;
  close: () => void;
}

const uuidv4 = require('uuid/v4');
export let _generate = uuidv4;
export function setIdGenerator(generator: () => string) {
  _generate = generator;
}
export function generate() {
  return _generate();
}

let logging = false;
type ILogFunc = (level: 'info' | 'error' | 'warn', ...args: any[]) => void;
let logFunc: ILogFunc = (level, ...args) => console[level](...args);
export function overwriteLog(func: ILogFunc) {
  logFunc = func;
}
interface ILog {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}
export const log = {
  disable(enable: boolean = false) {
    logging = enable;
  },
  enable(enable: boolean = true) {
    logging = enable;
  },
  info(...args: any[]) {
    if (!logging) return;
    logFunc('info', ...args);
  },
  error(...args: any[]) {
    if (!logging) return;
    logFunc('error', ...args);
  },
  warning(...args: any[]) {
    if (!logging) return;
    logFunc('warn', ...args);
  }
};

// let logs = [];
// const colorsjs = require('colors/safe');

export function createLog(name: string): ILog {
  /*const colors = [
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'gray'
  ];*/

  let options = {
    // color: '',
    tabs: ''
  };
  return Object.keys(log).reduce(
    (state: any, key: string) => ({
      ...state,
      [key]: (...args: any[]) => {
        return log[key](options.tabs + name, ...args);
        /*if (!options.color) {
          options.color = colors[logs.length % colors.length];
          options.tabs = Array(logs.length)
            .fill(0)
            .reduce(str => `${str}  `, '');
          logs.push(null);
        }
        return log[key](options.tabs + colorsjs[options.color](name), ...args);
        */
      }
    }),
    {}
  );
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
    if (listeners.length) {
      while (i--) {
        listeners[i](...args);
      }
    }
  }
}
