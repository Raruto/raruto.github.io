const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { saveMonth } = require('./devlog');
const { contributions, cachedContributions, monthSummary, renderMonth } = require('./backfill');

test('paginates historical contributions and excludes private repositories', async () => {
  const repo = (name, isPrivate) => ({ nameWithOwner: `owner/${name}`, isPrivate, url: `https://github.com/owner/${name}` });
  const publicRepo = repo('public', false);
  const privateRepo = repo('private', true);
  const issue = repository => ({ occurredAt: '2026-10-20T12:00:00Z', issue: { title: 'Fix', url: `${repository.url}/issues/1`, repository } });
  const connection = (nodes, hasNextPage = false, endCursor = null) => ({ nodes, pageInfo: { hasNextPage, endCursor } });
  let calls = 0;
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer token');
    const { variables } = JSON.parse(options.body);
    calls++;
    if (calls === 1) {
      return { ok: true, json: async () => ({ data: { user: { contributionsCollection: {
        commitContributionsByRepository: [
          { repository: publicRepo, contributions: connection([{ occurredAt: '2026-10-20T07:00:00Z', commitCount: 2 }]) },
          { repository: privateRepo, contributions: connection([{ occurredAt: '2026-10-20T07:00:00Z', commitCount: 1 }]) }
        ],
        issueContributions: connection([issue(privateRepo)], true, 'next'),
        pullRequestContributions: connection([]), pullRequestReviewContributions: connection([])
      } } } }) };
    }
    assert.equal(variables.issueCursor, 'next');
    assert.equal(variables.commits, false);
    return { ok: true, json: async () => ({ data: { user: { contributionsCollection: {
      issueContributions: connection([issue(publicRepo)])
    } } } }) };
  };
  const start = Date.parse('2026-10-19T00:00:00Z');
  const entries = await contributions('owner', 'token', start, start + 7 * 86400000, request);
  assert.equal(calls, 2);
  assert.equal(entries.length, 2);
  assert(entries.every(item => item.repo === 'owner/public'));
  assert.match(entries[1].line, /Opened issue: Fix/);
  await assert.rejects(contributions('owner', 'token', start, start + 7 * 86400000,
    async () => ({ ok: true, json: async () => ({ errors: [{ message: 'denied' }] }) })), /denied/);
});

test('reuses historical contributions in post metadata without fetching them again', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-test-'));
  try {
    const start = Date.parse('2026-10-19T00:00:00Z');
    const end = start + 7 * 86400000;
    const connection = { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
    const request = async () => ({ ok: true, json: async () => ({ data: { user: { contributionsCollection: {
      commitContributionsByRepository: [], issueContributions: connection,
      pullRequestContributions: connection, pullRequestReviewContributions: connection
    } } } }) });
    assert.deepEqual(await cachedContributions('owner', 'token', start, end, request, dir), []);
    assert.deepEqual(await cachedContributions('owner', 'token', start, end, () => { throw new Error('unexpected fetch'); }, dir), []);
    await assert.rejects(cachedContributions('other', 'token', start, end, request, dir), /Invalid contribution metadata/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('historical backfill fetches only gaps in monthly coverage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-test-'));
  try {
    const start = Date.parse('2026-10-01T00:00:00Z');
    const end = Date.parse('2026-11-01T00:00:00Z');
    saveMonth(start, { contributions: {
      user: 'owner', source: 'GitHub public contributions', entries: [],
      coverage: [
        { start: '2026-10-01T00:00:00.000Z', end: '2026-10-08T00:00:00.000Z' },
        { start: '2026-10-15T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' }
      ]
    } }, dir);
    const connection = { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
    let calls = 0;
    const request = async (url, options) => {
      calls++;
      const { variables } = JSON.parse(options.body);
      assert.equal(variables.from, '2026-10-08T00:00:00.000Z');
      assert.equal(variables.to, '2026-10-14T23:59:59.999Z');
      return { ok: true, json: async () => ({ data: { user: { contributionsCollection: {
        commitContributionsByRepository: [], issueContributions: connection,
        pullRequestContributions: connection, pullRequestReviewContributions: connection
      } } } }) };
    };
    await cachedContributions('owner', 'token', start, end, request, dir);
    await cachedContributions('owner', 'token', start, end, request, dir);
    assert.equal(calls, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('commit-only months avoid invented details and other activity still uses Copilot', () => {
  const start = Date.parse('2017-05-01T00:00:00Z');
  const entry = {
    type: 'Contribution', repo: 'owner/repo', base: 'https://github.com/owner/repo',
    line: '- 2017-05-10 · [owner/repo](https://github.com/owner/repo) · [Authored 6 commits](https://github.com/owner/repo)'
  };
  assert.equal(monthSummary([entry, entry], start, '', () => { throw new Error('unexpected Copilot call'); }),
    '# Commits to repo\n\nIn May, I contributed commits to [owner/repo](https://github.com/owner/repo).');
  const issue = { ...entry, line: entry.line.replace('Authored 6 commits', 'Opened issue') };
  assert.equal(monthSummary([issue], start, 'token', (report, token) => {
    assert.equal(report, issue.line);
    assert.equal(token, 'token');
    return 'generated';
  }), 'generated');
});

test('historical generation retries invalid summaries but never publishes unverified links', () => {
  const start = Date.parse('2020-01-01T00:00:00Z');
  const entry = {
    type: 'Contribution', repo: 'owner/repo', base: 'https://github.com/owner/repo',
    url: 'https://github.com/owner/repo/issues/1', date: '2020-01-01',
    line: '- 2020-01-01 · [owner/repo](https://github.com/owner/repo) · [Opened issue](https://github.com/owner/repo/issues/1)'
  };
  let calls = 0;
  const output = renderMonth([entry], start, Date.parse('2020-02-01T00:00:00Z'), 'token', () =>
    ++calls === 1 ? '# Title\n\n[bad](https://example.com)' : '# Title\n\n[issue](https://github.com/owner/repo/issues/1)');
  assert.equal(calls, 2);
  assert.match(output, /\[issue\]/);
  calls = 0;
  assert.throws(() => renderMonth([entry], start, Date.parse('2020-02-01T00:00:00Z'), 'token', () => {
    calls++;
    return '# Title\n\nNo links';
  }), /without source links/);
  assert.equal(calls, 3);
});
