//import http from 'http';
//import { ISocketBase } from 'debe-socket';

import { AGServerSocket } from "socketcluster-server";

export interface IExchange {
  subscribe: <T>(channel: string) => Promise<T>[];
  unsubscribe: (channel: string) => void;
  invokePublish: <T = any, T2 = any>(channel: string, data: T) => Promise<T2>;
  transmitPublish: <T = any>(channel: string, data: T) => void;
}

export interface IAGServerSocket {
  socket: AGServerSocket;
}

export type IMiddlewareActionType =
  | 'handshakeWS'
  | 'handshakeAG'
  | 'message'
  | 'transmit'
  | 'invoke'
  | 'subscribe'
  | 'publishIn'
  | 'publishOut'
  | 'authenticate';
export interface IMiddlewareAction {
  HANDSHAKE_WS: 'handshakeWS';
  HANDSHAKE_AG: 'handshakeAG';
  MESSAGE: 'message';
  TRANSMIT: 'transmit';
  INVOKE: 'invoke';
  SUBSCRIBE: 'subscribe';
  PUBLISH_IN: 'publishIn';
  PUBLISH_OUT: 'publishOut';
  AUTHENTICATE: 'authenticate';
  allow: () => void;
  block: (error?: any) => void;
  type: IMiddlewareActionType;
  socket: AGServerSocket;
  data: any;
  outcome: 'allowed' | 'blocked' | null;
  // AUTHENTICATE
  signedAuthToken: any | null;
  authToken: any | null;
  // Transmit
  receiver: string;
  // Invoke
  procedure: string;
  // SUBSCRIBE, PUBLISH_IN and PUBLISH_OUT
  channel: string;
}
export type IMiddlewareStream = Promise<IMiddlewareAction>[];
export type IMiddlewareType =
  | 'outbound'
  | 'inbound'
  | 'inboundRaw'
  | 'handshake';

