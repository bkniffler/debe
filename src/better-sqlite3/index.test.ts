import { generate } from 'debe-adapter';
import { BetterSqlite3Debe } from './index';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra';
import { createAdapterTest } from 'debe/dispatcher.test';

const dbDir = join(process.cwd(), '.temp/better-sqlite3');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');
createAdapterTest(
  'better-sqlite3',
  (col, opt) => new BetterSqlite3Debe(getDBDir(), col, opt)
);
