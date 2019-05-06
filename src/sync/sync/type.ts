import { ISocket } from 'asyngular-client';
import { Debe, IItem } from 'debe';
import { IUpdateState } from '../state';
import { SyncEngine } from '../sync';

export interface IListenReturn {
  wait: Promise<void | any>;
}
export interface ISyncType {
  initialUp(
    collection: string,
    since: string | undefined,
    count: number,
    sync: SyncEngine
  ): Promise<[string | undefined, string | undefined]>;
  listen(sync: SyncEngine): IListenReturn;
  up(
    collection: string,
    items: IItem[],
    options: any,
    sync: SyncEngine
  ): Promise<any>;
  initialDown(
    collection: string,
    since: string | undefined,
    count: number,
    sync: SyncEngine
  ): Promise<() => Promise<[string | undefined, string | undefined]>>;
}
