import * as React from 'react';
import { IDebeUse, IItem, IQueryInput, IGetItem } from 'debe';
import { debeContext, debeCacheContext } from './context';

let delay = 0;
export function setDelay(del: number) {
  delay = del;
}
export function useAllOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[]
) {
  return useDebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    'all',
    false,
    (proxy, cb) => {
      proxy
        .all(query)
        .then(x => cb(undefined, x))
        .catch(err => cb(err, undefined as any));
    },
    query,
    []
  );
}

export function useGetOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string
) {
  return useDebeBase<(T & IGetItem) | undefined>(
    collection,
    'get',
    false,
    (proxy, cb) => {
      proxy
        .get(query)
        .then(x => cb(undefined, x))
        .catch(err => cb(err, undefined));
    },
    query,
    undefined
  );
}

export function useAll<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[]
) {
  return useDebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    'all',
    true,
    (proxy, cb) =>
      proxy.all(query, (err, res) => {
        cb(err, res);
      }),
    query,
    []
  );
}

export function useGet<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string
) {
  return useDebeBase<T & IGetItem, (T & IGetItem) | undefined>(
    collection,
    'get',
    true,
    (proxy, cb) =>
      proxy.get(query, (err, res) => {
        cb(err, res);
      }),
    query,
    undefined
  );
}

function useDebeBase<TBase, TResult = TBase>(
  collection: string,
  method: string,
  listening: boolean,
  handler: (
    service: IDebeUse<TBase>,
    cb: (error: any, res: TResult) => void
  ) => void | (() => void),
  arg: any,
  defaultValue: any
): [TResult, boolean, any] {
  const client = React.useContext(debeContext);
  const cache = React.useContext(debeCacheContext);
  const argKey = JSON.stringify(arg);
  const key = `${collection}:${method}:${argKey}`;

  const [, update] = React.useState<TResult | undefined>(undefined);

  React.useEffect(() => {
    if (arg && arg.skip) {
      return;
    }
    return cache.listen<TResult>(
      key,
      function listener(error, v) {
        update(v);
      },
      !listening
    );
  }, [key]);

  if (!client && !cache.has(key)) {
    const err = new Error('Please define a client');
    if (cache.isSuspense) {
      throw err;
    } else {
      return [defaultValue, true, err];
    }
  }

  try {
    const result =
      (arg && arg.skip) || (!client && !cache.has(key))
        ? undefined
        : cache.read(key, set => {
            const proxy = client.use<TBase>(collection);
            handler(proxy, (err, res) => {
              setTimeout(() => {
                set(err, res);
              }, delay);
            });
          });
    return [result || defaultValue, false, undefined];
  } catch (err) {
    if (cache.isSuspense) {
      throw err;
    }
    if (err && err.then) {
      return [defaultValue, true, undefined];
    }
    return [defaultValue, false, err];
  }
}

export function useCollection<T = IItem>(service: string): IDebeUse<T> {
  const debe = React.useContext(debeContext);
  return debe.use(service);
}

export function createUse<T = IItem>(collection: string) {
  return {
    useAll: function(query?: (IQueryInput & { skip?: boolean }) | string[]) {
      return useAll<T>(collection, query);
    },
    useAllOnce: function(
      query?: (IQueryInput & { skip?: boolean }) | string[]
    ) {
      return useAllOnce<T>(collection, query);
    },
    useGet: function(query?: (IQueryInput & { skip?: boolean }) | string) {
      return useGet<T>(collection, query);
    },
    useGetOnce: function(query?: (IQueryInput & { skip?: boolean }) | string) {
      return useGetOnce<T>(collection, query);
    },
    useCollection: function() {
      return useCollection<T>(collection);
    }
  };
}
