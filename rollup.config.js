import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import json from 'rollup-plugin-json';
import pkg from './package.json';
import { join } from 'path';

const fs = require('fs');

// destination.txt will be created or overwritten by default.
const jobs = [];
const paths = require('./tsconfig.json').compilerOptions.paths;
const mainPackageJSON = require(join(__dirname, 'package.json'));
const names = Object.keys(paths).reduce(
  (state, key) => ({
    ...state,
    [key]: key.split('-')[0] // key.replace(/-([a-z])/g, g => g[1].toUpperCase())
  }),
  {}
);
const projects = Object.keys(paths).forEach(key => {
  const src = join(__dirname, paths[key][0]);
  const lib = join(__dirname, paths[key][0].replace('/src', '/lib'));
  const packageJSON = require(join(src, 'package.json'));
  if (!packageJSON.dependencies) {
    packageJSON.dependencies = {};
  }
  fs.writeFileSync(
    join(lib, 'README.md'),
    `Find out more on ${mainPackageJSON.repository.url.replace('.git', '')}`
  );
  fs.writeFileSync(
    join(lib, 'package.json'),
    JSON.stringify(
      {
        ...packageJSON,
        main: './index.cjs.js',
        browser: packageJSON.browser !== false ? './index.umd.js' : undefined,
        esnext: './index.js',
        module: './index.js',
        types: './index.d.js',
        publishConfig: {
          access: 'public'
        },
        version: mainPackageJSON.version,
        license: mainPackageJSON.license,
        keywords: mainPackageJSON.keywords,
        author: mainPackageJSON.author,
        bugs: mainPackageJSON.bugs,
        repository: mainPackageJSON.repository,
        dependencies: {
          ...Object.keys(packageJSON.dependencies).reduce((store, key) => {
            if (Object.keys(paths).indexOf(key) !== -1) {
              store[key] = mainPackageJSON.version;
            }
            return store;
          }, packageJSON.dependencies),
          tslib: '^1.9.3'
        }
      },
      null,
      2
    )
  );
  if (packageJSON.browser !== false) {
    jobs.push({
      input: join(lib, 'index.js'),
      output: {
        name: names[key],
        file: join(lib, 'index.umd.js'),
        format: 'umd',
        extend: true
      },
      external: Object.keys(paths),
      globals: names,
      plugins: [
        json(),
        resolve({ browser: true }),
        commonjs({
          namedExports: {
            'node_modules/flowzilla/lib/index.umd.js': ['Flowzilla'],
            'node_modules/rpc1/index.umd.js': [
              'waitFor',
              'createLog',
              'requestReply',
              'Service',
              'Broker',
              'LocalAdapter'
            ],
            'node_modules/rpc1-socket/index.umd.js': ['SocketAdapter']
          }
        })
      ]
    });
  }
  jobs.push({
    input: join(lib, 'index.js'),
    output: [{ file: join(lib, 'index.cjs.js'), format: 'cjs' }],
    plugins: [
      json(),
      resolve({ module: true, jail: lib }),
      autoExternal({
        packagePath: join(lib, 'package.json')
      })
    ]
  });
  return key;
});
export default jobs;
