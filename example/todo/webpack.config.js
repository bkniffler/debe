const { resolve } = require('path');
const merge = require('webpack-merge');
const baseDir = resolve(__dirname, '../..');
const paths = require(resolve(baseDir, 'tsconfig.json')).compilerOptions.paths;
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin'); // Ding

const base = {
  mode: 'development',
  optimization: {
    minimize: false
  },
  output: {
    path: resolve(__dirname, 'lib')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  resolve: {
    alias: Object.keys(paths).reduce((store, key) => {
      store[key] = resolve(baseDir, paths[key][0]);
      return store;
    }, {})
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
};

if (process.argv.indexOf('--server') === -1) {
  module.exports = merge(base, {
    target: 'web',
    entry: './src/index.tsx',
    output: {
      filename: 'browser.js'
    },
    devServer: {
      contentBase: resolve(__dirname, 'lib'),
      compress: true,
      port: 9000
    }
  });
} else {
  module.exports = merge(base, {
    node: {
      __dirname: false
    },
    target: 'node',
    entry: './server/index.ts',
    output: {
      filename: 'server.js'
    },
    plugins: [
      new NodemonPlugin({
        watch: resolve(__dirname, 'lib/server.js')
      })
    ],
    externals: [
      nodeExternals({
        modulesDir: '../../node_modules',
        whitelist: [/^debe/, /^debe-/]
      })
    ]
  });
}
