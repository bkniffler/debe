declare module 'asyngular-server' {
  import * as http from 'http';
  import { ISocketBase } from 'asyngular-client';
  export * from 'asyngular-client';

  type attach = (server: http.Server) => IAGServer;
  export let attach: attach;

  export interface IExchange {
    subscribe: <T>(channel: string) => Promise<T>[];
    unsubscribe: (channel: string) => void;
    invokePublish: <T = any, T2 = any>(channel: string, data: T) => Promise<T2>;
    transmitPublish: <T = any>(channel: string, data: T) => void;
  }
  export interface IAGServerSocket {
    socket: ISocketBase;
  }
  export interface IAGServer {
    exchange: IExchange;
    listener: (type: string) => Promise<IAGServerSocket>[];
    closeListener: (event: string) => void;
    killListener: (event: string) => void;
    close: () => Promise<void>;
    closeAllListeners: () => void;
    killAllListeners: () => void;
  }
}
