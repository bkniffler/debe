import { IItem, IListenerOptions, actionTypes, listenTypes } from './types';

export abstract class DebeDispatcher<TBase = IItem> {
  abstract close(): Promise<void>;
  abstract initialize(): Promise<void>;
  abstract run<T = TBase>(
    action: actionTypes,
    collection: string,
    payload?: any,
    options?: any
  ): Promise<T>;
  abstract listen<T = TBase>(
    action: listenTypes,
    callback: (value: T) => void,
    options: IListenerOptions
  ): () => void;
}
