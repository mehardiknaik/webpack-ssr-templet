import { DefinePlugin, Configuration as WebpackConfiguration } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import commonConfig from './webpack.config.common';
import { merge } from 'webpack-merge';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import pkg from './package.json';


process.env.BABEL_ENV = 'development';
interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: '[path][name].[hash:5][ext]'
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: '[path][name].[hash:5][ext]'
        }
      },
      {
        test: /\.module\.(css|s[ac]ss)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              modules: {
                namedExport: false,
                localIdentName: '[name]__[local]___[hash:5]',
                exportLocalsConvention: 'camelCase'
              }
            }
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ]
      },
      {
        test: /\.(css|s[ac]ss)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            }
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          }
        ],
        exclude: /\.module\.(css|scss)$/
      }
    ]
  },
  plugins: [
    new DefinePlugin({
      __DEV__: JSON.stringify(true),
      __PROD__: JSON.stringify(false),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(pkg.version)
    }),
    codeInspectorPlugin({
      bundler: 'webpack',
      // Root render call sites differ between client and server; skip them to keep SSR hydration in sync
      exclude: [/src[\\/]client[\\/]index\.tsx$/, /src[\\/]server[\\/]/]
    }),
  ],
  devtool: 'eval-source-map',
  devServer: {
    historyApiFallback: { index: `${process.env.PUBLIC_PATH || '/'}index.html` },
    port: 3000,
    open: true,
    hot: true
  }
};

export default merge<Partial<Configuration>>(commonConfig, config);
