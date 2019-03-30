import { MemoryDebe } from 'debe/memory';

test('memory:basic', async () => {
  const client = new MemoryDebe(require('faltu'));
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

test('memory:basic', async () => {
  const client = new MemoryDebe(require('faltu'));
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
  const client = new MemoryDebe(require('faltu'));
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
  const client = new MemoryDebe(require('faltu'));
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
