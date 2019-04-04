const setGlobalVars = require('indexeddbshim');
import { resolve } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
import { Debe, generate } from 'debe';

const dbDir = resolve(process.cwd(), '.temp/dexie');
removeSync(dbDir);
ensureDirSync(dbDir);
global['window'] = global;
global['shimNS'] = true;
setGlobalVars();
global['shimIndexedDB'].__setConfig({
  databaseBasePath: dbDir
});

import { DexieAdapter } from './index';

const schema = [
  {
    name: 'lorem',
    index: ['name']
  }
];
test('dexie:basic', async () => {
  const client = new Debe(
    new DexieAdapter({ name: generate().substr(0, 3) }),
    schema
  );
  await client.initialize();
  await client.insert<any>('lorem', {
    id: 'asd',
    name: 'Hallo'
  });
  const queryResult = await client.all<any>('lorem');
  const queryResult1 = await client.get<any>('lorem', 'asd');
  const queryResult2 = await client.all<any>('lorem', ['asd']);
  const queryResult3 = await client.all<any>('lorem', {
    where: ['id = ?', ['asd']]
  });
  const queryResult4 = await client.all<any>('lorem', {
    where: ['id != ?', ['asda']]
  });
  const queryResult5 = await client.all<any>('lorem', {
    where: ['id != ?', ['asd']]
  });
  expect(queryResult5.length).toBe(0);
  expect(queryResult4.length).toBe(1);
  expect(queryResult3.length).toBe(1);
  expect(queryResult2.length).toBe(1);
  expect(queryResult2[0].id).toBe('asd');
  expect(queryResult3[0].id).toBe('asd');
  expect(queryResult1).toBeTruthy();
  expect(queryResult1.id).toBe('asd');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe('asd');
  expect(queryResult[0].name).toBe('Hallo');
});

test('dexie:many', async () => {
  const client = new Debe(
    new DexieAdapter({ name: generate().substr(0, 3) }),
    schema
  );
  await client.initialize();
  const items = [];
  for (let x = 0; x < 100; x++) {
    items.push({ name: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await client.insert('lorem', items);
  const queryResult = await client.all<any>('lorem');
  const queryResult2 = await client.all<any>('lorem', {
    where: ['name < ?', 'a50']
  });
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(100);
  expect(queryResult2.length).toBe(50);
});
