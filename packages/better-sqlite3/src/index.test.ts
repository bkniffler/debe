import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { sqlight, generate } from '@sqlight/core';
import { betterSQLite3 } from './index';

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2']
  },
  {
    name: 'lorem2',
    index: ['hallo', 'hallo2']
  }
];
const dbDir = join(__dirname, '../../../.temp/sqlight');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

test('simple', async () => {
  const db = sqlight(betterSQLite3(getDBDir()), schema);
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
  expect(result.length).toBe(2);
});

test('complex', async () => {
  const db = sqlight(betterSQLite3(getDBDir()), schema);
  let listenerResult: any;
  const close = await db.allSubscription(
    'lorem',
    { limit: 1, orderBy: ['rev ASC'] },
    items => (listenerResult = items)
  );
  let listenerResult2: any;
  const close2 = await db.allSubscription(
    'lorem',
    { orderBy: ['rev ASC'] },
    items => (listenerResult2 = items)
  );
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok', id: 1 });
  await db.insert('lorem', { hallo: 'ok', id: 2 });
  await db.insert('lorem', { hallo: 'ok2', hallo2: 'ok', id: 1 });
  await db.insert('lorem', { hallo2: 'ok55', id: 1 });
  const all = await db.all('lorem', {});
  expect(all.length).toBe(3);
  expect(listenerResult).toBeTruthy();
  expect(listenerResult2).toBeTruthy();
  expect(listenerResult && listenerResult.length).toBe(1);
  expect(listenerResult2 && listenerResult2.length).toBe(3);
  setTimeout(close, 500);
  setTimeout(close2, 500);
});
/*
const func = () => console.log('CHANGE', 'lorem');
db.addListener('lorem', func);
db.addListener('lorem', () => console.log('CHANGE', 'lorem'));
db.addListener('lorem', () => console.log('CHANGE', 'lorem'));
console.log('Listener count', db.countListeners('lorem'));
db.removeListener('lorem', func);
console.log('Listener count', db.countListeners('lorem'));
db.removeAllListeners('lorem');
console.log('Listener count', db.countListeners('lorem'));

const count = db.count('lorem', {});
if (count === 0) {
  const start0 = +new Date();
  const newitems = [];
  for (var i = 0; i <= 999999; i++) {
    let num = (i + '').split('').reverse();
    let item = `${num[0] || 0}${num[1] || 0}${num[2] || 0}${num[3] ||
      0}${num[4] || 0}${num[5] || 0}`;
    newitems.push({ hallo: `welt${item}` });
  }
  db.insert('lorem', newitems);
  console.log('Took', +new Date() - start0, 'ms');
}

if (true) {
  const start1 = +new Date();
  const items = db.all('lorem', {
    where: ['hallo BETWEEN ? AND ?', 'welt000001', 'welt000100'],
    limit: 10
  });
  // console.log(db.all('lorem', ['hallo BETWEEN ? AND ?', 'welt', 'welt']));
  console.log(
    'Took',
    +new Date() - start1,
    'ms',
    items.length,
    items.map((x: any) => x.id)[0],
    'items'
  );
}
*/
