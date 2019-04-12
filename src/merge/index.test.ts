import { Debe, generate } from 'debe';
import { PostgreSQLAdapter } from 'debe-postgresql';
import { merge } from './index';
import { Sqlite3Adapter } from 'debe-better-sqlite3';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra';
import { MemoryAdapter } from 'debe-memory';
import * as Automerge from 'automerge';

const schema = [
  {
    name: 'lorem' + generate().substr(0, 3),
    index: ['firstName', 'lastName', 'age']
  }
];
const collectionName = schema[0].name;
interface ILorem {
  age?: number;
  firstName?: string;
  lastName?: string;
}

async function t(adapter: any) {
  const merged = {};
  const db = new Debe(adapter, schema, {
    softDelete: true,
    middlewares: [
      merge({
        getMessage: () => 'Yay',
        submitDelta: delta => {
          for (var item of delta) {
            if (!merged[item.id]) {
              merged[item.id] = [];
            }
            merged[item.id] = [...item.changes, ...merged[item.id]];
          }
        }
      })
    ]
  });
  await db.initialize();
  const item = await db.insert<ILorem>(collectionName, {
    firstName: 'Benjamin'
  });
  await db.insert<ILorem>(collectionName, {
    id: item.id,
    firstName: 'Benjamin'
  });
  await db.insert<ILorem>(collectionName, {
    id: item.id,
    lastName: 'Kniffler'
  });
  await db.insert<ILorem>(collectionName, {
    id: item.id,
    age: 31
  });
  await db.insert<ILorem>(collectionName, {
    id: item.id,
    firstName: 'Benni',
    lastName: 'Kniffler'
  });
  await db.insert<ILorem>(collectionName, {
    age: 50,
    firstName: 'Stan',
    lastName: 'Lee'
  });
  let final = await db.all<ILorem>(collectionName, {
    select: ['age', 'firstName', 'lastName']
  });
  expect(final.length).toBe(2);
  expect(final[0].firstName).toBe('Benni');
  expect(final[0].lastName).toBe('Kniffler');
  expect(final[0]['merge']).toBe(undefined);
  final = await db.all<ILorem>(collectionName, {});
  expect(final.length).toBe(2);
  expect(final[0].firstName).toBe('Benni');
  expect(final[0].lastName).toBe('Kniffler');
  expect(final[0]['merge']).toBeTruthy();

  expect(Object.keys(merged).length).toBe(2);
  for (var key in merged) {
    const doc = Automerge.applyChanges(Automerge.init(), merged[key]);
    const history = Automerge.getHistory(doc);
    const item = history[history.length - 1].snapshot;
    const compare = final.find(x => x.id === key);
    expect(compare).toBeTruthy();
    expect(item.firstName).toBe(compare && compare.firstName);
    expect(item.lastName).toBe(compare && compare.lastName);
    expect(item.age).toBe(compare && compare.age);
  }
  await db.close();
}

test('automerge:simple:memory', async cb => {
  await t(new MemoryAdapter());
  cb();
});

if (process.env.PG_CONNECTIONSTRING) {
  test('automerge:simple:postgresql', async cb => {
    await t(new PostgreSQLAdapter(process.env.PG_CONNECTIONSTRING + ''));
    cb();
  });
}

const dbDir = join(process.cwd(), '.temp/merge');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');
test('automerge:simple:better-sqlite3', async cb => {
  await t(new Sqlite3Adapter(getDBDir()));
  cb();
});
