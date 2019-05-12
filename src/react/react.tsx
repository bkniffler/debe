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
    (proxy, cb) => {
      proxy.all(query).then(x => cb(x));
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
    (proxy, cb) => {
      proxy.get(query).then(x => cb(x));
    },
    query,
    undefined
  );
}

export function useAll<T>(collection: string, query?: IQueryInput | string[]) {
  return useDebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    (proxy, cb) =>
      proxy.all(query, (err, res) => {
        cb(res);
      }),
    query,
    []
  );
}

export function useGet<T>(collection: string, query: IQueryInput | string) {
  return useDebeBase<T & IGetItem, (T & IGetItem) | undefined>(
    collection,
    (proxy, cb) =>
      proxy.get(query, res => {
        cb(res);
      }),
    query,
    undefined
  );
}

function useDebeBase<TBase, TResult = TBase>(
  collection: string,
  handler: (
    service: IDebeUse<TBase>,
    cb: (res: TResult) => void
  ) => void | (() => void),
  arg: any,
  defaultValue: any
): [TResult, boolean] {
  const [, update] = React.useState<any>(null);
  const client = React.useContext(debeContext);
  const cache = React.useContext(debeCacheContext);
  const argKey = JSON.stringify(arg);
  const key = `${collection}:${argKey}`;

  React.useEffect(() => {
    function listener(v: any) {
      update(v);
    }
    return cache.listen(key, listener);
  });

  const result =
    arg && arg.skip
      ? undefined
      : cache.read(key, set => {
          const proxy = client.use<TBase>(collection);
          handler(proxy, res => {
            setTimeout(() => {
              set(res);
            }, delay);
          });
        });

  return [result || defaultValue, false];
}

export function useCollection<T = IItem>(service: string): IDebeUse<T> {
  const debe = React.useContext(debeContext);
  return debe.use(service);
}
