import * as React from 'react';
import { Debe } from 'debe';
import {
  applyMiddleware,
  compose,
  createStore,
  combineReducers,
  Middleware,
  Reducer
} from 'redux';
// @ts-ignore
import { Provider } from 'react-redux';
import { useMemoOne } from './utils/memo-one';

export let STOREKEY = 'debe';
export let TIMEOUT = 5000;
export let setRequestTimeout = (timeout: number) => (TIMEOUT = timeout);
export let setStoreKey = (key: string) => (STOREKEY = key);

export const context = React.createContext<Debe>(undefined as any);
export function DebeProvider({
  children,
  initialize,
  loading,
  store: s,
  error,
  render,
  value
}: {
  store?: any;
  render?: (db: Debe) => React.ReactNode;
  loading?: () => React.ReactNode;
  error?: (err: any) => React.ReactNode;
  initialize?: (db: Debe) => Promise<void>;
  value: Debe | (() => Debe);
  children?: React.ReactNode;
}) {
  const [err, update] = React.useState<any>(undefined);
  const db = useMemoOne<Debe>(() => {
    const _db = value && (value as Debe).all ? value : (value as Function)();
    return _db;
  });
  const store = useMemoOne<any>(() => s || makeStore(db, {}));
  React.useEffect(() => {
    async function g() {
      try {
        if (!db.isInitialized) {
          await db.initialize();
        }
        if (initialize) {
          await initialize(db);
        }
        update(null);
      } catch (err) {
        update(err);
      }
    }
    g();
  }, [db]);

  if (render && db.isInitialized) {
    children = render(db);
  } else if (loading && !db.isInitialized) {
    children = loading();
  } else if (err && error) {
    children = error(err);
  }

  return (
    <context.Provider value={db}>
      <Provider store={store}>{children}</Provider>
    </context.Provider>
  );
}

export const reducer: Reducer = (state, action) => {
  if (!state) {
    return {};
  }
  switch (action.type) {
    case 'DEBE_QUERY_LOADING':
      return { ...state, [action.key]: { loading: true } };
    case 'DEBE_QUERY_SUCCESS':
      return {
        ...state,
        [action.key]: { loading: false, result: action.result }
      };
    case 'DEBE_QUERY_ERROR':
      return {
        ...state,
        [action.key]: { loading: false, error: action.error }
      };
  }
  return state;
};

const middleware = (db: Debe): Middleware => store => next => action => {
  if (action.type === 'DEBE_QUERY') {
    const { key, collection, query, method } = action;
    const stop = db[method as 'all'](collection, query, (error, result) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (error) {
        next({ type: 'DEBE_QUERY_ERROR', error, key });
      } else {
        next({ type: 'DEBE_QUERY_SUCCESS', result, key });
      }
    });
    let timeout = setTimeout(() => {
      stop();
      next({
        type: 'DEBE_QUERY_ERROR',
        error: new Error('Query ' + key + ' timed out'),
        key
      });
    }, TIMEOUT);
    return next({ type: 'DEBE_QUERY_LOADING', key });
  } else if (action.type === 'DEBE_QUERY') {
    const { key, collection, query, method } = action;
    db[method as 'all'](collection, query)
      .then(result => {
        next({ type: 'DEBE_QUERY_SUCCESS', result, key });
      })
      .catch(error => {
        next({ type: 'DEBE_QUERY_ERROR', error, key });
      });
    return next({ type: 'DEBE_QUERY_LOADING', key });
  }
  return next(action);
};

export const makeStore = (db: Debe, initialState: any = {}) => {
  const composeEnhancers =
    (typeof window !== 'undefined' &&
      window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__']) ||
    compose;
  const rootReducer = combineReducers({
    debe: reducer
  });
  return createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(middleware(db)))
  );
};

export function getUnloadedKeys(store: any, storeKey: string = STOREKEY) {
  const state = store.getState()[storeKey];
  const promises = [];
  for (let key of Object.keys(state)) {
    const entry = state[key];
    if (state[key].loading) {
      promises.push(entry);
    }
  }
  console.log(promises);
  return promises;
}

export async function awaitLoaded(
  store: any,
  unloaded?: any[],
  storeKey: string = STOREKEY,
  timeout: number = 20
): Promise<any> {
  if (!unloaded) {
    unloaded = getUnloadedKeys(store, storeKey);
  }
  if (unloaded.length === 0) {
    return;
  }
  await new Promise(yay => setTimeout(yay, timeout));
  return awaitLoaded(
    store,
    getUnloadedKeys(store, storeKey),
    storeKey,
    timeout
  );
}
