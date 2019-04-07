import { Debe } from 'debe';
import { MemoryAdapter } from 'debe-memory';
import { Broker, Service, LocalAdapter } from 'rpc1';
import { sync, createSyncClient } from './index';
//import { isEqual } from 'debe';
import { createSyncServer } from 'debe-sync-server';

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
async function prepare(
  cb: any,
  init: (db1: Debe, db2: Debe, forceSync: () => Promise<any>) => Promise<void>
) {
  function done() {
    clearTimeout(timeout);
    if (broker) {
      broker.close();
    }
    if (local1) {
      local1.close();
    }
    if (local2) {
      local2.close();
    }
    cb();
  }
  let timeout = setTimeout(done, 10000);
  const broker = new Broker();
  const db1 = new Debe(new MemoryAdapter(), schema);
  const db2 = new Debe(new MemoryAdapter(), schema);
  const sync1 = sync(db1, ['debe-sync2']);
  const sync2 = sync(db2, []);
  await Promise.all([db1.initialize(), db2.initialize()]);
  const local1 = new Service('debe-sync1', new LocalAdapter(broker));
  sync1.connect(local1);
  const local2 = new Service('debe-sync2', new LocalAdapter(broker));
  sync2.connect(local2);
  await init(db1, db2, sync1.forceSync);
  done();
}

test('sync:many:initial:oneway:simple', cb => {
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

test('sync:socket:simple', async cb => {
  const port = 5554;
  // HOST
  const dbMaster = new Debe(new MemoryAdapter(), schema);
  const destroyServer = createSyncServer(dbMaster, { port });
  await dbMaster.initialize();

  // CLIENT
  const dbClient = new Debe(new MemoryAdapter(), schema);
  const destroyClient = createSyncClient(dbClient, `http://localhost:${port}`);
  await dbClient.initialize();

  const items = [];
  for (let x = 0; x < 10; x++) {
    items.push({ goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await dbClient.insert('lorem', items);

  // CLIENT
  const dbClient2 = new Debe(new MemoryAdapter(), schema);
  const destroyClient2 = createSyncClient(
    dbClient2,
    `http://localhost:${port}`
  );
  await dbClient2.initialize();

  await new Promise(yay => setTimeout(yay, 1000));
  async function isEqualState() {
    const allOnClient = await dbClient.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnClient2 = await dbClient2.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnMaster = await dbMaster.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });

    expect(allOnMaster.length).toBe(allOnMaster.length);
    expect(allOnClient2.length).toBe(allOnClient.length);
    // expect(isEqual(allOnClient2, allOnMaster)).toBeTruthy();
  }

  await isEqualState();

  await dbClient.insert('lorem', { goa: 'a1000' });
  await dbClient2.insert('lorem', { goa: 'a1001' });
  await dbMaster.insert('lorem', { goa: 'a1002' });
  await dbMaster.insert('lorem', { goa: 'a1003' });
  await dbMaster.insert('lorem', { goa: 'a1004' });
  await new Promise(yay => setTimeout(yay, 1000));
  await isEqualState();

  destroyServer();
  destroyClient();
  destroyClient2();
  cb();
}, 20000);

test('sync:socket:crazy', async cb => {
  async function spawnMaster(port: number, syncTo?: number) {
    const db = new Debe(new MemoryAdapter(), schema);
    const destroy = [
      createSyncServer(db, { port }),
      syncTo ? createSyncClient(db, `http://localhost:${syncTo}`) : undefined
    ];
    await db.initialize();
    return { db, destroy: () => destroy.forEach(x => x && x()) };
  }
  async function spawnClient(syncTo: number) {
    const db = new Debe(new MemoryAdapter(), schema);
    const destroy = createSyncClient(db, `http://localhost:${syncTo}`);
    await db.initialize();
    return { db, destroy };
  }
  const instances = await Promise.all([
    spawnMaster(5555),
    spawnMaster(5556, 5555),
    spawnClient(5555),
    spawnClient(5555),
    spawnClient(5555),
    spawnClient(5556),
    spawnClient(5556)
  ]);

  const items = [];
  for (let x = 0; x < 1000; x++) {
    items.push({ name: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await instances[2].db.insert('lorem', items);

  // Let it sync
  await new Promise(yay => setTimeout(yay, 5000));
  async function isEqualState() {
    const all = await Promise.all(
      instances.map(i =>
        i.db.all<ILorem>('lorem', {
          orderBy: ['rev ASC', 'id ASC']
        })
      )
    );
    expect(all.length).toBe(instances.length);
    all.reduce((lastResults, results) => {
      if (!lastResults.length) {
        return results;
      }
      expect(lastResults.length).toBe(results.length);
      return results;
    }, []);
  }

  await isEqualState();

  await Promise.all(
    instances.map((instance, i) =>
      instance.db.insert<ILorem>('lorem', {
        name: 'a1000' + i
      })
    )
  );
  await new Promise(yay => setTimeout(yay, 3000));
  await isEqualState();

  instances.forEach(instance => instance.destroy());
  cb();
}, 60000);

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
