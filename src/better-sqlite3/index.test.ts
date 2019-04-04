import { generate, Debe } from 'debe';
import { Sqlite3Adapter } from './index';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra';

const dbDir = join(process.cwd(), '.temp/better-sqlite3');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');
test('sqlite3:basic', async () => {
  const client = new Debe(new Sqlite3Adapter(getDBDir()), [
    {
      name: 'lorem',
      index: ['name']
    }
  ]);
  await client.initialize();
  const insertResult = await client.insert<any>('lorem', {
    id: 'asd',
    name: 'Hallo'
  });
  const queryResult = await client.all<any>('lorem');
  expect(insertResult.id).toBe('asd');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});

test('sqlite3:many', async () => {
  const client = new Debe(new Sqlite3Adapter(getDBDir()), [
    {
      name: 'lorem',
      index: ['name']
    }
  ]);
  await client.initialize();
  const items = [];
  for (let x = 0; x < 100; x++) {
    items.push({ name: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await client.insert('lorem', items);
  const queryResult = await client.all<any>('lorem');
  const queryResult2 = await client.all<any>('lorem', {
    where: ['name < ?', 'a50']
  });
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(100);
  expect(queryResult2.length).toBe(50);
});
