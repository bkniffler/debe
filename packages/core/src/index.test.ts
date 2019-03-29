import { Debe, coreSkill, changeListenerSkill, memorySkill } from './index';

test('memory:basic', async () => {
  const client = new Debe();
  client.skill(coreSkill());
  client.skill(memorySkill());
  await client.initialize();
  const insertResult = await client.send<any>('insert', [
    'lorem',
    { id: 0, name: 'Hallo' }
  ]);
  const queryResult = await client.send<any>('all', ['lorem']);
  expect(insertResult.id).toBe('0');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});

test('memory:many', async () => {
  const client = new Debe();
  client.skill(coreSkill());
  client.skill(memorySkill());
  for (let x = 0; x < 100; x++) {
    client.insert('lorem', { goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  const final1 = await client.all('lorem', {
    where: { goa: { $lt: 'a50' } }
  } as any);
  const final2 = await client.all('lorem', {
    where: { goa: { $gte: 'a50' } }
  } as any);
  expect(final1.length).toBe(50);
  expect(final2.length).toBe(50);
}, 10000);

test('memory:change', async () => {
  const client = new Debe();
  client.skill(changeListenerSkill());
  client.skill(coreSkill());
  client.skill(memorySkill());
  await client.initialize();
  let calls = 0;
  const unlisten = client.sendSync('all', ['lorem'], {
    callback: () => (calls = calls + 1)
  });
  await client.send('insert', ['lorem', { id: '0', name: 'Hallo' }]);
  await client.send('insert', ['lorem', { id: '1', name: 'Hallo' }]);
  unlisten();
  await client.send('insert', ['lorem', { id: '2', name: 'Hallo' }]);
  expect(calls).toBe(2);
});

/*test('softdelete', async () => {
  const client = new Debe();
  client.skill(changeListenerSkill());
  client.skill(coreSkill());
  // client.skill(softDeleteSkill());
  client.skill(memorySkill());
  await client.initialize();
  const item = await client.insert('lorem', { name: 'Hallo' });
  await client.remove('lorem', item.id);
  const all = await client.all('lorem');
  expect(all.length).toBe(1);
});*/

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
