import { generate } from 'debe';
import { PostgreSQLDebe } from './index';

if (process.env.PG_CONNECTIONSTRING) {
  test('posgresql:basic', async () => {
    const name = 'lorem' + generate().substr(0, 4);
    const client = new PostgreSQLDebe(
      [
        {
          name,
          index: ['name']
        }
      ],
      {
        connectionString: process.env.PG_CONNECTIONSTRING
      }
    );
    await client.initialize();
    const insertResult = await client.insert<any>(name, {
      id: 0,
      name: 'Hallo'
    });
    const queryResult = await client.all<any>(name);
    expect(insertResult.id).toBe('0');
    expect(insertResult.name).toBe('Hallo');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].name).toBe(insertResult.name);
  });

  test('posgresql:many', async () => {
    const name = 'lorem' + generate().substr(0, 4);
    const client = new PostgreSQLDebe(
      [
        {
          name,
          index: ['goa']
        }
      ],
      {
        connectionString: process.env.PG_CONNECTIONSTRING
      }
    );
    await client.initialize();
    const items = [];
    for (let x = 0; x < 100; x++) {
      items.push({ goa: 'a' + (x < 10 ? `0${x}` : x) });
    }
    await client.insert(name, items);
    const queryResult = await client.all<any>(name);
    const queryResult2 = await client.all<any>(name, {
      where: ['goa < ?', 'a50']
    });
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(100);
    expect(queryResult2.length).toBe(50);
  });
} else {
  test('posgresql:many', async () => {
    expect(1).toBe(1);
  });
}
