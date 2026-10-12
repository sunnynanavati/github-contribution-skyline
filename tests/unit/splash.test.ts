import { describe, expect, it } from 'vitest';
import { splatDelay, splatHeightFactor, splatPhase, splashStep } from '../../src/core/splash';

describe('splash transition', () => {
  it('takes a visible finite timeline and reverses without resetting', () => {
    expect(splashStep(0, 1, 16)).toBeCloseTo(16/600);
    expect(splashStep(0.5, 0, 16)).toBeCloseTo(0.5-16/600);
    expect(splashStep(0.99, 1, 16)).toBe(1);
    expect(splashStep(0.01, 0, 16)).toBe(0);
  });
  it('matches skyline and graph endpoints for every cell', () => {
    for (let week = 0; week < 54; week += 1) {
      for (let day = 0; day < 7; day += 1) {
        const delay = (week + day) / 500;
        expect(splatPhase(0, delay)).toBe(0);
        expect(splatPhase(1, delay)).toBe(1);
      }
    }
  });

  it('delays edge buildings without separate fading layers', () => {
    expect(splatPhase(0.08, 0.1)).toBe(0);
    expect(splatPhase(0.5, 0.1)).toBeGreaterThan(0);
    expect(splatPhase(0.5, 0.1)).toBeLessThan(splatPhase(0.5, 0));
  });

  it('flattens the center first without delaying the shared camera', () => {
    expect(splatDelay(26,3,53)).toBe(0);
    expect(splatDelay(0,3,53)).toBeCloseTo(0.3);
  });

  it('makes the fanout visible without snapping each height at the start or end', () => {
    const center=splatDelay(26,3,53); const edge=splatDelay(0,3,53);
    expect(splatHeightFactor(0.2,center)).toBeLessThan(0.75);
    expect(splatHeightFactor(0.2,edge)).toBe(1);
    expect(splatHeightFactor(0.001,center)).toBeGreaterThan(0.9999);
    expect(splatHeightFactor(1,edge)).toBe(0);
    let previous=1;
    for (let frame=0;frame<=100;frame+=1) {
      const height=splatHeightFactor(frame/100,edge);
      expect(height).toBeLessThanOrEqual(previous);
      previous=height;
    }
  });
});
