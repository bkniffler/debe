export interface IFlow<T> {
  (value: T, onFlowBack?: INextFlow<T>): void;
  restart: (type: string, value: T, context?: any) => void;
  return: (value: T) => void;
  set: (key: string, value: any) => void;
  get: (key: string, defaultValue?: any) => any;
}
export type INextFlow<T = any> = (
  result: T,
  flow: (value: any) => void
) => void;
export type IPluginCreator<T1 = any, T2 = any> = (
  dispatcher: Dispatcher<T2> & T1,
  options: any
) => IPlugin<T2>;
export type IPlugin<T> = (type: string, value: T, flow: IFlow<T>) => void;

// restart, flow, return,
export class Dispatcher<T1 = any> {
  private plugins: IPlugin<T1>[] = [];
  private pluginDup: any[] = [];
  dispatch<T>(type: string, value?: T1, context: any = {}) {
    return new Promise<T>(yay => {
      return dispatch(yay, this.plugins, type, value, context);
    });
  }
  dispatchSync(type: string, value?: T1, context: any = {}) {
    return dispatch(undefined, this.plugins, type, value, context);
  }
  addPlugin(plugin: IPluginCreator, options: any = {}) {
    if (this.pluginDup.indexOf(plugin) !== -1) {
      return;
    }
    this.pluginDup.push(plugin);
    this.plugins.push(plugin(this, options));
  }
}

export function dispatch(
  callback: Function | undefined,
  plugins: Function[] = [],
  type: string,
  value: any,
  initialContext: any = {},
  isNext = false
) {
  let nextFlows: Function[] = [];
  const context = initialContext;
  function setContext(key: string, value: any) {
    context[key] = value;
  }
  function getContext(key: string, defaultValue: any) {
    return context[key] !== undefined ? context[key] : defaultValue;
  }
  function callPlugin(value: any, i = 0): any {
    const plugin = plugins[i];
    function flowReturn(value: any) {
      if (nextFlows.length) {
        // Afterwares present, go for them
        return dispatch(callback, nextFlows, type, value, context, true);
      } else if (callback) {
        // Finish
        return callback(value);
      }
    }
    function flowRestart(type: string, value: any, con: any) {
      return dispatch(callback, plugins, type, value, con || context);
    }
    if (!plugin) {
      return flowReturn(value);
    }
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        nextFlows = [nextFlow, ...nextFlows];
      }
      value = newValue || value;
      return callPlugin(value, i + 1);
    }
    flow.restart = flowRestart;
    flow.return = flowReturn;
    flow.get = getContext;
    flow.set = setContext;
    if (isNext) {
      return plugin(value, flow);
    } else {
      return plugin(type, value, flow);
    }
  }
  return callPlugin(value);
}
