import { NanoSQLAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';
import { generate } from 'debe';
import { join } from 'path';
import { removeSync, ensureDirSync } from 'fs-extra';

const dbDir = join(process.cwd(), '.temp/nanosql');
removeSync(dbDir);
ensureDirSync(dbDir);

createAdapterTest('nanosql', () => new NanoSQLAdapter(dbDir, generate()));
