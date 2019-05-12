import { BetterSqlite3Debe } from 'debe-better-sqlite3';
import { SyncServer } from 'debe-sync-server';
import { SocketServer } from 'debe-socket-server';
import { resolve } from 'path';
import { schema } from '../shared';

async function generateItems(db: BetterSqlite3Debe, numberOfItems: number) {
  setTimeout(async () => {
    if (await db.count('todo')) {
      return;
    }
    const start = new Date().getTime();
    const items = [];
    for (let x = 0; x < numberOfItems; x++) {
      items.push({ title: 'a' + (x < 10 ? `0${x}` : x) });
    }

    await db.insert('todo', items);
    console.log(
      `Generated ${numberOfItems} in ${new Date().getTime() - start}ms`
    );
  }, 10000);
}

async function work() {
  console.log('Start');
  const db = new BetterSqlite3Debe(resolve(__dirname, 'data.db'), schema, {
    softDelete: true
  });
  const server = await new SyncServer(db, 9911).initialize();
  new SocketServer(db, 9912);
  await generateItems(server.db, 10);
  console.log('Ready');
}

work();
