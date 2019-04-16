import { IGetItem } from 'debe';

export function hashCode(str: string = '') {
  var hash = 0,
    i,
    chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function getLastItemRev(
  items: IGetItem[] = [],
  revField: string,
  comparer?: string
): string | undefined {
  const result = items[items.length - 1]
    ? items[items.length - 1][revField]
    : undefined;
  if (!comparer || result > comparer) {
    return result;
  }
  return comparer;
}

export const maxRetries = 5;
export const maxTimeout = 2500;
export const defaultInterval = (tries: number) => {
  switch (tries) {
    case 0:
      return 100;
    case 1:
      return 200;
    case 2:
      return 400;
    case 3:
      return 800;
    case 4:
      return 1600;
    default:
      return 3200;
  }
};

export async function waitFor<T>(
  cb: () => any,
  {
    interval = defaultInterval
  }: {
    interval?: ((tries: number) => number) | number;
    fail?: boolean;
  } = {}
): Promise<T> {
  let tries = 0;
  let result: T;
  while (!(result = cb()) && tries <= maxRetries) {
    tries += 1;
    await new Promise(yay =>
      setTimeout(
        yay,
        typeof interval === 'function' ? interval(tries) : interval
      )
    );
  }
  return Promise.resolve(result);
}

export function getBigger(comparer0?: string, comparer1?: string) {
  if (!comparer0 || !comparer1) {
    return undefined;
  }
  if (!comparer1 || comparer0 > comparer1) {
    return comparer0;
  }
  return comparer1;
}

type IFetchCount = () => Promise<number>;
type IFetchItems<TResult = any> = (
  page: number
) => Promise<TResult[]> | TResult[];
type ITransferItems<TInput, TResult = TInput> = (
  items: TInput[]
) => Promise<TResult[]>;

export async function batchTransfer<TFetchResult = any>(
  fetchCount: IFetchCount,
  fetchItems: IFetchItems<TFetchResult>
): Promise<TFetchResult[]>;
export async function batchTransfer<TFetchResult = any, TTransferResult = any>(
  fetchCount: IFetchCount,
  fetchItems: IFetchItems<TFetchResult>,
  transferItems: ITransferItems<TFetchResult, TTransferResult>
): Promise<[TFetchResult[], TTransferResult[]]>;
export async function batchTransfer<TFetchResult = any, TTransferResult = any>(
  fetchCount: IFetchCount,
  fetchItems: IFetchItems<TFetchResult>,
  transferItems?: ITransferItems<TFetchResult, TTransferResult>
): Promise<any> {
  let changeCount = await fetchCount();
  let page = 0;
  let items: TFetchResult[] = [];
  let transferred: TTransferResult[] = [];
  while (changeCount > 0) {
    const changes = await fetchItems(page);
    if (changes.length) {
      if (transferItems) {
        transferred = transferred.concat(await transferItems(changes));
      }
      items = items.concat(changes);
    }
    changeCount = changeCount - changes.length;
    page = page + 1;
  }
  if (transferItems) {
    return [items, transferred];
  }
  return items;
}
