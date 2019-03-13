export function toISO(date?: Date) {
  if (!date) {
    return undefined;
  }
  return date.toISOString();
}
