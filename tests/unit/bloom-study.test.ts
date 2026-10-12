import { describe, expect, it } from 'vitest';
import { BLOOM_PLAYBACK, bloomCamera, collapsePhase, heightFactor, leanPulse, MotionPlayhead, poseTimeFor, radialDistance, roofSpread, studyGeometry } from '../../demo/src/motion/choreography';
import { BloomScene } from '../../demo/src/motion/BloomScene';
import { makeFixture } from '../../demo/src/fixture';
import { normalizeContributions } from '../../src/core/data';
import { calculateGeometry, flatCorners, isoPoint } from '../../src/core/geometry';
import { SKYLINE_PALETTES } from '../../src/core/palettes';

function capture() {
  const polygons: number[][] = [];
  let current: number[] = [];
  const context = {
    globalAlpha: 1, fillStyle: '',
    beginPath: () => { current = []; },
    moveTo: (x: number, y: number) => current.push(x, y),
    lineTo: (x: number, y: number) => current.push(x, y),
    closePath: () => {},
    fill: () => polygons.push([...current]),
  } as unknown as CanvasRenderingContext2D;
  return { context, polygons };
}

describe('Bloom comparison choreography', () => {
  it('has a landed center, active front, and untouched outer buildings together', () => {
    expect(heightFactor(collapsePhase(250, 0))).toBe(0);
    expect(heightFactor(collapsePhase(250, 0.5))).toBeGreaterThan(0.8);
    expect(heightFactor(collapsePhase(250, 1))).toBe(1);
    expect(heightFactor(collapsePhase(360, 0.5))).toBeLessThan(0.1);
    expect(heightFactor(collapsePhase(360, 1))).toBe(1);
    expect(heightFactor(collapsePhase(540, 1))).toBe(0);
  });
  it('fans out by geometric distance, symmetrically across 1–54 weeks', () => {
    for (const weeks of [1, 12, 52, 53, 54]) for (let week = 0; week < weeks; week += 1) for (let row = 0; row < 7; row += 1) {
      const distance = radialDistance(week, row, weeks);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(1);
      expect(distance).toBeCloseTo(radialDistance(weeks - 1 - week, 6 - row, weeks), 10);
    }
  });
  it('bounds outward deformation and completely removes it on landing', () => {
    let negativeSamples = 0;
    for (let i = 0; i <= 180; i += 1) {
      const t = i / 180;
      expect(leanPulse(t)).toBeLessThanOrEqual(1);
      expect(leanPulse(t)).toBeGreaterThanOrEqual(-0.08);
      expect(roofSpread(t)).toBeLessThanOrEqual(1.08);
      expect(roofSpread(t)).toBeGreaterThanOrEqual(1);
      if (leanPulse(t) < 0) negativeSamples += 1;
    }
    expect(negativeSamples).toBeGreaterThan(0);
    expect(leanPulse(0)).toBe(0); expect(leanPulse(1)).toBe(0);
    expect(roofSpread(0)).toBe(1); expect(roofSpread(1)).toBe(1);
  });
  it('keeps exact endpoint projections and a rigid camera grid throughout', () => {
    const g = calculateGeometry(1118, 620, 53);
    for (let time = 0; time <= 800; time += 8) {
      const c = bloomCamera(time, g, 53);
      expect(c.xx * c.yy - c.xy * c.yx).toBeGreaterThan(0);
      const project = (x: number, y: number) => ({ x: c.x + (x - 26.5) * c.xx + (y - 3.5) * c.xy, y: c.y + (x - 26.5) * c.yx + (y - 3.5) * c.yy });
      const a = project(10, 3); const b = project(11, 3); const d = project(12, 3);
      expect(b.x - a.x).toBeCloseTo(d.x - b.x, 8);
      expect(b.y - a.y).toBeCloseTo(d.y - b.y, 8);
      if (time === 0) { expect(a.x).toBeCloseTo(isoPoint(10, 3, 0, g).x, 8); expect(a.y).toBeCloseTo(isoPoint(10, 3, 0, g).y, 8); }
      if (time === 800) { expect(c.z).toBe(0); expect(a.x).toBeCloseTo(g.flatLeft + 10 * g.flatCell, 8); }
    }
  });
  it('preserves position and velocity when interrupted, then stops exactly', () => {
    const clock = new MotionPlayhead();
    clock.retarget(600); clock.advance(240);
    const time = clock.time; const velocity = clock.velocity;
    clock.retarget(0);
    expect(clock.time).toBe(time); expect(clock.velocity).toBe(velocity);
    clock.advance(16);
    expect(clock.velocity).toBeLessThan(velocity);
    expect(clock.velocity).toBeGreaterThan(0);
    clock.advance(64); expect(clock.velocity).toBe(-1);
    clock.retarget(600);
    for (let i = 0; i < 100; i += 1) clock.advance(16);
    expect(clock.time).toBe(600); expect(clock.settled).toBe(true);
    clock.retarget(0); clock.advance(2000);
    expect(clock.time).toBe(0); expect(clock.settled).toBe(true);
  });
  it('is frame-rate independent, including irregular frames and scrubbing', () => {
    const a = new MotionPlayhead(); const b = new MotionPlayhead();
    a.retarget(600); b.retarget(600);
    for (let i = 0; i < 20; i += 1) a.advance(16);
    for (const dt of [5, 43, 92, 17, 163]) b.advance(dt);
    expect(a.time).toBeCloseTo(b.time, 8);
    b.seek(250); expect(b.time).toBe(250); expect(b.settled).toBe(true);
  });
  it('preserves the readable splat instead of speeding through its moving front', () => {
    expect(BLOOM_PLAYBACK.duration).toBe(600);
    expect(poseTimeFor(0, 'elastic')).toBe(0);
    expect(poseTimeFor(600, 'elastic')).toBe(800);
    let previous = -1;
    for (let time = 0; time <= 600; time += 1) {
      const pose = poseTimeFor(time, 'elastic');
      expect(pose).toBeGreaterThanOrEqual(previous);
      expect(pose).toBe(poseTimeFor(time, 'vertical'));
      previous = pose;
    }
    // At 30fps there must be several consecutive frames with a fully landed
    // center and untouched edges, not one fleeting frame that passes a test.
    const g = calculateGeometry(1118, 620, 53);
    let readableFrames = 0;
    let deformingFrames = 0;
    for (let time = 0; time <= 600; time += 1000 / 30) {
      const pose = poseTimeFor(time, 'elastic');
      const camera = bloomCamera(pose, g, 53);
      if (heightFactor(collapsePhase(pose, 0)) === 0 && heightFactor(collapsePhase(pose, 1)) === 1 && camera.z > 0.4) readableFrames += 1;
      if (leanPulse(collapsePhase(pose, 0.5)) > 0.2) deformingFrames += 1;
    }
    expect(readableFrames).toBeGreaterThanOrEqual(3);
    expect(deformingFrames).toBeGreaterThanOrEqual(2);
    // 225ms of propagation and 135ms of local compression: 360ms of visible
    // spread, followed by the camera's own eased finish (not a global warp).
    expect(poseTimeFor(45, 'elastic')).toBe(60);
    expect(poseTimeFor(270, 'elastic')).toBe(360);
    expect(poseTimeFor(405, 'elastic')).toBe(540);
    const front = poseTimeFor(225, 'elastic');
    expect(heightFactor(collapsePhase(front, 0))).toBe(0);
    expect(heightFactor(collapsePhase(front, 1))).toBe(1);
    expect(heightFactor(collapsePhase(front, 0.5))).toBeCloseTo(0.5);
    expect(poseTimeFor(240, 'baseline')).toBe(240);
  });
  it('does not stack a startup delay, and eases every interrupted reversal', () => {
    const clock = new MotionPlayhead();
    clock.retarget(600); clock.advance(16);
    expect(clock.time).toBe(16);
    for (let i = 0; i < 12; i += 1) {
      const time = clock.time; const velocity = clock.velocity;
      const pose = poseTimeFor(time, 'elastic');
      clock.retarget(i % 2 ? 600 : 0);
      expect(clock.time).toBe(time); expect(clock.velocity).toBe(velocity);
      expect(poseTimeFor(clock.time, 'elastic')).toBe(pose);
      clock.advance(16);
      expect(Math.abs(clock.time - time)).toBeLessThanOrEqual(16);
    }
    clock.retarget(600); clock.advance(1000);
    expect(clock.settled).toBe(true);
    clock.retarget(0); clock.advance(600);
    expect(clock.time).toBe(0); expect(clock.settled).toBe(true);
  });
  it('plays the return at exactly the forward pace without changing the splat', () => {
    const forward = new MotionPlayhead();
    const reverse = new MotionPlayhead();
    forward.retarget(600);
    reverse.seek(600); reverse.retarget(0);
    for (let elapsed = 0; elapsed <= 600; elapsed += 10) {
      expect(forward.time).toBe(elapsed);
      expect(reverse.time).toBe(600 - elapsed);
      expect(Math.abs(reverse.velocity)).toBe(Math.abs(forward.velocity));
      expect(poseTimeFor(forward.time, 'elastic') + poseTimeFor(reverse.time, 'elastic')).toBeCloseTo(800);
      if (elapsed < 600) {
        expect(forward.settled).toBe(false); expect(reverse.settled).toBe(false);
      }
      forward.advance(10); reverse.advance(10);
    }
    expect(forward.settled).toBe(true); expect(reverse.settled).toBe(true);
  });
  it('renders distinct intermediate bodies with identical opaque endpoints', () => {
    const grid = normalizeContributions(makeFixture());
    const g = calculateGeometry(1118, 620, grid.weeks);
    const scene = new BloomScene(grid, g, SKYLINE_PALETTES.red, 1, false);
    for (const time of [0, 800]) {
      const a = capture(); const b = capture();
      scene.draw(a.context, time, 'vertical'); scene.draw(b.context, time, 'elastic');
      expect(a.polygons).toEqual(b.polygons);
      expect(a.context.globalAlpha).toBe(1);
      if (time === 800) {
        expect(a.polygons).toHaveLength(grid.days.length);
        const expected = grid.days.map(day => flatCorners(day.weekIndex, day.weekday, g).flatMap(p => [p.x, p.y]).map(v => v.toFixed(4)).join(','));
        expect(a.polygons.map(p => p.map(v => v.toFixed(4)).join(',')).sort()).toEqual(expected.sort());
      }
    }
    const a = capture(); const b = capture();
    scene.draw(a.context, 240, 'vertical'); scene.draw(b.context, 240, 'elastic');
    expect(a.polygons).not.toEqual(b.polygons);
    expect(b.polygons.flat().every(Number.isFinite)).toBe(true);
    const repeated = capture(); scene.draw(repeated.context, 240, 'elastic');
    expect(repeated.polygons).toEqual(b.polygons);
  });
  it('keeps the full dense skyline inside desktop and mobile bounds at every height scale', () => {
    const grid = normalizeContributions(makeFixture().map(day => ({ ...day, count: 40, level: 4 as const })));
    for (const [width, height] of [[1118, 620], [360, 320], [375, 520], [282, 496]]) for (const scale of [0.4, 1, 2]) {
      const scene = new BloomScene(grid, studyGeometry(width!, height!, grid.weeks, scale), SKYLINE_PALETTES.red, scale, false);
      for (let time = 0; time <= 800; time += 40) {
        const frame = capture(); scene.draw(frame.context, time, 'elastic');
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        for (const points of frame.polygons) for (let index = 0; index < points.length; index += 2) {
          minX = Math.min(minX, points[index]!); maxX = Math.max(maxX, points[index]!);
          minY = Math.min(minY, points[index + 1]!); maxY = Math.max(maxY, points[index + 1]!);
        }
        expect(minX).toBeGreaterThanOrEqual(0); expect(maxX).toBeLessThanOrEqual(width!);
        expect(minY).toBeGreaterThanOrEqual(0); expect(maxY).toBeLessThanOrEqual(height!);
      }
    }
  });
});
