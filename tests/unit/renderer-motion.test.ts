import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SkylineRenderer, type SkylineRendererOptions } from '../../src/core/SkylineRenderer';
import { SkylineScene } from '../../src/core/SkylineScene';
import { normalizeContributions } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { installDomMocks } from './setup';

let now = 0, id = 0;
let frames: Map<number, FrameRequestCallback>;
function tick(dt: number) {
  now += dt;
  const pending = [...frames]; frames.clear();
  for (const [, frame] of pending) frame(now);
}
function create(options: Partial<SkylineRendererOptions> = {}) {
  return new SkylineRenderer(document.createElement('canvas'), document.createElement('div'), {
    grid: normalizeContributions([{ date: '2026-09-26', count: 15 }]),
    palette: SKYLINE_PALETTES.red, heightScale: 1.4, buildingDetail: true,
    transparentBackground: true, showLabels: true, maxDevicePixelRatio: 2,
    initialView: 'skyline', reducedMotion: false, ...options,
  });
}
beforeEach(() => {
  installDomMocks(); now = 0; id = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => { frames.set(++id, frame); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('finishes at 650ms in both directions and does not continue drawing at rest', () => {
  const onViewChange = vi.fn();
  const renderer = create({ onViewChange });
  renderer.setView('graph'); tick(649);
  expect(renderer.isAnimating()).toBe(true); expect(onViewChange).not.toHaveBeenCalled();
  tick(1); expect(onViewChange).toHaveBeenLastCalledWith('graph'); expect(frames.size).toBe(0);
  renderer.setView('skyline'); tick(649); expect(renderer.isAnimating()).toBe(true);
  tick(1); expect(onViewChange).toHaveBeenLastCalledWith('skyline'); expect(frames.size).toBe(0);
  renderer.destroy();
});

it('does not restart the pose when height, detail, or palette changes mid-flight', () => {
  const draw = vi.spyOn(SkylineScene.prototype, 'draw');
  const renderer = create(); renderer.setView('graph'); tick(200);
  const pose = draw.mock.lastCall![1];
  renderer.update({ heightScale: 1.7, palette: SKYLINE_PALETTES.blue, buildingDetail: false });
  expect(draw.mock.lastCall![1]).toBe(pose); expect(frames.size).toBe(1);
  tick(450); expect(renderer.isAnimating()).toBe(false);
  renderer.destroy();
});

it('keeps offscreen state across document visibility events and resumes without a time jump', () => {
  const draw = vi.spyOn(SkylineScene.prototype, 'draw');
  const renderer = create(); renderer.setView('graph'); tick(100);
  const pose = draw.mock.lastCall![1];
  renderer.setActive(false); tick(10000); expect(frames.size).toBe(0);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(0);
  renderer.setActive(true); tick(16);
  expect(draw.mock.lastCall![1]).toBeCloseTo(pose + 16 * 800 / 650);
  renderer.destroy(); expect(frames.size).toBe(0);
});

it('settles immediately when reduced motion changes during playback and cleans up', () => {
  const renderer = create(); renderer.setView('graph'); tick(120);
  renderer.update({ reducedMotion: true });
  expect(renderer.getView()).toBe('graph'); expect(renderer.isAnimating()).toBe(false);
  renderer.setView('skyline'); expect(renderer.isAnimating()).toBe(false);
  renderer.destroy(); renderer.setView('graph'); renderer.update({ heightScale: 2 });
  expect(frames.size).toBe(0);
});

it('stops an enter/leave within one frame and never selects moving cells', () => {
  const renderer = create(); renderer.setView('graph'); renderer.setView('skyline');
  expect(frames.size).toBe(0);
  renderer.setView('graph'); tick(400);
  expect(renderer.hitTest(450, 250)).toBeNull();
  renderer.destroy();
});
