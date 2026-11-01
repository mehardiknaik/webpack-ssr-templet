/**
 * Module declaration for image files.
 * Allows importing images as modules.
 */
declare module '*.png';
declare module '*.svg';
declare module '*.jpeg';
declare module '*.jpg';

/**
 * Global variable.
 * Public path for Webpack.
 * This is set by Webpack at build time.
 */
declare const __webpack_public_path__: string;

/**
 * Global variable.
 * True when in development mode.
 */
declare const __DEV__: boolean;

/**
 * Global variable.
 * True when in production mode.
 */
declare const __PROD__: boolean;

/**
 * Global variable.
 * Build date in ISO format.
 */
declare const __BUILD_DATE__: string;

/**
 * Global variable.
 * Application version from package.json.
 */
declare const __VERSION__: string;

interface Window {
  /**
   * Global environment variables.
   * This object is access from window context.
   */
  __env: {
    /**
     * Application name.
     */
    NAME?: string;
  };

  /**
   * API responses fetched during SSR, keyed like useApi().
   * Written by the server's streamed <script> tags, read on hydration.
   */
  __API_DATA__?: Record<string, unknown>;
}
