import { ITrackerArg } from './types';

export function insertToArray(
  array: any[],
  item: any,
  position: 'START' | 'END' | 'BEFORE' | 'AFTER' = 'END',
  anchor: any | string | any[] | string[] = [],
  findItem: (item: string) => any = x => x
) {
  if (position === 'END') {
    array.push(item);
  } else if (position === 'AFTER' || position === 'BEFORE') {
    const arr = Array.isArray(anchor) ? anchor : [anchor];
    let index = position === 'AFTER' ? -1 : array.length + 1;
    let i = 0;
    while (i < arr.length) {
      const s = arr[i];
      const item = typeof s === 'string' ? findItem(s) : s;
      if (item === undefined) {
        throw new Error(
          `Skill with name ${s} could not be found, please ensure it is added before ${name}`
        );
      }
      const indexB = array.indexOf(item);
      if (position === 'AFTER') {
        index = indexB > index ? indexB : index;
      } else {
        index = indexB < index ? indexB : index;
      }
      i++;
    }
    if (position === 'AFTER') {
      index = index < 0 ? array.length : index + 1;
    }
    index = index > array.length ? array.length : index;
    // index = index < 0 ? 0 : index;
    array.splice(index, 0, item);
  } else {
    array.splice(0, 0, item);
  }
  return array;
}

let idCache0 = 0;
let idCache1 = 0;
const start = new Date(2019, 3 - 1, 28).getTime();
export function generateID(token: string = '') {
  const time = new Date().getTime() - start;
  if (idCache0 === time) {
    idCache1 = idCache1 + 1;
  } else {
    idCache0 = time;
    if (idCache1 !== 0) {
      idCache1 = 0;
    }
  }
  return `${idCache0}.${token}${idCache1}`;
}

export function treeizeTracker(
  tracker: ITrackerArg[],
  ids: (string | number)[] = [],
  map = (x: ITrackerArg, prev?: ITrackerArg): any => {
    const { parents, id, ...rest } = x;
    rest.time = prev ? x.time - prev.time : 0;
    return rest;
  },
  prev?: ITrackerArg
): any {
  const path = ids.join('.');
  return tracker
    .filter(x => x.parents.join('.') === path)
    .reduce((state, x) => {
      const rawId = x.id.split('.')[0];
      const children = treeizeTracker(tracker, [...ids, x.id], map, x);

      const item = map(x, prev);
      if (Object.keys(children).length) {
        item.children = children;
      }
      if (!state[rawId]) {
        state[rawId] = [];
      }
      state[rawId].push(item);
      prev = x;
      return state;
    }, {});
}
