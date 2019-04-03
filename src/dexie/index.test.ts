const setGlobalVars = require('indexeddbshim');
import { resolve } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { generate } from 'debe';

const dbDir = resolve(process.cwd(), '.temp/dexie');
removeSync(dbDir);
ensureDirSync(dbDir);
global['window'] = global;
global['shimNS'] = true;
setGlobalVars();
global['shimIndexedDB'].__setConfig({
  databaseBasePath: dbDir
});

import { DexieDebe } from './index';

test('dexie:basic', async () => {
  const client = new DexieDebe(
    [
      {
        name: 'lorem',
        index: ['name']
      }
    ],
    {
      name: generate().substr(0, 3)
    }
  );
  await client.initialize();
  await client.insert<any>('lorem', {
    id: 'asd',
    name: 'Hallo'
  });
  const queryResult = await client.all<any>('lorem');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe('asd');
  expect(queryResult[0].name).toBe('Hallo');
});

test('dexie:many', async () => {
  const client = new DexieDebe(
    [
      {
        name: 'lorem',
        index: ['goa']
      }
    ],
    {
      name: generate().substr(0, 3)
    }
  );
  await client.initialize();
  const items = [];
  for (let x = 0; x < 100; x++) {
    items.push({ goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await client.insert('lorem', items);
  const queryResult = await client.all<any>('lorem');
  const queryResult2 = await client.all<any>('lorem', {
    where: ['goa < ?', 'a50']
  });
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(100);
  expect(queryResult2.length).toBe(50);
});
