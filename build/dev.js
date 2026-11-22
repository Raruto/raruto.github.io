const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { buildSite } = require('./build');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.resolve(process.env.SITE_OUTPUT_DIR || path.join(ROOT, 'static'));
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8080;
const SITE_URL = `http://${HOST}:${PORT}`;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

buildSite({ outputDir: OUTPUT, siteUrl: SITE_URL });

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, SITE_URL).pathname).replace(/^[/\\]+/, '');
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  let file = path.resolve(OUTPUT, pathname);
  if (file !== OUTPUT && !file.startsWith(`${OUTPUT}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.stat(file, (error, stats) => {
    if (error || (!stats.isFile() && !stats.isDirectory())) {
      response.writeHead(404).end('Not found');
      return;
    }
    if (stats.isDirectory()) file = path.join(file, 'index.html');
    fs.stat(file, (indexError, indexStats) => {
      if (indexError || !indexStats.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Length': indexStats.size,
        'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(file).pipe(response);
    });
  });
});

server.listen(PORT, HOST, () => console.log(`Preview: ${SITE_URL}/`));

let rebuildTimer;
function rebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    try {
      buildSite({ outputDir: OUTPUT, siteUrl: SITE_URL });
      console.log('Rebuilt site');
    } catch (error) {
      console.error('Site rebuild failed:', error);
    }
  }, 150);
}

const watchers = ['_posts', 'index.html', 'thank-you.md', 'README.md', 'AGENTS.md', 'cdn', 'static/assets', 'static/examples', 'static/img']
  .map(target => {
    const directory = path.join(ROOT, target);
    return fs.watch(directory, { recursive: fs.statSync(directory).isDirectory() }, rebuild);
  });
for (const watcher of watchers) {
  watcher.on('error', error => {
    console.error('File watcher failed:', error);
    process.exitCode = 1;
    server.close();
    for (const activeWatcher of watchers) activeWatcher.close();
  });
}
