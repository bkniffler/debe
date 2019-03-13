import { IDBItem } from '@sqlight/types';
export function transform(includeBody: boolean) {
  return (item: IDBItem) => {
    if (!item) {
      return item;
    }
    const { id, rev, json } = item;
    if (includeBody) {
      return { id, rev, ...JSON.parse(json) };
    }
    return { id, rev };
  };
}
