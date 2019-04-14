require('fake-indexeddb/auto');
import { generate } from 'debe-adapter';
import { IDBDebe } from './index';
import { createAdapterTest } from 'debe/dispatcher.test';

createAdapterTest(
  'idb',
  (col, options) => new IDBDebe(col, generate().substr(0, 3), options)
);
