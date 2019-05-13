import * as React from 'react';
import { debeContext, debeCacheContext, Cache } from './context';
import { Debe } from 'debe';

const Provider = debeContext.Provider;
const ProviderCache = debeCacheContext.Provider;

export function CacheProvider({ children }: { children?: React.ReactNode }) {
  const cache = React.useMemo(() => new Cache(), []);
  return <ProviderCache value={cache}>{children}</ProviderCache>;
}

export function DebeProvider({
  children,
  initialize,
  cache,
  value
}: {
  initialize?: (db: Debe) => Promise<void>;
  cache?: Cache;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const [, update] = React.useState<Debe | undefined>();
  if (!cache) {
    cache = React.useContext(debeCacheContext);
  }

  React.useEffect(() => {
    if (!cache) {
      throw new Error('Please provide a cache');
    }
    return cache.listen<Debe>('debe', function listener(error, v) {
      if (error) {
        console.log(error);
        throw error;
      }
      update(v);
    });
  });

  const db = cache.read<Debe>('debe', async set => {
    const db = typeof value === 'function' ? value() : value;
    await db.initialize();
    if (initialize) {
      await initialize(db);
    }
    set(undefined, db);
  });
  return (
    <ProviderCache value={cache}>
      <Provider value={db}>{children}</Provider>
    </ProviderCache>
  );
}
