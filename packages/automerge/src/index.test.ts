import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { debeAutomerge } from './index';
import { generate } from '@debe/core';
import { createBetterSQLite3Client } from '@debe/better-sqlite3';
import { createPostgreSQLClient } from '../../postgres/src';
const sql = require('better-sqlite3');
const pg = require('pg');

const name = 'lorem' + generate();
const schema = [
  {
    name,
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
  const db = createBetterSQLite3Client(sql(getDBDir()), schema);
  await db.connect();
  const automerge = debeAutomerge(db);
  const item = await automerge<ILorem>(name, doc => {
    doc.goa = 'mpu';
  });
  await automerge<ILorem>(name, item.id, doc => {
    doc.goa2 = 'mpu2';
  });
  const final = await db.all<ILorem>(name, {});
  expect(final.length).toBe(1);
  expect(final[0].goa).toBe('mpu');
  expect(final[0].goa2).toBe('mpu2');
});

if (process.env.PG_CONNECTIONSTRING) {
  test('automerge:pg', async () => {
    const pool = new pg.Pool({
      connectionString: process.env.PG_CONNECTIONSTRING + ''
    });
    const db = createPostgreSQLClient(pool, schema);
    await db.connect();
    const automerge = debeAutomerge(db);
    const item = await automerge<ILorem>(name, doc => {
      doc.goa = 'mpu';
    });
    await automerge<ILorem>(name, item.id, doc => {
      doc.goa2 = 'mpu1';
    });
    await automerge<ILorem>(name, item.id, doc => {
      doc.goa2 = 'mpu2';
    });
    const final = await db.all<ILorem>(name, { id: item.id });
    expect(final.length).toBe(1);
    expect(final[0].goa).toBe('mpu');
    expect(final[0].goa2).toBe('mpu2');
  });
}
