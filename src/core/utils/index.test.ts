import {
  toISO,
  createLog,
  log as logging,
  ensureArray,
  generate,
  setIdGenerator,
  isArgsWithCallback,
  extractCallback,
  overwriteLog
} from './index';

test('utils:toISO', () => {
  const date = new Date();
  expect(date.toISOString()).toBe(toISO(date));
});

test('utils:log', () => {
  const { info, warn, log, error } = console;
  const l = createLog('test');
  const check = [];
  console.log = function(...args: any[]) {
    check.push(args);
  };
  console.warn = function(...args: any[]) {
    check.push(args);
  };
  console.info = function(...args: any[]) {
    check.push(args);
  };
  console.error = function(...args: any[]) {
    check.push(args);
  };
  l.error('Test', 1);
  l.warn('Test', 2);
  l.info('Test', 3);
  logging.enable();
  l.error('Test', 1);
  l.warn('Test', 2);
  l.info('Test', 3);
  logging.disable();
  console.log = log;
  console.warn = warn;
  console.info = info;
  console.error = error;
  expect(check.length).toBe(3);
});

test('utils:log', () => {
  const log = createLog('test');
  const check = [];
  overwriteLog((...args) => check.push(args));
  log.error('Test', 1);
  log.warn('Test', 2);
  log.info('Test', 3);
  logging.enable();
  log.error('Test', 1);
  log.warn('Test', 2);
  log.info('Test', 3);
  logging.disable();
  expect(check.length).toBe(3);
});

test('utils:array', () => {
  expect(ensureArray(null).length).toBe(0);
  expect(ensureArray(1).length).toBe(1);
  expect(ensureArray([]).length).toBe(0);
  expect(ensureArray([1, 2]).length).toBe(2);
});

test('utils:id', () => {
  const ids: any = {};
  const conflicts: string[] = [];
  for (let i = 0; i < 1000000; i++) {
    const id = ids[generate()];
    if (id) {
      conflicts.push(id);
    }
    ids[id] = true;
  }
  expect(conflicts.length).toBe(0);
  setIdGenerator(() => '123');
  expect(generate()).toBe('123');
});

test('utils:args', () => {
  expect(isArgsWithCallback([1, 2, 3])).toBe(false);
  expect(isArgsWithCallback([1, 2, () => true])).toBe(true);
  expect(typeof extractCallback([1, 2, () => true])[0]).toBe('function');
  expect(extractCallback([1, 2, () => true])[1]).toBe(1);
  expect(extractCallback([1, 2, 3])[0]).toBe(undefined);
  expect(extractCallback([1, 2, 3])[1]).toBe(1);
});
