import { syncstateTable } from '../constants';
import { Debe } from 'debe';

export type IUpdateState = (
  collection: string,
  local: string | void | undefined,
  remote?: string | void | undefined
) => Promise<void> | void;

export class SyncState {
  constructor(db: Debe) {
    this.db = db;
  }
  private db: Debe;
  private state: any = {};
  local = (collection: string): string | undefined => {
    if (!this.state[collection]) {
      return undefined;
    }
    return this.state[collection].local;
  };
  remote = (collection: string): string | undefined => {
    if (!this.state[collection]) {
      return undefined;
    }
    return this.state[collection].remote;
  };
  // Queue for updateState
  private promise = Promise.resolve();
  init = async () => {
    const state = await this.db.get(syncstateTable);
    if (state) {
      this.state = state;
    }
  };
  // Update remote/local sync state of a collection to know where we currently are
  update: IUpdateState = async (collection, local, remote) => {
    if (!this.state[collection]) {
      this.state[collection] = {};
    }
    if (local) {
      this.state[collection].local = local;
    }
    if (remote) {
      this.state[collection].remote = remote;
    }
    this.promise = this.promise.then(() =>
      this.db.insert(syncstateTable, { ...this.state })
    );
  };
}
