import { IDBItem } from '@sqlight/types';
export function transform(columns: string[], bodyField: string) {
  return (item: IDBItem) => {
    if (!item) {
      return item;
    }
    const newObj = columns.reduce((state, key) => {
      if (key === bodyField) {
        return { ...state, ...JSON.parse(item[bodyField]) };
      }
      state[key] = item[key];
      return state;
    }, {});
    return newObj;
  };
}
