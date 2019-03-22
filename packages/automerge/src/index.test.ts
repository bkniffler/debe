import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { sqlightAutomerge } from './index';
import { generate } from '@sqlight/core';
import { createBetterSQLite3Client } from '@sqlight/better-sqlite3';

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2'],
    columns: ['automerge', 'changes']
  }
];
const dbDir = join(__dirname, '../../../.temp/automerge');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}
test('automerge', async () => {
  const db = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
  await db.connect();
  const automerge = sqlightAutomerge(db);
  const item = await automerge<ILorem>('lorem', doc => {
    doc.goa = 'mpu';
  });
  await automerge<ILorem>('lorem', item.id, doc => {
    doc.goa2 = 'mpu2';
  });
  const final = await db.all<ILorem>('lorem', {});
  expect(final.length).toBe(1);
  console.log(final);
  expect(final[0].goa).toBe('mpu');
  expect(final[0].goa2).toBe('mpu2');
});
