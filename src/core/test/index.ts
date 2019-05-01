import { Debe } from '../debe';

export async function generateItemsInto(
  db: Debe,
  count: number = 1000,
  prefix = ''
) {
  const items = [];
  for (var x = 0; x < count; x++) {
    items.push({
      //id: uuid4(),
      // id: prefix + `${x}`.padStart(`${count}`.length + 1, '0'),
      name: prefix + `${x}`.padStart(`${count}`.length + 1, '0')
    });
  } //
  return await db.insert('lorem', items);
}
