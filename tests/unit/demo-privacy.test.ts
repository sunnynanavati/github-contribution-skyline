import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDemoContributions } from '../../demo/src/data/synthetic';
import { normalizeContributions } from '../../src/core/data';
import { resolvePersonalPreview } from '../../demo/preview';

describe('account-free demo', () => {
  it('generates reproducible synthetic days without profile metadata', () => {
    const days = createDemoContributions();
    expect(days).toEqual(createDemoContributions());
    expect(days).toHaveLength(371);
    expect(normalizeContributions(days).weeks).toBe(53);
    for (const day of days) {
      expect(Object.keys(day).sort()).toEqual(['count', 'date']);
      expect(Number.isSafeInteger(day.count)).toBe(true);
      expect(day.count).toBeGreaterThanOrEqual(0);
      expect(day.count).toBeLessThanOrEqual(30);
    }
  });

  it('ships no saved account calendar and passes no account identity into the demo', () => {
    expect(readdirSync('demo/src/data')).toEqual(['synthetic.ts']);
    for (const file of ['demo/src/App.tsx', 'demo/src/Consumer.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('createDemoContributions');
      expect(source).not.toMatch(/username=["']|previewData|fetchGitHubContributions|\.json['"]/);
    }
  });

  it('never reads a personal calendar unless explicitly enabled', () => {
    expect(resolvePersonalPreview(false, () => { throw new Error('Must not read a private file'); })).toBeNull();
  });

  it('allowlists preview fields and validates the calendar', () => {
    const snapshot = { username: 'example-user', totalContributions: 7,
      contributions: [{ date: '2026-01-01', count: 7 }], token: 'not-a-credential', privateMetadata: 'exclude' };
    const preview = resolvePersonalPreview(true, () => snapshot)!;
    expect(Object.keys(preview).sort()).toEqual(['contributions', 'totalContributions', 'username']);
    expect(preview.contributions).toEqual([{ date: '2026-01-01', count: 7, level: 1 }]);
    expect(() => resolvePersonalPreview(true, () => ({ ...snapshot, totalContributions: -1 }))).toThrow();
    expect(() => resolvePersonalPreview(true, () => ({ ...snapshot, username: '<script>' }))).toThrow();
    expect(() => resolvePersonalPreview(true, () => ({ ...snapshot, contributions: [{ date: 'bad', count: 1 }] }))).toThrow();
  });
});
