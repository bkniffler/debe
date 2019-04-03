const setGlobalVars = require('indexeddbshim');
import { resolve } from 'path';
import { ensureDirSync, removeSync } from 'fs-extra';
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

const collections = [{ name: 'lorem' }];
test('dexie:basic', async () => {
  const client = new DexieDebe(collections);
  await client.initialize();
  await client.insert<any>('lorem', {
    id: 'asd',
    name: 'Hallo'
  });
  const insertResult = await client.get<any>('lorem', { id: 'asd' });
  const queryResult = await client.all<any>('lorem');
  expect(insertResult.id).toBe('asd');
  expect(insertResult.name).toBe('Hallo');
  expect(Array.isArray(queryResult)).toBe(true);
  expect(queryResult.length).toBe(1);
  expect(queryResult[0].id).toBe(insertResult.id);
  expect(queryResult[0].name).toBe(insertResult.name);
});
