import { delta } from './delta';
import { basic } from './basic';
import { generateItemsInto } from 'debe/test';
import { createSimpleServer, createSimpleSocket } from '../test';
import { MemoryDebe } from 'debe-memory';
import {
  createDeltaProcedures,
  createBasicProcedures,
  databaseListener,
  addFilterMiddleware
} from 'debe-sync-server/sync';
import { ISyncType } from './type';
import { ICollectionInput } from 'debe';
import { ensureSync } from '../ensure-sync';
import { waitFor } from '../utils';

class SyncMemoryDebe extends MemoryDebe {
  constructor(collections: ICollectionInput[], options?: any) {
    super(collections, options);
  }
  async initialize() {
    ensureSync(this);
    await super.initialize();
    return this;
  }
}

let basePort = 8911;
function testType(
  name: string,
  base: ISyncType,
  procedures: Function,
  mod = 0
) {
  function getNextPort(num: number = 0) {
    return basePort + num + mod;
  }
  const schema = [
    {
      name: 'lorem',
      index: ['name'],
      sync: name
    }
  ];

  test(`sync:type:${name}:initialDown`, async cb => {
    const count = 10;
    const port = getNextPort(1);
    const server = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();

    (async () => {
      for await (let { socket } of server.listener('connection')) {
        procedures(dbServer, socket, server);
      }
    })();

    const socket = createSimpleSocket(port);
    const dbClient = await new SyncMemoryDebe(schema).initialize();
    await socket.listener('connect').once();
    expect(socket.state).toBe('open');

    const items = await generateItemsInto(dbServer, count);
    const start = items[count - 1].rev;
    expect(await dbServer.count('lorem')).toBe(count);
    await generateItemsInto(dbServer, count);
    expect(await dbServer.count('lorem')).toBe(count * 2);

    let closing = false;
    await base.initialDown(
      'lorem',
      start,
      count,
      socket,
      dbClient,
      () => closing
    );

    expect(await dbClient.count('lorem')).toBe(
      (await dbServer.count('lorem')) - count
    );

    closing = true;
    await socket.disconnect();
    await server.close();
    cb();
  }, 10000);

  test(`sync:type:${name}:initialUp`, async cb => {
    const count = 10;
    const port = getNextPort(2);
    const server = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();

    (async () => {
      for await (let { socket } of server.listener('connection')) {
        procedures(dbServer, socket, server);
      }
    })();

    const socket = createSimpleSocket(port);
    const dbClient = await new SyncMemoryDebe(schema).initialize();
    await socket.listener('connect').once();
    expect(socket.state).toBe('open');

    // Insert
    await generateItemsInto(dbClient, count);
    expect(count).toBe(await dbClient.count('lorem'));
    await new Promise(yay => setTimeout(yay, 1));
    const start = new Date().toISOString();
    await new Promise(yay => setTimeout(yay, 1));
    await generateItemsInto(dbClient, count);
    expect(count * 2).toBe(await dbClient.count('lorem'));

    // Work
    let closing = false;
    await base.initialUp(
      'lorem',
      start,
      count,
      socket,
      dbClient,
      () => closing
    );

    expect((await dbClient.count('lorem')) - count).toBe(
      await dbServer.count('lorem')
    );

    closing = true;
    await socket.disconnect();
    await server.close();
    cb();
  }, 10000);

  test(`sync:type:${name}:listen`, async cb => {
    const count = 10;
    const port = getNextPort(3);
    const server = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();
    addFilterMiddleware(server);

    const socket = createSimpleSocket(port);
    const dbClient = await new SyncMemoryDebe(schema).initialize();
    await socket.listener('connect').once();
    expect(socket.state).toBe('open');

    let lastLocalRev = undefined;
    let lastRemoteRev = undefined;
    let working = false;
    let closing = false;
    const listener = base.listen(
      socket,
      dbClient,
      (x, y, z) => {
        lastLocalRev = y;
        lastRemoteRev = z;
      },
      () => {
        working = true;
        return () => {
          working = false;
        };
      },
      () => closing
    );
    databaseListener(server, dbServer, '123');
    await listener.wait;

    await generateItemsInto(dbServer, count);
    expect(count).toBe(await dbServer.count('lorem'));
    let result = await waitFor(
      async () =>
        (await dbClient.count('lorem')) === (await dbServer.count('lorem'))
    );

    expect(working).toBe(false);
    expect(result).toBe(true);
    expect(lastLocalRev).toBe(
      await dbClient.all('lorem', { orderBy: 'rev DESC' }).then(x => x[0].rev)
    );
    expect(lastRemoteRev).toBe(
      await dbServer.all('lorem', { orderBy: 'rev DESC' }).then(x => x[0].rev)
    );
    closing = true;
    await socket.disconnect();
    await server.close();
    cb();
  }, 10000);
}

testType('delta', delta, createDeltaProcedures);
testType('basic', basic, createBasicProcedures, 100);
