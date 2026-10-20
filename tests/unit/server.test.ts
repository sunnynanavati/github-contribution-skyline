// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGitHubContributions } from '../../src/server/index';

const calendar = { totalContributions: 8, weeks: [{ contributionDays: [
  { date: '2026-09-01', contributionCount: 0, contributionLevel: 'NONE' },
  { date: '2026-09-02', contributionCount: 8, contributionLevel: 'FOURTH_QUARTILE' },
] }] };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const payload = (login = 'octocat', value: unknown = calendar) => ({ data: { user: { login, contributionsCollection: { contributionCalendar: value } } } });
let request: ReturnType<typeof vi.fn>;
beforeEach(() => { request = vi.fn().mockResolvedValue(response(payload())); vi.stubGlobal('fetch', request); });
afterEach(() => vi.unstubAllGlobals());
const options = { username: 'octocat', token: 'test-token' };

describe('server GitHub loader', () => {
  it('returns the requested user and exact contribution data with credentials only in the request header', async () => {
    const result = await fetchGitHubContributions(options);
    expect(result).toEqual({ username: 'octocat', totalContributions: 8, contributions: [
      { date: '2026-09-01', count: 0, level: 0 }, { date: '2026-09-02', count: 8, level: 4 },
    ] });
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/graphql');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.redirect).toBe('error'); expect(init.cache).toBe('no-store');
    expect(init.body).not.toContain(options.token);
    expect(JSON.stringify(result)).not.toContain(options.token);
    expect(JSON.parse(init.body).variables).toEqual({ login: 'octocat' });
  });

  it('supports explicit calendar years and canonical username casing', async () => {
    request.mockResolvedValueOnce(response(payload('Octocat')));
    expect((await fetchGitHubContributions({ ...options, year: 2024 })).username).toBe('Octocat');
    expect(JSON.parse(request.mock.calls[0]![1].body).variables).toEqual({
      login: 'octocat', from: '2024-01-01T00:00:00Z', to: '2024-12-31T23:59:59Z',
    });
  });

  it('rejects browser execution before attempting a request', async () => {
    vi.stubGlobal('window', {});
    await expect(fetchGitHubContributions(options)).rejects.toThrow('server');
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects malformed usernames, missing tokens, and invalid years locally', async () => {
    for (const username of ['', '-octocat', 'cat--dog', 'a'.repeat(40), 'cat\nquery', 'cat/user']) {
      await expect(fetchGitHubContributions({ ...options, username })).rejects.toThrow('username');
    }
    await expect(fetchGitHubContributions({ ...options, token: '' })).rejects.toThrow('GITHUB_TOKEN');
    await expect(fetchGitHubContributions({ ...options, token: 'bad\r\nheader' })).rejects.toThrow('GITHUB_TOKEN');
    for (const year of [2007, 2024.5, NaN, new Date().getUTCFullYear() + 1]) {
      await expect(fetchGitHubContributions({ ...options, year })).rejects.toThrow('year');
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('redacts request failures and GraphQL error bodies', async () => {
    request.mockRejectedValueOnce(new Error(`Authorization: Bearer ${options.token}`));
    await expect(fetchGitHubContributions(options)).rejects.toThrow('failed or timed out');
    request.mockResolvedValueOnce(response({ errors: [{ message: options.token }] }));
    try { await fetchGitHubContributions(options); throw new Error('Expected failure'); }
    catch (error) { expect(String(error)).not.toContain(options.token); }
  });

  it.each([401, 403, 429, 500])('returns an actionable, safe HTTP %s error', async status => {
    request.mockResolvedValueOnce(response({ message: options.token }, status));
    await expect(fetchGitHubContributions(options)).rejects.toThrow(/GitHub/);
  });

  it('rejects missing users, mismatched users, and invalid calendars', async () => {
    for (const value of [null, { data: { user: null } }, payload('someone-else'), payload('octocat', {}),
      payload('octocat', { ...calendar, totalContributions: -1 }),
      payload('octocat', { weeks: [{ contributionDays: [{ date: '2026-02-30', contributionCount: 1 }] }] })]) {
      request.mockResolvedValueOnce(response(value));
      await expect(fetchGitHubContributions(options)).rejects.toThrow('GitHub');
    }
    request.mockResolvedValueOnce(new Response('not JSON'));
    await expect(fetchGitHubContributions(options)).rejects.toThrow('JSON');
  });

  it('respects an already aborted request without forwarding abort reasons into error messages', async () => {
    const controller = new AbortController(); controller.abort('sensitive-reason');
    request.mockImplementationOnce((_url, init) => {
      expect(init.signal.aborted).toBe(true); throw new Error(init.signal.reason);
    });
    await expect(fetchGitHubContributions({ ...options, signal: controller.signal })).rejects.toThrow('failed or timed out');
  });
});
