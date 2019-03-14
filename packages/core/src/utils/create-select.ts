export function createSelect(
  columns: string[],
  index: string[],
  bodyField: string,
  count = false
): string {
  const fields = [
    count ? 'COUNT(id)' : undefined,
    ...columns,
    ...index.map(
      (index: string) =>
        `json_extract(${bodyField}, '$.${index}') as '${index}'`
    )
  ].filter(x => x);
  return `SELECT ${fields.join(', ')}`;
}
