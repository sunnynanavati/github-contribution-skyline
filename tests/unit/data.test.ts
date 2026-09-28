import { describe, expect, it } from 'vitest';

import { deriveContributionLevels, fromGitHubContributionCalendar, normalizeContributions, parseUTCDate } from '../../src/core/data';

describe('contribution data', () => {
  it('normalizes UTC dates, fills missing days, and aligns complete weeks', () => {
    const grid = normalizeContributions([
      { date: '2026-09-01', count: 2 },
      { date: '2026-09-03', count: 6 },
    ]);
    expect(grid.days).toHaveLength(7);
    expect(grid.startDate).toBe('2026-08-30');
    expect(grid.endDate).toBe('2026-09-05');
    expect(grid.days.find((day) => day.date === '2026-09-02')).toMatchObject({ count: 0, source: 'filled' });
  });

  it('merges duplicate days deterministically', () => {
    const grid = normalizeContributions([
      { date: '2026-09-01', count: 2, level: 1 },
      { date: '2026-09-01', count: 5, level: 3 },
    ]);
    expect(grid.days.find((day) => day.date === '2026-09-01')).toMatchObject({ count: 7, level: 3 });
    expect(grid.totalContributions).toBe(7);
  });

  it('rejects invalid dates, counts, and spans over 54 weeks', () => {
    expect(() => parseUTCDate('2026-02-30')).toThrow('Invalid contribution date');
    expect(() => normalizeContributions([{ date: '2026-09-01', count: -1 }])).toThrow('Invalid contribution count');
    expect(() => normalizeContributions([
      { date: '2025-01-01', count: 1 },
      { date: '2026-02-01', count: 1 },
    ])).toThrow('no more than 378 days');
  });

  it('derives stable relative levels from exact counts', () => {
    expect(deriveContributionLevels([0, 1, 2, 3, 9])).toEqual([0, 1, 2, 3, 4]);
  });

  it('adapts GitHub GraphQL calendar data without fetching', () => {
    expect(fromGitHubContributionCalendar({
      totalContributions: 8,
      weeks: [{ contributionDays: [
        { date: '2026-09-01', contributionCount: 0, contributionLevel: 'NONE' },
        { date: '2026-09-02', contributionCount: 8, contributionLevel: 'FOURTH_QUARTILE' },
      ] }],
    })).toEqual([
      { date: '2026-09-01', count: 0, level: 0 },
      { date: '2026-09-02', count: 8, level: 4 },
    ]);
  });
});
