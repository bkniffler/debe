import { generate } from 'debe-adapter';
import { BetterSqlite3Debe } from './index';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra-unified';
import { createAdapterTest } from 'debe/dispatcher.test';

const dbDir = join(process.cwd(), '.temp/better-sqlite3');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');
createAdapterTest(
  'better-sqlite3',
  (col, opt) => new BetterSqlite3Debe(getDBDir(), col, opt)
);

test(`adapter:better-sqlite3:like`, async () => {
  const collections = [
    { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
  ];
  const table = collections[0].name;
  const client = new BetterSqlite3Debe(getDBDir(), collections);
  await client.initialize();
  await client.insert(table, { id: 'asd0', name: 'abc' });
  await client.insert(table, { id: 'asd1', name: 'bcd' });
  await client.insert(table, { id: 'asd2', name: 'cde' });
  await client.insert(table, { id: 'asd3', name: 'def' });
  const all0 = await client.all(table, { where: ['name LIKE ?', '%c%'] });
  expect(all0.length).toBe(3);
  await client.close();
});

test(`adapter:better-sqlite3:fts`, async () => {
  const collections = [
    { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
  ];
  const table = collections[0].name;
  const client = new BetterSqlite3Debe(getDBDir(), collections);
  await client.initialize();
  await client.insert(table, { id: 'asd0', name: 'abc' });
  await client.insert(table, { id: 'asd1', name: 'bcd' });
  await client.insert(table, { id: 'asd2', name: 'cde' });
  await client.insert(table, { id: 'asd3', name: 'def' });
  const all0 = await client.all(table, { where: ['name LIKE ?', '%c%'] });
  expect(all0.length).toBe(3);
  await client.close();
});
