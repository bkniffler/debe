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
  loading,
  error,
  render,
  cache,
  value
}: {
  suspense?: boolean;
  render?: () => React.ReactNode;
  loading?: () => React.ReactNode;
  error?: () => React.ReactNode;
  initialize?: (db: Debe) => Promise<void>;
  cache?: Cache;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const [, update] = React.useState<Debe | undefined>();
  if (!cache) {
    cache = React.useContext(debeCacheContext);
  }
  if (!cache) {
    cache = React.useMemo(() => new Cache(), []);
  }

  React.useEffect(() => {
    return (cache as Cache).listen<Debe>(
      'debe',
      function listener(error, v) {
        update(v);
      },
      true
    );
  }, []);

  let db;
  try {
    db = cache.read<Debe>('debe', async set => {
      const db = typeof value === 'function' ? value() : value;
      await db.initialize();
      if (initialize) {
        await initialize(db);
      }
      set(undefined, db);
    });
    children = render ? render() : children;
  } catch (err) {
    if (cache.isSuspense) {
      throw err;
    }
    if (err && err.then) {
      children = loading ? loading() : children;
    } else {
      children = error ? error() : children;
    }
  }

  return (
    <ProviderCache value={cache}>
      <Provider value={db}>{children}</Provider>
    </ProviderCache>
  );
}
