const { resolve } = require('path');
const baseDir = resolve(__dirname, '../../..');
const paths = require(resolve(baseDir, 'tsconfig.json')).compilerOptions.paths;

module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.tsx?$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        }
      }
    ]
  });
  config.resolve.extensions.push('.ts', '.tsx');
  config.resolve.alias = Object.keys(paths).reduce((store, key) => {
    store[key] = resolve(baseDir, paths[key][0]);
    return store;
  }, config.resolve.alias);
  return config;
};
