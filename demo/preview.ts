import { normalizeContributions } from '../src/core/data';
import type { GitHubContributions } from '../src/server';

/** Opt-in demo data only. Default builds never even read a personal snapshot. */
export function resolvePersonalPreview(enabled: boolean, readSnapshot: () => unknown): GitHubContributions | null {
  if (!enabled) return null;
  const value = readSnapshot() as Partial<GitHubContributions> | null;
  if (!value || typeof value.username !== 'string' || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value.username) || value.username.includes('--')) {
    throw new Error('Provide a valid demo snapshot with a GitHub username.');
  }
  if (!Array.isArray(value.contributions) || !value.contributions.length) throw new Error('The demo snapshot needs contribution days.');
  const grid = normalizeContributions(value.contributions);
  if (!Number.isSafeInteger(value.totalContributions) || value.totalContributions! < 0) throw new Error('The demo snapshot needs a valid total.');
  // Explicit allowlist: never embed extra fields, source metadata, or credentials.
  return {
    username: value.username,
    totalContributions: value.totalContributions!,
    contributions: grid.days.filter(day => day.source === 'provided').map(day => ({ date: day.date, count: day.count, level: day.level })),
  };
}
