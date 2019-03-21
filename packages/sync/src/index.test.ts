import { join } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { sqlight, generate, ISQLightClient } from '@sqlight/core';
import { betterSQLite3 } from '@sqlight/better-sqlite3';
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
    db1: ISQLightClient,
    db2: ISQLightClient,
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
    const db1 = sqlight(betterSQLite3(getDBDir()), schema);
    const db2 = sqlight(betterSQLite3(getDBDir()), schema);
    const sync1 = sync(db1, ['lorem'], ['sqlight-sync2']);
    const sync2 = sync(db2, ['lorem'], ['sqlight-sync1']);
    const local1 = broker.local('sqlight-sync1', sync1.connect);
    const local2 = broker.local('sqlight-sync2', sync2.connect);
    await init(db1, db2, sync1.forceSync);
    done(() => {
      local1();
      local2();
    });
  });
}

test('sync:many', cb => {
  prepare(cb, async (db1: ISQLightClient, db2: ISQLightClient, forceSync) => {
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
    const db1 = sqlight(betterSQLite3(getDBDir()), schema);
    const sync1 = sync(db1, ['lorem'], ['sqlight-sync2']);
    const local1 = broker.local('sqlight-sync1', sync1.connect);
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
    }
    await new Promise(yay => setTimeout(yay, 5000));
    const db2 = sqlight(betterSQLite3(getDBDir()), schema);
    const sync2 = sync(db2, ['lorem'], ['sqlight-sync1']);
    const local2 = broker.local('sqlight-sync2', sync2.connect);
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
    const dbMaster = sqlight(betterSQLite3(getDBDir()), schema);
    const syncMaster = sync(dbMaster, ['lorem'], ['sqlight-sync2']);
    const localMaster = broker.local('sqlight-sync-master', syncMaster.connect);
    for (let x = 0; x < 100; x++) {
      dbMaster.insert('lorem', { goa: 'a' + (x < 10 ? `0${x}` : x) });
    }
    await new Promise(yay => setTimeout(yay, 5000));
    const dbClient = sqlight(betterSQLite3(getDBDir()), schema);
    const syncClient = sync(
      dbClient,
      ['lorem'],
      ['sqlight-sync-master'],
      ['goa < ?', 'a50']
    );
    const localClient = broker.client(syncClient.connect);
    await syncClient.forceSync();
    const final2 = await dbClient.all<ILorem>('lorem', {});
    expect(final2.length).toBe(50);
    done(() => {
      localMaster();
      localClient();
    });
  });
}, 10000);
