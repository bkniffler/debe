import { IItem, IGetItem } from 'debe';

/*export interface ISyncInitialResponse {
  items: IItem[];
  request: string[];
}*/
export interface ISyncItem extends IGetItem {
  remote?: string;
  local?: string;
}
export interface ISync {
  initialFetchChanges: (
    collection: string,
    //state?: any,
    since?: string,
    where?: string[]
  ) => Promise<IItem[]>;
  sendChanges: (
    collection: string,
    items?: IItem[],
    options?: any
  ) => Promise<string | undefined>;
  listenToChanges: (
    table: string,
    clientID: string,
    emit: (err: any, items: IItem[]) => void
  ) => () => void;
}
