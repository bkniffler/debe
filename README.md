<div align="center">
  <h2>debe</h2>
  <strong>Flexible and reactive offline-first Javascript datastore for browsers, node, electron and react-native with focus on performance and simplicitiy. Includes support for multi-master/client database replication via plugin.</strong>
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
  <br />
  <br />
</div>

_Debe is currently under development, feel free to participate via PR or issues_

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

Please note, Debe is currently not supporting relations. If you're interested in relational data and graphs, you might be better off with graphQL, apollo and AppSync. Debe is focused on offline-first, performance and simplicity.

## Example

This is a small example for replating between master and client

```js
// Spawn a master on specified port, syncing to other port if provided
function spawnMaster(port, syncTo) {
  const db = new MemoryDebe();
  const destroy = [
    createSocketServer(db, { port }),
    syncTo
      ? createSocketClient(db, `http://localhost:${syncTo}`, ['lorem'])
      : undefined
  ];
  return { db, destroy: () => destroy.forEach(x => x && x()) };
}
// Spawn a client syncing to port
function spawnClient(syncTo) {
  const db = new MemoryDebe();
  const destroy = createSocketClient(db, `http://localhost:${syncTo}`, [
    'lorem'
  ]);
  return { db, destroy };
}
// Create instances
const instances = [
  // Simple master0
  spawnMaster(5555),
  // master1 that syncs to master0
  spawnMaster(5556, 5555),
  // client0 that syncs to master0
  spawnClient(5555),
  // client1 that syncs to master0
  spawnClient(5555),
  // client2 that syncs to master0
  spawnClient(5555),
  // client3 that syncs to master1
  spawnClient(5556),
  // client4 that syncs to master1
  spawnClient(5556)
];

// add 10 items to client0
const items = [];
for (let x = 0; x < 10; x++) {
  items.push({ name: 'a' + (x < 10 ? `0${x}` : x) });
}
await instances[2].db.insert('lorem', items);

// Let it sync
await new Promise(yay => setTimeout(yay, 3000));

// Check last clients items length
const length = (await instances[instances.length - 1].db.all('lorem')).length; // => 10
```
