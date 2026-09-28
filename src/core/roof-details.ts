import type { Point } from './geometry';

export type RoofStyle = 'artDeco' | 'pyramid' | 'mechanical' | 'antenna';

function roofHash(column: number, row: number, salt = 0): number {
  let value = Math.imul(column + 1 + salt, 0x9e3779b1) ^ Math.imul(row + 11, 0x85ebca6b);
  value ^= value >>> 16;
  return value >>> 0;
}

/** Selects a stable, intentionally sparse set of high-rises for rooftop detail. */
export function hasRoofDetail(column: number, row: number, level: number): boolean {
  return level >= 3 && roofHash(column, row) % 100 < 25;
}

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

export function roofStyleFor(column: number, row: number): RoofStyle {
  const value = roofHash(column, row, 23) % 100;
  if (value < 36) return 'mechanical';
  if (value < 68) return 'artDeco';
  if (value < 92) return 'pyramid';
  return 'antenna';
}

export function drawRoofDetail(
  context: CanvasRenderingContext2D,
  style: RoofStyle,
  top: readonly [Point, Point, Point, Point],
  color: string,
  visibility: number,
): void {
  const center = top.reduce((sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }), { x: 0, y: 0 });
  context.save();
  context.globalAlpha = visibility;

  if (style === 'artDeco') {
    for (let tier = 0; tier < 2; tier += 1) {
      const scale = 0.72 - tier * 0.22;
      const lift = 3 + tier * 5;
      const tierTop = top.map((point) => ({
        x: center.x + (point.x - center.x) * scale,
        y: center.y + (point.y - center.y) * scale - lift,
      })) as [Point, Point, Point, Point];
      const tierBase = tierTop.map((point) => ({ x: point.x, y: point.y + 4 })) as [Point, Point, Point, Point];
      polygon(context, [tierTop[1], tierTop[2], tierBase[2], tierBase[1]], shade(color, 0.64), visibility);
      polygon(context, [tierTop[2], tierTop[3], tierBase[3], tierBase[2]], shade(color, 0.48), visibility);
      polygon(context, tierTop, shade(color, 1.05), visibility);
    }
  } else if (style === 'pyramid') {
    const apex = { x: center.x, y: center.y - 14 };
    polygon(context, [top[0], top[1], apex], shade(color, 1.08), visibility);
    polygon(context, [top[1], top[2], apex], shade(color, 0.68), visibility);
    polygon(context, [top[2], top[3], apex], shade(color, 0.5), visibility);
  } else {
    const scale = style === 'antenna' ? 0.52 : 0.68;
    const roof = top.map((point) => ({
      x: center.x + (point.x - center.x) * scale,
      y: center.y + (point.y - center.y) * scale - 3,
    })) as [Point, Point, Point, Point];
    const base = roof.map((point) => ({ x: point.x, y: point.y + 4 })) as [Point, Point, Point, Point];
    polygon(context, [roof[1], roof[2], base[2], base[1]], shade(color, 0.62), visibility);
    polygon(context, [roof[2], roof[3], base[3], base[2]], shade(color, 0.47), visibility);
    polygon(context, roof, shade(color, 1.04), visibility);
    if (style === 'antenna') {
      context.strokeStyle = shade(color, 0.55);
      context.lineCap = 'round';
      context.beginPath();
      context.lineWidth = 1.25;
      context.moveTo(center.x, center.y - 6);
      context.lineTo(center.x, center.y - 16);
      context.stroke();
      context.beginPath();
      context.lineWidth = 0.75;
      context.moveTo(center.x, center.y - 16);
      context.lineTo(center.x, center.y - 21);
      context.stroke();
    }
  }
  context.restore();
}

export { polygon, shade };
