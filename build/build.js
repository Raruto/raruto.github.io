const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

const ROOT = path.resolve(__dirname, '..');
const TITLE = 'Matteo Tosi';
const TAGLINE = '👋 hello fellow humans';
const DEFAULT_OUTPUT = path.join(ROOT, 'static');

const rougeClasses = {
  attr: 'na',
  'built_in': 'nb',
  comment: 'c',
  function: 'nf',
  keyword: 'k',
  literal: 'kc',
  meta: 'cp',
  name: 'nt',
  number: 'mi',
  string: 's',
  tag: 'nt',
  title: 'nf',
  type: 'kt'
};

function mapHighlightClasses(html) {
  return html.replace(/class="hljs-([^"]+)"/g, (match, name) =>
    rougeClasses[name] ? `class="${rougeClasses[name]}"` : '');
}

const markdown = new MarkdownIt({
  html: true,
  highlight(code, language) {
    if (!language || !hljs.getLanguage(language)) return '';
    return mapHighlightClasses(hljs.highlight(code, { language }).value);
  }
});

markdown.renderer.rules.heading_open = (tokens, index, options, env, renderer) => {
  const inline = tokens[index + 1];
  const text = (inline.children || []).map(token =>
    ['text', 'code_inline', 'image'].includes(token.type) ? token.content :
      ['softbreak', 'hardbreak'].includes(token.type) ? ' ' : ''
  ).join('');
  const base = text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';
  const ids = env.headingIds || (env.headingIds = new Map());
  const count = ids.get(base) || 0;
  ids.set(base, count + 1);
  tokens[index].attrSet('id', count ? `${base}-${count}` : base);
  return renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index];
  const requestedLanguage = token.info.trim().split(/\s+/)[0];
  const language = /^[\w+-]+$/.test(requestedLanguage) ? requestedLanguage : '';
  const highlighted = language && hljs.getLanguage(language)
    ? mapHighlightClasses(hljs.highlight(token.content, { language }).value)
    : markdown.utils.escapeHtml(token.content);
  const languageClass = language ? `language-${language} ` : '';
  return `<div class="${languageClass}highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${highlighted}</code></pre></div></div>\n`;
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function replaceLiquidUrls(source) {
  const rendered = source.replace(/\{\{\s*(['"])(\/[^'"]*)\1\s*\|\s*relative_url\s*\}\}/g, (match, quote, url) => url);
  if (/\{%|\{\{/.test(rendered)) throw new Error('Unsupported Liquid syntax in Markdown content');
  return rendered;
}

function renderMarkdown(source) {
  return markdown.render(replaceLiquidUrls(source), { headingIds: new Map() });
}

function readBlogEntries() {
  const root = path.join(ROOT, '_posts');
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.md') && file !== path.join(root, 'index.md')) files.push(file);
    }
  }
  walk(root);
  return files.map(file => {
    const parsed = matter(fs.readFileSync(file, 'utf8'));
    const name = path.basename(file, '.md');
    if (typeof parsed.data.title !== 'string' || !parsed.data.title.trim()) {
      throw new Error(`Missing title in ${path.relative(ROOT, file)}`);
    }
    return {
      name,
      filename: path.basename(file),
      title: parsed.data.title,
      category: typeof parsed.data.category === 'string' ? parsed.data.category : 'Devlog',
      content: parsed.content
    };
  }).sort((a, b) => b.filename.localeCompare(a.filename));
}

function renderArchive(entries) {
  const years = [...new Set(entries.map(entry => entry.name.slice(0, 4)))];
  const yearLinks = years.map(year => `<a href="#year-${escapeHtml(year)}">${escapeHtml(year)}</a>`).join('\n        ');
  const sections = years.map(year => {
    const posts = entries.filter(entry => entry.name.startsWith(year)).map(entry => {
      const month = entry.name.slice(0, 7);
      return `          <li>
            <a href="/blog/${escapeHtml(entry.name)}.html">${escapeHtml(entry.title)}</a>
            <div class="blog-archive__meta">
              <span>${escapeHtml(entry.category)}: <time datetime="${escapeHtml(month)}">${escapeHtml(month)}</time></span>
            </div>
          </li>`;
    }).join('\n');
    return `  <section class="blog-archive__year" aria-labelledby="year-${escapeHtml(year)}">
    <h2 id="year-${escapeHtml(year)}">${escapeHtml(year)}</h2>
    <ul class="blog-archive__list">
${posts}
    </ul>
  </section>`;
  }).join('\n');
  return `  <nav class="blog-archive__years" aria-label="Browse by year">
        ${yearLinks}
  </nav>
${sections}`;
}

function breadcrumbs(title, isArchive) {
  return `<style>
  .breadcrumbs { margin-bottom: 1.5rem; font-size: .9em; }
  .breadcrumbs ol { display: flex; flex-wrap: wrap; gap: .25rem .5rem; list-style: none; margin: 0; padding: 0; }
  .breadcrumbs li { overflow-wrap: anywhere; }
  .breadcrumbs li + li::before { content: "/"; margin-right: .5rem; color: #666; }
  .breadcrumbs [aria-current] { color: #555; }
</style>
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    ${isArchive ? '' : '<li><a href="/blog/">Blog</a></li>'}
    <li aria-current="page">${escapeHtml(title)}</li>
  </ol>
</nav>`;
}

function renderLayout(content, pageTitle, pageUrl, siteUrl, cssHash, isHome = false) {
  const canonical = new URL(pageUrl, `${siteUrl.replace(/\/+$/, '')}/`).href;
  const fullTitle = isHome ? `${TITLE} | ${TAGLINE}` : `${pageTitle} | ${TITLE}`;
  const seoTitle = isHome ? TITLE : pageTitle;
  const schema = {
    '@context': 'https://schema.org',
    '@type': isHome ? 'WebSite' : 'WebPage',
    description: TAGLINE,
    headline: seoTitle,
    ...(isHome ? { name: TITLE } : {}),
    url: canonical
  };
  return `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,maximum-scale=2">
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/style.css?v=${cssHash}">
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="generator" content="Node.js static build">
    <meta property="og:title" content="${escapeHtml(seoTitle)}">
    <meta property="og:locale" content="en_US">
    <meta name="description" content="${escapeHtml(TAGLINE)}">
    <meta property="og:description" content="${escapeHtml(TAGLINE)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:site_name" content="${escapeHtml(TITLE)}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary">
    <meta property="twitter:title" content="${escapeHtml(seoTitle)}">
    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  </head>
  <body>
    <div id="header_wrap" class="outer">
      <header class="inner">
        <h1 id="project_title">${escapeHtml(TITLE)}</h1>
        <h2 id="project_tagline">${escapeHtml(TAGLINE)}</h2>
      </header>
    </div>
    <div id="main_content_wrap" class="outer">
      <section id="main_content" class="inner">
        ${content}
      </section>
    </div>
    <div id="footer_wrap" class="outer">
      <footer class="inner">
        <p>Published with <a href="https://pages.github.com">GitHub Pages</a></p>
      </footer>
    </div>
  </body>
</html>
`;
}

function replaceMarker(source, marker, content) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`Expected exactly one ${marker} marker`);
  }
  return `${source.slice(0, first)}${content}${source.slice(first + marker.length)}`;
}

function renderHomepage(entries, siteUrl, cssHash) {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const contactsHeading = '## Contacts';
  const contactsIndex = readme.indexOf(contactsHeading);
  if (contactsIndex < 0) throw new Error('README.md is missing the Contacts section');
  const homepage = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const latest = entries.slice(0, 5).map(entry =>
    `<li><a href="/blog/${escapeHtml(entry.name)}.html">${escapeHtml(entry.title)} <span aria-hidden="true">&rarr;</span></a></li>`
  ).join('\n  ');
  let content = replaceMarker(homepage, '<!-- homepage:readme-intro -->', renderMarkdown(readme.slice(0, contactsIndex)));
  content = replaceMarker(content, '<!-- homepage:latest-posts -->', `<ul class="latest-posts__list">\n  ${latest}\n</ul>`);
  content = replaceMarker(content, '<!-- homepage:readme-contacts -->', renderMarkdown(readme.slice(contactsIndex + contactsHeading.length)));
  return renderLayout(content, TITLE, '/', siteUrl, cssHash, true);
}

function copyStaticFiles(outputDir) {
  const assets = path.join(ROOT, 'static', 'assets');
  const destinationAssets = path.join(outputDir, 'assets');
  if (path.resolve(assets) !== path.resolve(destinationAssets)) {
    fs.cpSync(assets, destinationAssets, { recursive: true });
  }
  const cdn = path.join(ROOT, 'cdn');
  if (fs.existsSync(cdn)) fs.cpSync(cdn, path.join(outputDir, 'cdn'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(outputDir, 'README.md'));
}

function clearGeneratedFiles(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (entry.isDirectory() && ['assets', 'examples', 'img'].includes(entry.name)) continue;
    fs.rmSync(path.join(outputDir, entry.name), { recursive: true, force: true });
  }
}

function buildSite({ outputDir = DEFAULT_OUTPUT, siteUrl = process.env.SITE_URL || 'https://raruto.github.io' } = {}) {
  const destination = path.resolve(outputDir);
  if (destination === ROOT || destination === path.parse(destination).root) {
    throw new Error('Refusing to use a filesystem root as the build destination');
  }
  if (destination.startsWith(`${ROOT}${path.sep}`) && destination !== DEFAULT_OUTPUT) {
    throw new Error('Build output inside the repository must use static/');
  }
  clearGeneratedFiles(destination);
  copyStaticFiles(destination);
  fs.writeFileSync(path.join(destination, '.nojekyll'), '');

  const css = fs.readFileSync(path.join(destination, 'assets', 'css', 'style.css'));
  const cssHash = createHash('sha1').update(css).digest('hex').slice(0, 12);
  const entries = readBlogEntries();
  fs.writeFileSync(path.join(destination, 'index.html'), renderHomepage(entries, siteUrl, cssHash));

  const archiveSource = matter(fs.readFileSync(path.join(ROOT, '_posts', 'index.md'), 'utf8'));
  const archiveMarker = '<!-- blog:archive -->';
  const archiveContent = replaceMarker(archiveSource.content, archiveMarker, renderArchive(entries));
  const archiveUrl = archiveSource.data.permalink || '/blog/';
  const archive = `${breadcrumbs(archiveSource.data.title || 'Blog', true)}${renderMarkdown(archiveContent)}`;
  const archiveFile = path.join(destination, 'blog', 'index.html');
  fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
  fs.writeFileSync(archiveFile, renderLayout(archive, archiveSource.data.title || 'Blog', archiveUrl, siteUrl, cssHash));

  for (const entry of entries) {
    const article = `${breadcrumbs(entry.title, false)}${renderMarkdown(entry.content)}`;
    fs.writeFileSync(path.join(destination, 'blog', `${entry.name}.html`), renderLayout(article, entry.title, `/blog/${entry.name}.html`, siteUrl, cssHash));
  }

  const rootPage = 'thank-you.md';
  const source = path.join(ROOT, rootPage);
  fs.copyFileSync(source, path.join(destination, rootPage));
  const page = matter(fs.readFileSync(source, 'utf8'));
  const title = page.data.title || TITLE;
  const url = `/${rootPage.replace(/\.md$/, '.html')}`;
  fs.writeFileSync(path.join(destination, rootPage.replace(/\.md$/, '.html')), renderLayout(renderMarkdown(page.content), title, url, siteUrl, cssHash));

  return { articles: entries.length, rootPages: 1, outputDir: destination };
}

if (require.main === module) {
  try {
    const result = buildSite();
    console.log(`Built ${result.articles} articles and ${result.rootPages + 2} pages in ${result.outputDir}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

module.exports = { buildSite, readBlogEntries, renderArchive, renderMarkdown, renderLayout, replaceLiquidUrls };
