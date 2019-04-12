import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { useAll, DebeProvider, useCollection } from './index';
import { render, waitForElement, fireEvent } from 'react-testing-library';
import { MemoryAdapter } from 'debe-memory';
import 'jest-dom/extend-expect';
import { Debe } from 'debe';

interface ILorem {
  name: string;
}
const collections = [{ name: 'lorem', index: ['name'] }];
test('react:basic', async cb => {
  function Component() {
    const [result] = useAll<ILorem>('lorem', {});
    return (
      <span data-testid="result">{result.map(x => x.name).join(', ')}</span>
    );
  }

  const { getByTestId, asFragment } = render(
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      value={() => new Debe(new MemoryAdapter(), collections)}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await waitForElement(() => getByTestId('result'));
  });

  //expect(resultNode).toHaveTextContent();
  expect(asFragment()).toMatchSnapshot();
  cb();
});

test('react:many', async cb => {
  function Component() {
    const [result] = useAll<ILorem>('lorem', {
      where: ['name < ?', '500']
    });
    return (
      <ul data-testid="result">
        <li>Start</li>
        {result.map(item => (
          <li key={item.id}>
            <span data-testid={item.name}>{item.name}</span>
          </li>
        ))}
        <li>End</li>
      </ul>
    );
  }

  const { getByTestId, asFragment } = render(
    <DebeProvider
      initialize={async db => {
        const items = [];
        for (let x = 0; x < 1000; x++) {
          items.push({ name: `${x}`.padStart(3, '0') });
        }
        await db.insert('lorem', items);
      }}
      value={() => new Debe(new MemoryAdapter(), collections)}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await waitForElement(() => getByTestId('result'));
  });

  expect(() => getByTestId('500')).toThrow();
  expect(getByTestId('499')).toBeTruthy();
  expect(asFragment()).toMatchSnapshot();
  cb();
});

test('react:listen', async cb => {
  let renders = 0;
  function Component() {
    const [result] = useAll<ILorem>('lorem', {});
    renders = renders + 1;
    return (
      <ul>
        {result.map(item => (
          <li key={item.id}>
            <span data-testid={item.name}>{item.name}</span>
          </li>
        ))}
      </ul>
    );
  }

  const { getByTestId, asFragment } = render(
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
        setTimeout(
          () => db.insert('lorem', [{ name: 'Max' }, { name: 'Nik' }]),
          1000
        );
      }}
      value={() => new Debe(new MemoryAdapter(), collections)}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await waitForElement(() => getByTestId('Nik'));
  });

  //expect(resultNode).toHaveTextContent();
  expect(renders).toBe(3);
  expect(asFragment()).toMatchSnapshot();
  cb();
});

test('react:interact', async cb => {
  function Component() {
    const collection = useCollection<ILorem>('lorem');
    const [result] = useAll<ILorem>('lorem', {});
    return (
      <div>
        <button
          data-testid="button"
          onClick={() => collection.insert({ name: 'Jadda' })}
        >
          Add
        </button>
        <ul>
          {result.map(item => (
            <li key={item.id}>
              <span data-testid={item.name}>{item.name}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { getByTestId, asFragment } = render(
    <DebeProvider
      initialize={async db => {
        await db.insert('lorem', [{ name: 'Beni' }, { name: 'Alex' }]);
      }}
      value={() => new Debe(new MemoryAdapter(), collections)}
      render={() => <Component />}
      loading={() => <span>Loading...</span>}
    />
  );

  await (act as any)(async () => {
    await waitForElement(() => getByTestId('Beni'));
  });

  //expect(resultNode).toHaveTextContent();
  await (act as any)(async () => {
    fireEvent.click(getByTestId('button'));
    await waitForElement(() => getByTestId('Jadda'));
  });

  expect(asFragment()).toMatchSnapshot();
  cb();
});
