export function toISO(date?: Date | null) {
  if (!date) {
    return undefined;
  }
  return date.toISOString();
}
