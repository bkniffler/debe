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

// the default task
Sparky.task('default', () => {
  // setup the producer with common settings
  const fuse = FuseBox.init({
    homeDir: resolve(__dirname, '../..'),
    output: `${OUTPUT_DIR}/$name.js`,
    // log: isProduction,
    cache: false,
    // sourceMaps: true,
    tsConfig: 'tsconfig.json',
    useTypescriptCompiler: true
    // useJsNext: true
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
    .instructions('> example/todo/server/index.ts')
    .plugin(WebIndexPlugin({ template: './src/index.html' }))
    .plugin(CSSPlugin({ inject: true }))
    .plugin(
      ReplacePlugin({
        'process.env.NODE_ENV': `${process.env.NODE_ENV}`
      })
    );
  // packages.forEach(name => bundle.alias(`debe-${name}`, `~/modules/${name}`));

  // and watch & hot reload unless we're bundling for production
  if (!isProduction) {
    server.watch(
      p =>
        p.indexOf(`src/`) !== -1 ||
        p.indexOf(resolve(__dirname, 'server')) === 0
    );
    browser.watch(
      p =>
        p.indexOf(`src/`) !== -1 || p.indexOf(resolve(__dirname, 'src')) === 0
    );
    browser.hmr();
  }

  // when we are finished bundling...
  return fuse.run().then(() => {
    if (!isProduction) {
      // startup electron
      spawn('npm', ['run', 'watch'], {
        shell: true,
        stdio: 'inherit'
      });
    }
  });
});
