import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
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
    [key]: key.replace(/-([a-z])/g, g => g[1].toUpperCase())
  }),
  {}
);
const projects = Object.keys(paths).forEach(key => {
  const src = join(__dirname, paths[key][0]);
  const lib = join(__dirname, paths[key][0].replace('/src', '/lib'));
  try {
    let packageJSON = require(join(src, 'package.json'));
    if (!packageJSON.dependencies) {
      packageJSON.dependencies = {};
    }
    packageJSON = {
      ...packageJSON,
      main: './index.cjs.js',
      browser: './index.umd.js',
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
    };
    fs.writeFileSync(
      join(lib, 'package.json'),
      JSON.stringify(packageJSON, null, 2)
    );
    jobs.push({
      input: join(lib, 'index.js'),
      output: {
        name: names[key],
        file: join(lib, 'index.umd.js'),
        format: 'umd'
      },
      external: Object.keys(paths),
      globals: names,
      plugins: [
        resolve({ browser: true }),
        commonjs({
          namedExports: {
            'node_modules/service-dog/lib/index.umd.js': ['ServiceDog']
          }
        })
      ]
    });
    jobs.push({
      input: join(lib, 'index.js'),
      output: [{ file: join(lib, 'index.cjs.js'), format: 'cjs' }],
      plugins: [
        resolve({ module: true, jail: lib }),
        autoExternal({
          packagePath: join(lib, 'package.json')
        })
      ]
    });
  } catch (err) {
    console.log(err);
  }
  return key;
});
export default jobs;
