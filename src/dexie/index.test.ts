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

import { DexieAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';

createAdapterTest('dexie', () => new DexieAdapter(generate().substr(0, 3)));
