import { Debe, softDeletePlugin } from 'debe';
import { generate } from './utils';

test('adapter:test', async () => {
  expect(1).toBe(1);
});

export function createAdapterTest(name: string, createAdapter: any) {
  test(`${name}:basic`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const table = collections[0].name;
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    const insertResult = await client.insert<any>(table, {
      id: 'asd0',
      name: 'Hallo'
    });
    const queryResult = await client.all<any>(table);
    expect(insertResult.id).toBe('asd0');
    expect(insertResult.name).toBe('Hallo');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].name).toBe(insertResult.name);
  });

  test(`${name}:many`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const table = collections[0].name;
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    for (let x = 0; x < 100; x++) {
      client.insert(table, { id: 'a' + (x < 10 ? `0${x}` : x) });
    }
    let result = await client.all(table, {
      where: ['id < ?', 'a50']
    } as any);
    expect(result.length).toBe(50);
    result = await client.all(table, {
      where: ['id >= ?', 'a50']
    } as any);
    expect(result.length).toBe(50);
    result = await client.all(table, {
      orderBy: ['id ASC'],
      limit: 5
    } as any);
    expect(result.length).toBe(5);
    expect(result[0].id).toBe('a00');
    expect(result[4].id).toBe('a04');
    result = await client.all(table, {
      orderBy: ['id ASC'],
      limit: 6,
      offset: 5
    } as any);
    expect(result.length).toBe(6);
    expect(result[0].id).toBe('a05');
    expect(result[4].id).toBe('a09');
  }, 10000);

  test(`${name}:change`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const table = collections[0].name;
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    let calls = 0;
    const unlisten = client.all(table, {}, () => (calls = calls + 1));
    await client.insert(table, { id: '0', name: 'Hallo' });
    await client.insert(table, { id: '1', name: 'Hallo' });
    unlisten();
    await client.insert(table, { id: '2', name: 'Hallo' });
    expect(calls).toBe(2);
  });

  test(`${name}:softdelete`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const table = collections[0].name;
    const client = new Debe(createAdapter(), collections, {
      plugins: [softDeletePlugin()]
    });
    await client.initialize();
    await client.insert(table, { id: 'asd0', name: 'Hallo' });
    await client.insert(table, { id: 'asd1', name: 'Hallo' });
    await client.remove(table, 'asd0');
    const all0 = await client.all(table, { where: ['id != ?', 'asd2'] });
    const all1 = await client.all(table, {});
    const item0 = await client.get(table, { id: 'asd0' });
    expect(all0.length).toBe(1);
    expect(all1.length).toBe(1);
    expect(item0).toBeTruthy();
    expect(item0.id).toBe('asd0');
  });
}
