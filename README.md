<div align="center">
  <a href="https://github.com/bkniffler/debe">
    <img alt="flowzilla" src="https://raw.githubusercontent.com/bkniffler/debe/master/assets/logo.png" height="400px" />
  </a>
</div>
<div align="center">
  <strong>Tiny, flexible and reactive offline-first Javascript datastore for browsers, node, electron and react-native with focus on performance, simplicitiy and querying. Includes support for multi-master/client database replication via plugin.</strong>
    <br />
    <br />
  <i><small>Debe is currently under development, feel free to participate via PR or issues. Consider debe to not be production ready yet. Core API is considered pretty final, though plugin API like replication might change a bit.</small></i>
  <br />
  <br />
  <a href="https://travis-ci.org/bkniffler/debe">
    <img src="https://img.shields.io/travis/bkniffler/debe.svg?style=flat-square" alt="Build Status">
  </a>
  <a href="https://codecov.io/github/bkniffler/debe">
    <img src="https://img.shields.io/codecov/c/github/bkniffler/debe.svg?style=flat-square" alt="Coverage Status">
  </a>
  <a href="https://github.com/bkniffler/debe">
    <img src="http://img.shields.io/npm/v/debe.svg?style=flat-square" alt="Version">
  </a>
  <a href="https://github.com/bkniffler/debe">
    <img src="https://img.shields.io/badge/language-typescript-blue.svg?style=flat-square" alt="Language">
  </a>
  <a href="https://github.com/bkniffler/debe/master/LICENSE">
    <img src="https://img.shields.io/github/license/bkniffler/debe.svg?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/bkniffler/debe">
    <img src="https://flat.badgen.net/bundlephobia/minzip/debe" alt="License">
  </a>
  <a href="https://github.com/bkniffler/debe">
    <img src="https://img.shields.io/david/bkniffler/debe.svg?style=flat-square" alt="Dependencies">
  </a>
  <br />
  <br />
</div>

## Get started

https://codesandbox.io/s/y27xmr9rvj

```js
const { Debe } = require("debe");
const { MemoryAdapter } = require("debe-memory");
const { createSocketClient } = require("debe-sync");
const { createSocketServer } = require("debe-sync-server");

async function generateItems(db, numberOfItems) {
  const start = new Date().getTime();
  const items = [];
  for (let x = 0; x < numberOfItems; x++) {
    items.push({ name: "a" + (x < 10 ? `0${x}` : x) });
  }
  await db.insert("lorem", items);
  console.log(
    `Generated ${numberOfItems} in ${new Date().getTime() - start}ms`
  );
}

async function wait(ms) {
  await new Promise(yay => setTimeout(yay, ms));
}

const schema = [{ name: "lorem", index: ["name"] }];

async function work() {
  console.log("Start");
  // Master
  const db0 = new Debe(new MemoryAdapter(), schema);
  createSocketServer(db0, { port: 5555 });
  // Client
  const db1 = new Debe(new MemoryAdapter(), schema);
  createSocketClient(db1, "http://localhost:5555", ["lorem"]);
  // Init
  await db0.initialize();
  await db1.initialize();
  console.log("Initialized");
  // Step1
  await generateItems(db0, 10000);
  await wait(250);
  console.log(`Synced ${await db1.count("lorem")} items via socket`);
  // Step2
  await generateItems(db1, 1000);
  await wait(250);
  console.log(`Synced ${await db0.count("lorem")} items via socket`);
}

work().catch(err => console.log(err));

```

## Bindings

- Vanilla Javascript/NodeJS
- React/React Native via hooks
- Workers \*not yet
- ElectronJS

## Adapters

- Memory
- SQLite
- PostgreSQL
- MongoDB \*not yet :(

## Why

PouchDB/RxDB are great solutions for replicating databases, but being forced to build your services on top of CouchDB can be unfitting for some users. Debe is a fast and modern one-stop solution if you want to replicate your data in every way imaginable, so master-to-clients, master-to-masters-to-clients or master-to-client-to-master-to-client, ... It currently uses schemaless SQLight/PostgreSQL for persistence (with possibly more to follow). This makes it work wonderfully on React-Native/Expo and ElectronJS, since these all support SQLight fairly easily.

Please note, Debe is currently not supporting relations. If you're interested in relational data and graphs, you might be better off with graphQL, apollo and AppSync. Debe is focused on offline-first, performance, simplicity and being slim.

# Querying

Querying is simple and similar to SQL.

```
db1.all('lorem', {
  where: ['name < ?', 'a50'],
  orderBy: ['name', 'rev DESC']
}));
```

# Replication

# Credits

## Assets

- Vector Graphic: [www.freepik.com](https://www.freepik.com/free-photos-vectors/background)

## Dependencies

- [rpc1](https://github.com/bkniffler/rpc1)
- [flowzilla](https://github.com/bkniffler/flowzilla)

## Similar libraries

- PouchDB
- RxDB
- Realm
- NanoSQL
