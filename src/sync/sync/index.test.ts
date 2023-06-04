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

  test(`sync:type:${name}:initialDown`, async () => {
    const count = 10;
    const port = getNextPort(1);
    const s = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();

    (async () => {
      for await (let { socket } of s.server.listener('connection')) {
        procedures(dbServer, socket, s.server);
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

    const srv = {
      socket,
      db: dbClient,
      isClosing: false
    };
    const perform = await base.initialDown('lorem', start, count, srv as any);
    await perform();

    expect(await dbClient.count('lorem')).toBe(
      (await dbServer.count('lorem')) - count
    );

    srv.isClosing = true;
    await dbClient.close();
    await dbServer.close();
    await socket.disconnect();
    await s.close();
  }, 10000);

  test(`sync:type:${name}:initialUp`, async () => {
    const count = 10;
    const port = getNextPort(2);
    const s = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();

    (async () => {
      for await (let { socket } of s.server.listener('connection')) {
        procedures(dbServer, socket, s.server);
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
    await base.initialUp('lorem', start, count, {
      socket,
      db: dbClient,
      isClosing: false
    } as any);

    expect((await dbClient.count('lorem')) - count).toBe(
      await dbServer.count('lorem')
    );

    await socket.disconnect();
    await s.close();
    await dbClient.close();
    await dbServer.close();
  }, 10000);

  test(`sync:type:${name}:listen`, async () => {
    const count = 10;
    const port = getNextPort(3);
    const s = createSimpleServer(port);
    const dbServer = await new SyncMemoryDebe(schema).initialize();
    addFilterMiddleware(s.server);

    const socket = createSimpleSocket(port);
    const dbClient = await new SyncMemoryDebe(schema).initialize();
    await socket.listener('connect').once();
    expect(socket.state).toBe('open');

    let lastLocalRev = undefined;
    let lastRemoteRev = undefined;
    const listener = base.listen({
      socket,
      db: dbClient,
      initialSyncComplete: Promise.resolve(),
      registerTask: () => () => {},
      syncState: {
        update: (x: any, y: any, z: any) => {
          lastLocalRev = y;
          lastRemoteRev = z;
        }
      }
    } as any);
    databaseListener(s.server, dbServer, '123');
    await listener.wait;

    await generateItemsInto(dbServer, count);
    expect(count).toBe(await dbServer.count('lorem'));
    let result = await waitFor(
      async () =>
        (await dbClient.count('lorem')) === (await dbServer.count('lorem'))
    );

    expect(result).toBe(true);
    expect(lastLocalRev).toBe(
      await dbClient.all('lorem', { orderBy: 'rev DESC' }).then(x => x[0].rev)
    );
    expect(lastRemoteRev).toBe(
      await dbServer.all('lorem', { orderBy: 'rev DESC' }).then(x => x[0].rev)
    );
    await socket.disconnect();
    await s.close();
    await dbClient.close();
    await dbServer.close();
  }, 10000);
}

testType('delta', delta, createDeltaProcedures);
testType('basic', basic, createBasicProcedures, 100);
