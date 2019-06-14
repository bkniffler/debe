import { Debe } from 'debe';
import { Sync } from 'debe-sync';
import { MemoryDebe } from 'debe-memory';
import { SyncServer } from 'debe-sync-server';
import { create } from 'debe-socket';
import http from 'http';
import { attach } from 'debe-socket-server';

export const schema = [
  {
    name: 'lorem',
    index: ['name'],
    sync: 'simple'
  }
];

export let alphabet = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l'
];

export async function generateItemsInto(
  db: Debe,
  count: number = 1000,
  prefix = ''
) {
  const items = [];
  for (var x = 0; x < count; x++) {
    items.push({
      //id: uuid4(),
      // id: prefix + `${x}`.padStart(`${count}`.length + 1, '0'),
      name: prefix + `${x}`.padStart(`${count}`.length + 1, '0')
    });
  } //
  await db.insert('lorem', items);
}

export async function spawnServer(port: number, syncTo?: number) {
  const db = new MemoryDebe(schema);
  const target: any = syncTo ? ['localhost', syncTo] : undefined;
  return new SyncServer(db, port, target).initialize();
}

export async function spawnClient(port: number) {
  const db = new MemoryDebe(schema);
  return new Sync(db, ['localhost', port]).initialize();
}

export async function generateClients(port: number, numberOfClients: number) {
  const clients: Sync[] = [];
  for (var i = 0; i < numberOfClients; i++) {
    clients.push(await spawnClient(port));
  }
  return clients;
}

export async function isEqual(...args: Debe[]) {
  let previous: string[] | undefined = undefined;
  for (var db of args) {
    const items = await db.all('lorem', { orderBy: ['name ASC'] });
    const arr = [...new Set([...items.map(x => x.name)])];
    if (previous !== undefined && previous.join(',') !== arr.join(',')) {
      return false;
    }
    previous = arr;
  }
  return true;
}

export async function awaitIsEqual(maxTries = 10, ...dbs: Debe[]) {
  for (var i = 0; i < maxTries; i++) {
    if (await isEqual(...dbs)) {
      return true;
    }
    await new Promise(yay => setTimeout(yay, 1000));
  }
  return false;
}

export function createSimpleSocket(port: number) {
  const socket = create({
    hostname: 'localhost',
    port
  });
  return socket;
}

export function createSimpleServer(port: number) {
  const httpServer = http.createServer();
  const agServer = attach(httpServer);
  httpServer.listen(port);
  return {
    server: agServer,
    close: async () => {
      agServer.closeAllListeners();
      await agServer.close();
      httpServer.close();
    }
  };
}
