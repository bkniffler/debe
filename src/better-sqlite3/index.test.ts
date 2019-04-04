import { generate } from 'debe';
import { Sqlite3Adapter } from './index';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra';
import { createAdapterTest } from 'debe/adapter.test';

const dbDir = join(process.cwd(), '.temp/better-sqlite3');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');
createAdapterTest('better-sqlite3', () => new Sqlite3Adapter(getDBDir()));
