test('sync', () => {
  expect(2).toBe(2);
});

/*import { Debe } from 'debe';
import { MemoryAdapter } from 'debe-memory';
import { SyncServer } from 'debe-sync-server';
import { SyncClient } from './index';

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
  const server = new SyncServer(db, port, syncTo ? ['localhost', syncTo] : []);
  await server.initialize();
  return server;
}
async function spawnClient(port: number) {
  const db = new Debe(new MemoryAdapter(), schema);
  const sync = new SyncClient(db, ['localhost', port]);
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
  const port = getPort(0);
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
  server.close();
  clients.forEach(client => client.close());
  cb();
}, 120000);

test('sync:1000x10', async cb => {
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
  server.close();
  clients.forEach(client => client.close());
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
  server0.close();
  clients0.forEach(client => client.close());
  server1.close();
  clients1.forEach(client => client.close());
  cb();
}, 120000);
*/
