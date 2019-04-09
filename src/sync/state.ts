import { syncstateTable } from './constants';
import { Debe, createLog } from 'debe';
import { ISyncItem } from './types';
import { getBigger } from './utils';
const log = createLog('sync/sync-state');

export function getSyncState(id: string, client: Debe) {
  let syncState: any = client
    .get<ISyncItem>(syncstateTable, { id })
    .catch(err => log.error(`Can't fetch syncstate`));
  let insertPromise: Promise<any> = Promise.resolve();
  // Allow update syncstate, but take care of parallel access
  const updateSyncState = async (local?: string, remote?: string) => {
    const currentState = (await syncState) || {};
    return (insertPromise = insertPromise.then(() =>
      client
        .insert<ISyncItem>(syncstateTable, {
          id,
          rev: currentState ? currentState.rev : '',
          local: getBigger(local, currentState.local),
          remote: getBigger(remote, currentState.remote)
        })
        .then(i => (syncState = i))
        .catch(x => console.error('Error while insertPromise', x))
    ));
  };
  return {
    get: async () => (await syncState) || {},
    update: updateSyncState
  };
}
