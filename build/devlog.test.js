const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { previousWeek, monthsBetween, monthPaths, publicEvents, activity, render, summarize, resolveTokens, readMonth, publishMonth, updateMonths } = require('./devlog');

test('uses explicit tokens or the GitHub CLI locally', () => {
  let calls = 0;
  const gh = (command, args, options) => {
    calls++;
    assert.equal(command, 'gh');
    assert.deepEqual(args, ['auth', 'token', '--hostname', 'github.com']);
    assert.equal(options.env.GITHUB_TOKEN, '');
    assert.equal(options.env.GH_TOKEN, '');
    return { status: 0, stdout: 'cli-token\n' };
  };
  assert.deepEqual(resolveTokens({}, gh), { github: 'cli-token', copilot: 'cli-token' });
  assert.equal(calls, 1);
  assert.deepEqual(resolveTokens({ GITHUB_TOKEN: 'api', COPILOT_GITHUB_TOKEN: 'copilot' }, gh), { github: 'api', copilot: 'copilot' });
  assert.equal(calls, 1);
  assert.deepEqual(resolveTokens({ GITHUB_TOKEN: 'api', GH_TOKEN: 'other' }, gh), { github: 'api', copilot: 'cli-token' });
  assert.deepEqual(resolveTokens({ GITHUB_TOKEN: 'api', GITHUB_ACTIONS: 'true' }, gh), { github: 'api', copilot: '' });
  assert.throws(() => resolveTokens({}, () => ({ status: 1, stderr: 'not logged in' })), /gh auth login.*not logged in/);
  assert.throws(() => resolveTokens({}, () => ({ error: new Error('not installed') })), /not installed/);
});

test('previous complete UTC week, including boundaries and unsorted events', () => {
  const { start, end } = previousWeek(new Date('2026-11-16T08:15:00Z'));
  assert.equal(new Date(start).toISOString(), '2026-11-09T00:00:00.000Z');
  assert.equal(new Date(end).toISOString(), '2026-11-16T00:00:00.000Z');
  const event = (created_at, title, isPublic = true) => ({
    created_at, public: isPublic, type: 'IssuesEvent', repo: { name: 'owner/repo' },
    payload: { action: 'opened', issue: { title, html_url: 'https://github.com/owner/repo/issues/1' } }
  });
  const entries = activity([
    event('2026-11-16T00:00:00Z', 'outside'),
    event('2026-11-09T00:00:00Z', '<script>{% raw %}</script>'),
    event('2026-11-15T23:59:59Z', 'inside'),
    event('2026-11-10T00:00:00Z', 'private', false)
  ], start, end);
  assert.equal(entries.length, 2);
  assert.match(entries[0].line, /2026-11-15.*inside/);
  assert.match(entries[1].line, /&lt;script&gt;&#123;% raw %&#125;&lt;\/script&gt;/);
});

test('stores monthly posts in the repository root without a draft path', () => {
  const { published } = monthPaths(Date.parse('2026-10-01T00:00:00Z'));
  const root = path.join(__dirname, '..');
  assert.equal(published, path.join(root, '_posts', '2026', '2026-10.md'));
  assert.equal(Object.hasOwn(monthPaths(Date.parse('2026-10-01T00:00:00Z')), 'draft'), false);
});

test('fetches all pages despite unsorted events and flags truncated weeks', async () => {
  let page = 0;
  const request = async () => ({
    ok: true,
    json: async () => ++page < 3
      ? Array.from({ length: 100 }, () => ({ created_at: '2026-11-01T00:00:00Z' }))
      : [{ created_at: '2026-11-10T00:00:00Z' }]
  });
  assert.equal((await publicEvents('Raruto', 'token', request)).events.length, 201);
  const full = async () => ({
    ok: true,
    json: async () => Array.from({ length: 100 }, () => ({ created_at: '2026-11-10T00:00:00Z' }))
  });
  const result = await publicEvents('Raruto', 'token', full);
  assert.equal(result.truncated, true);
  await assert.rejects(publicEvents('Raruto', 'token', async () => ({ ok: false, status: 403 })), /403/);
});

test('requires a GitHub token and sends authorization', async () => {
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer token');
    return { ok: true, json: async () => [] };
  };
  await assert.rejects(publicEvents('Raruto', undefined, request), /GITHUB_TOKEN/);
  await publicEvents('Raruto', 'token', request);
});

test('publishes linked prose and a factual release timeline without internal details', () => {
  const start = Date.parse('2026-11-09T00:00:00Z');
  const release = (date, tag) => ({
    created_at: date, public: true, type: 'ReleaseEvent', repo: { name: 'owner/repo' },
    payload: { action: 'published', release: { tag_name: tag, html_url: `https://github.com/owner/repo/releases/tag/${tag}` } }
  });
  const entries = activity([
    release('2026-11-10T00:00:00Z', 'v2'),
    release('2026-11-09T00:00:00Z', 'v1')
  ], start, start + 7 * 86400000);
  const summary = summarize('public event', 'token', (command, args, options) => {
    assert.ok(args.includes('--available-tools=none'));
    assert.ok(options.input.includes('public event'));
    assert.ok(options.input.includes('Never discuss missing information'));
    const guidelines = fs.readFileSync(path.join(__dirname, '..', '.github', 'instructions', 'blog.instructions.md'), 'utf8')
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    assert.ok(options.input.includes(guidelines));
    return { status: 0, stdout: '# A pair of releases\n\nI shipped [v1](https://github.com/owner/repo/releases/tag/v1).\n\n<script>{% raw %}</script>' };
  });
  const output = render(entries, start, start + 7 * 86400000, summary);
  assert.match(output, /^# A pair of releases\n\n\*Devlog: 2026-11\*/);
  assert.doesNotMatch(output, /^(?:layout|title|activity):/m);
  assert.match(output, /\[v1\]\(https:\/\/github.com\/owner\/repo\/releases\/tag\/v1\)/);
  assert.match(output, /&lt;script&gt;&#123;% raw %&#125;&lt;\/script&gt;/);
  assert.match(output, /<pre class="mermaid"[\s\S]*2026-11-09 : owner\/repo v1[\s\S]*2026-11-10 : owner\/repo v2/);
  assert.doesNotMatch(output, /Activity details|Public GitHub activity|may be incomplete|Summary generated/);
  const review = activity([{
    created_at: '2026-11-09T00:00:00Z', public: true, type: 'PullRequestReviewEvent',
    repo: { name: 'owner/repo' },
    payload: { review: { html_url: 'https://github.com/owner/repo/pull/42#pullrequestreview-1' } }
  }], start, start + 7 * 86400000);
  assert.match(render(review, start, start + 7 * 86400000, '# Review\n\n[review](https://github.com/owner/repo/pull/42)'), /\[review\]/);
  assert.throws(() => render(entries, start, start + 7 * 86400000, '# Title\n\n[bad](https://example.com)'), /outside the public activity/);
  assert.throws(() => render(entries, start, start + 7 * 86400000, '# Title\n\nNo links'), /without source links/);
  assert.throws(() => render(entries, start, start + 7 * 86400000, '# {% bad %}\n\n[repo](https://github.com/owner/repo)'), /invalid devlog title/);
  assert.doesNotMatch(render(entries.slice(0, 1), start, start + 7 * 86400000, '# Title\n\n[repo](https://github.com/owner/repo)'), /class="mermaid"/);
  assert.throws(() => summarize('public event', ''), /COPILOT_GITHUB_TOKEN/);
  assert.throws(() => summarize('public event', 'token', () => ({ status: 1, stderr: 'failed' })), /Copilot failed/);
  assert.throws(() => summarize('public event', 'token', () => ({ status: 0, stdout: '' })), /empty summary/);
});

test('illustrates only a cited project with an existing local image', () => {
  const start = Date.parse('2026-11-01T00:00:00Z');
  const base = 'https://github.com/Raruto/leaflet-city-mapper';
  const entries = [{ base, url: `${base}/issues/1` }];
  const output = render(entries, start, start + 86400000, `# Mapping the city\n\n[The project](${base}/issues/1) explores maps.`);
  assert.match(output, /!\[Illustration of leaflet-city-mapper\]\(\.\.\/img\/leaflet-city-mapper\.png\)/);
  assert.match(output, /current illustration/);
  const other = 'https://github.com/other/leaflet-city-mapper';
  assert.doesNotMatch(render([{ base: other, url: other }], start, start + 86400000, `# Another project\n\n[Project](${other})`), /!\[/);
});

test('writes monthly posts without layout/title/activity metadata and protects manual edits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-test-'));
  try {
    const start = Date.parse('2026-10-01T00:00:00Z');
    const post = '# Example\n\nPost body\n';
    const file = publishMonth(start, post, dir);
    assert.equal(file, path.join(dir, '_posts', '2026', '2026-10.md'));
    assert.match(fs.readFileSync(file, 'utf8'), /^---\nbodyHash: [a-f\d]{64}\n---$/m);
    assert.match(fs.readFileSync(file, 'utf8'), /^bodyHash: [a-f\d]{64}$/m);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /^(?:layout|title|activity):/m);
    publishMonth(start, post.replace('Post body', 'Updated body'), dir);
    assert.match(fs.readFileSync(file, 'utf8'), /Updated body/);
    fs.appendFileSync(file, 'Manual edit\n');
    assert.throws(() => publishMonth(start, post, dir), /manual edits/);
    assert.match(fs.readFileSync(file, 'utf8'), /Manual edit/);
    assert.equal(fs.existsSync(path.join(dir, '_drafts')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('weekly update summarizes the available feed by month without storing events', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-test-'));
  try {
    const event = (created_at) => ({
      created_at, public: true, type: 'WatchEvent',
      repo: { name: 'owner/repo' }, payload: {}
    });
    const events = [event('2026-12-01T00:00:00Z'), event('2027-01-01T00:00:00Z'), event('2027-01-04T00:00:00Z')];
    const start = Date.parse('2026-12-28T00:00:00Z'), end = Date.parse('2027-01-04T00:00:00Z');
    assert.deepEqual(monthsBetween(start, end).map(time => new Date(time).toISOString().slice(0, 7)), ['2026-12', '2027-01']);
    const reports = [];
    updateMonths(start, end, events, 'token', dir, report => {
      reports.push(report);
      return '# A month of work\n\n[repo](https://github.com/owner/repo)';
    });
    assert.match(reports[0], /2026-12-01/);
    assert.match(reports[1], /2027-01-01/);
    assert.doesNotMatch(reports[1], /2027-01-04/);
    assert.deepEqual(fs.readdirSync(path.join(dir, '_posts')).sort(), ['2026', '2027']);
    assert.deepEqual(fs.readdirSync(path.join(dir, '_posts', '2026')), ['2026-12.md']);
    assert.deepEqual(fs.readdirSync(path.join(dir, '_posts', '2027')), ['2027-01.md']);
    updateMonths(start, end, events, 'token', dir, () => '# Updated title\n\n[updated](https://github.com/owner/repo)');
    assert.match(fs.readFileSync(path.join(dir, '_posts', '2027', '2027-01.md'), 'utf8'), /\[updated\]/);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, '_posts', '2027', '2027-01.md'), 'utf8'), /^(?:layout|title|activity):/m);
    assert.match(fs.readFileSync(path.join(dir, '_posts', '2027', '2027-01.md'), 'utf8'), /^bodyHash: [a-f\d]{64}$/m);
    assert.deepEqual(Object.keys(readMonth(Date.parse('2027-01-01T00:00:00Z'), dir).data), ['bodyHash']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

