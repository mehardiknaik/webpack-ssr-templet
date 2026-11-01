import ts from 'typescript';
import fs from 'fs';
import { Compiler, Compilation, WebpackPluginInstance } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

interface ConfigWebpackPluginOptions {
  input: string;
  outputFileName?: string;
}

class ConfigWebpackPlugin implements WebpackPluginInstance {
  private input: string;
  private outputFileName: string;

  constructor(options: ConfigWebpackPluginOptions) {
    this.input = options.input;
    this.outputFileName = options.outputFileName || 'config.js';
  }

  apply(compiler: Compiler) {
    const isDev = compiler.options.mode === 'development';
    if (isDev) {
      compiler.hooks.afterCompile.tap('ConfigWebpackPlugin', (compilation) => {
        compilation.fileDependencies.add(this.input);
      });
    }

    compiler.hooks.thisCompilation.tap('ConfigWebpackPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'ConfigWebpackPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
        },
        async () => {
          const tsCode = fs.readFileSync(this.input, 'utf-8');
          const result = ts.transpileModule(tsCode, {
            compilerOptions: {
              module: ts.ModuleKind.None,
              target: ts.ScriptTarget.ES5
            }
          });

          const fileName = this.outputFileName;

          compilation.emitAsset(
            fileName,
            new compiler.webpack.sources.RawSource(result.outputText)
          );

          // Store injected config script on HtmlWebpackPlugin instance
          const htmlPlugin = compiler.options.plugins.find(
            (p) => p instanceof HtmlWebpackPlugin
          ) as HtmlWebpackPlugin | undefined;

          if (htmlPlugin) {
            (htmlPlugin as any).userOptions.injectConfigScript = fileName;
          }
        }
      );
    });

    compiler.hooks.compilation.tap('ConfigWebpackPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync(
        'ConfigWebpackPlugin',
        (data, cb) => {
          const injectedScript = compiler.options.plugins.find(
            (plugin) => plugin instanceof HtmlWebpackPlugin
          )?.userOptions?.injectConfigScript;

          if (injectedScript) {
            const publicPath = compiler.options.output.publicPath;
            const prefix = typeof publicPath === 'string' && publicPath !== 'auto' ? publicPath : '';

            data.headTags.unshift({
              tagName: 'script',
              voidTag: false,
              attributes: { src: `${prefix}${injectedScript}` },
              meta: { plugin: 'ConfigWebpackPlugin' }
            });
          }

          cb(null, data);
        }
      );
    });
  }
}

export default ConfigWebpackPlugin;
