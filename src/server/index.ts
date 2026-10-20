import { fromGitHubContributionCalendar, normalizeContributions } from '../core/data.js';
import type { ContributionDay, GitHubContributionCalendar } from '../core/types.js';

export interface FetchGitHubContributionsOptions {
  username: string;
  /** Read from a server environment variable. Never pass this to a client component. */
  token: string;
  /** Omit for GitHub's rolling contribution year. */
  year?: number;
  signal?: AbortSignal;
}

export interface GitHubContributions {
  username: string;
  contributions: ContributionDay[];
  totalContributions: number;
}

const query = `query SkylineContributions($login: String!, $from: DateTime, $to: DateTime) {
  user(login: $login) {
    login
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

/** Optional server/build-time helper. The renderer never performs network requests. */
export async function fetchGitHubContributions(options: FetchGitHubContributionsOptions): Promise<GitHubContributions> {
  if (typeof window !== 'undefined') throw new Error('Load GitHub contributions on a server or during a build. Never expose a GitHub token in the browser.');
  const { username, token, year, signal } = options;
  if (typeof username !== 'string' || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) || username.includes('--')) throw new Error('Provide a valid GitHub username.');
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token)) throw new Error('Set GITHUB_TOKEN in the server environment.');
  if (year !== undefined && (!Number.isInteger(year) || year < 2008 || year > new Date().getUTCFullYear())) throw new Error('year must be a GitHub contribution year between 2008 and the current year.');
  const variables = {
    login: username,
    ...(year === undefined ? {} : { from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` }),
  };
  let response: Response;
  try {
    response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      redirect: 'error',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    });
  } catch {
    // Do not include transport errors or request objects: they may contain credentials.
    throw new Error('GitHub request failed or timed out. Check connectivity and retry from the server.');
  }
  if (response.status === 401) throw new Error('GitHub authentication failed. Check the server token.');
  if (response.status === 403 || response.status === 429) throw new Error('GitHub denied or rate-limited the request. Check token permissions and retry later.');
  if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('GitHub returned an invalid JSON response.'); }
  if (!payload || typeof payload !== 'object' || payload.errors?.length) throw new Error('GitHub could not load the contribution calendar. Check the username and token permissions.');
  const user = payload.data?.user;
  if (!user) throw new Error('GitHub user was not found or is unavailable to this token.');
  if (typeof user.login !== 'string' || user.login.toLowerCase() !== username.toLowerCase()) throw new Error('GitHub returned a different user than requested.');
  const calendar = user.contributionsCollection?.contributionCalendar as GitHubContributionCalendar | undefined;
  let contributions: ContributionDay[];
  let totalContributions: number;
  try {
    contributions = fromGitHubContributionCalendar(calendar!);
    const grid = normalizeContributions(contributions);
    totalContributions = calendar!.totalContributions ?? grid.totalContributions;
    if (!Number.isSafeInteger(totalContributions) || totalContributions < 0) throw new Error();
  } catch { throw new Error('GitHub returned an invalid contribution calendar.'); }
  return { username: user.login, contributions, totalContributions };
}
