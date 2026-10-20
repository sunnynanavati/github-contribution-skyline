import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDemoContributions } from '../../demo/src/data/synthetic';
import { normalizeContributions } from '../../src/core/data';

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
      expect(source).not.toMatch(/username=|previewData|fetchGitHubContributions|\.json['"]/);
    }
  });
});
