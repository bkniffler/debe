import { createAdapterTest } from 'debe/adapter.test';
import { MemoryAdapter } from 'debe-memory';
import { createSocketServer } from 'debe-socket-server';
import { Debe } from 'debe';
import { SocketAdapter } from './index';

let port = 5560;
createAdapterTest(
  'socketadapter',
  i => new SocketAdapter(`http://localhost:${port + i}`) as any,
  async (collections, i) => {
    const db = new Debe(new MemoryAdapter(), collections);
    await db.initialize();
    let unmount = createSocketServer(db, port + i);
    unmount['db'] = db;
    return unmount;
  }
);
