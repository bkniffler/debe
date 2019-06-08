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
  render?: (db: Debe) => React.ReactNode;
  loading?: () => React.ReactNode;
  error?: (err: any) => React.ReactNode;
  initialize?: (db: Debe) => Promise<void>;
  cache?: Cache;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const [{ db, err }, update] = React.useState<{
    db: Debe | undefined;
    err: any | undefined;
  }>({ db: undefined, err: undefined });

  if (!cache) {
    cache = React.useContext(debeCacheContext);
  }
  if (!cache) {
    cache = React.useMemo(() => new Cache(), []);
  }

  React.useEffect(() => {
    async function g() {
      const db = value && (value as Debe).all ? value : (value as Function)();
      if (!db.isInitialized) {
        await db.initialize();
      }
      if (initialize) {
        await initialize(db);
      }
      update({ db, err: undefined });
    }
    g();
  }, []);

  if (render && db) {
    children = render(db);
  } else if (!db && loading) {
    children = loading();
  } else if (err && error) {
    children = error(err);
  }

  return (
    <ProviderCache value={cache}>
      <Provider value={db as any}>{children}</Provider>
    </ProviderCache>
  );
}
