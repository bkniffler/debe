let logging = false;
export type ILogFunc = (
  level: 'info' | 'error' | 'warn',
  ...args: any[]
) => void;
let logFunc: ILogFunc = (level, ...args) => console[level](...args);
export function overwriteLog(func: ILogFunc) {
  logFunc = func;
}
export interface ILog {
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
