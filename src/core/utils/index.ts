export * from './ensure-array';
export * from './time';
export * from './generate';
export * from './query';
export * from './chunk';
export * from './log';
// Do function arguments contain a cb function?
export function isArgsWithCallback(args: any[]) {
  return typeof args[args.length - 1] === 'function';
}
// Return last arg and rest args
export function extractCallback(args: any[]): [Function | undefined, ...any[]] {
  if (isArgsWithCallback(args)) {
    return [args[args.length - 1], ...args.splice(0, args.length - 1)];
  } else {
    return [undefined, ...args];
  }
}
