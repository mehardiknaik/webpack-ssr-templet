/**
 * Babel plugin: makes plain `lazy(() => import('...'))` SSR-aware, so source code needs
 * no chunk names or wrappers (similar to what Next.js's compiler does for next/dynamic).
 *
 *   lazy(() => import('@/client/components/User'))
 * becomes
 *   lazy(() => import(/* webpackChunkName: "components-User" *\/ '@/client/components/User')
 *     .then(_withChunk('components-User')))
 *
 * - The chunk name is derived from the imported file's path (relative to src/client), so the
 *   client and server builds produce the same name; an existing webpackChunkName is kept.
 * - withChunk (src/client/util/withChunk.tsx) renders the chunk's CSS <link> during SSR,
 *   using chunks-manifest.json, so streamed content is styled before it is shown.
 */
const path = require('path');
const { addNamed } = require('@babel/helper-module-imports');

const SRC_DIR = path.resolve(__dirname, '../src');
const CLIENT_DIR = path.join(SRC_DIR, 'client');
const RUNTIME = '@/client/util/withChunk';
const CHUNK_NAME_RE = /webpackChunkName:\s*["']([^"']+)["']/;

function chunkNameFor(specifier, filename) {
  let file;
  if (specifier.startsWith('@/')) file = path.join(SRC_DIR, specifier.slice(2));
  else if (specifier.startsWith('.') && filename) file = path.resolve(path.dirname(filename), specifier);
  else return specifier.replace(/[^\w]+/g, '-');

  const base = file.startsWith(CLIENT_DIR + path.sep) ? CLIENT_DIR : SRC_DIR;
  return path
    .relative(base, file)
    .replace(/\.[jt]sx?$/, '')
    .replace(/[\\/]index$/, '')
    .replace(/[^\w]+/g, '-');
}

/** `lazy` imported from "react", or `React.lazy` */
function isReactLazy(callee, scope) {
  if (callee.type === 'MemberExpression') {
    return (
      callee.object.type === 'Identifier' &&
      callee.object.name === 'React' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'lazy'
    );
  }
  if (callee.type !== 'Identifier') return false;
  const binding = scope.getBinding(callee.name);
  if (!binding || binding.kind !== 'module') return false;
  const { node, parent } = binding.path;
  return (
    parent.source.value === 'react' &&
    node.type === 'ImportSpecifier' &&
    (node.imported.name || node.imported.value) === 'lazy'
  );
}

/** The `import('...')` call returned by the loader function, if any */
function dynamicImportOf(loader) {
  if (loader.type !== 'ArrowFunctionExpression' && loader.type !== 'FunctionExpression') return null;
  let body = loader.body;
  if (body.type === 'BlockStatement') {
    const ret = body.body.length === 1 && body.body[0];
    if (!ret || ret.type !== 'ReturnStatement' || !ret.argument) return null;
    body = ret.argument;
  }
  if (body.type === 'ImportExpression' && body.source.type === 'StringLiteral') {
    return { call: body, source: body.source };
  }
  if (
    body.type === 'CallExpression' &&
    body.callee.type === 'Import' &&
    body.arguments[0] &&
    body.arguments[0].type === 'StringLiteral'
  ) {
    return { call: body, source: body.arguments[0] };
  }
  return null;
}

module.exports = function lazyChunkPlugin({ types: t }) {
  return {
    name: 'lazy-chunk',
    visitor: {
      CallExpression(callPath, state) {
        const { node } = callPath;
        if (!isReactLazy(node.callee, callPath.scope) || !node.arguments[0]) return;
        const loader = node.arguments[0];
        const found = dynamicImportOf(loader);
        if (!found) return;

        const { call, source } = found;
        const comments = source.leadingComments || [];
        const existing = comments.map((c) => CHUNK_NAME_RE.exec(c.value)).find(Boolean);
        const chunk = existing ? existing[1] : chunkNameFor(source.value, state.filename);
        if (!existing) t.addComment(source, 'leading', ` webpackChunkName: "${chunk}" `);

        if (!state.withChunk) state.withChunk = addNamed(callPath, 'withChunk', RUNTIME);
        const wrapped = t.callExpression(t.memberExpression(call, t.identifier('then')), [
          t.callExpression(t.cloneNode(state.withChunk), [t.stringLiteral(chunk)])
        ]);

        if (loader.body === call) loader.body = wrapped;
        else loader.body.body[0].argument = wrapped;
      }
    }
  };
};
