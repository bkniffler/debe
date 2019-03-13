<div align="center">
  <h2>sqlight</h2>
  <strong>Universal sqlite interface, currently supporting better-sqlight3 and expo, more to come.</strong>
  <br />
  <br />
  <a href="https://travis-ci.org/bkniffler/sqlight">
    <img src="https://img.shields.io/travis/bkniffler/sqlight.svg?style=flat-square" alt="Build Status">
  </a>
  <a href="https://codecov.io/github/bkniffler/sqlight">
    <img src="https://img.shields.io/codecov/c/github/bkniffler/sqlight.svg?style=flat-square" alt="Coverage Status">
  </a>
  <a href="https://github.com/bkniffler/sqlight">
    <img src="http://img.shields.io/npm/v/sqlight.svg?style=flat-square" alt="Version">
  </a>
  <a href="https://github.com/bkniffler/sqlight">
    <img src="https://img.shields.io/badge/language-typescript-blue.svg?style=flat-square" alt="Language">
  </a>
  <a href="https://github.com/bkniffler/sqlight/master/LICENSE">
    <img src="https://img.shields.io/github/license/bkniffler/sqlight.svg?style=flat-square" alt="License">
  </a>
  <br />
  <br />
</div>

## Bindings

## Why

## Install

### Yarn

## Example

### Local

```jsx
const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2']
  }
];
const dbDir = join(__dirname, '.temp/db.db');
async function() {
  const db = sqlight(betterSQLite3(dbDir), schema);
  await db.insert('lorem', { hallo: 'ok' });
  await db.insert('lorem', { hallo: 'ok2' });
  const result = await db.all('lorem', {});
};
```
