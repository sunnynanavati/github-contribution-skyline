export function animationStep(current: number, target: number, elapsedMs: number): number {
  const delta = 1 - Math.pow(1 - 0.24, Math.min(32, elapsedMs) / 16.67);
  const next = current + (target - current) * delta;
  return Math.abs(target - next) < 0.001 ? target : next;
}

export function isAnimationSettled(current: number, target: number): boolean {
  return current === target || Math.abs(target - current) < 0.001;
}
