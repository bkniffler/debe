import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import pkg from './package.json';

/*const umd = {
  plugins: [
    resolve({
      browser: true
    }),
    commonjs({
      namedExports: {
        '../../node_modules/service-dog/lib/index.umd.js': ['ServiceDog']
      }
    })
  ]
};*/
export default [
  {
    input: './lib/index.js',
    output: {
      name: pkg.name
        .replace('@', '')
        .replace(/\/([a-z])/g, g => g[1].toUpperCase()),
      file: './lib/core.umd.js',
      format: 'umd'
    },
    plugins: [
      resolve({ browser: true }),
      commonjs({
        namedExports: {
          '../node_modules/service-dog/lib/index.umd.js': ['ServiceDog']
        }
      })
    ]
  },
  {
    input: './lib/db/memory/index.js',
    output: {
      name: pkg.name
        .replace('@', '')
        .replace(/\/([a-z])/g, g => g[1].toUpperCase()),
      file: './lib/memory.umd.js',
      format: 'umd'
    },
    plugins: [resolve({ browser: true }), commonjs({})]
  },
  {
    input: './lib/extensions/sync/index.js',
    output: {
      name: pkg.name
        .replace('@', '')
        .replace(/\/([a-z])/g, g => g[1].toUpperCase()),
      file: './lib/sync.umd.js',
      format: 'umd'
    },
    plugins: [resolve({ browser: true }), commonjs({})]
  },
  {
    input: './lib/extensions/automerge/index.js',
    output: {
      name: pkg.name
        .replace('@', '')
        .replace(/\/([a-z])/g, g => g[1].toUpperCase()),
      file: './lib/automerge.umd.js',
      format: 'umd'
    },
    plugins: [resolve({ browser: true }), commonjs({})]
  },
  {
    input: './lib/index.js',
    output: [{ file: './lib/index.cjs.js', format: 'cjs' }],
    plugins: [resolve(), autoExternal()]
  }
];
