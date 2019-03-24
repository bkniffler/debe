import { PostgreSQLEngine } from './index';
import { generate, Debe } from '@debe/core';
const pg = require('pg');

if (process.env.PG_CONNECTIONSTRING) {
  const name = 'lorem' + generate().substr(0, 5);
  const schema = [
    {
      name,
      index: ['hallo']
    }
  ];
  test('postgres', async () => {
    const pool = new pg.Pool({
      connectionString: process.env.PG_CONNECTIONSTRING + ''
    });
    const db = new Debe(new PostgreSQLEngine(pool));
    await db.initialize(schema);
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
    expect(PostgreSQLEngine).toBeTruthy();
  });
}
