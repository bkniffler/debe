import { MemoryDebe } from './index';
import { createAdapterTest } from 'debe/dispatcher.test';

createAdapterTest('memory', (col, opt) => new MemoryDebe(col, opt));
