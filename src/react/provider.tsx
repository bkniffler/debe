import * as React from 'react';
import { debeContext } from './context';
import { Debe } from 'debe';

const Provider = debeContext.Provider;

export function DebeProvider({
  render,
  children,
  value,
  loading,
  initialize = () => Promise.resolve()
}: {
  initialize?: (db: Debe) => Promise<void>;
  value: Debe | (() => Debe);
  render?: () => React.ReactNode;
  authError?: () => React.ReactNode;
  loading?: () => React.ReactNode;
  children?: React.ReactNode;
}) {
  const [isInitialized, setState] = React.useState(false);
  const debe = React.useMemo(
    () => (typeof value === 'function' ? value() : value),
    []
  );
  React.useEffect(() => {
    debe
      .initialize()
      .then(() => initialize(debe))
      .then(() => setState(true))
      .catch(err => console.log(err));
    return () => {
      // debe.close();
    };
  }, []);
  let child = null;
  if (!isInitialized && loading) {
    child = loading();
  } else if (isInitialized && render) {
    child = render();
  } else {
    child = children;
  }
  return <Provider value={debe}>{child}</Provider>;
}
