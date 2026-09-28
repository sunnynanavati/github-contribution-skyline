import { beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeContributions } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { SkylineRenderer } from '../../src/core/SkylineRenderer';
import { installDomMocks } from './setup';

describe('renderer lifecycle', () => {
  beforeEach(() => installDomMocks());

  it('stops requesting frames after a transition settles', () => {
    let nextId = 1;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const onViewChange = vi.fn();
    const canvas = document.createElement('canvas');
    const container = document.createElement('div');
    const renderer = new SkylineRenderer(canvas, container, {
      grid: normalizeContributions([{ date: '2026-09-26', count: 5 }]),
      palette: SKYLINE_PALETTES.green,
      heightScale: 1,
      buildingDetail: true,
      showLabels: true,
      maxDevicePixelRatio: 2,
      initialView: 'skyline',
      reducedMotion: false,
      onViewChange,
    });

    renderer.setView('graph');
    let time = performance.now();
    for (let count = 0; frames.size && count < 120; count += 1) {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) break;
      frames.delete(entry[0]);
      time += 16.67;
      entry[1](time);
    }

    expect(renderer.isAnimating()).toBe(false);
    expect(frames.size).toBe(0);
    expect(onViewChange).toHaveBeenCalledWith('graph');
    renderer.destroy();
  });
});
