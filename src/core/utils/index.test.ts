import { toISO, createLog, log as logging, overwriteLog } from './index';

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
