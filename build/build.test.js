const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildSite, validateLocalLinks } = require('./build');

test('builds the Slate site with working homepage, archive, and article routes', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'raruto-site-'));
  const output = path.join(temporary, 'site');
  try {
    for (const directory of ['examples', 'img']) {
      fs.mkdirSync(path.join(output, directory), { recursive: true });
      fs.writeFileSync(path.join(output, directory, 'preserved.txt'), directory);
    }
    const sharedImages = path.join(__dirname, '..', 'static', 'img');
    for (const image of fs.readdirSync(sharedImages)) {
      fs.copyFileSync(path.join(sharedImages, image), path.join(output, 'img', image));
    }
    const result = buildSite({ outputDir: output, siteUrl: 'https://example.test' });
    const read = file => fs.readFileSync(path.join(output, file), 'utf8');
    const home = read('index.html');
    const archive = read('blog/index.html');
    const devlog = read('blog/2026-11.html');
    const codeSample = read('blog/2026-08.html');

    assert.ok(result.articles > 100);
    assert.match(home, /href="https:\/\/example\.test\/"/);
    assert.match(home, /id="header_wrap"/);
    assert.match(home, /leaflet-city-mapper/);
    assert.equal((home.match(/class="latest-posts__list"/g) || []).length, 1);
    assert.ok(home.indexOf('href="/blog/2026-11.html"') < home.indexOf('href="/blog/2026-10.html"'));
    assert.match(archive, /href="#year-2026"/);
    assert.match(archive, /Devlog: <time datetime="2026-11">2026-11<\/time>/);
    assert.ok(archive.indexOf('href="/blog/2026-11.html"') < archive.indexOf('href="/blog/2026-10.html"'));
    assert.match(archive, /href="\/blog\/2026-11\.html"/);
    assert.match(devlog, /aria-label="Breadcrumb"/);
    assert.match(devlog, /Devlog: 2026-11/);
    assert.match(devlog, /href="https:\/\/example\.test\/blog\/2026-11\.html"/);
    assert.match(read('blog/2017-05.html'), /href="https:\/\/github\.com\/Raruto\/IlMagnifico"/);
    assert.match(read('blog/2018-04.html'), /src="\.\.\/img\/wordpress-git-composer\.jpg"/);
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

test('reports broken local URLs and ignores external project URLs', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'raruto-links-'));
  const output = path.join(temporary, 'site');
  try {
    fs.mkdirSync(path.join(output, 'blog'), { recursive: true });
    fs.mkdirSync(path.join(output, 'img'), { recursive: true });
    fs.writeFileSync(path.join(output, 'index.html'), '<a href="/blog/">Archive</a><a href="https://example.test/leaflet-project/">Demo</a><a href="https://example.test/missing.html">Missing</a>');
    fs.writeFileSync(path.join(output, 'blog', 'index.html'), '<a href="./missing.html">Missing</a><img src="../img/present.png">');
    fs.writeFileSync(path.join(output, 'img', 'present.png'), '');

    assert.throws(
      () => validateLocalLinks(output, ['index.html', 'blog/index.html'], 'https://example.test'),
      error => {
        assert.match(error.message, /index\.html: "https:\/\/example\.test\/missing\.html" resolves to missing "\/missing\.html"/);
        assert.match(error.message, /blog\/index\.html: "\.\/missing\.html" resolves to missing "\/blog\/missing\.html"/);
        return true;
      }
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
