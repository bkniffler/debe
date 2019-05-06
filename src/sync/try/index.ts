import {
  spawnServer,
  generateClients,
  generateItemsInto,
  alphabet,
  awaitIsEqual
} from '../test';

let basePort = 12000;
function getNextPort() {
  basePort = basePort + 1;
  return basePort;
}

async function work() {
  const port0 = getNextPort();
  const port1 = getNextPort();
  const count = 10;
  const server0 = await spawnServer(port0);
  const server1 = await spawnServer(port1, port0);
  const clients0 = await generateClients(port0, 1);
  const clients1: any[] = [] || (await generateClients(port1, 1));
  await Promise.all(
    [server0, server1, ...clients0, ...clients1].map((x, i) =>
      generateItemsInto(x.db, count, `${alphabet[i]}.`)
    )
  );
  expect(
    await awaitIsEqual(
      20,
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
      20,
      server0.db,
      server1.db,
      ...clients0.map(x => x.db),
      ...clients1.map(x => x.db)
    )
  ).toBe(true);
  console.log('DONE');
  await Promise.all(clients0.map(client => client.close()));
  await Promise.all(clients1.map(client => client.close()));
  await server0.close();
  await server1.close();
}

work();
