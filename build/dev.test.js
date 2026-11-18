const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

test('serves versioned assets and reports missing routes and unsupported methods', async () => {
  const port = await availablePort();
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'site-preview-test-'));
  for (const directory of ['examples', 'img']) {
    fs.cpSync(path.join(__dirname, '..', 'static', directory), path.join(output, directory), { recursive: true });
  }
  const child = spawn(process.execPath, [path.join(__dirname, 'dev.js')], {
    env: { ...process.env, PORT: String(port), SITE_OUTPUT_DIR: output },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let startupLog = '';
  child.stdout.on('data', chunk => { startupLog += chunk; });
  child.stderr.on('data', chunk => { startupLog += chunk; });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Dev server did not start: ${startupLog}`)), 15000);
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', code => {
        clearTimeout(timeout);
        reject(new Error(`Dev server exited with ${code}: ${startupLog}`));
      });
      child.stdout.on('data', () => {
        if (startupLog.includes(`http://127.0.0.1:${port}/`)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const base = `http://127.0.0.1:${port}`;
    const image = await fetch(`${base}/img/leaflet-city-mapper.png`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/png/);

    const example = await fetch(`${base}/examples/leaflet-google/leaflet-google.html`);
    assert.equal(example.status, 200);

    const missing = await fetch(`${base}/missing`);
    assert.equal(missing.status, 404);

    const unsupported = await fetch(base, { method: 'POST' });
    assert.equal(unsupported.status, 405);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
    fs.rmSync(output, { recursive: true, force: true });
  }
});
