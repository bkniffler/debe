import { IDBItem } from '@sqlight/types';
export function transform(columns: string[]) {
  return (item: IDBItem) => {
    if (!item) {
      return item;
    }
    const newObj = columns.reduce((state, key) => {
      if (key === 'json') {
        return { ...state, ...JSON.parse(item.json) };
      }
      state[key] = item[key];
      return state;
    }, {});
    return newObj;
  };
}
