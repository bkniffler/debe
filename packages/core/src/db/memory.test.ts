import { MemoryDebe } from './memory';

test('memory:basic', async () => {
  const client = new MemoryDebe();
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
