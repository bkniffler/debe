import { insertToArray, generateID } from '../utils';

test('array', async () => {
  const x0 = '01234';
  const start = insertToArray([1, 2, 3, 4], 0, 'START').join('');
  const end = insertToArray([0, 1, 2, 3], 4, 'END').join('');
  const def = insertToArray([0, 1, 2, 3], 4).join('');
  const before = insertToArray([0, 1, 2, 3], 4, 'BEFORE').join('');
  const before1 = insertToArray([1, 2, 3, 4], 0, 'BEFORE', 1).join('');
  const before14 = insertToArray([1, 2, 3, 4], 0, 'BEFORE', [1, 4]).join('');
  const before14b = insertToArray([1, 2, 3, 4], 0, 'BEFORE', [4, 1]).join('');
  const before2 = insertToArray([0, 2, 3, 4], 1, 'BEFORE', 2).join('');
  const before23 = insertToArray([0, 2, 3, 4], 1, 'BEFORE', [2, 3]).join('');
  const before3 = insertToArray([0, 1, 3, 4], 2, 'BEFORE', 3).join('');
  const before4 = insertToArray([0, 1, 2, 4], 3, 'BEFORE', 4).join('');
  const after = insertToArray([0, 1, 2, 3], 4, 'AFTER').join('');
  const after0 = insertToArray([0, 2, 3, 4], 1, 'AFTER', 0).join('');
  const after1 = insertToArray([0, 1, 3, 4], 2, 'AFTER', 1).join('');
  const after13 = insertToArray([0, 1, 2, 3], 4, 'AFTER', [1, 3]).join('');
  const after13b = insertToArray([0, 1, 2, 3], 4, 'AFTER', [3, 1]).join('');
  const after2 = insertToArray([0, 1, 2, 4], 3, 'AFTER', 2, x => x).join('');
  const after3 = insertToArray([0, 1, 2, 3], 4, 'AFTER', 3).join('');
  expect(def).toBe(x0);
  expect(start).toBe(x0);
  expect(end).toBe(x0);
  expect(before).toBe(x0);
  expect(before1).toBe(x0);
  expect(before14).toBe(x0);
  expect(before14b).toBe(x0);
  expect(before2).toBe(x0);
  expect(before23).toBe(x0);
  expect(before3).toBe(x0);
  expect(before4).toBe(x0);
  expect(after0).toBe(x0);
  expect(after1).toBe(x0);
  expect(after13).toBe(x0);
  expect(after13b).toBe(x0);
  expect(after2).toBe(x0);
  expect(after3).toBe(x0);
  expect(after).toBe(x0);
  expect(() =>
    insertToArray([0, 2, 3, 4], 1, 'AFTER', '0', x => undefined).join('')
  ).toThrow();
});

test('id', async () => {
  let ids: string[] = [];
  for (let i = 0; i < 10000; i++) {
    ids.push(generateID('xyz'));
  }
  const uniques = ids.filter((v, i) => ids.indexOf(v) === i);
  expect(uniques.length).toBe(ids.length);
});
