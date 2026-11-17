const { test } = require('node:test');
const assert = require('node:assert/strict');
const { previousWeek, publicEvents, activity, render, summarize, resolveTokens } = require('./devlog');

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
    return { status: 0, stdout: 'I shipped [v1](https://github.com/owner/repo/releases/tag/v1).\n\n<script>{% raw %}</script>' };
  });
  const output = render(entries, start, start + 7 * 86400000, summary);
  assert.match(output, /\[v1\]\(https:\/\/github.com\/owner\/repo\/releases\/tag\/v1\)/);
  assert.match(output, /&lt;script&gt;&#123;% raw %&#125;&lt;\/script&gt;/);
  assert.match(output, /<pre class="mermaid"[\s\S]*2026-11-09 : owner\/repo v1[\s\S]*2026-11-10 : owner\/repo v2/);
  assert.doesNotMatch(output, /Activity details|Public GitHub activity|may be incomplete|Summary generated/);
  const review = activity([{
    created_at: '2026-11-09T00:00:00Z', public: true, type: 'PullRequestReviewEvent',
    repo: { name: 'owner/repo' },
    payload: { review: { html_url: 'https://github.com/owner/repo/pull/42#pullrequestreview-1' } }
  }], start, start + 7 * 86400000);
  assert.match(render(review, start, start + 7 * 86400000, '[review](https://github.com/owner/repo/pull/42)'), /\[review\]/);
  assert.throws(() => render(entries, start, start + 7 * 86400000, '[bad](https://example.com)'), /outside the public activity/);
  assert.throws(() => render(entries, start, start + 7 * 86400000, 'No links'), /without source links/);
  assert.doesNotMatch(render(entries.slice(0, 1), start, start + 7 * 86400000, '[repo](https://github.com/owner/repo)'), /class="mermaid"/);
  assert.throws(() => summarize('public event', ''), /COPILOT_GITHUB_TOKEN/);
  assert.throws(() => summarize('public event', 'token', () => ({ status: 1, stderr: 'failed' })), /Copilot failed/);
  assert.throws(() => summarize('public event', 'token', () => ({ status: 0, stdout: '' })), /empty summary/);
});
