import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.xml':'application/xml',
  '.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const rules = new Map();
const rulesFile = await readFile(resolve(dist, '_headers'), 'utf8')
  .catch(() => { throw new Error('Execute npm run build antes de abrir a prévia.'); });
let route;
for (const line of rulesFile.split(/\r?\n/)) {
  if (line.startsWith('/')) {
    route = {};
    rules.set(line.trim(), route);
  } else if (/^\s+[\w-]+:/.test(line) && route) {
    const at = line.indexOf(':');
    route[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
}
createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {'Allow':'GET, HEAD'}).end(); return; }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch { res.writeHead(400).end(); return; }
  const headers = {'Cache-Control':'no-store', ...rules.get('/*'), ...rules.get(pathname)};
  const redirect = {'/privacidade.html':'/privacidade', '/index.html':'/'}[pathname];
  if (redirect) { res.writeHead(308, {...headers, 'Location':redirect}).end(); return; }

  try {
    const file = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname === '/privacidade' ? '/privacidade.html' : pathname));
    if (!file.startsWith(dist + sep) || !mime[extname(file)] || file === resolve(dist, '_headers')) throw new Error('Rota não encontrada.');
    const body = await readFile(file);
    res.writeHead(200, {...headers, 'Content-Type':mime[extname(file)]});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    const body = await readFile(resolve(dist, '404.html')).catch(() => 'Página não encontrada.');
    res.writeHead(404, {...headers, 'Content-Type':mime['.html']});
    res.end(req.method === 'HEAD' ? undefined : body);
  }
}).listen(port, '127.0.0.1', () => console.log(`Caso Grave — http://127.0.0.1:${port}/`));
