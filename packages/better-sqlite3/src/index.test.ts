import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { sqlight, generate } from '@sqlight/core';
import { betterSQLite3 } from './index';

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

test('simple', async () => {
  const db = sqlight(betterSQLite3(getDBDir()), schema);
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
  expect(result.length).toBe(2);
});
