import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import pkg from './package.json';

export default [
  {
    input: pkg.module,
    output: {
      name: pkg.name
        .replace('@', '')
        .replace(/\/([a-z])/g, g => g[1].toUpperCase()),
      file: pkg.browser,
      format: 'umd'
    },
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
  },
  {
    input: pkg.module,
    output: [{ file: pkg.main, format: 'cjs' }],
    plugins: [resolve(), autoExternal()]
  }
];
