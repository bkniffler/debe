import * as React from 'react';
import { DebeProvider, Cache } from 'debe-react';
import { collections, Component, clean } from 'debe-react/index.test';
import { MemoryDebe } from 'debe-memory';
import 'jest-dom/extend-expect';
import { extractCache } from './index';

test('react-server:basic', async cb => {
  const db = new MemoryDebe(collections);
  const cache = new Cache();

  const data = await extractCache(
    cache,
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      cache={cache}
      value={() => db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  expect(data).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});

test('react-server:basic2', async cb => {
  const db = new MemoryDebe(collections);
  const cache = new Cache();

  await db.initialize();
  await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);

  const data = await extractCache(
    cache,
    <DebeProvider
      cache={cache}
      value={db}
      render={() => (
        <Component mode="All" arg={{ limit: 1, offset: 0 }}>
          <Component mode="AllOnce" arg={{ limit: 1, offset: 1 }}>
            <Component mode="Get" />
          </Component>
        </Component>
      )}
      loading={() => <span>Loading...</span>}
    />
  );

  expect(data).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});
