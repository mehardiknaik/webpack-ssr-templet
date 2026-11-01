import { Transform } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter, matchRoutes } from 'react-router';
import Root from '@/client/Root';
import { dehydrate, type ApiCache } from '@/client/api/ApiCache';
import routes, { basename, type RouteHandle } from '@/client/routes';

/** chunk name -> emitted JS/CSS files (dist/client/chunks-manifest.json) */
export type ChunksManifest = Record<string, string[]>;

const PLACEHOLDER = '<!--html-placeholder-->';
const PUBLIC_PATH = process.env.PUBLIC_PATH || '/';
const ABORT_DELAY = 10000;
// Crawlers / link-preview bots get the full HTML in one go instead of a stream
const BOT_USER_AGENT =
    /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|slack|discord|linkedin|lighthouse|headless/i;

/**
 * <link> tags for the lazy page chunks of the matched routes: stylesheet for CSS
 * (styled on first paint, without shipping other pages' CSS) and preload for JS
 * (chunk downloads in parallel with the entry, so hydration isn't delayed).
 */
function chunkLinks(chunks: string[], manifest: ChunksManifest) {
    // Files of the "app" entry are already in index.html (HtmlWebpackPlugin)
    const entryFiles = new Set(manifest.app || []);
    const files = new Set(chunks.flatMap((chunk) => manifest[chunk] || []));
    return [...files]
        .filter((file) => !entryFiles.has(file))
        .map((file) =>
            file.endsWith('.css')
                ? `<link rel="stylesheet" href="${PUBLIC_PATH}${file}">`
                : `<link rel="preload" as="script" href="${PUBLIC_PATH}${file}">`
        )
        .join('');
}

/**
 * Streams the React app into the HTML template at PLACEHOLDER.
 * Falls back to the plain template (client-side render) if the shell fails.
 */
export function render(
    req: IncomingMessage,
    res: ServerResponse,
    template: string,
    manifest: ChunksManifest = {}
) {
    const url = req.url || '/';
    let didError = false;

    // Catch-all "*" route means no page matched
    const matches = matchRoutes(routes, url, basename);
    const notFound = !matches || matches[matches.length - 1].route.path === '*';

    const chunks = (matches || [])
        .map(({ route }) => (route.handle as RouteHandle | undefined)?.chunk)
        .filter((chunk): chunk is string => !!chunk);
    const [head, tail] = template
        .replace('</head>', `${chunkLinks(chunks, manifest)}</head>`)
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
            res.end(template);
        },
        onError(error) {
            didError = true;
            console.error(error);
        }
    });

    setTimeout(abort, ABORT_DELAY);
}
