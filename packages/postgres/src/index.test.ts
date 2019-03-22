import { createPostgreSQLClient } from './index';

const schema = [
  {
    name: 'lorem',
    index: ['hallo']
  }
];

test('postgres', async () => {
  const db = createPostgreSQLClient(
    'postgresql://postgres@localhost:5432/test2',
    schema
  );
  db.connect();
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const count = await db.count('lorem');
  const result = await db.all('lorem');
  expect(count).toBe(2);
  expect(result.length).toBe(2);
});
