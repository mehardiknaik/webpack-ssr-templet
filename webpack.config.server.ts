import path from 'path';
import { Configuration, DefinePlugin, ProvidePlugin } from 'webpack';
import DotenvWebpackPlugin from 'dotenv-webpack';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import pkg from './package.json';
import './scripts/loadEnv';
import TerserPlugin from 'terser-webpack-plugin';

type Mode = 'development' | 'production';

/**
 * Server (Node) bundle used for SSR.
 * Asset filenames and CSS module class names MUST match the client
 * configs (webpack.config.dev.ts / webpack.config.prod.ts) so hydration matches.
 */
export const createServerConfig = (mode: Mode): Configuration => {
  const isDev = mode === 'development';
  const SEPERATE_FOLDERS = process.env.SEPERATE_FOLDERS === 'true';
  const assetName = (folder: string) =>
    isDev ? '[path][name].[hash:5][ext]' : `${SEPERATE_FOLDERS ? folder : ''}[name].[hash:5][ext]`;

  return {
    mode,
    target: 'node',
    entry: {
      // Exports render() — used by the dev SSR server (scripts/devSsr.ts)
      render: './src/server/entry-ssr.tsx',
      // Standalone production server
      server: './src/server/index.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist/server'),
      filename: '[name].js',
      publicPath: process.env.PUBLIC_PATH || '/',
      library: { type: 'commonjs2' },
      clean: true
    },
    // Loaded from node_modules at runtime (uses dynamic requires)
    externals: { express: 'commonjs express' },
    node: {
      __dirname: false,
      __filename: false
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx|mjs|cjs)$/i,
          use: 'babel-loader'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: { filename: assetName('fonts/'), emit: false }
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
          generator: { filename: assetName('images/'), emit: false }
        },
        {
          test: /\.module\.(css|scss)$/,
          use: [
            {
              loader: 'css-loader',
              options: {
                modules: {
                  namedExport: false,
                  exportOnlyLocals: true,
                  localIdentName: isDev ? '[name]__[local]___[hash:5]' : '[hash:5]',
                  exportLocalsConvention: 'camelCase'
                }
              }
            }
          ]
        },
        {
          // Global CSS is injected by the client bundle; server only needs a no-op module
          test: /\.(css|scss)$/,
          use: [
            {
              loader: 'css-loader',
              options: { modules: { mode: 'global', exportOnlyLocals: true } }
            }
          ],
          exclude: /\.module\.(css|scss)$/
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    optimization: {
      splitChunks: false,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    plugins: [
      new ProvidePlugin({
        React: 'react'
      }),
      new DotenvWebpackPlugin({
        defaults: true,
        allowEmptyValues: true,
        safe: true,
        // Keep real process.env (PORT, etc.) available at runtime on the server
        ignoreStub: true
      }),
      new DefinePlugin({
        __DEV__: JSON.stringify(isDev),
        __PROD__: JSON.stringify(!isDev),
        __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        __VERSION__: JSON.stringify(pkg.version)
      }),
      // Same data-insp-* attributes as the dev client, otherwise hydration mismatches
      isDev &&
      codeInspectorPlugin({
        bundler: 'webpack',
        exclude: [/src[\\/]client[\\/]index\.tsx$/, /src[\\/]server[\\/]/]
      })
    ],
    devtool: isDev ? 'source-map' : false,
    stats: 'errors-warnings'
  };
};

export default (_env: unknown, argv: { mode?: Mode }) =>
  createServerConfig(argv.mode ?? 'production');
