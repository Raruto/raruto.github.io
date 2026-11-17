const fs = require('node:fs');
const { SummaryValidationError, previousWeek, monthStart, nextMonth, monthsBetween, publicEvents, summarize, render, resolveTokens, escapeText, monthPaths, readMonth, saveMonth, publishMonth, monthEntries, archiveAllEvents } = require('./devlog');
const query = `
query($login: String!, $from: DateTime!, $to: DateTime!, $commits: Boolean!,
      $issues: Boolean!, $prs: Boolean!, $reviews: Boolean!,
      $issueCursor: String, $prCursor: String, $reviewCursor: String) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) @include(if: $commits) {
        repository { nameWithOwner isPrivate url }
        contributions(first: 100) { nodes { occurredAt commitCount } pageInfo { hasNextPage } }
      }
      issueContributions(first: 100, after: $issueCursor) @include(if: $issues) {
        nodes { occurredAt issue { title url repository { nameWithOwner isPrivate url } } }
        pageInfo { hasNextPage endCursor }
      }
      pullRequestContributions(first: 100, after: $prCursor) @include(if: $prs) {
        nodes { occurredAt pullRequest { title url repository { nameWithOwner isPrivate url } } }
        pageInfo { hasNextPage endCursor }
      }
      pullRequestReviewContributions(first: 100, after: $reviewCursor) @include(if: $reviews) {
        nodes { occurredAt pullRequest { title url repository { nameWithOwner isPrivate url } } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

function entry(repo, url, date, description) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo.nameWithOwner)) throw new Error('Invalid public repository name');
  const base = `https://github.com/${repo.nameWithOwner}`;
  if (repo.url !== base || (url !== base && !url.startsWith(`${base}/`)) || /[()<>\s\\]/.test(url)) {
    throw new Error('Invalid public contribution URL');
  }
  if (!Number.isFinite(Date.parse(date))) throw new Error('Invalid public contribution date');
  return {
    date: date.slice(0, 10), repo: repo.nameWithOwner, base, url, type: 'Contribution',
    line: `- ${date.slice(0, 10)} · [${escapeText(repo.nameWithOwner)}](${base}) · [${escapeText(description)}](${url})`
  };
}

async function contributions(user, token, start, end, request = fetch) {
  if (!token) throw new Error('GITHUB_TOKEN is required to fetch public contributions');
  const entries = [];
  const variables = {
    login: user, from: new Date(start).toISOString(), to: new Date(end - 1).toISOString(),
    commits: true, issues: true, prs: true, reviews: true,
    issueCursor: null, prCursor: null, reviewCursor: null
  };
  while (variables.commits || variables.issues || variables.prs || variables.reviews) {
    const response = await request('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'weekly-devlog' },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) throw new Error(`GitHub contributions request failed: ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(`GitHub contributions request failed: ${result.errors.map(error => error.message).join('; ')}`);
    const collection = result.data && result.data.user && result.data.user.contributionsCollection;
    if (!collection) throw new Error('GitHub contributions response is missing data');
    if (variables.commits) {
      const repos = collection.commitContributionsByRepository;
      if (!Array.isArray(repos) || repos.length >= 100) throw new Error('GitHub commit contributions may be incomplete');
      for (const { repository, contributions: commits } of repos) {
        if (!repository || typeof repository.isPrivate !== 'boolean') throw new Error('Missing repository visibility in GitHub response');
        if (commits.pageInfo.hasNextPage) throw new Error('GitHub commit contributions may be incomplete');
        if (repository.isPrivate) continue;
        for (const commit of commits.nodes) {
          if (!Number.isInteger(commit.commitCount) || commit.commitCount < 1) throw new Error('Invalid public commit count');
          entries.push(entry(repository, repository.url, commit.occurredAt, `Authored ${commit.commitCount} commits`));
        }
      }
      variables.commits = false;
    }
    for (const [enabled, cursor, field, object, label] of [
      ['issues', 'issueCursor', 'issueContributions', 'issue', 'Opened issue'],
      ['prs', 'prCursor', 'pullRequestContributions', 'pullRequest', 'Opened pull request'],
      ['reviews', 'reviewCursor', 'pullRequestReviewContributions', 'pullRequest', 'Reviewed pull request']
    ]) {
      if (!variables[enabled]) continue;
      const connection = collection[field];
      if (!connection || !Array.isArray(connection.nodes) || !connection.pageInfo) throw new Error(`Missing ${field} in GitHub response`);
      for (const node of connection.nodes) {
        const item = node[object];
        if (!item || !item.repository || typeof item.repository.isPrivate !== 'boolean') throw new Error(`Invalid ${field} in GitHub response`);
        if (!item.repository.isPrivate && typeof item.title !== 'string') throw new Error(`Missing public title in ${field}`);
        if (!item.repository.isPrivate) entries.push(entry(item.repository, item.url, node.occurredAt, `${label}: ${item.title}`));
      }
      variables[enabled] = connection.pageInfo.hasNextPage;
      if (variables[enabled] && (!connection.pageInfo.endCursor || connection.pageInfo.endCursor === variables[cursor])) {
        throw new Error(`Invalid pagination cursor for ${field}`);
      }
      variables[cursor] = connection.pageInfo.endCursor;
    }
  }
  return entries;
}

async function cachedContributions(user, token, start, end, request = fetch, root = '.') {
  const month = monthStart(start);
  if (start < month || end <= start || end > nextMonth(month)) throw new Error('Invalid contribution interval');
  const { data, file } = readMonth(month, root);
  const saved = data.contributions || { source: 'GitHub public contributions', user, coverage: [], entries: [] };
  if (saved.user !== user || !Array.isArray(saved.coverage) || !Array.isArray(saved.entries)) {
    throw new Error(`Invalid contribution metadata: ${file}`);
  }
  const coverage = saved.coverage.map(range => {
    const from = Date.parse(range.start), to = Date.parse(range.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < month || to > nextMonth(month) || to <= from) {
      throw new Error(`Invalid contribution coverage: ${file}`);
    }
    return { from, to };
  }).sort((a, b) => a.from - b.from);
  const gaps = [];
  let cursor = start;
  for (const range of coverage) {
    if (range.to <= cursor) continue;
    if (range.from >= end) break;
    if (range.from > cursor) gaps.push([cursor, Math.min(range.from, end)]);
    cursor = Math.max(cursor, range.to);
  }
  if (cursor < end) gaps.push([cursor, end]);
  for (const [from, to] of gaps) {
    const entries = await contributions(user, token, from, to, request);
    const combined = new Map([...saved.entries, ...entries].map(item => [JSON.stringify(item), item]));
    saved.entries = [...combined.values()];
    saved.coverage.push({ start: new Date(from).toISOString(), end: new Date(to).toISOString() });
    data.contributions = saved;
    saveMonth(month, data, root);
  }
  return saved.entries.filter(item => {
    const time = Date.parse(item.date);
    if (!Number.isFinite(time)) throw new Error(`Invalid contribution date: ${file}`);
    return time >= start && time < end;
  });
}

function monthSummary(entries, start, token, generate = summarize) {
  if (!entries.length) throw new Error('Cannot summarize a month without activity');
  if (entries.every(item => item.type === 'Contribution' && / · \[Authored \d+ commits\]\(/.test(item.line))) {
    const repos = [...new Map(entries.map(item => [item.repo, item.base])).entries()];
    const links = repos.slice(0, 3).map(([repo, url]) => `[${repo}](${url})`);
    const list = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} and ${links[links.length - 1]}`;
    const month = new Date(start).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const names = repos.slice(0, 2).map(([repo]) => repo.split('/')[1].replace(/_/g, ' '));
    const title = names.length === 1 ? `Commits to ${names[0]}` : `Commits to ${names.join(' and ')}${repos.length > 2 ? ' and more' : ''}`;
    return `# ${title}\n\nIn ${month}, I contributed commits to ${repos.length > 3 ? 'repositories including ' : ''}${list}.`;
  }
  return generate(entries.map(item => item.line).join('\n'), token);
}

function renderMonth(entries, start, end, token, generate = summarize) {
  for (let attempt = 1; ; attempt++) {
    const summary = monthSummary(entries, start, token, generate);
    try {
      return render(entries, start, end, summary);
    } catch (error) {
      if (!(error instanceof SummaryValidationError) || attempt === 3) throw error;
      console.warn(`Invalid summary for ${new Date(start).toISOString().slice(0, 7)}; retrying: ${error.message}`);
    }
  }
}

async function main(args = process.argv.slice(2)) {
  const year = Number(args[0]);
  const limit = args.length === 2 ? Number(args[1]) : Infinity;
  if (!Number.isInteger(year) || year < 2008 || year > new Date().getUTCFullYear() ||
      (args.length !== 1 && args.length !== 2) || (args.length === 2 && (!Number.isInteger(limit) || limit < 1))) {
    throw new Error('Usage: npm run devlog:backfill -- YEAR [LIMIT]');
  }
  const first = Date.UTC(year, 0, 1);
  const last = Math.min(Date.UTC(year + 1, 0, 1), previousWeek(new Date()).end);
  const tokens = resolveTokens();
  const { events, truncated } = await publicEvents('Raruto', tokens.github);
  if (truncated) console.warn('GitHub public events are truncated; historical contributions omit some activity types.');
  archiveAllEvents(events, truncated);
  const months = [];
  for (const start of monthsBetween(first, last)) {
    const end = Math.min(nextMonth(start), last);
    const entries = await cachedContributions('Raruto', tokens.github, start, end);
    months.push({ start, end });
    console.log(`Saved ${new Date(start).toISOString().slice(0, 7)}: ${entries.length} public contributions`);
  }
  let generated = 0;
  for (const { start, end } of months) {
    if (generated >= limit) break;
    if (fs.existsSync(monthPaths(start).published)) continue;
    const { data } = readMonth(start);
    const allEntries = monthEntries(data, start, end);
    if (!allEntries.length) continue;
    const file = publishMonth(start, renderMonth(allEntries, start, end, tokens.copilot));
    generated++;
    console.log(`Wrote ${file}`);
  }
  console.log(`Generated ${generated} devlogs; existing article text was not changed.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { contributions, cachedContributions, monthSummary, renderMonth };
