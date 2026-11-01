import path from 'path';
import { Configuration, DefinePlugin } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import merge from 'webpack-merge';
import commonConfig from './webpack.config.common';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import WebpackObfuscator from 'webpack-obfuscator';
import pkg from './package.json';
import './scripts/loadEnv';

process.env.BABEL_ENV = 'production';
const SEPERATE_FOLDERS = process.env.SEPERATE_FOLDERS === 'true' ? true : false;
const WEBPACK_OBFUSCATOR = process.env.WEBPACK_OBFUSCATOR === 'true' ? true : false;

const config: Configuration = {
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist/client'),
    filename: '[name].[chunkhash].js',
    chunkFilename: `${SEPERATE_FOLDERS ? 'chunk/' : ''}[name].[chunkhash].js`,
    hashDigestLength: 7,
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: `${SEPERATE_FOLDERS ? 'fonts/' : ''}[name].[hash:5][ext]`
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: `${SEPERATE_FOLDERS ? 'images/' : ''}[name].[hash:5][ext]`
        }
      },
      {
        test: /\.module\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                namedExport: false,
                localIdentName: '[hash:5]',
                exportLocalsConvention: 'camelCase'
              }
            }
          }
        ]
      },
      {
        test: /\.(css|scss)$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
        exclude: /\.module\.(css|scss)$/
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        exclude: [/config\.js$/],
        extractComments: false,
        terserOptions: {
          ecma: 5,
          compress: {
            ecma: 5,
            passes: 2,
            drop_debugger: true,
            dead_code: true,
            unused: true,
            keep_fargs: false,
            hoist_props: true,
            collapse_vars: true,
            reduce_vars: true
          },
          mangle: true,
          format: {
            comments: false
          }
        }
      }),
      new CssMinimizerPlugin()
    ],
    usedExports: true,
    sideEffects: true,
    providedExports: true,
    innerGraph: true,
    concatenateModules: true
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[chunkhash].css',
      chunkFilename: `${SEPERATE_FOLDERS ? 'css/' : ''}[name].[chunkhash].css`
    }),
    new DefinePlugin({
      __DEV__: JSON.stringify(false),
      __PROD__: JSON.stringify(true),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(pkg.version),
      __REACT_DEVTOOLS_GLOBAL_HOOK__: JSON.stringify(false)
    }),
    new BundleAnalyzerPlugin({
      openAnalyzer: false,
      analyzerMode: 'static'
    }),
    WEBPACK_OBFUSCATOR && new WebpackObfuscator({
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.4,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.2,
      identifierNamesGenerator: 'hexadecimal',
      rotateStringArray: true,
      selfDefending: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
      stringArrayEncoding: ['rc4']
    }, ['npm.*.js', 'config.js'])
  ]
};

export default merge<Partial<Configuration>>(commonConfig, config);
