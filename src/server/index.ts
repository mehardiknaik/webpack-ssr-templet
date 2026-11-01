import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { render } from '@/server/entry-ssr';

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIR = path.resolve(__dirname, '../client');

const template = fs.readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf-8');
const manifest = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, 'chunks-manifest.json'), 'utf-8'));
const app = express();

// Serve built assets; index: false so "/" goes through SSR
app.use(process.env.PUBLIC_PATH || '/', express.static(CLIENT_DIR, { index: false }));

app.use((req, res) => {
  render(req, res, template, manifest);
});

app.listen(PORT, () => {
  console.log(`SSR server running at http://localhost:${PORT}`);
});
