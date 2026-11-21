import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeMiddleware } from './runtime-middleware.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const index = resolve(dist, 'index.html');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
]);

try {
  const middleware = runtimeMiddleware();
  if (!(await stat(index).catch(() => null))?.isFile()) {
    throw new Error('Production assets are missing. Run npm run build first.');
  }
  const port = Number(process.env.CARTOGRAPH_WEB_PORT ?? 5173);
  const server = createServer((request, response) => {
    function fail(status) {
      response.writeHead(status).end();
    }

    void Promise.resolve(middleware(request, response, async () => {
      if (!['GET', 'HEAD'].includes(request.method)) return fail(405);
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(dist, `.${path}`);
      if (file !== resolve(dist) && !file.startsWith(dist.endsWith(sep) ? dist : dist + sep)) return fail(404);
      if (!(await stat(file).catch(() => null))?.isFile()) {
        if (path.startsWith('/assets/') || path.startsWith('/api/')) return fail(404);
        file = index;
      }
      response.writeHead(200, {
        'Content-Type': mime.get(extname(file)) ?? 'application/octet-stream',
        'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      if (request.method === 'HEAD') return response.end();
      const stream = createReadStream(file);
      response.once('close', () => stream.destroy());
      stream.once('error', () => response.destroy());
      stream.pipe(response);
    })).catch(() => fail(400));
  });
  server.listen(port, '127.0.0.1', () => console.log(`Cartograph listening at http://127.0.0.1:${port}`));
} catch (error) {
  console.error(`[Cartograph] ${error.message}`);
  process.exitCode = 1;
}
