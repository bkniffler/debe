import { MemoryDebe } from 'debe-memory';

async function generateItems(db: MemoryDebe, numberOfItems: number) {
  const start = new Date().getTime();
  const items = [];
  for (let x = 0; x < numberOfItems; x++) {
    items.push({ goa: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await db.insert('lorem', items);
  console.log(
    `Generated ${numberOfItems} in ${new Date().getTime() - start}ms`
  );
}

const schema = [{ name: 'lorem', index: ['goa'] }];
async function work() {
  const db0 = await new MemoryDebe(schema).initialize();
  await generateItems(db0, 10000);
  process.exit();
}

work();
