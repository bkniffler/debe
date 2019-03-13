export function createLimit(
  limit?: number | [number] | [number, number]
): string {
  if (limit !== undefined && !Array.isArray(limit)) {
    return `LIMIT ${limit}`;
  }
  if (limit !== undefined && Array.isArray(limit) && limit.length === 1) {
    return `LIMIT ${limit[0]}`;
  }
  if (limit !== undefined && Array.isArray(limit) && limit.length === 2) {
    return `LIMIT ${limit[0]} OFFSET ${limit[1]}`;
  }
  return '';
}
