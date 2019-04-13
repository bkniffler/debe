export function addToQuery(
  query: [] | undefined | [string, ...any[]],
  type: 'AND' | 'OR' = 'AND',
  additional: string,
  ...args: any[]
): [string, ...any[]] {
  if (!query) {
    return [additional, ...args];
  } else {
    const [arg0, ...rest] = query;
    return [`${arg0} ${type} ${additional}`, ...rest, ...args] as any;
  }
}

export function and(
  query: [] | undefined | [string, ...any[]],
  additional: string,
  ...args: any[]
): [string, ...any[]] {
  return addToQuery(query, 'AND', additional, ...args);
}

export function isNull(field: string): string {
  return `${field} IS NULL`;
}

export function isIn(field: string): string {
  return `${field} IS NULL`;
}

function fetchLast(arr: any[]) {
  return arr[arr.length - 1] && arr[arr.length - 1];
}

export interface IFilterReducer<T = any, T2 = T> {
  '>=': (state: T, field: string, value: any) => T2;
  '>': (state: T, field: string, value: any) => T2;
  '<=': (state: T, field: string, value: any) => T2;
  '<': (state: T, field: string, value: any) => T2;
  IN: (state: T, field: string, value: any) => T2;
  'NOT IN': (state: T, field: string, value: any) => T2;
  'IS NULL': (state: T, field: string, value: any) => T2;
  '=': (state: T, field: string, value: any) => T2;
  '!=': (state: T, field: string, value: any) => T2;
}

type IMapField = (field: string) => string;
export class FilterReducer<T = any, T2 = T> {
  map: IFilterReducer<T, T2>;
  mapField?: IMapField;
  constructor(map: IFilterReducer<T, T2>, mapField?: IMapField) {
    this.map = map;
    this.mapField = mapField;
  }
  filter = (query: [string, ...any[]], mapField?: IMapField): any => {
    const array = queryToArray(query);
    mapField = mapField || this.mapField;
    return (item: T) => {
      for (var i = 0; i < array.length; i++) {
        let [left, operand, right] = array[i];
        if (mapField) {
          left = mapField(left);
        }
        if (!this.map[operand] || !this.map[operand](item, left, right)) {
          return false;
        }
      }
      return true;
    };
  };
  reduce = (state: T, query: [string, ...any[]], mapField?: IMapField): T => {
    mapField = mapField || this.mapField;
    const array = queryToArray(query);
    for (var i = 0; i < array.length; i++) {
      let [left, operand, right] = array[i];
      if (mapField) {
        left = mapField(left);
      }
      if (this.map[operand] && left) {
        state = this.map[operand](state, left, right);
      }
    }
    return state;
  };
}

export function queryToArray(query: [string, ...any[]]) {
  let questions: number = 0;
  return query[0].split('AND').map((part: string) =>
    part.split(' ').reduce<string[]>((arr, x) => {
      x = x.trim();
      if (x === '?' || x === '(?)') {
        const arg = query[(questions += 1)];
        if (
          Array.isArray(arg) &&
          (fetchLast(arr) === '=' || fetchLast(arr) === '==')
        ) {
          arr[arr.length - 1] = `IN`;
          arr.push(arg as any);
        } else if (
          (arg === undefined || arg === null) &&
          (fetchLast(arr) === '=' ||
            fetchLast(arr) === '==' ||
            fetchLast(arr) === 'IS')
        ) {
          arr[arr.length - 1] = `IS NULL`;
        } else if (
          (arg === undefined || arg === null) &&
          fetchLast(arr) === '!='
        ) {
          arr[arr.length - 1] = `IS NOT NULL`;
        } else if (Array.isArray(arg) && fetchLast(arr) === '!=') {
          arr[arr.length - 1] = `NOT IN`;
          arr.push(arg as any);
        } else {
          arr.push(arg);
        }
      } else if (x) {
        if (fetchLast(arr) === 'NOT') {
          arr[arr.length - 1] = `${arr[arr.length - 1]} ${x}`;
        } else if (x === 'NULL') {
          arr[arr.length - 1] = `${arr[arr.length - 1]} ${x}`;
        } else {
          arr.push(x === '==' ? '=' : x);
        }
      }
      return arr;
    }, [])
  );
}
