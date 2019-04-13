const { Sqlite3Debe } = require('debe-better-sqlite3');
const { log } = require('debe');
const { createSocketClient } = require('debe-sync');
const { createSocketServer } = require('debe-sync-server');

log.enable();
async function generateItems(db, numberOfItems) {
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

async function wait(ms) {
  await new Promise(yay => setTimeout(yay, ms));
}

const schema = [{ name: 'lorem', index: ['goa'] }];
async function work() {
  // Master
  const db0 = new Sqlite3Debe(schema, { dbPath: 'db0.sqlite' });
  createSocketServer(db0, { port: 5555 });
  // Client
  const db1 = new Sqlite3Debe(schema, { dbPath: 'db1.sqlite' });
  createSocketClient(db1, 'http://localhost:5555', ['lorem']);
  await db0.initialize();
  await db1.initialize();
  //
  // await generateItems(db0, 100000);
  await wait(250);
  console.log(
    `Synced ${await db1.count('lorem')}/${await db0.count('lorem')} via socket`
  );
  //
  await generateItems(db1, 10000);
  //await generateItems(db1, 1);
  await wait(250);
  console.log(
    `Synced ${await db1.count('lorem')}/${await db0.count('lorem')} via socket`
  );
  process.exit();
}

work();
