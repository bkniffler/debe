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
