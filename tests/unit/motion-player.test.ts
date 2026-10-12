import { afterEach, expect, it, vi } from 'vitest';
import { MotionPlayer } from '../../demo/src/motion/MotionPlayer';
import { normalizeContributions } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { installDomMocks } from './setup';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('pauses offscreen, resumes without a time jump, and disposes observers, frames, and listeners', () => {
  installDomMocks();
  const disconnect = vi.fn();
  let intersection!: (entries: { isIntersecting: boolean }[]) => void;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
  const frames = new Map<number, FrameRequestCallback>(); let next = 0; let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++next, fn); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const root = document.createElement('div');
  Object.defineProperties(root, { clientWidth: { value: 900 }, clientHeight: { value: 520 } });
  const player = new MotionPlayer(root, document.createElement('canvas'), document.createElement('div'), document.createElement('p'), {
    profile: 'elastic', grid: normalizeContributions([{ date: '2026-09-26', count: 8 }]), palette: SKYLINE_PALETTES.red,
    buildingDetail: false, heightScale: 1, speed: 1,
  }, () => {});
  const tick = () => {
    now += 16;
    const entry = frames.entries().next().value;
    if (entry) { frames.delete(entry[0]); entry[1](now); }
  };
  player.replay(); for (let i = 0; i < 15; i += 1) tick();
  const time = Number(root.dataset.time);
  intersection([{ isIntersecting: false }]); expect(frames.size).toBe(0);
  now += 5000;
  intersection([{ isIntersecting: true }]); tick();
  expect(Number(root.dataset.time) - time).toBeLessThanOrEqual(17);
  for (let i = 0; i < 60; i += 1) tick();
  expect(frames.size).toBe(0); expect(root.dataset.time).toBe('600');
  player.toGraph(false); expect(frames.size).toBe(1);
  player.destroy(); expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledTimes(2);
  const draws = root.dataset.draws;
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  window.dispatchEvent(new Event('resize'));
  expect(root.dataset.draws).toBe(draws); expect(frames.size).toBe(0);
});
