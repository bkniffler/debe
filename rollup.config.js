import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import buildIns from 'rollup-plugin-node-builtins';
import replace from 'rollup-plugin-replace';
import autoExternal from 'rollup-plugin-auto-external';
import alias from 'rollup-plugin-alias';
import json from 'rollup-plugin-json';
import { join } from 'path';

const fs = require('fs');
const integrate = ['debe-sql'];

// destination.txt will be created or overwritten by default.
const jobs = [];
const paths = require('./tsconfig.json').compilerOptions.paths;
delete paths['*'];
const mainPackageJSON = require(join(__dirname, 'package.json'));
Object.keys(paths).forEach(key => {
  const src = join(__dirname, paths[key][0]);
  const lib = join(__dirname, paths[key][0].replace('/src', '/lib'));
  const packageJSON = require(join(src, 'package.json'));
  if (!packageJSON.dependencies) {
    packageJSON.dependencies = {};
  }
  if (fs.existsSync(join(src, 'README.md'))) {
    fs.copyFileSync(join(src, 'README.md'), join(lib, 'README.md'));
  } else {
    fs.writeFileSync(
      join(lib, 'README.md'),
      `Find out more on ${mainPackageJSON.repository.url.replace('.git', '')}`
    );
  }
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
  jobs.push({
    context: '{}',
    input: join(lib, 'index.js'),
    output: [{ file: join(lib, 'index.cjs.js'), format: 'cjs' }],
    plugins: [
      json(),
      resolve({ jail: lib }),
      autoExternal({
        packagePath: join(lib, 'package.json')
      })
    ]
  });
  if (packageJSON.browser !== false) {
    jobs.push({
      context: '{}',
      input: join(lib, 'index.js'),
      output: {
        name: 'debe',
        file: join(lib, 'index.umd.js'),
        format: 'umd',
        extend: true,
        globals: Object.keys(paths).reduce(
          (state, k) => {
            state[k] = 'debe';
            return state;
          },
          {
            react: 'React'
          }
        )
      },
      external: [
        ...Object.keys(paths).filter(x => integrate.indexOf(x) === -1),
        'react'
      ],
      plugins: [
        replace({
          'process.env.NODE_ENV': JSON.stringify('production')
        }),
        buildIns(),
        alias(
          integrate.reduce(
            (state, key) => ({
              ...state,
              [key]: join(
                __dirname,
                paths[key][0].replace('/src', '/lib'),
                'index.js'
              )
            }),
            {}
          )
        ),
        json(),
        resolve({ browser: true }),
        commonjs({
          include: [/node_modules/],
          namedExports: {
            'node_modules/automerge/dist/automerge.js': [
              'init',
              'change',
              'emptyChange',
              'undo',
              'redo',
              'load',
              'save',
              'merge',
              'diff',
              'getChanges',
              'applyChanges',
              'getMissingDeps',
              'equals',
              'getHistory',
              'uuid',
              'Frontend',
              'Backend',
              'DocSet',
              'WatchableDoc',
              'Connection'
            ]
          }
        })
      ]
    });
  }
  return key;
});
export default jobs;
