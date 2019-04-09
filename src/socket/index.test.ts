import { createAdapterTest } from 'debe/adapter.test';
import { MemoryAdapter } from 'debe-memory';
import { SocketServer } from 'debe-socket-server';
import { Debe } from 'debe';
import { SocketAdapter } from './index';

let port = 5560;
createAdapterTest(
  'socket',
  i => new SocketAdapter('localhost', port + i) as any,
  async (collections, i) => {
    const db = new Debe(new MemoryAdapter(), collections);
    await db.initialize();
    return new SocketServer(db, port + i);
  }
);
