import {
  FuseBox,
  Sparky,
  ReplacePlugin,
  JSONPlugin,
  WebIndexPlugin,
  CSSPlugin
} from 'fuse-box';
import { resolve } from 'path';
import { spawn } from 'child_process';

const DEV_PORT = 4455;
const OUTPUT_DIR = 'lib';

// are we running in production mode?
const isProduction = process.env.NODE_ENV === 'production';

const base = resolve(__dirname, '../..');

// the default task
Sparky.task('default', () => {
  const fuse = FuseBox.init({
    homeDir: base,
    output: `${OUTPUT_DIR}/$name.js`,
    cache: false,
    tsConfig: 'tsconfig.base.json'
  });

  // start the hot reload server
  if (!isProduction) {
    fuse.dev({
      fallback: '../src/index.html',
      port: DEV_PORT
    });
  }

  // bundle the electron renderer code
  const browser = fuse
    .bundle('browser')
    .target('browser@esnext')
    .instructions('> example/todo/src/index.tsx')
    .plugin(JSONPlugin())
    .plugin(WebIndexPlugin({ template: './src/index.html' }))
    .plugin(CSSPlugin({ inject: true }))
    .plugin(
      ReplacePlugin({
        'process.env.NODE_ENV': `${process.env.NODE_ENV}`
      })
    );

  const server = fuse
    .bundle('server')
    .target('server@esnext')
    .instructions('> example/todo/server/index.ts -better-sqlite3');

  if (!isProduction) {
    server.watch(
      p =>
        p.indexOf(`/debe/src/`) !== -1 ||
        p.indexOf(resolve(__dirname, 'server')) === 0
    );
    browser.watch(
      p =>
        p.indexOf(`/debe/src/`) !== -1 ||
        p.indexOf(resolve(__dirname, 'src')) === 0
    );
    browser.hmr();
  }

  // when we are finished bundling...
  return fuse.run().then(() => {
    if (!isProduction) {
      spawn('npm', ['run', 'watch'], {
        shell: true,
        stdio: 'inherit'
      });
    }
  });
});
