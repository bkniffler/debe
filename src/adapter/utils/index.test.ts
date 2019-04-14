import { generate, setIdGenerator } from './index';

test('utils:id', () => {
  const ids: any = {};
  const conflicts: string[] = [];
  for (let i = 0; i < 1000000; i++) {
    const id = ids[generate()];
    if (id) {
      conflicts.push(id);
    }
    ids[id] = true;
  }
  expect(conflicts.length).toBe(0);
  setIdGenerator(() => '123');
  expect(generate()).toBe('123');
});
