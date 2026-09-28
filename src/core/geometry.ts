export interface Point { x: number; y: number }

export interface SkylineGeometry {
  compact: boolean;
  flatCell: number;
  flatSize: number;
  flatLeft: number;
  flatTop: number;
  isoW: number;
  isoH: number;
  isoCenterX: number;
  isoCenterY: number;
}

export function calculateGeometry(width: number, height: number, weeks: number): SkylineGeometry {
  const compact = width < 640;
  const columns = Math.max(1, weeks);
  const flatCell = Math.max(4, Math.min((width - (compact ? 28 : 88)) / columns, (height - 130) / 7));
  const flatSize = flatCell * 0.78;
  const flatLeft = (width - flatCell * columns) / 2;
  const flatTop = (height - flatCell * 7) / 2 + 4;
  const sidePadding = compact ? 22 : 84;
  const maxHeight = compact ? 66 : 78;
  const isoWFromWidth = (width - sidePadding) / (columns + 7);
  const isoWFromHeight = (height - (compact ? 184 : 210)) / ((columns + 6) * 0.5);
  const isoW = Math.max(2.4, Math.min(isoWFromWidth, isoWFromHeight));
  const isoH = isoW * 0.5;
  return {
    compact,
    flatCell,
    flatSize,
    flatLeft,
    flatTop,
    isoW,
    isoH,
    isoCenterX: width * 0.5 - (columns - 7) * isoW * 0.42,
    isoCenterY: (compact ? 72 : 66) + maxHeight,
  };
}

export function isoPoint(column: number, row: number, z: number, geometry: SkylineGeometry): Point {
  return {
    x: geometry.isoCenterX + (column - row) * geometry.isoW,
    y: geometry.isoCenterY + (column + row) * geometry.isoH - z,
  };
}

export function flatCorners(column: number, row: number, geometry: SkylineGeometry): [Point, Point, Point, Point] {
  const x = geometry.flatLeft + column * geometry.flatCell + (geometry.flatCell - geometry.flatSize) / 2;
  const y = geometry.flatTop + row * geometry.flatCell + (geometry.flatCell - geometry.flatSize) / 2;
  return [{ x, y }, { x: x + geometry.flatSize, y }, { x: x + geometry.flatSize, y: y + geometry.flatSize }, { x, y: y + geometry.flatSize }];
}

export function mixPoint(a: Point, b: Point, progress: number): Point {
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampTooltipPosition(x: number, y: number, width: number, height: number): Point {
  return {
    x: clamp(x, 80, Math.max(80, width - 80)),
    y: clamp(y, 70, Math.max(70, height - 16)),
  };
}
