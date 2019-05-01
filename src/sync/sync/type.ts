import { ISocket } from 'asyngular-client';
import { Debe, IItem } from 'debe';
import { IUpdateState } from '../state';

export interface IListenReturn {
  cancel: () => void;
  wait: Promise<void | any>;
}
export interface ISyncType {
  initialUp(
    collection: string,
    since: string | undefined,
    count: number,
    socket: ISocket,
    db: Debe
  ): Promise<[string | undefined, string | undefined]>;
  listen(socket: ISocket, db: Debe, updateState: IUpdateState): IListenReturn;
  up(
    collection: string,
    db: Debe,
    socket: ISocket,
    items: IItem[],
    options: any
  ): Promise<any>;
  initialDown(
    collection: string,
    since: string | undefined,
    count: number,
    socket: ISocket,
    db: Debe
  ): Promise<[string | undefined, string | undefined]>;
}
