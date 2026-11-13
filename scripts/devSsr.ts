import path from 'path';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import type { IncomingMessage, ServerResponse } from 'http';
import clientConfig from '../webpack.config.dev';
import { createServerConfig } from '../webpack.config.server';

type RenderFn = (
  req: IncomingMessage,
  res: ServerResponse,
  template: string,
  manifest: Record<string, string[]>,
  options?: { publicPath?: string }
) => void;

const serverConfig = createServerConfig('development');
const renderBundle = path.join(serverConfig.output!.path!, 'render.js');

// --- Server bundle: rebuilt in watch mode, re-required only after a rebuild ---
let cachedRender: RenderFn | undefined;
let serverReady: Promise<void>;
let resolveServerReady: () => void = () => {};
const resetServerReady = () => {
  serverReady = new Promise((resolve) => (resolveServerReady = resolve));
};
resetServerReady();

const serverCompiler = webpack(serverConfig);
serverCompiler.hooks.invalid.tap('devSsr', resetServerReady);
serverCompiler.watch({}, (err, stats) => {
  if (err) console.error(err);
  else if (stats?.hasErrors()) console.error(stats.toString('errors-only'));
  cachedRender = undefined;
  resolveServerReady();
});

const loadRender = (): RenderFn => {
  if (cachedRender) return cachedRender;
  // Drop render.js and its lazy() chunks so the new build is evaluated
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(serverConfig.output!.path!)) delete require.cache[file];
  }
  cachedRender = require(renderBundle).render as RenderFn;
  return cachedRender;
};

// --- Client bundle: webpack-dev-server (HMR) + SSR middleware ---
const clientCompiler = webpack(clientConfig);
const devServer = new WebpackDevServer(
  {
    ...clientConfig.devServer,
    port: process.env.PORT || clientConfig.devServer?.port,
    // Let every page request fall through to the SSR middleware
    historyApiFallback: false,
    devMiddleware: { ...clientConfig.devServer?.devMiddleware, index: false },
    static: { directory: path.resolve(__dirname, '../public'), serveIndex: false },
    setupMiddlewares: (middlewares, server) => {
      middlewares.push({
        name: 'ssr',
        middleware: (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
          server.middleware!.waitUntilValid(async () => {
            try {
              await serverReady;
              const fs = server.middleware!.context.outputFileSystem;
              const read = (file: string) =>
                String(fs.readFileSync!(path.join(clientCompiler.outputPath, file)));
              loadRender()(req, res, read('index.html'), JSON.parse(read('chunks-manifest.json')), {
                publicPath: process.env.PUBLIC_PATH || '/'
              });
            } catch (error) {
              next(error);
            }
          });
        }
      });
      return middlewares;
    }
  },
  clientCompiler
);

devServer.start();
