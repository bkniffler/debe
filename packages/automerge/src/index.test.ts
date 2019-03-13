import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { sqlightAutomerge } from './index';
import { sqlight, generate } from '@sqlight/core';
import { betterSQLite3 } from '@sqlight/better-sqlite3';

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2'],
    columns: ['automerge TEXT', 'changes INTEGER']
  }
];
const dbDir = join(__dirname, '../../../.temp/automerge');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

test('automerge', async () => {
  const db = sqlight(betterSQLite3(getDBDir()), schema);
  await db.insert('lorem', { hallo: 'ok', id: '1' });
  const edit = sqlightAutomerge(db);
  await edit('lorem', '1', doc => {
    doc.goa = 'mpu';
  });
  await edit('lorem', '1', doc => {
    doc.goa2 = 'mpu2';
  });
});
