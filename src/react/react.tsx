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
  defaultValue: any,
  once = false
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
    !key || !store.debe[key] ? empty : store.debe[key]
  );
  const id = useMemoOne(() => fastGuid());
  useMemoOne<string>(() => {
    if (!key) {
      return;
    }
    dispatch({
      id,
      key,
      type: 'DEBE_QUERY',
      collection,
      query,
      method,
      once
    });
  }, [key]);
  React.useEffect(() => {
    if (!once && !key) {
      return () => {
        dispatch({
          id,
          key,
          type: 'DEBE_QUERY_UNLISTEN'
        });
      };
    }
    return undefined;
  }, [key]);
  return [result, loading, error];
}

export function useAllOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[]
) {
  return useAll(collection, query, true);
}

export function useGetOnce<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string
) {
  return useGet(collection, query, true);
}

const emptyArray: any[] = [];
export function useAll<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string[],
  once = false
) {
  return useDebeBase('all', collection, query as any, emptyArray, once);
}

export function useGet<T>(
  collection: string,
  query?: (IQueryInput & { skip?: boolean }) | string,
  once = false
) {
  return useDebeBase('get', collection, query, undefined, once);
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

var lut: string[] = [];
for (var i = 0; i < 256; i++) {
  lut[i] = (i < 16 ? '0' : '') + i.toString(16);
}
function fastGuid() {
  var d0 = (Math.random() * 0xffffffff) | 0;
  var d1 = (Math.random() * 0xffffffff) | 0;
  var d2 = (Math.random() * 0xffffffff) | 0;
  var d3 = (Math.random() * 0xffffffff) | 0;
  return (
    lut[d0 & 0xff] +
    lut[(d0 >> 8) & 0xff] +
    lut[(d0 >> 16) & 0xff] +
    lut[(d0 >> 24) & 0xff] +
    '-' +
    lut[d1 & 0xff] +
    lut[(d1 >> 8) & 0xff] +
    '-' +
    lut[((d1 >> 16) & 0x0f) | 0x40] +
    lut[(d1 >> 24) & 0xff] +
    '-' +
    lut[(d2 & 0x3f) | 0x80] +
    lut[(d2 >> 8) & 0xff] +
    '-' +
    lut[(d2 >> 16) & 0xff] +
    lut[(d2 >> 24) & 0xff] +
    lut[d3 & 0xff] +
    lut[(d3 >> 8) & 0xff] +
    lut[(d3 >> 16) & 0xff] +
    lut[(d3 >> 24) & 0xff]
  );
}
