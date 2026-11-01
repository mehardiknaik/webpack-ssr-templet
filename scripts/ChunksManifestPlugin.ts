import { Compiler, Compilation, WebpackPluginInstance } from 'webpack';

interface ChunksManifestPluginOptions {
  outputFileName?: string;
}

/**
 * Emits { [chunkName]: string[] } for every named chunk group (e.g. lazy pages
 * named with webpackChunkName). The SSR server uses it to add <link> tags for
 * the CSS/JS of the page being rendered, instead of shipping every page's CSS.
 */
class ChunksManifestPlugin implements WebpackPluginInstance {
  private outputFileName: string;

  constructor(options: ChunksManifestPluginOptions = {}) {
    this.outputFileName = options.outputFileName || 'chunks-manifest.json';
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap('ChunksManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ChunksManifestPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
        },
        () => {
          const manifest: Record<string, string[]> = {};

          compilation.namedChunkGroups.forEach((chunkGroup, name) => {
            manifest[name] = chunkGroup
              .getFiles()
              .filter((file: string) => /\.(js|css)$/.test(file) && !file.includes('.hot-update.'));
          });

          compilation.emitAsset(
            this.outputFileName,
            new compiler.webpack.sources.RawSource(JSON.stringify(manifest, null, 2))
          );
        }
      );
    });
  }
}

export default ChunksManifestPlugin;
