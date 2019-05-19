export interface ICreateOptions {
  hostname: string;
  secure?: boolean;
  rejectUnauthorized?: boolean;
  port: number;
}
export type ICreate = (options: ICreateOptions) => ISocket;
// export let create: ICreate;

export interface IReq<T, T2> {
  data: T;
  end: (result: T2) => void;
  error: (error: any) => void;
  socket: ISocketBase;
}
export interface IChannelMethods<T> {
  unsubscribe: () => void;
  invokePublish: <T2 = any>(data: T) => Promise<T2>;
  transmitPublish: (data: T) => void;
}
export type IChannel<T> = Promise<T>[] & IChannelMethods<T>;
export interface IListenerExtension<T> {
  once: () => Promise<T>;
}
export interface ISocketBase {
  id: string;
  procedure: <T1 = any, T2 = any>(channel: string) => Promise<IReq<T1, T2>>[];
  transmit: <T = any>(channel: string, data: T) => void;
  listener: <T = any>(channel: string) => Promise<T>[] & IListenerExtension<T>;
  receiver: <T = any>(channel: string) => Promise<T>[] & IListenerExtension<T>;
  invoke: <T = any, T2 = any>(channel: string, payload: T) => Promise<T2>;
  closeReceiver: (channel: string) => void;
  disconnect: (code?: number, data?: any) => void;
}
export type IConnectionState =
  | 'connecting'
  | 'open'
  | 'closed'
  | 'authenticated'
  | 'unauthenticated';
export interface ISocket extends ISocketBase {
  state: IConnectionState;
  subscribe: <T>(channel: string) => IChannel<T>;
  closeAllListeners: () => void;
  killAllListeners: () => void;
  closeAllReceivers: () => void;
  killAllReceivers: () => void;
  killAllChannelListeners: () => void;
  killAllChannelOutputs: () => void;
  killAllChannels: () => void;
}
