declare module 'asyngular-client' {
  import * as http from 'http';

  export interface ICreateOptions {
    hostname: string;
    port: number;
  }
  type create = (options: ICreateOptions) => ISocket;
  export let create: create;

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
  export interface ISocketBase {
    id: string;
    procedure: <T1 = any, T2 = any>(channel: string) => Promise<IReq<T1, T2>>[];
    transmit: <T = any>(channel: string, data: T) => void;
    listener: <T = any>(channel: string) => Promise<T>[];
    receiver: <T = any>(channel: string) => Promise<T>[];
    invoke: <T = any, T2 = any>(channel: string, payload: T) => Promise<T2>;
    closeReceiver: (channel: string) => void;
    disconnect: (code?: number, data?: any) => void;
  }
  export interface ISocket extends ISocketBase {
    subscribe: <T>(channel: string) => IChannel<T>;
  }
}
