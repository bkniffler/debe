export function createOffset(offset?: number): string {
  return offset !== undefined ? `OFFSET ${offset}` : '';
}
