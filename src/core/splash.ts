import { clamp } from './geometry';
import { motionTokens } from './motion-tokens';

/** Stable per-tile staggering with exact, reversible endpoints. */
export function splatPhase(progress: number, delay: number): number {
  return clamp((progress-delay)/(1-delay), 0, 1);
}

/** Center-out wave, with edge cells following the center by up to 180ms. */
export function splatDelay(week: number, weekday: number, weeks: number): number {
  const across = weeks > 1 ? (week / (weeks-1)*2-1) : 0;
  const depth = (weekday-3)/3;
  return Math.min(1, Math.hypot(across, depth*0.22)) * motionTokens.skyline.fanoutFraction;
}

/** Smooth local collapse: zero velocity at both ends of each height change. */
export function splatHeightFactor(progress: number, delay: number): number {
  const t=clamp(splatPhase(progress,delay)/motionTokens.skyline.collapseFraction,0,1);
  return 1-t*t*(3-2*t);
}

/** A 600ms transition; reversals continue from the current position. */
export function splashStep(current: number, target: number, elapsedMs: number): number {
  const travel = Math.min(32, Math.max(0, elapsedMs)) / (motionTokens.duration.slow*1000);
  return target > current ? Math.min(target, current + travel) : Math.max(target, current - travel);
}
