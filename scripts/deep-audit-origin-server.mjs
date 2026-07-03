import http from 'node:http';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const ttlMs = Number(process.env.TTL_MS || 60_000);

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end('<!doctype html><title>deep audit cleanup</title><main>deep audit cleanup</main>');
});

server.listen(port, host, () => {
  console.log(`deep-audit-origin-server ready: http://${host}:${port}/`);
});

setTimeout(() => {
  server.close(() => process.exit(0));
}, ttlMs).unref();
