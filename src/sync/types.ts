import { IItem, IGetItem, IInsertItem } from 'debe';

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
export interface ISendChanges {
  type: string;
  items: IInsertItem[];
  options?: any;
}
export interface IListenToChanges {
  type: string;
  clientID: string;
  emit: (err: any, items: IItem[]) => void;
}
export interface ISync {
  countInitialChanges: (payload: ICountInitialChanges) => Promise<number>;
  initialFetchChanges: (payload: IInitialFetchChanges) => Promise<IItem[]>;
  sendChanges: (payload: ISendChanges) => Promise<string | undefined>;
  listenToChanges: (payload: IListenToChanges) => () => void;
}
