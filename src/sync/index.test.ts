import { MemoryDebe } from 'debe-memory';
import { createBroker } from 'rpc1';
import { sync, createSocketClient } from './index';
import { isEqual } from 'debe';
import { createSocketServer } from 'debe-sync-server';

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
    const sync2 = sync(db2, ['lorem'], []);
    const local1 = broker.local('debe-sync1', sync1.connect);
    const local2 = broker.local('debe-sync2', sync2.connect);
    await init(db1, db2, sync1.forceSync);
    done(() => {
      local1();
      local2();
    });
  });
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

test('sync:socket', async cb => {
  prepare;
  const port = 5554;
  // HOST
  const dbMaster = new MemoryDebe();
  const destroyServer = createSocketServer(dbMaster, { port });

  // CLIENT
  const dbClient = new MemoryDebe();
  const destroyClient = createSocketClient(
    dbClient,
    `http://localhost:${port}`,
    ['lorem']
  );

  // CLIENT
  const dbClient2 = new MemoryDebe();
  const destroyClient2 = createSocketClient(
    dbClient2,
    `http://localhost:${port}`,
    ['lorem']
  );

  for (let x = 0; x < 100; x++) {
    dbClient.insert('lorem', { goa: 'a' + x });
  }

  await new Promise(yay => setTimeout(yay, 3000));
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

    expect(isEqual(allOnClient, allOnMaster)).toBeTruthy();
    expect(isEqual(allOnClient2, allOnMaster)).toBeTruthy();
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
}, 10000);

test('sync:socket:crazy', async cb => {
  const port0 = 5555;
  const dbMaster0 = new MemoryDebe();
  const destroyServer0 = createSocketServer(dbMaster0, { port: port0 });

  const port1 = 5556;
  const dbMaster1 = new MemoryDebe();
  const destroyServer1 = createSocketServer(dbMaster1, { port: port1 });
  const destroyClient0 = createSocketClient(
    dbMaster1,
    `http://localhost:${port0}`,
    ['lorem']
  );

  const port2 = 5557;
  const dbMaster2 = new MemoryDebe();
  const destroyServer2 = createSocketServer(dbMaster2, { port: port2 });
  const destroyClient1 = createSocketClient(
    dbMaster2,
    `http://localhost:${port1}`,
    ['lorem']
  );

  // CLIENT
  const dbClient = new MemoryDebe();
  const destroyClient = createSocketClient(
    dbClient,
    `http://localhost:${port0}`,
    ['lorem']
  );

  // CLIENT
  const dbClient2 = new MemoryDebe();
  const destroyClient2 = createSocketClient(
    dbClient2,
    `http://localhost:${port0}`,
    ['lorem']
  );

  // CLIENT
  const dbClient3 = new MemoryDebe();
  const destroyClient3 = createSocketClient(
    dbClient3,
    `http://localhost:${port1}`,
    ['lorem']
  );

  for (let x = 0; x < 100; x++) {
    dbClient.insert('lorem', { goa: 'a' + x });
  }

  await new Promise(yay => setTimeout(yay, 15000));

  async function isEqualState() {
    const allOnClient = await dbClient.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnClient2 = await dbClient2.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnMaster = await dbMaster0.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnMaster1 = await dbMaster1.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnClient3 = await dbClient3.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnMaster2 = await dbMaster2.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });

    expect(isEqual(allOnClient, allOnMaster)).toBeTruthy();
    expect(isEqual(allOnClient2, allOnMaster)).toBeTruthy();
    expect(isEqual(allOnClient2, allOnMaster1)).toBeTruthy();
    expect(isEqual(allOnClient3, allOnMaster)).toBeTruthy();
    expect(isEqual(allOnMaster2, allOnMaster)).toBeTruthy();
  }

  await isEqualState();

  await dbClient.insert('lorem', { goa: 'a1000' });
  await dbClient2.insert('lorem', { goa: 'a1001' });
  await dbMaster0.insert('lorem', { goa: 'a1002' });
  await dbMaster0.insert('lorem', { goa: 'a1003' });
  await dbMaster0.insert('lorem', { goa: 'a1004' });
  await new Promise(yay => setTimeout(yay, 5000));
  await isEqualState();

  destroyClient0();
  destroyServer0();
  destroyServer2();
  destroyServer1();
  destroyClient1();
  destroyClient();
  destroyClient2();
  destroyClient3();
  cb();
}, 20000);

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
