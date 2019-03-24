import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { generate, Debe } from '@debe/core';
import { BetterSQLite3Engine } from './index';
const sql = require('better-sqlite3');

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2']
  }
];
const dbDir = join(__dirname, '../../../.temp/better-sqlite3');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

test('sqlite3', async () => {
  const db = new Debe(new BetterSQLite3Engine(sql(getDBDir())));
  await db.initialize(schema);
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
  expect(result.length).toBe(2);
});

test('complex', async () => {
  const db = new Debe(new BetterSQLite3Engine(sql(getDBDir())));
  await db.initialize(schema);
  let listenerResult: any;
  const close = db.all(
    'lorem',
    { limit: 1, orderBy: ['rev ASC'] },
    items => (listenerResult = items)
  );
  let listenerResult2: any;
  const close2 = db.all(
    'lorem',
    { orderBy: ['rev ASC'] },
    items => (listenerResult2 = items)
  );
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok', id: '1' });
  await db.insert('lorem', { hallo: 'ok3', id: '2' });
  await db.insert('lorem', { hallo: 'ok2', hallo2: 'ok', id: '1' });
  await db.insert('lorem', { hallo2: 'ok55', id: '1' });
  const all = await db.all('lorem');
  const all2 = await db.all('lorem', {
    limit: 1,
    where: ['hallo2 = ?', 'ok55']
  });
  const all3 = await db.all('lorem', {
    limit: 1,
    where: ['hallo = ?', 'ok3']
  });
  expect(all.length).toBe(3);
  expect(all2.length).toBe(1);
  expect(all3.length).toBe(1);
  expect(all2[0] ? all2[0]['hallo2'] : '').toBe('ok55');
  expect(all3[0] ? all3[0]['hallo'] : '').toBe('ok3');
  expect(listenerResult).toBeTruthy();
  expect(listenerResult2).toBeTruthy();
  expect(listenerResult && listenerResult.length).toBe(1);
  expect(listenerResult2 && listenerResult2.length).toBe(3);
  setTimeout(close, 500);
  setTimeout(close2, 500);
});
