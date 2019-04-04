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

function fetchLast(arr: any[]) {
  return arr[arr.length - 1] && arr[arr.length - 1];
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
        } else if (Array.isArray(arg) && fetchLast(arr) === '!=') {
          arr[arr.length - 1] = `NOT IN`;
        }
        arr.push(arg);
      } else if (x) {
        if (fetchLast(arr) === 'NOT') {
          arr[arr.length - 1] = `${arr[arr.length - 1]} ${x}`;
        } else {
          arr.push(x);
        }
      }
      return arr;
    }, [])
  );
}

/*export function mongoToQuery(mongoQuery: any[]) {
  if (!mongoQuery) {
    return [];
  } else {
    const array = Object.keys(mongoQuery);
    let result = '';
    const params = [];
    for (var i = 0; i < array.length; i++) {
      const key = array[i];
      result = (result ? result : `${result} `) + `${key} = ?`;
      params.push(mongoQuery[key]);
    }
    return [result, ...params];
  }
}*/
