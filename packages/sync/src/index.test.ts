import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { generate, log, DebeClient } from '@debe/core';
import { createBetterSQLite3Client } from '@debe/better-sqlite3';
import { createBroker } from '@service-tunnel/core';
import { sync } from './index';

const schema = [
  {
    name: 'lorem',
    index: ['goa']
  }
];
const dbDir = join(__dirname, '../../../.temp/sync');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}
function prepare(
  cb: any,
  init: (
    db1: DebeClient,
    db2: DebeClient,
    forceSync: () => Promise<any>
  ) => Promise<void>
) {
  function done(cleanup?: any) {
    clearTimeout(timeout);
    if (cleanup) {
      cleanup();
    }
    if (destroy) {
      destroy();
    }
    cb();
  }
  let timeout = setTimeout(done, 10000);
  const destroy = createBroker(async broker => {
    const db1 = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    const db2 = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    await Promise.all([db1.connect(), db2.connect()]);
    const sync1 = sync(db1, ['lorem'], ['debe-sync2']);
    const sync2 = sync(db2, ['lorem'], ['debe-sync1']);
    const local1 = broker.local('debe-sync1', sync1.connect);
    const local2 = broker.local('debe-sync2', sync2.connect);
    await init(db1, db2, sync1.forceSync);
    done(() => {
      local1();
      local2();
    });
  });
}

test('sync:many', cb => {
  prepare(cb, async (db1: DebeClient, db2: DebeClient, forceSync) => {
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
      db2.insert('lorem', { goa: 'b' + x });
    }
    await forceSync();
    const final1 = await db1.all<ILorem>('lorem', {});
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final1.length).toBe(200);
    expect(final2.length).toBe(200);
  });
}, 10000);

test('sync:delayed', cb => {
  function done(cleanup?: any) {
    clearTimeout(timeout);
    if (cleanup) {
      cleanup();
    }
    if (destroy) {
      destroy();
    }
    cb();
  }
  let timeout = setTimeout(done, 10000);
  const destroy = createBroker(async broker => {
    const db1 = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    await db1.connect();
    const sync1 = sync(db1, ['lorem'], ['debe-sync2']);
    const local1 = broker.local('debe-sync1', sync1.connect);
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
    }
    await new Promise(yay => setTimeout(yay, 5000));
    const db2 = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    await db2.connect();
    const sync2 = sync(db2, ['lorem'], ['debe-sync1']);
    const local2 = broker.local('debe-sync2', sync2.connect);
    await sync1.forceSync();
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final2.length).toBe(100);
    done(() => {
      local1();
      local2();
    });
  });
}, 10000);

test('sync:where', cb => {
  log.enable();
  function done(cleanup?: any) {
    clearTimeout(timeout);
    if (cleanup) {
      cleanup();
    }
    if (destroy) {
      destroy();
    }
    log.disable();
    cb();
  }
  let timeout = setTimeout(done, 10000);
  const destroy = createBroker(async broker => {
    const dbMaster = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    await dbMaster.connect();
    const syncMaster = sync(dbMaster, ['lorem'], []);
    const localMaster = broker.local('debe-sync-master', syncMaster.connect);
    await dbMaster.insert(
      'lorem',
      Array(100)
        .fill(0)
        .map((i, num) => ({
          goa: 'a' + (num < 10 ? `0${num}` : num)
        }))
    );
    await new Promise(yay => setTimeout(yay, 5000));
    const dbClient = createBetterSQLite3Client(schema, { dbPath: getDBDir() });
    await dbClient.connect();
    const item = await dbClient.insert('lorem', { goa: 'a1001' });
    const syncClient = sync(
      dbClient,
      ['lorem'],
      ['debe-sync-master'],
      ['goa < ?', 'a50']
    );
    const localClient = broker.client(syncClient.connect);
    await syncClient.forceSync();
    const final2 = await dbClient.all<ILorem>('lorem', {});
    const final1 = await dbClient.all<ILorem>('lorem', {});
    expect(final2.length).toBe(51);
    expect(final1.find(x => x.id === item.id)).toBeTruthy();
    done(() => {
      localMaster();
      localClient();
    });
  });
}, 10000);
