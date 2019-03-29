import { MemoryDebe } from '@debe/core';
import { createBroker } from '@service-tunnel/core';
import { sync } from './index';

const schema = [
  {
    name: 'lorem',
    index: ['goa']
  }
];

interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}
function prepare(
  cb: any,
  init: (
    db1: MemoryDebe,
    db2: MemoryDebe,
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
    const db1 = new MemoryDebe();
    const db2 = new MemoryDebe();
    await Promise.all([db1.initialize(schema), db2.initialize(schema)]);
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

test('sync:many:initial:oneway', cb => {
  prepare(cb, async (db1, db2, forceSync) => {
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
      // db2.insert('lorem', { goa: 'b' + x });
    }
    await forceSync();
    const final1 = await db1.all<ILorem>('lorem', {});
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final1.length).toBe(100);
    expect(final2.length).toBe(100);
  });
}, 10000);

test('sync:many:initial:oneway:reverse', cb => {
  prepare(cb, async (db1, db2, forceSync) => {
    for (let x = 0; x < 100; x++) {
      //db1.insert('lorem', { goa: 'a' + x });
      db2.insert('lorem', { goa: 'b' + x });
    }
    await forceSync();
    const final1 = await db1.all<ILorem>('lorem', {});
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final1.length).toBe(100);
    expect(final2.length).toBe(100);
  });
}, 10000);

test('sync:many:initial:twoway', cb => {
  prepare(cb, async (db1, db2, forceSync) => {
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

test('sync:many:dynamic:twoway', cb => {
  // log.enable();
  prepare(cb, async (db1, db2, forceSync) => {
    await forceSync();
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
      db2.insert('lorem', { goa: 'b' + x });
    }
    await forceSync();
    const final1 = await db1.all<ILorem>('lorem', {});
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final1.length).toBe(200);
    expect(final2.length).toBe(200);
    // log.disable();
  });
}, 10000);

/*

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
    const db1 = new Debe(new Engine(db(getDBDir())));
    await db1.initialize(schema);
    const sync1 = sync(db1, ['lorem'], ['debe-sync2']);
    const local1 = broker.local('debe-sync1', sync1.connect);
    for (let x = 0; x < 100; x++) {
      db1.insert('lorem', { goa: 'a' + x });
    }
    await new Promise(yay => setTimeout(yay, 5000));
    const db2 = new Debe(new Engine(db(getDBDir())));
    await db2.initialize(schema);
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
    const dbMaster = new Debe(new Engine(db(getDBDir())));
    await dbMaster.initialize(schema);
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
    const dbClient = new Debe(new Engine(db(getDBDir())));
    await dbClient.initialize(schema);
    const item = await dbClient.insert('lorem', { goa: 'a1001' });
    const syncClient = sync(
      dbClient,
      ['lorem'],
      ['debe-sync-master'],
      ['goa < ?', 'a50']
    );
    const localClient = broker.client(syncClient.connect);
    await syncClient.forceSync();
    const finalClient = await dbClient.all<ILorem>('lorem');
    const finalMaster = await dbClient.all<ILorem>('lorem');
    expect(finalClient.length).toBe(51);
    expect(finalMaster.find(x => x.id === item.id)).toBeTruthy();
    done(() => {
      localMaster();
      localClient();
    });
  });
}, 10000);
*/
