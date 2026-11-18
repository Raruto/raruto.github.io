const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildSite } = require('./build');

test('builds the Slate site with working homepage, archive, and article routes', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'raruto-site-'));
  const output = path.join(temporary, 'site');
  try {
    for (const directory of ['examples', 'img']) {
      fs.mkdirSync(path.join(output, directory), { recursive: true });
      fs.writeFileSync(path.join(output, directory, 'preserved.txt'), directory);
    }
    const result = buildSite({ outputDir: output, siteUrl: 'https://example.test' });
    const read = file => fs.readFileSync(path.join(output, file), 'utf8');
    const home = read('index.html');
    const archive = read('blog/index.html');
    const devlog = read('blog/2026-11.html');
    const codeSample = read('blog/2026-08-20-tripetto-playground.html');

    assert.ok(result.articles > 100);
    assert.match(home, /href="https:\/\/example\.test\/"/);
    assert.match(home, /id="header_wrap"/);
    assert.match(home, /leaflet-city-mapper/);
    assert.equal((home.match(/class="latest-posts__list"/g) || []).length, 1);
    assert.ok(home.indexOf('href="/blog/2026-11.html"') < home.indexOf('href="/blog/2026-11-03-leaflet-city-mapper-project.html"'));
    assert.match(archive, /href="#year-2026"/);
    assert.match(archive, /Devlog: <time datetime="2026-11">2026-11<\/time>/);
    assert.ok(archive.indexOf('href="/blog/2026-11.html"') < archive.indexOf('href="/blog/2026-11-03-leaflet-city-mapper-project.html"'));
    assert.match(archive, /href="\/blog\/2026-11\.html"/);
    assert.match(devlog, /aria-label="Breadcrumb"/);
    assert.match(devlog, /Devlog: 2026-11/);
    assert.match(devlog, /href="https:\/\/example\.test\/blog\/2026-11\.html"/);
    assert.match(codeSample, /class="language-html highlighter-rouge"/);
    assert.match(codeSample, /class="nt"/);
    assert.match(read('thank-you.html'), /Message delivered!/);
    assert.ok(fs.existsSync(path.join(output, 'assets', 'css', 'style.css')));
    assert.ok(fs.existsSync(path.join(output, '.nojekyll')));
    for (const directory of ['examples', 'img']) {
      assert.equal(fs.readFileSync(path.join(output, directory, 'preserved.txt'), 'utf8'), directory);
    }
    assert.equal(fs.readdirSync(path.join(output, 'blog')).filter(file => file.endsWith('.html')).length, result.articles + 1);
    assert.ok(!fs.existsSync(path.join(output, '_drafts')));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
