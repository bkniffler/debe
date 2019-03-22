import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { generate } from '@sqlight/core';
import { createBetterSQLite3Client } from './index';

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
  const db = createBetterSQLite3Client(schema, {
    dbPath: getDBDir()
  });
  await db.connect();
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
  expect(result.length).toBe(2);
});
