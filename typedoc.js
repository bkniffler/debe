module.exports = {
  out: './typedocs',
  tsconfig: './packages/tsconfig.json',

  // readme: 'none',
  // includes: ['./packages/core'],
  exclude: ['**/*.test.ts'],

  mode: 'file',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true
};

// excludePrivate --excludeProtected --exclude !**/*/src --module commonjs --target es5 --out typedoc packages
