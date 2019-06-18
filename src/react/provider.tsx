import React from 'react';
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
    return {
      listeners: {}
    };
  }
  if (action.type === 'DEBE_QUERY_UNLISTEN') {
    const listeners = { ...state.listeners };
    const currentListeners = state.listeners[action.key]
      ? [...state.listeners[action.key]]
      : [];
    const index = currentListeners.indexOf(action.id);
    if (index >= 0) {
      currentListeners.splice(index, 1);
    }
    if (currentListeners.length === 0) {
      delete listeners[action.key];
    } else {
      listeners[action.key] = currentListeners;
    }
    return {
      ...state,
      listeners
    };
  } else if (action.type === 'DEBE_QUERY_LISTEN') {
    const listeners = { ...state.listeners };
    const currentListeners = state.listeners[action.key]
      ? [...state.listeners[action.key]]
      : [];
    currentListeners.push(action.id);
    listeners[action.key] = currentListeners;
    return {
      ...state,
      listeners
    };
  } else if (action.type === 'DEBE_QUERY_LOADING') {
    return {
      ...state,
      [action.key]: { loading: true }
    };
  } else if (action.type === 'DEBE_QUERY_SUCCESS') {
    return {
      ...state,
      [action.key]: { loading: false, result: action.result }
    };
  } else if (action.type === 'DEBE_QUERY_ERROR') {
    const result = state[action.key] &&state[action.key].result;
    return {
      ...state,
      [action.key]: { result, loading: false, error: action.error }
    };
  }
  return state;
};

export const middleware = (
  db: Debe,
  isServer = false,
  storeKey: string = STOREKEY,
  listeners = {}
): Middleware => store => next => action => {
  if (action.type === 'DEBE_QUERY_UNLISTEN') {
    const { key } = action;
    next(action);
    const state = store.getState()[storeKey];
    if (!state.listeners[key] || state.listeners[key].length === 0) {
      if (listeners[key]) {
        listeners[key]();
        listeners[key] = undefined;
      }
    }
  } else if (action.type === 'DEBE_QUERY') {
    const { key, collection, query, method, id, once } = action;

    if (!store.getState()[storeKey][key]) {
      let timedOut = false;
      let timeout = setTimeout(() => {
        timedOut = true;
        store.dispatch({
          type: 'DEBE_QUERY_ERROR',
          error: 'Query ' + key + ' timed out',
          key
        });
      }, TIMEOUT || (isServer ? 1000 : 5000));

      store.dispatch({
        type: 'DEBE_QUERY_LOADING',
        key
      });
      db[method as 'all'](collection, query)
        .then(result => {
          if (timedOut) {
            return;
          }
          clearTimeout(timeout);
          store.dispatch({
            type: 'DEBE_QUERY_SUCCESS',
            error: undefined,
            result,
            key
          });
        })
        .catch(error => {
          if (timedOut) {
            return;
          }
          clearTimeout(timeout);
          store.dispatch({
            type: 'DEBE_QUERY_ERROR',
            result: undefined,
            error,
            key
          });
        });
    }
    if (!once && !isServer) {
      if (!listeners[key]) {
        const stop = db[method as 'all'](collection, query, (error, result) => {
          if (error) {
            store.dispatch({
              type: 'DEBE_QUERY_ERROR',
              result: undefined,
              error,
              key
            });
          } else {
            store.dispatch({
              type: 'DEBE_QUERY_SUCCESS',
              error: undefined,
              result,
              key
            });
          }
        });
        listeners[key] = stop;
      }
      store.dispatch({ type: 'DEBE_QUERY_LISTEN', key, id });
    }
    return;
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
