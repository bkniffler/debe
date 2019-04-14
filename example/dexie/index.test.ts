require('fake-indexeddb/auto');
import { generate } from 'debe';
import { DexieAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';

createAdapterTest('dexie', () => new DexieAdapter(generate().substr(0, 3)));
