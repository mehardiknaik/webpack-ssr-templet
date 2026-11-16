import { createContext, use, type ComponentType } from 'react';
import { preload } from 'react-dom';

/**
 * Runtime for scripts/babel-plugin-lazy-chunk.js: not meant to be used by hand.
 * Write plain `lazy(() => import('...'))`; the plugin adds the chunk name and this wrapper.
 */

export interface SsrChunks {
  /** chunk name -> emitted JS/CSS files (dist/client/chunks-manifest.json) */
  manifest: Record<string, string[]>;
  /** Asset URL prefix, e.g. "/app/" */
  publicPath: string;
}

/** Server only (provided by entry-ssr); null on the client */
export const SsrChunksContext = createContext<SsrChunks | null>(null);

/**
 * Wraps a lazily loaded module's default export. During SSR the wrapper renders the
 * chunk's CSS as a React 19 stylesheet resource (precedence): React hoists and dedupes it
 * and holds back a streamed Suspense boundary until it has loaded, so the content never
 * shows unstyled. JS files are preloaded so hydration isn't delayed. On the client it
 * renders only the component.
 */
export function withChunk(chunk: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ default: Component }: { default: ComponentType<any> }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const WithChunk = (props: any) => {
      const ssr = use(SsrChunksContext);
      if (!ssr) return <Component {...props} />;

      // Files of the "app" entry are already in index.html (HtmlWebpackPlugin)
      const entryFiles = ssr.manifest.app || [];
      const files = (ssr.manifest[chunk] || []).filter((file) => !entryFiles.includes(file));
      files
        .filter((file) => file.endsWith('.js'))
        .forEach((file) => preload(ssr.publicPath + file, { as: 'script' }));

      return (
        <>
          {files
            .filter((file) => file.endsWith('.css'))
            .map((file) => (
              <link key={file} rel="stylesheet" href={ssr.publicPath + file} precedence="default" />
            ))}
          <Component {...props} />
        </>
      );
    };
    return { default: WithChunk };
  };
}
