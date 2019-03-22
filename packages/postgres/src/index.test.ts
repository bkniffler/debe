import { createPostgreSQLClient } from './index';
import { generate } from '@debe/core';

if (process.env.PG_CONNECTIONSTRING) {
  const name = 'lorem' + generate().substr(0, 5);
  const schema = [
    {
      name,
      index: ['hallo']
    }
  ];
  test('postgres', async () => {
    const db = createPostgreSQLClient(
      process.env.PG_CONNECTIONSTRING + '',
      schema
    );
    await db.connect();
    const init = await db.count(name);
    await db.insert(name, { hallo: 'ok' });
    await db.insert(name, { hallo: 'ok2' });
    const count = await db.count(name);
    const result = await db.all(name);
    expect(count).toBe(init + 2);
    expect(result.length).toBe(init + 2);
  });
} else {
  test('debe', () => {
    expect(createPostgreSQLClient).toBeTruthy();
  });
}
