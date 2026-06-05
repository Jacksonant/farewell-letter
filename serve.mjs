// Tiny local server for previewing. Web Crypto needs a "secure context",
// which http://localhost counts as (file:// does NOT). Run:  node serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = 5173, ROOT = process.cwd();
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.css':'text/css' };

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control':'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end('not found'); }
}).listen(PORT, () => console.log(`▶ http://localhost:${PORT}  (Ctrl+C to stop)`));
