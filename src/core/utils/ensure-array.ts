export function ensureArray<T>(obj: T[] | T | undefined): T[] {
  if (obj && !Array.isArray(obj)) {
    return [obj];
  } else if (!obj) {
    return [];
  } else {
    return obj as any;
  }
}
