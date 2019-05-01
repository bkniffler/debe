import { IItem, IGetItem, IInsertItem, Debe } from 'debe';
import { IChanges } from 'debe-delta';

export const CHANNELS = {
  SEND: 'sendChanges',
  SEND_DELTA: 'sendDeltaChanges',
  COUNT_INITIAL: 'countInitialChanges',
  COUNT_INITIAL_DELTA: 'countInitialDeltaChanges',
  FETCH_INITIAL: 'fetchInitialChanges',
  FETCH_INITIAL_DELTA: 'fetchInitialDeltaChanges',
  FETCH_MISSING_DELTA: 'fetchMissingDelta',
  SUBSCRIBE_CHANGES: `subscription`,
  SUBSCRIBE_DELTA_CHANGES: `subscribeDelta`
};
/*export interface ISyncInitialResponse {
  items: IItem[];
  request: string[];
}*/
export interface ISyncItem extends IGetItem {
  remote?: string;
  local?: string;
}

export interface ICountInitialChanges {
  type: string;
  since?: string;
  where?: [string, ...any[]];
}
export interface IInitialFetchChanges {
  type: string;
  since?: string;
  where?: [string, ...any[]];
  page?: number;
}
export type IAddress = [string] | [] | [string, number];
export type ISendChanges =
  | [string, IInsertItem[], any?]
  | [string, IInsertItem[]];
export type ISendDelta = [string, [string, IChanges][], any?];
export interface IListenToChanges {
  type: string;
  clientID: string;
  emit: (err: any, items: IItem[]) => void;
}
export interface ISync {
  countInitialChanges: (payload: ICountInitialChanges) => Promise<number>;
  initialFetchChanges: (payload: IInitialFetchChanges) => Promise<IItem[]>;
  sendChanges: (payload: ISendChanges) => Promise<string | undefined>;
}
export interface ISyncAdapter {
  initialDownload: () => void;
  initialUpload: () => void;
  listenToSubscription: (db: Debe) => Promise<void>;
}
