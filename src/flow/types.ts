export interface IFlow<T> {
  (value: T, onFlowBack?: IFlowBack<T>): void;
  run: <T>(type: string, value?: T, context?: any) => Promise<T>;
  reset: (type: string, value?: T, context?: any) => void;
  return: (value: T) => void;
  set: <T = any>(key: string, value: T) => void;
  get: <T = any>(key: string, defaultValue?: T) => T;
  catch: (handler: IIntermediateErrorHandler) => any;
}
export interface IIntermediateErrorHandler {
  (err: any, orginalCallback: ICallback): void;
}
export type IFlowBack<T = any> = (
  result: T,
  flow: (value: any) => void
) => void;
export type ISkill<T = any> = (type: string, value: T, flow: IFlow<T>) => void;
export interface ITrackerArg {
  skill: string;
  type: string;
  time: number;
  value: any;
  id: string;
  parents: (string | number)[];
}
export type ITracker = (arg: ITrackerArg) => void;
export type IPosition = 'START' | 'BEFORE' | 'AFTER' | 'END';
export interface IOptions {
  tracker?: ITracker;
  [s: string]: any;
}
export interface ICallback {
  (err: any): void;
  (err: undefined, result: any): void;
}
export type ICallbacks = ICallback | [IErrorCallback, ISuccessCallback];
export interface ISuccessCallback {
  (result: any): void;
}
export interface IErrorCallback {
  (err: any): void;
}
