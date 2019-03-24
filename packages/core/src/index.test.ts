import { Debe, DebeMemoryEngine } from './index';
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
  const result = await db.all('lorem');
  const count = await db.count('lorem');
  expect(count).toBe(2);
  expect(result.length).toBe(2);
});

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
});
