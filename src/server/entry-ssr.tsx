import { Transform } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter, matchRoutes } from 'react-router';
import Root from '@/client/Root';
import { dehydrate, type ApiCache } from '@/client/api/ApiCache';
import routes, { getBasename, type RouteHandle } from '@/client/routes';

/** chunk name -> emitted JS/CSS files (dist/client/chunks-manifest.json) */
export type ChunksManifest = Record<string, string[]>;

export interface RenderOptions {
    /**
     * Where the app and its assets are served, e.g. "/app/". Used for asset URLs,
     * lazy chunks (__webpack_public_path__) and the router basename.
     * Defaults to PUBLIC_PATH from .env.
     */
    publicPath?: string;
}

const PLACEHOLDER = '<!--html-placeholder-->';
// Prefix the HTML template's asset URLs were built with (HtmlWebpackPlugin publicPath)
const BUILD_PUBLIC_PATH = process.env.PUBLIC_PATH || '/';
const ABORT_DELAY = 10000;
// Crawlers / link-preview bots get the full HTML in one go instead of a stream
const BOT_USER_AGENT =
    /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|slack|discord|linkedin|lighthouse|headless/i;

/**
 * <link> tags for the lazy page chunks of the matched routes: stylesheet for CSS
 * (styled on first paint, without shipping other pages' CSS) and preload for JS
 * (chunk downloads in parallel with the entry, so hydration isn't delayed).
 */
function chunkLinks(chunks: string[], manifest: ChunksManifest, publicPath: string) {
    // Files of the "app" entry are already in index.html (HtmlWebpackPlugin)
    const entryFiles = new Set(manifest.app || []);
    const files = new Set(chunks.flatMap((chunk) => manifest[chunk] || []));
    return [...files]
        .filter((file) => !entryFiles.has(file))
        .map((file) =>
            file.endsWith('.css')
                ? `<link rel="stylesheet" href="${publicPath}${file}">`
                : `<link rel="preload" as="script" href="${publicPath}${file}">`
        )
        .join('');
}

/** "app" -> "/app/", "https://cdn.x/app" -> "https://cdn.x/app/" */
function normalizePublicPath(publicPath: string) {
    if (/^([a-z][a-z\d+.-]*:)?\/\//i.test(publicPath)) return publicPath.replace(/\/?$/, '/');
    return `/${publicPath}/`.replace(/\/{2,}/g, '/');
}

/**
 * Moves the template's src/href URLs from the build-time prefix to publicPath and
 * exposes publicPath to the client (read by src/client/publicPath.ts).
 */
function applyPublicPath(html: string, publicPath: string) {
    let result = html;
    if (publicPath !== BUILD_PUBLIC_PATH) {
        const escaped = BUILD_PUBLIC_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // (?!\/) skips protocol-relative URLs ("//cdn...") when the build prefix is "/"
        const attr = new RegExp(`(\\s(?:src|href)=["'])${escaped}(?!\\/)`, 'gi');
        result = result.replace(attr, `$1${publicPath}`);
    }
    const value = JSON.stringify(publicPath).replace(/</g, '\\u003c');
    return result.replace(/<head[^>]*>/i, `$&<script>window.__PUBLIC_PATH__=${value}</script>`);
}

function setSsr(html: string) {
    return html.replace(
        /<html([^>]*)>/i,
        (match, attributes) => {
            if (/data-render-mode=/i.test(attributes)) {
                return match.replace(
                    /data-render-mode=["'][^"']*["']/i,
                    'data-render-mode="ssr"'
                );
            }
            return `<html${attributes} data-render-mode="ssr">`;
        }
    );
}

/**
 * Streams the React app into the HTML template at PLACEHOLDER.
 * Falls back to the plain template (client-side render) if the shell fails.
 */
export function render(
    req: IncomingMessage,
    res: ServerResponse,
    template: string,
    manifest: ChunksManifest = {},
    { publicPath: rawPublicPath = BUILD_PUBLIC_PATH }: RenderOptions = {}
) {
    const url = req.url || '/';
    let didError = false;
    const publicPath = normalizePublicPath(rawPublicPath);
    const basename = getBasename(publicPath);
    // Asset imports (images, fonts) rendered on the server must match the client's URLs.
    // Module-global: every request served by one process should use the same publicPath.
    __webpack_public_path__ = publicPath;

    // Catch-all "*" route means no page matched
    const matches = matchRoutes(routes, url, basename);
    const notFound = !matches || matches[matches.length - 1].route.path === '*';

    const chunks = (matches || [])
        .map(({ route }) => (route.handle as RouteHandle | undefined)?.chunk)
        .filter((chunk): chunk is string => !!chunk);
    const [head, tail] = applyPublicPath(setSsr(template), publicPath)
        .replace('</head>', `${chunkLinks(chunks, manifest, publicPath)}</head>`)
        .split(PLACEHOLDER);

    // Filled by useApi() during render; resolved entries are streamed to the client
    const apiCache: ApiCache = new Map();
    const sentKeys = new Set<string>();

    const app = (
        <StaticRouter location={url} basename={basename}>
            <Root apiCache={apiCache} />
        </StaticRouter>
    );

    // Browsers: onShellReady streams the shell (with Suspense fallbacks) now, resolved boundaries follow.
    // Bots: onAllReady waits for every Suspense boundary, so the HTML has full content inline.
    const isBot = BOT_USER_AGENT.test(req.headers['user-agent'] || '');
    // const isBot = true
    const readyEvent = isBot ? 'onAllReady' : 'onShellReady';

    const { pipe, abort } = renderToPipeableStream(app, {
        [readyEvent]() {
            res.statusCode = didError ? 500 : notFound ? 404 : 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.write(head);

            // React may split one write batch across chunks, so data <script>s only go
            // between batches. They go before the next batch (the boundaries that use the
            // data), never at the start of the shell, so they don't precede the app markup.
            let betweenBatches = false;
            const transform = new Transform({
                transform(chunk, _encoding, callback) {
                    if (betweenBatches) {
                        betweenBatches = false;
                        const scripts = dehydrate(apiCache, sentKeys);
                        if (scripts) this.push(scripts);
                    }
                    callback(null, chunk);
                },
                flush(callback) {
                    this.push(dehydrate(apiCache, sentKeys) + tail);
                    callback();
                }
            });
            // React calls destination.flush() after each write batch
            Object.assign(transform, {
                flush() {
                    betweenBatches = true;
                }
            });
            transform.pipe(res);
            pipe(transform);
        },
        onShellError(error) {
            console.error(error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(applyPublicPath(template, publicPath));
        },
        onError(error) {
            didError = true;
            console.error(error);
        }
    });

    setTimeout(abort, ABORT_DELAY);
}
