export function ensureArray<T>(obj: T[] | T): T[] {
  if (obj && !Array.isArray(obj)) {
    return [obj];
  } else {
    return obj as any;
  }
}
