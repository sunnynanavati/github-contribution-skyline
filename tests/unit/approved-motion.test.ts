import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SKYLINE_DEFAULTS } from '../../src/core/defaults';
import { calculateSkylineGeometry, collapsePhase, heightFactor, leanPulse, poseTimeFor, SplatPlayhead } from '../../src/core/animation';
import { calculateBuildingHeight } from '../../src/core/buildings';
import { SkylineScene } from '../../src/core/SkylineScene';
import { normalizeContributions, fromGitHubContributionCalendar } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import snapshot from '../../demo/src/data/sunnynanavati.json';

function capture() {
  const ops: unknown[][] = [];
  const context: any = { globalAlpha: 1 };
  for (const method of ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'save', 'restore', 'translate', 'scale']) {
    context[method] = (...args: unknown[]) => ops.push([method, ...args.map(v => typeof v === 'number' ? Number(v.toFixed(5)) : v), ...(method === 'fill' ? [context.fillStyle, context.globalAlpha] : [])]);
  }
  return { context: context as CanvasRenderingContext2D, ops };
}

describe('approved production splat', () => {
  it('preserves the full saved Chrome configuration', () => {
    expect(SKYLINE_DEFAULTS).toEqual({
      forwardMs: 650, returnMs: 650, linkedTiming: true, reversalMs: 80,
      waveStart: .075, waveSpread: .6, compression: .135, easing: 'quick',
      lean: .35, widening: .055, rebound: 0,
      heightScale: 1.4, heightCurve: .75, minimumHeight: .12,
      footprint: .8, graphFill: .78, buildingDetail: true,
      pitch: 30, cameraTurn: 1, cameraRise: 1,
      showHeader: true, showLegend: true, showLabels: true,
    });
    expect(Object.isFrozen(SKYLINE_DEFAULTS)).toBe(true);
  });

  it('matches 288 approved reference frames, including roof details and every palette', () => {
    // Fingerprint recorded from the separately approved experiment before promotion.
    // This covers two viewport sizes, both detail states, six palettes, and 12 poses.
    const hash = createHash('sha256');
    const grid = normalizeContributions(fromGitHubContributionCalendar(snapshot.calendar));
    for (const [width, height] of [[1118, 620], [375, 520]]) for (const detail of [false, true]) for (const palette of Object.values(SKYLINE_PALETTES)) {
      const geometry = calculateSkylineGeometry(width!, height!, grid.weeks, 1.4);
      const scene = new SkylineScene(grid, geometry, palette, 1.4, detail);
      for (const time of [0, 60, 120, 180, 250, 300, 360, 420, 540, 648, 720, 800]) {
        const { context, ops } = capture();
        scene.draw(context, time);
        hash.update(JSON.stringify(ops));
      }
    }
    expect(hash.digest('hex')).toBe('1c4dbe97d4ce580e194fb65833b3966d05fd49698a26f85524e73068fe495962');
  });

  it('keeps a flat center while the collapse boundary travels to the edges', () => {
    for (const ms of [180, 240, 300, 400]) {
      expect(heightFactor(collapsePhase(poseTimeFor(ms), 0))).toBe(0);
      expect(heightFactor(collapsePhase(poseTimeFor(ms), 1))).toBe(1);
    }
    expect(heightFactor(collapsePhase(poseTimeFor(526.5), 1))).toBe(0);
    for (let phase = 0; phase <= 1; phase += .01) expect(leanPulse(phase)).toBeGreaterThanOrEqual(0);
  });

  it('uses exact counts and a relative cap instead of height buckets', () => {
    for (const compact of [true, false]) for (const scale of [.4, 1, 1.4, 2]) {
      let previous = 0;
      for (let count = 1; count <= 100; count++) {
        const height = calculateBuildingHeight(count, 100, scale, compact);
        expect(height).toBeGreaterThan(previous);
        expect(height).toBeCloseTo(calculateBuildingHeight(count * 10, 1000, scale, compact), 10);
        previous = height;
      }
      expect(previous).toBeCloseTo((compact ? 66 : 78) * scale);
      expect(calculateBuildingHeight(0, 100, scale, compact)).toBe(2.2);
    }
  });

  it('has symmetric timing, smooth interruptions, and exact finite endpoints', () => {
    const forward = new SplatPlayhead(), reverse = new SplatPlayhead();
    forward.retarget(650); reverse.seek(650); reverse.retarget(0);
    for (let elapsed = 0; elapsed <= 650; elapsed += 10) {
      expect(forward.time).toBe(elapsed); expect(reverse.time).toBe(650 - elapsed);
      forward.advance(10); reverse.advance(10);
    }
    expect(forward.settled && reverse.settled).toBe(true);
    forward.retarget(0); forward.advance(200);
    const pose = forward.time, speed = forward.velocity;
    forward.retarget(650);
    expect(forward.time).toBe(pose); expect(forward.velocity).toBe(speed);
    forward.advance(40); expect(forward.velocity).toBeCloseTo(0);
    forward.advance(40); expect(forward.velocity).toBe(1);
    forward.advance(1000); expect(forward.time).toBe(650); expect(forward.settled).toBe(true);
    forward.seek(0); forward.retarget(650); forward.retarget(0);
    expect(forward.settled).toBe(true);
  });
});
