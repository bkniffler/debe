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

interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}
test('automerge', async () => {
  const db = sqlight(betterSQLite3(getDBDir()), schema);
  const edit = sqlightAutomerge(db);
  await db.insert<ILorem>('lorem', { hallo: 'ok', id: '1' });
  await edit<ILorem>('lorem', '1', doc => {
    doc.goa = 'mpu';
  });
  await edit<ILorem>('lorem', '1', doc => {
    doc.goa2 = 'mpu2';
  });
  console.log(await db.get<ILorem>('lorem', { id: '1' }));
});
