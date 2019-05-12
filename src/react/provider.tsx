import * as React from 'react';
import { debeContext, debeCacheContext, Cache } from './context';
import { Debe } from 'debe';

const Provider = debeContext.Provider;
const ProviderCache = debeCacheContext.Provider;

function DebeProviderInner({
  children,
  initialize,
  value
}: {
  initialize?: (db: Debe) => Promise<void>;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const [, update] = React.useState('');
  const cache = React.useContext(debeCacheContext);
  const db = cache.read('debe', async set => {
    const db = typeof value === 'function' ? value() : value;
    await db.initialize();
    if (initialize) {
      await initialize(db);
    }
    set(db);
    update(new Date().getTime() + '');
  });
  if (db && db.then) {
    throw db;
  }
  return <Provider value={db}>{children}</Provider>;
}

export function DebeProvider({
  children,
  value,
  initialize
}: {
  initialize?: (db: Debe) => Promise<void>;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const cache = React.useMemo(() => new Cache(), []);
  return (
    <ProviderCache value={cache}>
      <DebeProviderInner initialize={initialize} value={value}>
        {children}
      </DebeProviderInner>
    </ProviderCache>
  );
}
