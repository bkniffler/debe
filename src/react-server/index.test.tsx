import * as React from 'react';
import { DebeProvider, Cache } from 'debe-react';
import { collections, Component, clean } from 'debe-react/index.test';
import { MemoryDebe } from 'debe-memory';
import 'jest-dom/extend-expect';
import { extractCache } from './index';

test('react-server:basic', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  const cache = new Cache();

  const data = await extractCache(
    cache,
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
        // await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      cache={cache}
      value={() => db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(data).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});

test('react-server:basic2', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  await db.initialize();

  const cache = new Cache();
  await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);

  const data = await extractCache(
    cache,
    <DebeProvider
      initialize={async db => {
        // await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      cache={cache}
      value={db}
      render={() => (
        <Component arg={{ limit: 1, offset: 0 }}>
          <Component arg={{ limit: 1, offset: 1 }}>
            <Component mode="Get" />
          </Component>
        </Component>
      )}
      loading={() => <span>Loading...</span>}
    />
  );

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(data).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});
