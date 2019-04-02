import { IItem, IGetItem } from 'debe';

/*export interface ISyncInitialResponse {
  items: IItem[];
  request: string[];
}*/
export interface ISyncItem extends IGetItem {
  remote: string;
  local: string;
}
export interface ISync {
  initialFetchChanges: (
    model: string,
    //state?: any,
    since?: string,
    where?: string[]
  ) => Promise<IItem[]>;
  sendChanges: (model: string, items?: IItem[], options?: any) => Promise<void>;
  listenToChanges: (
    table: string,
    clientID: string,
    emit: (err: any, model: string, items: IItem[]) => void
  ) => () => void;
}
