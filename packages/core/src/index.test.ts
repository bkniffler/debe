import { Debe, corePlugin, changeListenerPlugin, memoryPlugin } from './index';
import { softDeletePlugin, jsonBodyPlugin } from './plugins';

test('dispatcher', async () => {
  const client = new Debe();
  client.addPlugin(() => (type, value, flow) => {
    value.push(1);
    flow(value);
  });
  client.addPlugin(() => (type, value, flow) => {
    value.push(2);
    flow(value);
  });
  client.addPlugin(() => (type, value, flow) => {
    value.push(3);
    flow(value);
  });
  client.addPlugin(() => (type, value, flow) => {
    return flow(value);
  });
  const result = await client.dispatch<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(4);
});

test('dispatcher:nopromise', async () => {
  const client = new Debe();
  client.addPlugin(() => (type, value) => {
    value.push(1);
    return value;
  });
  const result = client.dispatchSync('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('dispatcher:afterware', async () => {
  const client = new Debe();
  client.addPlugin(() => (type, value, flow) => {
    value.push(1);
    flow(
      value,
      (x: any, flow: any) => {
        x.push(5);
        flow(x);
      }
    );
  });
  client.addPlugin(() => (type, value, flow) => {
    value.push(2);
    flow(
      value,
      (x: any, flow: any) => {
        x.push(4);
        flow(x);
      }
    );
  });
  client.addPlugin(() => (type, value, flow) => {
    value.push(3);
    flow(value);
  });
  client.addPlugin(() => (type, value, flow) => {
    return flow(value);
  });
  const result = await client.dispatch<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(6);
  expect(result.join('')).toBe('012345');
});

test('dispatcher:memory', async () => {
  const client = new Debe();
  client.addPlugin(corePlugin);
  client.addPlugin(memoryPlugin);
  const insertResult = await client.dispatch<any>('insert', [
    'lorem',
    { id: 0, name: 'Hallo' }
  ]);
  const queryResult = await client.dispatch<any>('all', ['lorem']);
  expect(insertResult.id).toBe('0');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});

test('dispatcher:memory:change', async () => {
  const client = new Debe();
  client.addPlugin(changeListenerPlugin);
  client.addPlugin(corePlugin);
  client.addPlugin(memoryPlugin);
  let calls = 0;
  const unlisten = client.dispatchSync('all', ['lorem'], {
    callback: () => {
      calls = calls + 1;
    }
  });
  await client.dispatch('insert', ['lorem', { id: '0', name: 'Hallo' }]);
  await client.dispatch('insert', ['lorem', { id: '1', name: 'Hallo' }]);
  unlisten();
  await client.dispatch('insert', ['lorem', { id: '2', name: 'Hallo' }]);
  expect(calls).toBe(2);
});

test('client', async () => {
  const client = new Debe();
  client.addPlugin(jsonBodyPlugin);
  client.addPlugin(memoryPlugin);
  await client.insert('lorem', { name: 'Hallo' }, { log: true });
  const all = await client.all('lorem', {}, { log: true });
  expect(all.length).toBe(1);
});

test('client', async () => {
  const client = new Debe();
  client.addPlugin(changeListenerPlugin);
  client.addPlugin(memoryPlugin);
  await client.insert('lorem', { name: 'Hallo' });
  const all = await client.all('lorem');
  expect(all.length).toBe(1);
});

test('client', async () => {
  const client = new Debe();
  client.addPlugin(changeListenerPlugin);
  client.addPlugin(softDeletePlugin);
  client.addPlugin(memoryPlugin);
  const item = await client.insert('lorem', { name: 'Hallo' });
  await client.remove('lorem', item.id);
  const all = await client.all('lorem');
  expect(all.length).toBe(1);
});

/*import { Debe, DebeMemoryEngine } from './index';
import { toISO } from './utils';
import { Emitter } from './common';

const schema = [
  {
    name: 'lorem'
  }
];

test('simple', async () => {
  const db = new Debe(new DebeMemoryEngine());
  await db.initialize(schema);
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
  const count = await db.count('lorem');
  expect(count).toBe(2);
  expect(result.length).toBe(2);
});
*/
/*
test('simple-use', async () => {
  interface ILorem {
    goa?: string;
    goa2?: string;
    hallo?: string;
  }
  const db = new Debe(new DebeMemoryEngine());
  await db.initialize(schema);
  const lorem = db.use<ILorem>('lorem');
  await lorem.insert({ hallo: 'ok' });
  await lorem.insert({ hallo: 'ok2' });
  const result = await lorem.all({});
  const count = await lorem.count({});
  expect(result.length).toBe(2);
  expect(count).toBe(2);
});

test('remove', async () => {
  const db = new Debe(new DebeMemoryEngine());
  await db.initialize(schema);
  await db.insert('lorem', { hallo: 'ok' });
  const item = await db.insert('lorem', { hallo: 'ok2' });
  await db.remove('lorem', item.id);
  const result = await db.all('lorem');
  const deletedItem = await db.get('lorem', { id: item.id });
  expect(result.length).toBe(1);
  expect(deletedItem).toBeTruthy();
  // expect(deletedItem[db.engine.removedField]).toBeTruthy();
});

test('time', () => {
  const date = new Date();
  expect(toISO(date)).toBe(date.toISOString());
  expect(toISO(null)).toBe(undefined);
});

test('emitter', () => {
  const emitter = new Emitter();
  const invocations = [];
  const unlisten = emitter.on('h', (i: number) => invocations.push(i));
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  unlisten();
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  expect(invocations.length).toBe(3);
  emitter.once('h', (i: number) => invocations.push(i));
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  expect(invocations.length).toBe(4);
  emitter.once((i: number) => invocations.push(i));
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  expect(invocations.length).toBe(5);
  const unlisten2 = emitter.on((i: number) => invocations.push(i));
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  unlisten2();
  emitter.emit('h', 1);
  emitter.emit('h', 1);
  expect(emitter.numberOfListeners).toBe(0);
});*/
