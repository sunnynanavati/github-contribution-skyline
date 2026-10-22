import { calculateGeometry, clamp, type SkylineGeometry } from './geometry.js';
import { SKYLINE_DEFAULTS } from './defaults.js';

/** Shared camera, anchored collapse, and interruptible playback. */
export const SPLAT_TIMING = {
  duration: 800,
  start: 800 * SKYLINE_DEFAULTS.waveStart,
  sweep: 800 * SKYLINE_DEFAULTS.waveSpread,
  collapse: 800 * SKYLINE_DEFAULTS.compression,
  reversal: SKYLINE_DEFAULTS.reversalMs,
} as const;
// The approved Chrome preset changes the front, not the shared camera path.
// Camera and individual buildings already ease themselves. A second whole-scene
// easing races through the moving front and makes the splat disappear.
export const SPLAT_PLAYBACK = {
  duration: SKYLINE_DEFAULTS.forwardMs,
} as const;
export function poseTimeFor(time: number): number {
  return SPLAT_TIMING.duration * clamp(time / SPLAT_PLAYBACK.duration, 0, 1);
}
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const REFERENCE_VIEWPORT = { width: 1120, height: 620 } as const;

/** Fit one proportionate city into the host; never shrink only its foundations. */
export function calculateSkylineGeometry(width: number, height: number, weeks: number, heightScale: number): SkylineGeometry {
  const g = calculateGeometry(width, height, weeks);
  // Calibrate to the approved desktop composition. Height remains count-based;
  // the responsive zoom applies equally to roofs, walls, and cell spacing.
  const reference = calculateGeometry(REFERENCE_VIEWPORT.width, REFERENCE_VIEWPORT.height, weeks);
  const maxHeight = 78 * heightScale;
  reference.isoCenterY += Math.max(0, heightScale - 1) * 78;
  if (heightScale > 1) reference.isoW = Math.max(2.4, Math.min(reference.isoW,
    (REFERENCE_VIEWPORT.height - 30 - reference.isoCenterY) * 2 / (weeks + 7)));
  const footprintHeight = (weeks + 7) * reference.isoW * 0.5;
  const centerOffsetY = reference.isoCenterY - REFERENCE_VIEWPORT.height / 2;
  const halfWidth = footprintHeight + Math.abs(weeks - 7) * reference.isoW * 0.08;
  const zoom = Math.max(0.01, Math.min(1,
    (width / 2 - 14) / halfWidth,
    (height / 2 - 64) / Math.max(1, maxHeight - centerOffsetY),
    (height / 2 - 30) / Math.max(1, centerOffsetY + footprintHeight)));
  const isoW = reference.isoW * zoom;
  return {
    ...g, isoW, isoH: isoW * 0.5, elevationScale: zoom,
    isoCenterX: width * 0.5 - (weeks - 7) * isoW * 0.42,
    isoCenterY: height * 0.5 + centerOffsetY * zoom,
  };
}

export function radialDistance(week: number, row: number, weeks: number): number {
  return Math.hypot(week - (weeks - 1) / 2, row - 3) / Math.hypot((weeks - 1) / 2, 3);
}

export function collapsePhase(time: number, distance: number): number {
  return clamp((time - SPLAT_TIMING.start - SPLAT_TIMING.sweep * distance) / SPLAT_TIMING.collapse, 0, 1);
}

export function heightFactor(phase: number): number {
  if (SKYLINE_DEFAULTS.easing === 'quick') return (1 - phase) ** 3;
  if (SKYLINE_DEFAULTS.easing === 'soft') return 1 - phase ** 3 * (phase * (phase * 6 - 15) + 10);
  return 1 - smoothstep(phase);
}

/** One outward pulse. The approved preset disables the inward recovery. */
export function leanPulse(phase: number): number {
  if (phase <= 0 || phase >= 1) return 0;
  return phase < 0.7
    ? Math.sin(Math.PI * phase / 0.7) ** 2
    : -SKYLINE_DEFAULTS.rebound * Math.sin(Math.PI * (phase - 0.7) / 0.3) ** 2;
}

export function roofSpread(phase: number): number {
  return phase <= 0 || phase >= 1 ? 1 : 1 + SKYLINE_DEFAULTS.widening * Math.sin(Math.PI * phase) ** 2;
}

// Monotone Hermite curves: the camera stays oblique while the front is visible,
// then approaches overhead gently. Slopes are cached, not solved per building.
const times = [0, 120, 240, 420, 600, 800];
function cameraCurve(values: number[]) {
  const slopes = values.map((_, index) => {
    if (index === 0 || index === values.length - 1) return 0;
    const a = (values[index]! - values[index - 1]!) / (times[index]! - times[index - 1]!);
    const b = (values[index + 1]! - values[index]!) / (times[index + 1]! - times[index]!);
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  });
  return (time: number) => {
    if (time <= 0) return 0;
    if (time >= SPLAT_TIMING.duration) return 1;
    let index = 0;
    while (time > times[index + 1]!) index += 1;
    const span = times[index + 1]! - times[index]!;
    const t = (time - times[index]!) / span;
    return (2 * t ** 3 - 3 * t * t + 1) * values[index]!
      + (t ** 3 - 2 * t * t + t) * span * slopes[index]!
      + (-2 * t ** 3 + 3 * t * t) * values[index + 1]!
      + (t ** 3 - t * t) * span * slopes[index + 1]!;
  };
}
const turn = cameraCurve([0, 0.24, 0.62, 0.90, 0.985, 1]);
const elevation = cameraCurve([0, 0.08, 0.35, 0.72, 0.94, 1]);

export function splatCamera(time: number, geometry: SkylineGeometry, weeks: number) {
  const t = turn(time);
  const yaw = Math.PI / 4 * (1 - t);
  const pitch = Math.PI / 6 + Math.PI / 3 * elevation(time);
  const cell = geometry.isoW * Math.SQRT2 * (1 - t) + geometry.flatCell * t;
  const cos = Math.cos(yaw); const sin = Math.sin(yaw);
  const tilt = Math.sin(pitch);
  const sourceX = geometry.isoCenterX + (weeks / 2 - 3.5) * geometry.isoW;
  const sourceY = geometry.isoCenterY + (weeks / 2 + 3.5) * geometry.isoH;
  return {
    xx: cell * cos, xy: -cell * sin,
    yx: cell * sin * tilt, yy: cell * cos * tilt,
    x: sourceX * (1 - t) + (geometry.flatLeft + weeks * geometry.flatCell / 2) * t,
    y: sourceY * (1 - t) + (geometry.flatTop + 3.5 * geometry.flatCell) * t,
    z: time >= SPLAT_TIMING.duration ? 0 : Math.cos(pitch) / Math.cos(Math.PI / 6),
    halfCell: 0.4 * (1 - t) + geometry.flatSize / geometry.flatCell / 2 * t,
    depthX: sin, depthY: cos,
  };
}

/** Position and velocity survive retargeting; no per-building timers restart. */
export class SplatPlayhead {
  time = 0;
  velocity = 0;
  target = 0;
  private rampAge = SPLAT_TIMING.reversal as number;
  private fromVelocity = 0;
  private toVelocity = 0;
  constructor(public duration: number = SPLAT_PLAYBACK.duration) {}

  get settled(): boolean { return this.time === this.target && this.velocity === 0; }

  seek(time: number): void {
    this.time = this.target = clamp(time, 0, this.duration);
    this.velocity = this.fromVelocity = this.toVelocity = 0;
    this.rampAge = SPLAT_TIMING.reversal;
  }

  retarget(target: number): void {
    target = clamp(target, 0, this.duration);
    if (target === this.target) return;
    if (target === this.time) { this.seek(target); return; }
    const atRestEndpoint = this.settled && (this.time === 0 || this.time === this.duration);
    this.target = target;
    this.fromVelocity = this.velocity;
    // Traverse the same poses at the same pace in either direction.
    this.toVelocity = Math.sign(target - this.time);
    this.rampAge = 0;
    // Camera and building curves already have zero endpoint velocity. A launch ramp
    // adds hesitation; reserve that ramp for true mid-flight interruptions.
    if (atRestEndpoint) {
      this.velocity = this.fromVelocity = this.toVelocity;
      this.rampAge = SPLAT_TIMING.reversal;
    }
  }

  advance(elapsed: number): void {
    if (this.settled) return;
    const dt = Math.max(0, elapsed);
    const ramp = SPLAT_TIMING.reversal;
    const used = Math.min(dt, Math.max(0, ramp - this.rampAge));
    const u0 = this.rampAge / ramp;
    const u1 = (this.rampAge + used) / ramp;
    const integral = (u: number) => u ** 3 - u ** 4 / 2;
    this.time += this.fromVelocity * used + (this.toVelocity - this.fromVelocity) * ramp * (integral(u1) - integral(u0));
    this.rampAge += used;
    this.time += this.toVelocity * (dt - used);
    this.velocity = this.fromVelocity + (this.toVelocity - this.fromVelocity) * smoothstep(Math.min(1, this.rampAge / ramp));
    this.time = clamp(this.time, 0, this.duration);
    if ((this.toVelocity > 0 && this.time >= this.target) || (this.toVelocity < 0 && this.time <= this.target)) this.seek(this.target);
  }
}
