import { createMemoryFilter } from './query';

test('memory:filter', async () => {
  const items = [];
  for (let x = 0; x < 100; x++) {
    items.push({ goa2: 1, goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  const { filter } = createMemoryFilter();
  expect(items.filter(filter(['goa < ?', 'a50']) as any).length).toBe(50);
  expect(
    items.filter(filter(['goa < ? AND goa2 = ?', 'a50', 1]) as any).length
  ).toBe(50);
  expect(
    items.filter(filter(['goa < ? AND goa2 = ?', 'a50', 2]) as any).length
  ).toBe(0);
  expect(
    items.filter(filter(['goa = ? AND goa2 = ?', 'a50', 1]) as any).length
  ).toBe(1);
  expect(items.filter(filter(['goa != ?', 'a51']) as any).length).toBe(99);
  expect(items.filter(filter(['goa IN ?', ['a50', 'a51']]) as any).length).toBe(
    2
  );
}, 10000);
