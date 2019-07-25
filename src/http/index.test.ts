import { createAdapterTest } from 'debe/dispatcher.test';
import { MemoryDebe } from 'debe-memory';
import { HttpServer } from 'debe-http-server';
import { HttpDebe } from './index';
import { generate } from 'debe-adapter';

let port = 5590;
createAdapterTest(
  'http',
  () => new HttpDebe(`http://localhost:${port}`),
  async (collections, i, options) => {
    port = port + 1;
    const db = await new MemoryDebe(collections, options).initialize();
    return new HttpServer(db, port);
  }
);
test(`adapter:http:batch`, async () => {
  const collections = [
    { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
  ];
  port = port + 1;
  const db = await new MemoryDebe(collections).initialize();
  const ini = new HttpServer(db, port);
  let listenerCalled = 0;
  let serverSideCallings = 0;
  let serverSideArgs = 0;
  ini.queryLogger = args => {
    serverSideCallings = serverSideCallings + 1;
    serverSideArgs = args.length;
  };
  const client = new HttpDebe(`http://localhost:${port}`);
  const table = collections[0].name;
  await client.initialize();
  const listener = client.all(
    table,
    () => (listenerCalled = listenerCalled + 1)
  );
  const [queryResult, insertResult] = await Promise.all([
    client.all<any>(table),
    client.insert<any>(table, {
      id: 'asd0',
      name: 'Hallo'
    }),
    client.all<any>(table)
  ]);
  expect(listenerCalled).toBe(1);
  expect(serverSideArgs).toBe(2);
  expect(serverSideCallings).toBe(1);
  expect(insertResult.id).toBe('asd0');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
  listener();
  await client.close();
  if (ini) {
    if (ini.db) {
      await ini.db.close();
    }
    await ini.close();
  }
});
