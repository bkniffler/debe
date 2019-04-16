import * as React from 'react';
import { IDebeUse, IItem, IQueryInput, IGetItem } from 'debe';
import { debeContext } from './context';

export function useAllOnce<T>(
  collection: string,
  query: IQueryInput | string[]
) {
  return useBebeBase<T & IGetItem, (T & IGetItem)[]>(
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
  return useBebeBase<(T & IGetItem) | undefined>(
    collection,
    (proxy, cb) => {
      proxy.get(query).then(x => cb(x));
    },
    query,
    undefined
  );
}

export function useAll<T>(collection: string, query?: IQueryInput | string[]) {
  return useBebeBase<T & IGetItem, (T & IGetItem)[]>(
    collection,
    (proxy, cb) =>
      proxy.all(query, res => {
        cb(res);
      }),
    query,
    []
  );
}

export function useGet<T>(collection: string, query: IQueryInput | string) {
  return useBebeBase<T & IGetItem, (T & IGetItem) | undefined>(
    collection,
    (proxy, cb) =>
      proxy.get(query, res => {
        cb(res);
      }),
    query,
    undefined
  );
}

function useBebeBase<TBase, TResult = TBase>(
  collection: string,
  handler: (
    service: IDebeUse<TBase>,
    cb: (res: TResult) => void
  ) => void | (() => void),
  arg: any,
  defaultValue: TResult
): [TResult, boolean] {
  const [state, setState] = React.useState<{
    res: TResult;
    loading: boolean;
    err?: any;
  }>({
    loading: true,
    err: undefined,
    res: defaultValue
  });
  const client = React.useContext(debeContext);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    const proxy = client.use<TBase>(collection);
    return handler(proxy, (res: TResult) => setState({ res, loading: false }));
  }, [client, JSON.stringify(arg)]);
  return [state.res, state.loading];
}
/*
export function useDebeMethod<T>(
  service: string,
  method: string,
  ...args: any[]
): [T | undefined, boolean, any] {
  const [state, setState] = React.useState<{
    res?: number;
    loading: boolean;
    err?: any;
  }>({
    loading: true,
    err: undefined,
    res: undefined
  });
  const client = React.useContext(context);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    const proxy = client.use(service);
    proxy[method](...args)
      .then((res: any) =>
        setState({
          res: (res || undefined) as any,
          loading: false,
          err: undefined
        })
      )
      .catch((err: any) => setState({ res: undefined, loading: false, err }));
  }, [client, method, JSON.stringify(args)]);
  return [state.res as any, state.loading, state.err];
}*/

export function useCollection<T = IItem>(service: string): IDebeUse<T> {
  const debe = React.useContext(debeContext);
  return debe.use(service);
}
