import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { generate } from './index';
import { createBetterSQLite3Client } from '@debe/better-sqlite3';
import { toISO } from './utils';

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2']
  }
];
const dbDir = join(__dirname, '../../../.temp/debe');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

test('simple', async () => {
  const db = createBetterSQLite3Client(schema, {
    dbPath: getDBDir()
  });
  await db.connect();
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem');
  const count = await db.count('lorem');
  expect(count).toBe(2);
  expect(result.length).toBe(2);
  expect(count).toBe(2);
});

test('simple-use', async () => {
  interface ILorem {
    goa?: string;
    goa2?: string;
    hallo?: string;
  }
  const db = createBetterSQLite3Client(schema, {
    dbPath: getDBDir()
  });
  await db.connect();
  const lorem = db.use<ILorem>('lorem');
  await lorem.insert({ hallo: 'ok' });
  await lorem.insert({ hallo: 'ok2' });
  const result = await lorem.all({});
  const count = await lorem.count({});
  expect(result.length).toBe(2);
  expect(count).toBe(2);
});

test('time', () => {
  const date = new Date();
  expect(toISO(date)).toBe(date.toISOString());
  expect(toISO(null)).toBe(undefined);
});

test('remove', async () => {
  const db = createBetterSQLite3Client(schema, {
    dbPath: getDBDir()
  });
  await db.connect();
  await db.insert('lorem', { hallo: 'ok' });
  const item = await db.insert('lorem', { hallo: 'ok2' });
  await db.remove('lorem', item.id);
  const result = await db.all('lorem', {});
  const deletedItem = await db.get('lorem', { id: item.id });
  expect(result.length).toBe(1);
  expect(deletedItem).toBeTruthy();
  expect(deletedItem[db.engine.removedField]).toBeTruthy();
});

test('complex', async () => {
  const db = createBetterSQLite3Client(schema, {
    dbPath: getDBDir()
  });
  await db.connect();
  let listenerResult: any;
  const close = await db.all(
    'lorem',
    { limit: 1, orderBy: ['rev ASC'] },
    items => (listenerResult = items)
  );
  let listenerResult2: any;
  const close2 = await db.all(
    'lorem',
    { orderBy: ['rev ASC'] },
    items => (listenerResult2 = items)
  );
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok', id: '1' });
  await db.insert('lorem', { hallo: 'ok3', id: '2' });
  await db.insert('lorem', { hallo: 'ok2', hallo2: 'ok', id: '1' });
  await db.insert('lorem', { hallo2: 'ok55', id: '1' });
  const all = await db.all('lorem', {});
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
