import { Debe, generate } from '../src/core';
import { MemoryAdapter } from '../src/memory';
import { Sqlite3Adapter } from '../src/better-sqlite3';
import { writeJSON, readJSONSync, removeSync, ensureDirSync } from 'fs-extra';
import { resolve, join } from 'path';
import { chartist } from './chartist';
const Benchmark = require('benchmark');

console.log('Starting benchmark');

const p = resolve(__dirname, 'results.json');
const png = resolve(__dirname, 'chart.png');
const versions = readJSONSync(p);
const pkg = readJSONSync(resolve(__dirname, '../package.json'));
versions[pkg.version] = {};

const dbDir = join(process.cwd(), '.temp/better-sqlite3-benchmark');
removeSync(dbDir);
ensureDirSync(dbDir);
const getDBDir = () => join(dbDir, generate() + '.db');

async function work() {
  const collections = [
    { name: 'lorem' + generate().substr(0, 4), index: ['name'] }
  ];
  const table = collections[0].name;
  const clientMemory = new Debe(new MemoryAdapter(), collections);
  const clientSqlite3 = new Debe(new Sqlite3Adapter(getDBDir()), collections);
  await clientMemory.initialize();
  await clientSqlite3.initialize();
  var suite = new Benchmark.Suite();
  suite
    .add(
      'memory',
      function(deferred: any) {
        clientMemory
          .insert(table, {
            id: 'asd0',
            name: 'Hallo'
          })
          .then(() => deferred.resolve());
      },
      { defer: true }
    )
    .add(
      'better-sqlite3',
      function(deferred: any) {
        clientSqlite3
          .insert(table, {
            id: 'asd0',
            name: 'Hallo'
          })
          .then(() => deferred.resolve());
      },
      { defer: true }
    )
    .add(
      'memory-100x',
      async function(deferred: any) {
        const count = 1000;
        const pad = (num: any) => `${num}`.padStart(`${count}0`.length, '0');
        const items = [];
        for (let x = 0; x < count; x++) {
          items.push({ name: pad(x) });
        }
        await clientMemory.insert(table, items);
        deferred.resolve();
      },
      { defer: true }
    )
    .add(
      'better-sqlite3-100x',
      async function(deferred: any) {
        const count = 1000;
        const pad = (num: any) => `${num}`.padStart(`${count}0`.length, '0');
        const items = [];
        for (let x = 0; x < count; x++) {
          items.push({ name: pad(x) });
        }
        await clientSqlite3.insert(table, items);
        deferred.resolve();
      },
      { defer: true }
    )
    .on('cycle', function(event: any) {
      versions[pkg.version][event.target.name] = Math.floor(event.target.hz);
    })
    .on('complete', async function() {
      console.log('Fastest is ' + suite.filter('fastest').map('name'));
      await writeJSON(p, versions, { spaces: 2 });
      const suites: { [key: string]: number[] } = {};
      const max: number[] = [];
      const labels: string[] = [];
      Object.keys(versions).map(version => {
        Object.keys(versions[version]).forEach(suite => {
          if (!suites[suite]) {
            suites[suite] = [];
            max.push(0);
          }
        });
      });
      Object.keys(versions).map(version => {
        labels.push(version);
        Object.keys(suites).forEach((suite, i) => {
          const value = versions[version][suite] || 0;
          suites[suite].push(value);
          if (value > max[i]) {
            max[i] = value;
          }
        });
      });
      const series = Object.keys(suites).map((key, i) =>
        suites[key].map(v => v / max[i])
      );

      await chartist(
        'line',
        { width: 1200, height: 400 },
        {
          labels,
          series
        },
        png
      );
    })
    .run({ async: true });
}

work();
