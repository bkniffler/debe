import { createAdapterTest } from 'debe/dispatcher.test';
import { MemoryDebe } from 'debe-memory';
import { HttpServer } from 'debe-http-server';
import { HttpDebe } from './index';

let port = 5560;
createAdapterTest(
  'http',
  () => new HttpDebe(`http://localhost:${port}`),
  async (collections, i, options) => {
    port = port + 1;
    const db = await new MemoryDebe(collections, options).initialize();
    return new HttpServer(db, port);
  }
);
