export interface ISyncInitialResponse {
  items: IItem[];
  request: string[];
}
export interface ISync {
  initialFetchChanges: (
    model: string,
    state?: any,
    where?: string[]
  ) => Promise<ISyncInitialResponse>;
  sendChanges: (model: string, items?: IItem[], options?: any) => Promise<void>;
  listenToChanges: (
    table: string,
    clientID: string,
    emit: (err: any, model: string, items: IItem[]) => void
  ) => () => void;
}
