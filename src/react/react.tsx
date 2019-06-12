import * as React from 'react';
import { IDebeUse, IItem, IQueryInput } from 'debe';
import { useMemoOne } from './utils/memo-one';
// @ts-ignore
import { useDispatch, useSelector } from 'react-redux';
import { context } from './provider';

const empty = {};
function useDebeBase(
  method: 'get' | 'all',
  collection: string,
  query: (IQueryInput & { skip?: boolean }) | string | undefined,
  defaultValue: any
) {
  const skip = query && query['skip'];
  if (query) {
    delete query['skip'];
  }
  const dispatch = useDispatch();
  const str = skip ? '' : JSON.stringify(query || {});
  const key = useMemoOne<string>(() => {
    return skip ? '' : `${collection}:${method}:${str}`;
  }, [collection, str, skip]);
  const { result = defaultValue, error, loading } = useSelector((store: any) =>
    skip || !store.debe[key] ? empty : store.debe[key]
  );
  useMemoOne<string>(() => {
    if (loading === true || loading === false || skip) {
      return;
    }
    dispatch({
      key,
      type: 'DEBE_QUERY',
      collection,
      query,
      method
    });
  }, [key]);
  return [result, loading, error];
}

export function useAllOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[]
) {
  return useAll(collection, query);
}

export function useGetOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string
) {
  return useGet(collection, query);
}

const emptyArray: any[] = [];
export function useAll<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[]
) {
  return useDebeBase('all', collection, query as any, emptyArray);
}

export function useGet<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string
) {
  return useDebeBase('get', collection, query, undefined);
}

export function useCollection<T = IItem>(service: string): IDebeUse<T> {
  const db = React.useContext(context);
  return useMemoOne(() => (db && db.use(service)) as any, [db]);
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
