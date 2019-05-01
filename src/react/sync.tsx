import * as React from 'react';
import { debeContext } from './context';
import { Sync } from 'debe-sync';
import { IConnectionState } from 'asyngular-client';

export const syncContext = React.createContext<Sync>(undefined as any);

export function useConnectionState(): IConnectionState {
  const client = React.useContext(debeContext);
  const [state, setState] = React.useState<IConnectionState>(
    client['sync'] && client['sync'].state
  );
  React.useEffect(() => {
    if (!client || !client['sync'] || !client['sync'].onConnectionState) {
      return;
    }
    return client['sync'].onConnectionState((con: IConnectionState) =>
      setState(con)
    );
  }, [client]);
  return state;
}
