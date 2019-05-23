import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { DebeProvider } from './index';
import { render } from 'react-testing-library';
import { MemoryDebe } from 'debe-memory';
import 'jest-dom/extend-expect';
import { Cache } from './context';
import * as use from './react';
import { IQueryInput } from 'debe';

test('react:basic', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  await db.initialize();

  const cache = new Cache();
  await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);

  const { asFragment } = render(
    <DebeProvider
      initialize={async db => {
        // await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      cache={cache}
      value={db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await cache.waitPending();
  });

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(asFragment()).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});

test('react:basic2', async cb => {
  let failed = false;
  const db = new MemoryDebe(collections);
  const cache = new Cache();

  const { asFragment } = render(
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      cache={cache}
      value={db}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await cache.waitPending();
  });

  //expect(resultNode).toHaveTextContent();
  expect(failed).toBe(false);
  expect(asFragment()).toMatchSnapshot();
  expect(clean(cache.extract())).toMatchSnapshot();
  cache.close();
  await db.close();
  cb();
});

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
export const collections = [{ name: 'lorem', index: ['name'] }];
