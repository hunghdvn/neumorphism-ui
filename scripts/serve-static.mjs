// Tiny static server for the visual-regression page. Local development only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const mounts = [
  ['/tokens/', 'packages/tokens'],
  ['/elements/', 'packages/elements'],
  ['/mockup/', 'docs/superpowers/specs/assets'],
  ['/', 'e2e/visual'],
];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const port = Number(process.env.PORT ?? 4173);

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const [prefix, dir] = mounts.find(([mount]) => path.startsWith(mount));
  const base = join(root, dir);
  const file = normalize(join(base, path.slice(prefix.length)));
  if (file !== base && !file.startsWith(base + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`static server on http://localhost:${port}`));
