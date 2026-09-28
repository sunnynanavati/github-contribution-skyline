import type {
  ContributionDay,
  ContributionGrid,
  ContributionLevel,
  GitHubContributionCalendar,
  NormalizedContributionDay,
} from './types';

const DAY_MS = 86_400_000;
const LEVEL_MAP: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export function parseUTCDate(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid contribution date: ${date}`);
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new Error(`Invalid contribution date: ${date}`);
  return value;
}

export function formatUTCDate(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function deriveContributionLevels(counts: readonly number[]): ContributionLevel[] {
  const positive = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (!positive.length) return counts.map(() => 0);
  const threshold = (percentile: number) => positive[Math.min(positive.length - 1, Math.floor((positive.length - 1) * percentile))] ?? 0;
  const q1 = threshold(0.25);
  const q2 = threshold(0.5);
  const q3 = threshold(0.75);
  return counts.map((count): ContributionLevel => {
    if (count <= 0) return 0;
    if (count <= q1) return 1;
    if (count <= q2) return 2;
    if (count <= q3) return 3;
    return 4;
  });
}

export function normalizeContributions(input: readonly ContributionDay[], weekStartsOn: 0 | 1 = 0): ContributionGrid {
  if (!Array.isArray(input)) throw new Error('contributions must be an array.');
  if (!input.length) return { days: [], weeks: 0, startDate: null, endDate: null, totalContributions: 0 };

  const merged = new Map<number, { date: string; count: number; level?: ContributionLevel }>();
  for (const item of input) {
    const dateValue = parseUTCDate(item.date);
    if (!Number.isFinite(item.count) || item.count < 0 || !Number.isInteger(item.count)) throw new Error(`Invalid contribution count for ${item.date}.`);
    if (item.level !== undefined && (!Number.isInteger(item.level) || item.level < 0 || item.level > 4)) throw new Error(`Invalid contribution level for ${item.date}.`);
    const prior = merged.get(dateValue);
    merged.set(dateValue, {
      date: item.date,
      count: (prior?.count ?? 0) + item.count,
      level: item.level ?? prior?.level,
    });
  }

  const values = [...merged.entries()].sort(([a], [b]) => a - b);
  const firstValue = values[0]?.[0];
  const lastValue = values.at(-1)?.[0];
  if (firstValue === undefined || lastValue === undefined) return { days: [], weeks: 0, startDate: null, endDate: null, totalContributions: 0 };
  if (lastValue - firstValue > DAY_MS * 377) throw new Error('Contribution data must span no more than 378 days.');

  const firstWeekday = new Date(firstValue).getUTCDay();
  const startOffset = (firstWeekday - weekStartsOn + 7) % 7;
  const start = firstValue - startOffset * DAY_MS;
  const lastWeekday = new Date(lastValue).getUTCDay();
  const lastRow = (lastWeekday - weekStartsOn + 7) % 7;
  const end = lastValue + (6 - lastRow) * DAY_MS;
  const totalDays = Math.round((end - start) / DAY_MS) + 1;
  const weeks = Math.ceil(totalDays / 7);
  if (weeks > 54) throw new Error('Normalized contribution data exceeds 54 weeks.');

  const mergedValues = [...merged.values()];
  const derived = deriveContributionLevels(mergedValues.map((item) => item.count));
  const derivedByDate = new Map(mergedValues.map((item, index) => [item.date, derived[index] ?? 0]));
  const days: NormalizedContributionDay[] = [];
  for (let value = start, index = 0; value <= end; value += DAY_MS, index += 1) {
    const date = formatUTCDate(value);
    const provided = merged.get(value);
    days.push({
      date,
      dateValue: value,
      count: provided?.count ?? 0,
      level: provided?.level ?? derivedByDate.get(date) ?? 0,
      weekday: index % 7,
      weekIndex: Math.floor(index / 7),
      source: provided ? 'provided' : 'filled',
    });
  }

  return {
    days,
    weeks,
    startDate: days[0]?.date ?? null,
    endDate: days.at(-1)?.date ?? null,
    totalContributions: mergedValues.reduce((sum, day) => sum + day.count, 0),
  };
}

export function fromGitHubContributionCalendar(calendar: GitHubContributionCalendar): ContributionDay[] {
  if (!calendar || !Array.isArray(calendar.weeks)) throw new Error('Invalid GitHub contribution calendar.');
  return calendar.weeks.flatMap((week) => week.contributionDays.map((day) => ({
    date: day.date,
    count: day.contributionCount,
    level: day.contributionLevel ? LEVEL_MAP[day.contributionLevel] : undefined,
  })));
}
