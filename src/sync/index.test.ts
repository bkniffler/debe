import { Debe } from 'debe';
import { MemoryAdapter } from 'debe-memory';
import { SyncClient } from './index';
import { SyncServer } from 'debe-sync-server';

const schema = [
  {
    name: 'lorem',
    index: ['name']
  }
];

function getPort(i: number) {
  return 9999 + i;
}
let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
async function generateItemsInto(db: Debe, count: number = 1000, prefix = '') {
  const items = [];
  for (var x = 0; x < count; x++) {
    items.push({
      //id: uuid4(),
      // id: prefix + `${x}`.padStart(`${count}`.length + 1, '0'),
      name: prefix + `${x}`.padStart(`${count}`.length + 1, '0')
    });
  }
  await db.insert('lorem', items);
}
async function spawnServer(port: number, syncTo?: number) {
  const db = new Debe(new MemoryAdapter(), schema);
  const server = new SyncServer(
    db,
    port,
    syncTo ? [['localhost', syncTo]] : []
  );
  await server.initialize();
  return server;
}
async function spawnClient(port: number) {
  const db = new Debe(new MemoryAdapter(), schema);
  const sync = new SyncClient(db, 'localhost', port);
  await db.initialize();
  return sync;
}
async function generateClients(port: number, numberOfClients: number) {
  const clients: SyncClient[] = [];
  for (var i = 0; i < numberOfClients; i++) {
    clients.push(await spawnClient(port));
  }
  return clients;
}
async function isEqual(...args: Debe[]) {
  let previous: string[] | undefined = undefined;
  for (var db of args) {
    const items = await db.all('lorem', { orderBy: ['name ASC'] });
    const arr = [...new Set([...items.map(x => x.name)])];
    if (previous !== undefined && previous.join(',') !== arr.join(',')) {
      // console.log(previous.join(','), 'vs', arr.join(','));
      return false;
    }
    previous = arr;
  }
  return true;
}

async function awaitIsEqual(maxTries = 10, ...dbs: Debe[]) {
  await new Promise(yay => setTimeout(yay, 5000));
  for (var i = 0; i < maxTries; i++) {
    if (await isEqual(...dbs)) {
      return true;
    }
    await new Promise(yay => setTimeout(yay, 5000));
  }
  return false;
}

test('sync:10x3', async cb => {
  const port = getPort(1);
  const count = 10;
  const server = await spawnServer(port);
  const clients = await generateClients(port, 1);
  await Promise.all(
    [server, ...clients].map((x, i) =>
      generateItemsInto(x.db, count, `${alphabet[i]}.`)
    )
  );
  expect(await awaitIsEqual(3, server.db, ...clients.map(x => x.db))).toBe(
    true
  );
  cb();
}, 120000);

test('sync:10000x3', async cb => {
  const port = getPort(1);
  const count = 10000;
  const server = await spawnServer(port);
  const clients = await generateClients(port, 3);
  await generateItemsInto(server.db, count, `${alphabet[0]}.`);
  await new Promise(yay => setTimeout(yay, 3000));
  await Promise.all(
    clients.map((x, i) => generateItemsInto(x.db, count, `${alphabet[i + 1]}.`))
  );
  expect(await awaitIsEqual(20, server.db, ...clients.map(x => x.db))).toBe(
    true
  );
  cb();
}, 120000);

test('sync:10:1000', async cb => {
  const port = getPort(2);
  const count = 1000;
  const server = await spawnServer(port);
  const clients = await generateClients(port, 10);
  await generateItemsInto(server.db, count, `${alphabet[0]}.`);
  await new Promise(yay => setTimeout(yay, 3000));
  await Promise.all(
    clients.map((x, i) => generateItemsInto(x.db, count, `${alphabet[i + 1]}.`))
  );
  expect(await awaitIsEqual(20, server.db, ...clients.map(x => x.db))).toBe(
    true
  );
  cb();
}, 120000);

test('sync:multimaster', async cb => {
  const port0 = getPort(3);
  const port1 = getPort(4);
  const count = 100;
  const server0 = await spawnServer(port0);
  const server1 = await spawnServer(port1, port0);
  const clients0 = await generateClients(port0, 3);
  const clients1 = await generateClients(port1, 3);
  await Promise.all(
    [server0, server1, ...clients0, ...clients1].map((x, i) =>
      generateItemsInto(x.db, count, `${alphabet[i]}.`)
    )
  );
  expect(
    await awaitIsEqual(
      3,
      server0.db,
      server1.db,
      ...clients0.map(x => x.db),
      ...clients1.map(x => x.db)
    )
  ).toBe(true);
  await Promise.all(
    [server0, server1, ...clients0, ...clients1].map((x, i) =>
      generateItemsInto(x.db, count, `${alphabet[i]}.`)
    )
  );
  expect(
    await awaitIsEqual(
      3,
      server0.db,
      server1.db,
      ...clients0.map(x => x.db),
      ...clients1.map(x => x.db)
    )
  ).toBe(true);
  cb();
}, 120000);

/*
test('sync:many:initial:oneway:reverse', cb => {
  prepare(cb, 2, async (db0, db1, db2, forceSync) => {
    const count = 10000;
    const items = [];
    for (let x = 0; x < count; x++) {
      items.push({ name: 'a' + (x < 10 ? `0${x}` : x) });
    }
    await db2.insert('lorem', items);
    await forceSync();
    const final1 = await db1.all<ILorem>('lorem', {});
    const final2 = await db2.all<ILorem>('lorem', {});
    expect(final1.length).toBe(count);
    expect(final2.length).toBe(count);
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

test('sync:socket:simple3', async cb => {
  const port = 5554;
  // HOST
  const dbMaster = new Debe(new MemoryAdapter(), schema);
  const destroyServer = new SyncServer(dbMaster, port);
  await dbMaster.initialize();

  // CLIENT
  const dbClient = new Debe(new MemoryAdapter(), schema);
  const destroyClient = new SyncClient(
    dbClient,
    new SocketAdapter(`http://localhost:${port}`)
  );
  await dbClient.initialize();

  const items = [];
  for (let x = 0; x < 10; x++) {
    items.push({ goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await dbClient.insert('lorem', items);

  // CLIENT
  const dbClient2 = new Debe(new MemoryAdapter(), schema);
  const destroyClient2 = new SyncClient(
    dbClient2,
    new SocketAdapter(`http://localhost:${port}`)
  );
  await dbClient2.initialize();

  await new Promise(yay => setTimeout(yay, 2000));
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

    expect(allOnClient.length).toBe(allOnMaster.length);
    expect(allOnClient2.length).toBe(allOnClient.length);
    // expect(isEqual(allOnClient2, allOnMaster)).toBeTruthy();
  }

  await isEqualState();

  await dbClient.insert('lorem', { goa: 'a1000' });
  await dbClient2.insert('lorem', { goa: 'a1001' });
  await dbMaster.insert('lorem', { goa: 'a1002' });
  await dbMaster.insert('lorem', { goa: 'a1003' });
  await dbMaster.insert('lorem', { goa: 'a1004' });
  await new Promise(yay => setTimeout(yay, 2000));
  await isEqualState();

  destroyServer.close();
  destroyClient.close();
  destroyClient2.close();
  cb();
}, 20000);

test('sync:socket:simple2', async cb => {
  const port = 5554;
  // HOST
  const dbMaster = new Debe(new MemoryAdapter(), schema);
  const destroyServer = new SyncServer(dbMaster, port);
  const destroyClient0 = new SyncClient(
    dbMaster,
    new SocketAdapter(`http://localhost:${port}`)
  );
  await dbMaster.initialize();

  // CLIENT
  const dbClient = new Debe(new MemoryAdapter(), schema);
  const destroyClient1 = new SyncClient(
    dbClient,
    new SocketAdapter(`http://localhost:${port}`)
  );
  await dbClient.initialize();

  const items = [];
  for (let x = 0; x < 10; x++) {
    items.push({ goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await dbClient.insert('lorem', items);

  await new Promise(yay => setTimeout(yay, 2000));
  async function isEqualState() {
    const allOnClient = await dbClient.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });
    const allOnMaster = await dbMaster.all<ILorem>('lorem', {
      orderBy: ['rev ASC', 'id ASC']
    });

    expect(allOnClient.length).toBe(allOnMaster.length);
    // expect(isEqual(allOnClient2, allOnMaster)).toBeTruthy();
  }

  await isEqualState();

  await dbClient.insert('lorem', { goa: 'a1000' });
  await dbClient2.insert('lorem', { goa: 'a1001' });
  await dbMaster.insert('lorem', { goa: 'a1002' });
  await dbMaster.insert('lorem', { goa: 'a1003' });
  await dbMaster.insert('lorem', { goa: 'a1004' });
  await new Promise(yay => setTimeout(yay, 2000));
  await isEqualState();

  destroyServer.close();
  destroyClient0.close();
  destroyClient1.close();
  cb();
}, 20000);

test('sync:socket:crazy', async cb => {
  async function spawnMaster(port: number, syncTo?: number) {
    const db = new Debe(new MemoryAdapter(), schema);
    const services = [
      new SyncServer(db, port),
      syncTo ? await spawnClient(syncTo, db) : undefined
    ];
    await db.initialize();
    return { db, close: () => services.forEach(x => x && x.close()) };
  }
  async function spawnClient(
    syncTo: number,
    db = new Debe(new MemoryAdapter(), schema)
  ) {
    const client = new SyncClient(
      db,
      new SocketAdapter(`http://localhost:${syncTo}`)
    );
    await db.initialize();
    return client;
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
  await new Promise(yay => setTimeout(yay, 6000));
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
  await new Promise(yay => setTimeout(yay, 5000));
  await isEqualState();

  instances.forEach(instance => instance.close());
  cb();
}, 60000);
*/

////////////////////////
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
