import * as React from 'react';
import { IDebeUse, IItem, IQueryInput, IGetItem } from 'debe';
import { debeContext, debeCacheContext } from './context';

let delay = 0;
export function setDelay(del: number) {
  delay = del;
}
export function useAllOnce<T>(
  collection: string,
  query: IQueryInput | string[]
) {
  return useDebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    'all',
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
  query?: IQueryInput | string
) {
  return useDebeBase<(T & IGetItem) | undefined>(
    collection,
    'get',
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

export function useAll<T>(collection: string, query?: IQueryInput | string[]) {
  return useDebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    'all',
    (proxy, cb) =>
      proxy.all(query, (err, res) => {
        cb(err, res);
      }),
    query,
    []
  );
}

export function useGet<T>(collection: string, query: IQueryInput | string) {
  return useDebeBase<T & IGetItem, (T & IGetItem) | undefined>(
    collection,
    'get',
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
  handler: (
    service: IDebeUse<TBase>,
    cb: (error: any, res: TResult) => void
  ) => void | (() => void),
  arg: any,
  defaultValue: any
): [TResult, boolean] {
  const [, update] = React.useState<TResult | undefined>(undefined);
  const client = React.useContext(debeContext);
  const cache = React.useContext(debeCacheContext);
  const argKey = JSON.stringify(arg);
  const key = `${collection}:${method}:${argKey}`;

  React.useEffect(() => {
    return cache.listen<TResult>(key, function listener(error, v) {
      if (error) {
        console.log(error);
        throw error;
      }
      update(v);
    });
  });

  const result =
    arg && arg.skip
      ? undefined
      : cache.read(key, set => {
          const proxy = client.use<TBase>(collection);
          handler(proxy, (err, res) => {
            setTimeout(() => {
              set(err, res);
            }, delay);
          });
        });

  return [result || defaultValue, false];
}

export function useCollection<T = IItem>(service: string): IDebeUse<T> {
  const debe = React.useContext(debeContext);
  return debe.use(service);
}
