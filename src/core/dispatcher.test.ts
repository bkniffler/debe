import { generate } from 'debe-adapter';
import { Debe, ICollectionInput } from './index';

test('adapter:test', async () => {
  expect(1).toBe(1);
});

interface IServer {
  db?: Debe<any>;
  close: () => Promise<void>;
}
export function createAdapterTest(
  name: string,
  createDB: (collections: any[], options?: any) => Debe,
  init: (
    collections: ICollectionInput[],
    i: number,
    options?: any
  ) => Promise<IServer | undefined> = () => Promise.resolve(undefined)
) {
  /*test(`adapter:${name}:ids`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 0);
    const table = collections[0].name;
    const client = createDB(collections, {});
    await client.initialize();
    for (var i = 0; i < 1500; i++) {
      await client.insert<any>(table, {
        id: i,
        name: 'Hallo'
      });
    }
    const queryResult = await client.all<any>(table, { id: ['1', '2', '3'] });
    expect(queryResult.length).toBe(3);
    const queryResult2 = await client.all<any>(table, {
      id: [...Array(300).keys()].map(x => `${x}`)
    });
    expect(queryResult2.length).toBe(300);
    const queryResult3 = await client.all<any>(table, {
      id: [...Array(1000).keys()].map(x => `${x}`)
    });
    expect(queryResult3.length).toBe(1000);
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });*/

  test(`adapter:${name}:basic`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 0);
    const table = collections[0].name;
    const client = createDB(collections, {});
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
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });

  test(`adapter:${name}:empty`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 0);
    const table = collections[0].name;
    const client = createDB(collections, {});
    await client.initialize();
    const queryResult = await client.all<any>(table);
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(0);
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });

  test(`adapter:${name}:nochange`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 0);
    const table = collections[0].name;
    const client = createDB(collections, {
      changeListener: false
    });
    await client.initialize();
    const insertResult = await client.insert<any>(table, {
      id: 'asd0',
      name: 'Hallo'
    });
    const queryResult = await client.all<any>(table);
    const queryResult2 = await client.all<any>(table, {
      where: ['name = ?', new Date().getTime()]
    });
    expect(insertResult.id).toBe('asd0');
    expect(insertResult.name).toBe('Hallo');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(Array.isArray(queryResult2)).toBe(true);
    expect(queryResult2.length).toBe(0);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].name).toBe(insertResult.name);
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });

  test(`adapter:${name}:select`, async () => {
    const collections = [
      {
        name: 'lorem' + generate().substr(0, 4),
        index: ['firstName', 'lastName']
      }
    ];
    const ini = await init(collections, 0);
    const table = collections[0].name;
    const client = createDB(collections);
    await client.initialize();
    const insertResult = await client.insert<any>(table, {
      id: 'asd0',
      firstName: 'Beni',
      lastName: 'Kniffi'
    });
    let queryResult = await client.all<any>(table, { select: 'id' });
    expect(insertResult.id).toBe('asd0');
    expect(insertResult.firstName).toBe('Beni');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].firstName).toBe(undefined);
    expect(queryResult[0].lastName).toBe(undefined);

    queryResult = await client.all<any>(table, { select: ['id', 'firstName'] });
    expect(insertResult.id).toBe('asd0');
    expect(insertResult.firstName).toBe('Beni');
    expect(Array.isArray(queryResult)).toBe(true);
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].id).toBe(insertResult.id);
    expect(queryResult[0].firstName).toBe('Beni');
    expect(queryResult[0].lastName).toBe(undefined);

    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });

  const isQualified = false; //name !== 'idb' && name !== 'postgresql';
  test(
    isQualified ? `adapter:${name}:million` : `adapter:${name}:thousand`,
    async () => {
      const count = isQualified ? 1000000 : 1000;
      const pad = (num: any) => `${num}`.padStart(`${count}0`.length, '0');
      const collections = [
        { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
      ];
      const ini = await init(collections, 1);
      const table = collections[0].name;
      const client = createDB(collections);
      await client.initialize();
      const items = [];
      for (let x = 0; x < count; x++) {
        items.push({ name: pad(x), id: x });
      }
      await client.insert(table, items);
      let ids = await client.all(table, {
        id: ['1', '2', '3', '4', '5']
      });
      expect(ids.length).toBe(5);
      let result = await client.all(table, {
        orderBy: ['name ASC'],
        where: ['name < ?', pad(50)]
      } as any);
      expect(result.length).toBe(50);
      result = await client.all(table, {
        orderBy: ['name ASC'],
        where: ['name >= ?', pad(50)]
      } as any);
      expect(result.length).toBe(count - 50);
      result = await client.all(table, {
        orderBy: ['name ASC'],
        limit: 5
      } as any);
      expect(result.length).toBe(5);
      expect(result[0].name).toBe(pad(0));
      expect(result[4].name).toBe(pad(4));
      result = await client.all(table, {
        orderBy: ['name ASC'],
        limit: 6,
        offset: 5
      } as any);
      expect(result.length).toBe(6);
      expect(result[0].name).toBe(pad(5));
      expect(result[4].name).toBe(pad(9));
      const single = await client.get(table, {
        where: ['name <= ?', pad(50)],
        orderBy: ['name ASC']
      } as any);
      expect(single).toBeTruthy();
      expect(single.name).toBe(pad(0));
      await client.close();
      if (ini) {
        if (ini.db) {
          await ini.db.close();
        }
        await ini.close();
      }
    },
    1000 * 60 * 4
  );

  test(`adapter:${name}:insert`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 1);
    const table = collections[0].name;
    const client = createDB(collections);
    await client.initialize();
    async function isMatch(item?: any) {
      const single = item || (await client.get(table, 'a0'));
      return (
        single &&
        single.id === 'a0' &&
        single.fieldBool === true &&
        single.fieldString === 'abc' &&
        single.fieldNumber === 5
      );
    }
    const single = await client.insert(table, {
      id: 'a0',
      fieldString: 'abc',
      fieldBool: true,
      fieldNumber: 5
    });
    expect(await isMatch(single)).toBe(true);
    expect(await isMatch()).toBe(true);
    const newItem = await client.insert(
      table,
      {
        id: 'a0',
        newField: 'abc2'
      },
      { update: true }
    );
    expect(await isMatch()).toBe(true);
    expect(newItem.newField).toBe('abc2');
    expect((await client.get(table, 'a0')).newField).toBe('abc2');
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  }, 10000);

  test(`adapter:${name}:change`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 2);
    const table = collections[0].name;
    const client = createDB(collections);
    await client.initialize();
    let calls = 0;
    let countCalls = 0;
    const unlisten = client.all(table, () => {
      calls = calls + 1;
    });
    const unlisten2 = client.count(table, () => {
      countCalls = countCalls + 1;
    });
    await client.insert(table, { id: '0', name: 'Hallo', x: '1' });
    await client.insert(table, { id: '1', name: 'Hallo', x: '1' });
    await client.insert(table, { id: '2', name: 'Hallo', x: '1' });
    await client.insert(table, { id: '3', name: 'Hallo', x: '1' });
    await new Promise(yay => setTimeout(yay, 100));
    unlisten();
    unlisten2();
    const res1 = await client.insert(table, { id: '1', name: 'Hallo2' });
    const res2 = await client.insert(table, [
      { id: '2', name: 'Hallo2' },
      { id: '3', name: 'Hallo2' }
    ]);
    expect(calls).toBe(4);
    expect(countCalls).toBe(4);
    expect(res1.name).toBe('Hallo2');
    expect(res2[0].name).toBe('Hallo2');
    expect(res2[1].name).toBe('Hallo2');
    const res3 = await client.all(table, {});
    expect(res3[0].name).toBe('Hallo');
    expect(res3[1].name).toBe('Hallo2');
    expect(res3[2].name).toBe('Hallo2');
    expect(res3[3].name).toBe('Hallo2');
    expect(res3[0].x).toBe('1');
    expect(res3[1].x).toBe('1');
    expect(res3[2].x).toBe('1');
    expect(res3[3].x).toBe('1');
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });

  test(`adapter:${name}:softdelete`, async () => {
    const collections = [
      { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
    ];
    const ini = await init(collections, 3, {
      softDelete: true
    });
    const table = collections[0].name;
    const client = createDB(collections, {
      softDelete: true
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
    await client.close();
    if (ini) {
      if (ini.db) {
        await ini.db.close();
      }
      await ini.close();
    }
  });
}
