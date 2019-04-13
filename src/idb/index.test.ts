require('fake-indexeddb/auto');
import { generate } from 'debe';
import { IDBAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';

createAdapterTest('idb', () => new IDBAdapter(generate().substr(0, 3)));
