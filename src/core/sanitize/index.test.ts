import { ensureArray } from './index';

test('utils:array', () => {
  expect(ensureArray(null).length).toBe(0);
  expect(ensureArray(1).length).toBe(1);
  expect(ensureArray([]).length).toBe(0);
  expect(ensureArray([1, 2]).length).toBe(2);
});
