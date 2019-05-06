import {
  spawnServer,
  generateClients,
  generateItemsInto,
  alphabet,
  awaitIsEqual
} from './test';

let basePort = 12000;
function getNextPort() {
  basePort = basePort + 1;
  return basePort;
}

test('sync:init:10x3', async cb => {
  const port = getNextPort();
  const count = 10;
  const server = await spawnServer(port);
  const clients = await generateClients(port, 1);
  await Promise.all(
    [server, ...clients].map((x, i) =>
      generateItemsInto(x.db, count, `${alphabet[i]}.`)
    )
  );
  expect(await awaitIsEqual(20, server.db, ...clients.map(x => x.db))).toBe(
    true
  );
  await Promise.all(clients.map(client => client.close()));
  await server.close();
  cb();
}, 120000);

test('sync:init:10000x3', async cb => {
  const port = getNextPort();
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
  await Promise.all(clients.map(client => client.close()));
  await server.close();
  cb();
}, 120000);

test('sync:init:1000x10', async cb => {
  const port = getNextPort();
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
  await Promise.all(clients.map(client => client.close()));
  await server.close();
  cb();
}, 120000);

test('sync:init:multimaster', async cb => {
  const port0 = getNextPort();
  const port1 = getNextPort();
  const count = 10;
  const server0 = await spawnServer(port0);
  const server1 = await spawnServer(port1, port0);
  const clients0 = await generateClients(port0, 3);
  const clients1 = await generateClients(port1, 3);
  const all = [server0, server1, ...clients0, ...clients1];
  await Promise.all(
    all.map((x, i) => generateItemsInto(x.db, count, `${alphabet[i]}.`))
  );
  console.log(
    (await Promise.all(all.map(({ db }) => db.count('lorem'))))
      .map(x => `${x}`)
      .join(', ')
  );
  await Promise.all(
    all.map(async ({ db }) => expect(await db.count('lorem')).toBe(count))
  );
  await new Promise(yay => setTimeout(yay, 3000));
  console.log(
    (await Promise.all(all.map(({ db }) => db.count('lorem'))))
      .map(x => `${x}`)
      .join(', ')
  );

  const targetCount = all.length * count;
  await Promise.all(
    all.map(async ({ db }) => expect(await db.count('lorem')).toBe(targetCount))
  );
  console.log('XY!!');
  await Promise.all(clients0.map(client => client.close()));
  await Promise.all(clients1.map(client => client.close()));
  await server0.close();
  await server1.close();
  cb();
}, 120000);
