import type { Point } from './geometry.js';

function shade(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = Math.min(255, Math.round(((value >> 16) & 255) * factor));
  const green = Math.min(255, Math.round(((value >> 8) & 255) * factor));
  const blue = Math.min(255, Math.round((value & 255) * factor));
  return `rgb(${red},${green},${blue})`;
}

function polygon(context: CanvasRenderingContext2D, points: readonly Point[], fill: string, alpha: number): void {
  context.globalAlpha = alpha;
  context.beginPath();
  context.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point) context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.globalAlpha = 1;
}

export { polygon, shade };
