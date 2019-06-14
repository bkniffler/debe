import React from 'react';
import { context } from './provider';
import { Sync } from 'debe-sync';
import { IConnectionState } from 'debe-socket';

export const syncContext = React.createContext<Sync>(undefined as any);

export function useConnectionState(): IConnectionState {
  const db = React.useContext(context);
  const [state, setState] = React.useState<IConnectionState>(
    db && db['sync'] && db['sync'].state
  );
  React.useEffect(() => {
    if (!db || !db['sync'] || !db['sync'].onConnectionState) {
      return;
    }
    return db['sync'].onConnectionState((con: IConnectionState) =>
      setState(con)
    );
  }, [db]);
  return state;
}
