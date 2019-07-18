import React from 'react';
import { act } from 'react-dom/test-utils';
import { DebeProvider, makeStore, awaitLoaded } from './index';
import { render } from '@testing-library/react';
import { MemoryDebe } from 'debe-memory';
import '@testing-library/jest-dom/extend-expect';
import { IQueryInput } from 'debe';
import * as use from './react';
import { STOREKEY } from './provider';

export const collections = [{ name: 'lorem', index: ['name'] }];

export function clean(obj: any) {
  Object.keys(obj).forEach(key => {
    const { result } = obj[key];
    if (result && Array.isArray(result)) {
      obj[key] = result.map((item: any) => {
        const { id, rev, ...rest } = item;
        return rest;
      });
    } else if (result) {
      const { id, rev, ...rest } = result;
      obj[key] = rest;
    }
  });
  return obj;
}

export interface ILorem {
  name: string;
}

export function Component({
  children,
  mode = 'AllOnce',
  arg
}: {
  children?: React.ReactNode;
  arg?: IQueryInput | string;
  mode?: 'AllOnce' | 'All' | 'Get';
}) {
  const [result, loading] = use[`use${mode}`]<ILorem>('lorem', arg);
  if (loading) {
    return <span>Loading</span>;
  }
  return (
    <span>
      {(Array.isArray(result) ? result : [result])
        .map((x: any) => x.name)
        .join(', ')}
      {children}
    </span>
  );
}

test('react:basic', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  await db.initialize();

  await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);

  const store = makeStore(db);
  const { asFragment } = render(
    <DebeProvider
      initialize={async db => {
        // await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      store={store}
      value={db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await awaitLoaded(store);
  });

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(asFragment()).toMatchSnapshot();
  expect(clean(store.getState()[STOREKEY])).toMatchSnapshot();
  await db.close();
  cb();
});

/*
test('react:basic2', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  const cache = new Cache();

  const { asFragment } = render(
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
        console.log('DONE INIT');
      }}
      cache={cache}
      value={db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    console.log('START WAITING');
    await cache.waitPending();
    console.log('DONE WAITING');
  });
  console.log('DONE TEST');

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(asFragment()).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});

/*
test('react:suspense', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  const cache = new Cache(true);

  const { asFragment } = render(
    <React.Suspense fallback="Loading">
      <DebeProvider
        cache={cache}
        initialize={async db => {
          await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
        }}
        value={db}
      >
        <Component />
      </DebeProvider>
    </React.Suspense>
  );

  await (act as any)(async () => {
    await cache.waitPending();
  });

  expect(asFragment()).toMatchSnapshot();
  expect(failed).toBe(false);

  cache.close();
  await db.close();
  cb();
});
*


export function Component({
  children,
  mode = 'AllOnce',
  arg
}: {
  children?: React.ReactNode;
  arg?: IQueryInput | string;
  mode?: 'AllOnce' | 'All' | 'Get';
}) {
  const [result, loading] = use[`use${mode}`]<ILorem>('lorem', arg);
  if (loading) {
    return <span>Loading</span>;
  }
  return (
    <span>
      {(Array.isArray(result) ? result : [result])
        .map((x: any) => x.name)
        .join(', ')}
      {children}
    </span>
  );
}

export function clean(obj: any) {
  Object.keys(obj).forEach(key => {
    const [, value] = obj[key];
    if (value && Array.isArray(value)) {
      obj[key] = value.map((item: any) => {
        const { id, rev, ...rest } = item;
        return rest;
      });
    } else if (value) {
      const { id, rev, ...rest } = value;
      obj[key] = rest;
    }
  });
  return obj;
}
*/
