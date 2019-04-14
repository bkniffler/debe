import { MemoryDebe } from 'debe-memory';
import { SyncServer } from 'debe-sync-server';

async function spawnServer(port: number, syncTo?: number) {
  const db = new MemoryDebe(schema);
  const target: any = syncTo ? ['localhost', syncTo] : undefined;
  return new SyncServer(db, port, target).initialize();
}

async function generateItems(db: MemoryDebe, numberOfItems: number) {
  const start = new Date().getTime();
  const items = [];
  for (let x = 0; x < numberOfItems; x++) {
    items.push({ title: 'a' + (x < 10 ? `0${x}` : x) });
  }
  await db.insert('todo', items);
  console.log(
    `Generated ${numberOfItems} in ${new Date().getTime() - start}ms`
  );
}

const schema = [{ name: 'todo', index: ['title', 'completed'] }];
async function work() {
  const server = await spawnServer(9911);
  await generateItems(server.db, 10);
  console.log('Ready');
}

work();
