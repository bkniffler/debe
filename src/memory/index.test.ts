import { MemoryDebe, createFilter } from './index';

const collections = [{ name: 'lorem' }];
test('memory:basic', async () => {
  const client = new MemoryDebe(collections);
  await client.initialize();
  const insertResult = await client.insert<any>('lorem', {
    id: 0,
    name: 'Hallo'
  });
  const queryResult = await client.run<any>('all', ['lorem']);
  expect(insertResult.id).toBe('0');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});

test('memory:basic', async () => {
  const client = new MemoryDebe(collections);
  await client.initialize();
  const insertResult = await client.insert<any>('lorem', {
    id: 0,
    name: 'Hallo'
  });
  const queryResult = await client.run<any>('all', ['lorem']);
  expect(insertResult.id).toBe('0');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});

test('memory:many', async () => {
  const client = new MemoryDebe(collections);
  await client.initialize();
  for (let x = 0; x < 100; x++) {
    client.insert('lorem', { goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  const final1 = await client.all('lorem', {
    where: ['goa < ?', 'a50']
  } as any);
  const final2 = await client.all('lorem', {
    where: ['goa >= ?', 'a50']
  } as any);
  expect(final1.length).toBe(50);
  expect(final2.length).toBe(50);
}, 10000);

test('memory:filter', async () => {
  const items = [];
  for (let x = 0; x < 100; x++) {
    items.push({ goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  expect(items.filter(createFilter(['goa < ?', 'a50']) as any).length).toBe(50);
  expect(
    items.filter(createFilter(['goa < ? AND goa2 = ?', 'a50', 1]) as any).length
  ).toBe(50);
  expect(
    items.filter(createFilter(['goa < ? AND goa2 = ?', 'a50', 2]) as any).length
  ).toBe(0);
  expect(
    items.filter(createFilter(['goa = ? AND goa2 = ?', 'a50', 1]) as any).length
  ).toBe(1);
  expect(items.filter(createFilter(['goa != ?', 'a51']) as any).length).toBe(
    99
  );
  expect(
    items.filter(createFilter(['goa IN ?', ['a50', 'a51']]) as any).length
  ).toBe(2);
}, 10000);

test('memory:change', async () => {
  const client = new MemoryDebe(collections);
  await client.initialize();
  let calls = 0;
  const unlisten = client.runSync('all', ['lorem'], {
    callback: () => (calls = calls + 1)
  });
  await client.run('insert', ['lorem', { id: '0', name: 'Hallo' }]);
  await client.run('insert', ['lorem', { id: '1', name: 'Hallo' }]);
  unlisten();
  await client.run('insert', ['lorem', { id: '2', name: 'Hallo' }]);
  expect(calls).toBe(2);
});

test('memory:softdelete', async () => {
  const client = new MemoryDebe(collections, { softDelete: true });
  await client.initialize();
  await client.run('insert', ['lorem', { id: '0', name: 'Hallo' }]);
  await client.run('insert', ['lorem', { id: '1', name: 'Hallo' }]);
  await client.run('remove', ['lorem', { id: '0' }]);
  const all0 = await client.run('all', ['lorem', { where: ['id != ?', null] }]);
  const all1 = await client.run('all', ['lorem', {}]);
  const item0 = await client.run('get', ['lorem', { id: '0' }]);
  expect(all0.length).toBe(1);
  expect(all1.length).toBe(1);
  expect(item0).toBeTruthy();
  expect(item0.id).toBe('0');
});
