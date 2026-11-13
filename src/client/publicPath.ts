/**
 * Must be the first import of the client entry: sets webpack's public path before
 * any lazy chunk or asset URL is resolved.
 *
 * - SSR: the renderer injects window.__PUBLIC_PATH__ (e.g. "/app/") and it wins.
 * - Otherwise: output.publicPath is "auto", so webpack derives it from the entry
 *   <script> src.
 */
if (typeof window !== 'undefined' && window.__PUBLIC_PATH__) {
  __webpack_public_path__ = window.__PUBLIC_PATH__;
}

export {};
