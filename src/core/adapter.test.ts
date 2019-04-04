import { Debe, softDeletePlugin } from 'debe';

test('adapter:test', async () => {
  expect(1).toBe(1);
});

const collections = [{ name: 'lorem', index: ['name'] }];
export function createAdapterTest(name: string, createAdapter: any) {
  test(`${name}:basic`, async () => {
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    const insertResult = await client.insert<any>('lorem', {
      id: 'asd0',
      name: 'Hallo'
    });
    const queryResult = await client.all<any>('lorem');
    expect(insertResult.id).toBe('asd0');
    expect(insertResult.name).toBe('Hallo');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].name).toBe(insertResult.name);
  });

  test(`${name}:many`, async () => {
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    for (let x = 0; x < 100; x++) {
      client.insert('lorem', { name2: 1, name: 'a' + (x < 10 ? `0${x}` : x) });
    }
    const final1 = await client.all('lorem', {
      where: ['name < ?', 'a50']
    } as any);
    const final2 = await client.all('lorem', {
      where: ['name >= ?', 'a50']
    } as any);
    expect(final1.length).toBe(50);
    expect(final2.length).toBe(50);
  }, 10000);

  test(`${name}:change`, async () => {
    const client = new Debe(createAdapter(), collections);
    await client.initialize();
    let calls = 0;
    const unlisten = client.all('lorem', {}, () => (calls = calls + 1));
    await client.insert('lorem', { id: '0', name: 'Hallo' });
    await client.insert('lorem', { id: '1', name: 'Hallo' });
    unlisten();
    await client.insert('lorem', { id: '2', name: 'Hallo' });
    expect(calls).toBe(2);
  });

  test(`${name}:softdelete`, async () => {
    const client = new Debe(createAdapter(), collections, {
      plugins: [softDeletePlugin()]
    });
    await client.initialize();
    await client.insert('lorem', { id: 'asd0', name: 'Hallo' });
    await client.insert('lorem', { id: 'asd1', name: 'Hallo' });
    await client.remove('lorem', 'asd0');
    const all0 = await client.all('lorem', { where: ['id != ?', 'asd2'] });
    const all1 = await client.all('lorem', {});
    const item0 = await client.get('lorem', { id: 'asd0' });
    expect(all0.length).toBe(1);
    expect(all1.length).toBe(1);
    expect(item0).toBeTruthy();
    expect(item0.id).toBe('asd0');
  });
}
