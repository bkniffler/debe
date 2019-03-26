function isAction(action: any) {
  if (action && action.$isAction) {
    return true;
  }
  return false;
}
function isSameAction(action1: any, action2: any) {
  if (
    action1 &&
    action1.$isAction &&
    action2 &&
    action2.$isAction &&
    action1.$isAction === action2.$isAction
  ) {
    return true;
  }
  return false;
}
interface IAction {
  type: string;
  value?: any | any[];
  callback?: Function;
}
export interface IFlow<T> {
  (action: IAction & T, onFlowBack?: IFlowBack<T>): void;
  restart: (action: IAction & T) => void;
  return: (action: IAction & T) => void;
}
export type IFlowBack<T> = (
  action: IAction & T,
  flow: (value: any) => void
) => void;
export type IPluginCreator<T1 = any, T2 = any> = (
  dispatcher: Dispatcher<T2> & T1,
  options: any
) => IPlugin<T2>;
export type IPlugin<T> = (action: IAction & T, flow: IFlow<T>) => void;

// restart, flow, return,
export class Dispatcher<T1> {
  plugins: IPlugin<T1>[] = [];
  pluginDup: any[] = [];
  dispatch<T>(action: IAction & T1) {
    return new Promise<T>(yay => {
      return dispatch(this.plugins, { $isAction: {}, ...action }, yay);
    });
  }
  dispatchSync(action: IAction & T1) {
    return dispatch(this.plugins, { $isAction: {}, ...action });
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
  plugins: Function[] = [],
  args: any,
  callback?: Function
) {
  let flowbacks: Function[] = [];
  const isFlowback = !isAction(args);
  function callPlugin(action: any, i = 0): any {
    const plugin = plugins[i];
    if (!plugin) {
      if (callback) {
        return callback(action);
      }
      return;
    }
    function flow(newAction: any, onFlowback: any) {
      if (!isFlowback && onFlowback) {
        flowbacks = [onFlowback, ...flowbacks];
      }
      const prevAction = action;
      action = newAction || action;
      if (!isFlowback && isAction(action)) {
        if (isSameAction(prevAction, action)) {
          // Is still action, so flow plugin
          return callPlugin(action, i + 1);
        } else {
          // Is a new action, so restart
          return dispatch(plugins, action, callback);
        }
      } else if (isFlowback) {
        return callPlugin(action, i + 1);
      } else if (flowbacks.length) {
        // Afterwares present, go for them
        return dispatch(flowbacks, action, callback);
      } else if (callback) {
        // Finish
        return callback(action);
      }
    }
    flow.restart = function(action: any) {
      return dispatch(plugins, action, callback);
    };
    flow.return = function(action: any) {
      return dispatch(flowbacks, action, callback);
    };
    return plugin(action, flow);
  }
  return callPlugin(args);
}
