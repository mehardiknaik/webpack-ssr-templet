import { Configuration, ProvidePlugin, WebpackPluginInstance } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import DotenvWebpackPlugin from 'dotenv-webpack';
import ProgressBarPlugin from 'progress-bar-webpack-plugin';
import ConfigWebpackPlugin from './scripts/ConfigWebpackPlugin';
import ChunksManifestPlugin from './scripts/ChunksManifestPlugin';
import path from 'path';
import './scripts/loadEnv';

const config: Configuration = {
  entry: { app: './src/client/index.tsx' },
  output: {
    // // Absolute so assets resolve on nested routes (e.g. /users/1)
    publicPath: process.env.PUBLIC_PATH || '/'
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx|mjs|cjs)$/i,
        use: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './src'),

    }
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 10000,
      cacheGroups: {
        common: {
          chunks: 'all',
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
          enforce: true
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          name(module) {
            const match = module.context?.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            );

            const packageName = match?.[1]?.replace('@', '');

            return `npm.${packageName}`;
          }
        }
      }
    },
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: true,
      // Keep comments: SSR injects markup at <!--html-placeholder-->
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: false,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      }
    }),
    new ProvidePlugin({
      React: 'react'
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'public' }]
    }),
    new DotenvWebpackPlugin({
      defaults: true,
      allowEmptyValues: true,
      safe: true,
      systemvars: true
    }),
    new ProgressBarPlugin() as WebpackPluginInstance,
    new ChunksManifestPlugin(),
    new ConfigWebpackPlugin({
      input: './src/client/config.ts',
      outputFileName: 'config.js'
    })
  ]
};

export default config;
