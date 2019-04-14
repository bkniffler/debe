import { createAdapterTest } from 'debe/dispatcher.test';
import { MemoryDebe } from 'debe-memory';
import { SocketServer } from 'debe-socket-server';
import { SocketDebe } from './index';

let port = 5560;
createAdapterTest(
  'socket',
  () => new SocketDebe(['localhost', port]),
  async (collections, i, options) => {
    port = port + 1;
    const db = await new MemoryDebe(collections, options).initialize();
    return new SocketServer(db, port);
  }
);
