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
