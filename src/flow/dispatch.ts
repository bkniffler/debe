import {
  ISkill,
  IOptions,
  IFlow,
  ICallbacks,
  IIntermediateErrorHandler
} from './types';
import { generateID } from './utils';
import { STATUS, RETURN, START, COMPLETED, NAME } from './constants';

export function dispatch(
  callbacks: ICallbacks | undefined,
  skills: ISkill<any>[],
  type: string,
  value: any,
  options: IOptions = {},
  parents: (string | number)[] = [],
  id?: string
) {
  let callback =
    !callbacks || !Array.isArray(callbacks)
      ? callbacks
      : (err?: any, result?: any) =>
          err ? callbacks[0](err) : callbacks[1](result);
  let nextFlows: IFlow<any>[] = [];
  const context = { ...options };
  function setContext(key: string, value: any) {
    context[key] = value;
  }
  function getContext(key: string, defaultValue: any) {
    return context[key] !== undefined ? context[key] : defaultValue;
  }
  if (options.tracker) {
    id = id || generateID();
    options.tracker({
      skill: options[STATUS] === RETURN ? RETURN : START,
      type,
      value,
      time: new Date().getTime(),
      id,
      parents
    });
  }
  function useSkill(value: any, i = 0): any {
    const skill = skills[i];
    function flowReturn(value: any) {
      if (nextFlows.length) {
        // Afterwares present, go for them
        return dispatch(
          callback,
          nextFlows,
          type,
          value,
          {
            ...context,
            [STATUS]: RETURN
          },
          parents,
          id
        );
      } else if (callback) {
        // Finish
        if (options.tracker && id) {
          options.tracker({
            skill: COMPLETED,
            type,
            value,
            time: new Date().getTime(),
            id,
            parents
          });
        }
        return callback(undefined, value);
      }
    }
    function flowReset(type: string, value: any, con: any = {}) {
      return dispatch(
        callbacks,
        skills,
        type,
        value,
        {
          ...options,
          ...con,
          [STATUS]: START
        },
        parents,
        id
      );
    }
    function flowRun<T>(type: string, value: any, con: any = {}) {
      return new Promise<T>((yay, nay) => {
        return dispatch(
          [nay, yay],
          skills,
          type,
          value,
          {
            ...options,
            ...con,
            [STATUS]: START
          },
          options.tracker
            ? [...parents, `${id}.${i}${options[STATUS] === RETURN ? '-' : ''}`]
            : []
        );
      });
    }
    function flowCatch(errorHandler: IIntermediateErrorHandler) {
      const originalCallback = callback || ((() => {}) as any);
      callback = function newCallback(err?: any, value?: any) {
        if (err) {
          errorHandler(err, originalCallback);
        } else if (callback) {
          originalCallback(err, value);
        }
      };
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill[NAME];
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        nextFlow[NAME] = skillName;
        nextFlows = [nextFlow, ...nextFlows];
      }
      value = newValue || value;
      return useSkill(value, i + 1);
    }
    flow.reset = flowReset;
    flow.return = flowReturn;
    flow.get = getContext;
    flow.set = setContext;
    flow.run = flowRun;
    flow.catch = flowCatch;
    if (options.tracker) {
      options.tracker({
        skill: skillName,
        type,
        value,
        time: new Date().getTime(),
        id: `${id}.${i}${options[STATUS] === RETURN ? '-' : ''}`,
        parents
      });
    }
    try {
      let result: any;
      if (options[STATUS] === RETURN) {
        result = (skill as any)(value, flow);
      } else {
        result = skill(type, value, flow);
      }
      if (result && result.then && result.catch) {
        result.catch((err: any) => {
          if (callback) {
            return callback(err);
          }
        });
      }
      return result;
    } catch (err) {
      if (callback) {
        return callback(err);
      }
      throw err;
    }
  }
  return useSkill(value);
}
