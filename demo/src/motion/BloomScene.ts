import { calculateBuildingHeight, drawBuilding, maximumContributionCount } from '../../../src/core/buildings';
import { type Point, type SkylineGeometry } from '../../../src/core/geometry';
import { drawRoofDetail, hasRoofDetail, polygon, roofStyleFor, shade, type RoofStyle } from '../../../src/core/roof-details';
import { SplatMorph } from '../../../src/core/SplatMorph';
import type { ContributionGrid, CustomSkylinePalette } from '../../../src/core/types';
import { bloomCamera, collapsePhase, heightFactor, leanPulse, radialDistance, roofSpread, type MotionProfile } from './choreography';

type Quad = [Point, Point, Point, Point];
const quad = (): Quad => [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

/** Two original Canvas studies sharing the same camera and fixed foundations. */
export class BloomScene {
  private readonly positions: Float64Array;
  private readonly heights: Float64Array;
  private readonly distances: Float64Array;
  private readonly depths: Float64Array;
  private readonly order: number[];
  private readonly colors: string[] = [];
  private readonly sides: [string, string][] = [];
  private readonly roofs: (RoofStyle | null)[] = [];
  private readonly top = quad();
  private readonly base = quad();
  private readonly detailTop = quad();
  private readonly face = quad();
  private readonly baseline: SplatMorph;
  private readonly maxCount: number;
  private readonly compareDepth = (a: number, b: number) => this.depths[a]! - this.depths[b]! || a - b;

  constructor(
    private readonly grid: ContributionGrid,
    private readonly geometry: SkylineGeometry,
    private readonly palette: CustomSkylinePalette,
    private readonly heightScale: number,
    private readonly buildingDetail: boolean,
  ) {
    const count = grid.days.length;
    this.maxCount = maximumContributionCount(grid.days);
    this.positions = new Float64Array(count * 2);
    this.heights = new Float64Array(count);
    this.distances = new Float64Array(count);
    this.depths = new Float64Array(count);
    this.order = Array.from({ length: count }, (_, index) => index);
    this.baseline = new SplatMorph(grid, geometry, palette, heightScale, buildingDetail);
    grid.days.forEach((day, index) => {
      this.positions[index * 2] = day.weekIndex + 0.5 - grid.weeks / 2;
      this.positions[index * 2 + 1] = day.weekday - 3;
      this.heights[index] = calculateBuildingHeight(day.count, this.maxCount, heightScale, geometry.compact);
      this.distances[index] = radialDistance(day.weekIndex, day.weekday, grid.weeks);
      const color = palette.levels[day.level];
      this.colors.push(color);
      this.sides.push([shade(color, 0.68), shade(color, 0.5)]);
      this.roofs.push(buildingDetail && hasRoofDetail(day.weekIndex, day.weekday, day.level) ? roofStyleFor(day.weekIndex, day.weekday) : null);
    });
  }

  draw(context: CanvasRenderingContext2D, time: number, profile: MotionProfile): void {
    if (profile === 'baseline') {
      if (time > 0 && time < 600) this.baseline.draw(context, time / 600);
      else {
        this.order.sort((a, b) => {
          const first = this.grid.days[a]!; const second = this.grid.days[b]!;
          return first.weekIndex + first.weekday - second.weekIndex - second.weekday;
        });
        for (const index of this.order) drawBuilding(context, this.grid.days[index]!, {
          progress: time <= 0 ? 0 : 1, heightScale: this.heightScale,
          buildingDetail: this.buildingDetail, palette: this.palette, geometry: this.geometry, maxCount: this.maxCount,
        });
      }
      return;
    }
    const camera = bloomCamera(time, this.geometry, this.grid.weeks);
    for (let index = 0; index < this.order.length; index += 1) {
      this.depths[index] = this.positions[index * 2]! * camera.depthX + this.positions[index * 2 + 1]! * camera.depthY;
    }
    this.order.sort(this.compareDepth);
    for (const index of this.order) {
      const phase = collapsePhase(time, this.distances[index]!);
      const factor = heightFactor(phase);
      const height = this.heights[index]! * factor * camera.z;
      const x = this.positions[index * 2]!; const y = this.positions[index * 2 + 1]!;
      const radius = Math.hypot(x, y);
      const pulse = profile === 'elastic' ? leanPulse(phase) : 0;
      const lean = pulse * 0.35 * Math.min(1, this.heights[index]! / (this.geometry.flatCell * 2.5));
      const dx = radius > 0 ? lean * x / radius : 0;
      const dy = radius > 0 ? lean * y / radius : 0;
      const spread = profile === 'elastic' ? roofSpread(phase) : 1;
      for (let corner = 0; corner < 4; corner += 1) {
        const cx = (corner === 1 || corner === 2 ? 1 : -1) * camera.halfCell;
        const cy = (corner >= 2 ? 1 : -1) * camera.halfCell;
        const base = this.base[corner]!; const top = this.top[corner]!;
        base.x = camera.x + (x + cx) * camera.xx + (y + cy) * camera.xy;
        base.y = camera.y + (x + cx) * camera.yx + (y + cy) * camera.yy;
        top.x = base.x + (cx * (spread - 1) + dx) * camera.xx + (cy * (spread - 1) + dy) * camera.xy;
        top.y = base.y - height + (cx * (spread - 1) + dx) * camera.yx + (cy * (spread - 1) + dy) * camera.yy;
      }
      // Deformation can expose an additional side. Cull by projected winding,
      // keeping all sides connected to their unchanged base vertices.
      for (let side = 0; side < 4 && height > 0; side += 1) {
        const next = (side + 1) % 4;
        this.face[0] = this.top[side]!; this.face[1] = this.top[next]!;
        this.face[2] = this.base[next]!; this.face[3] = this.base[side]!;
        let area = 0;
        for (let i = 0; i < 4; i += 1) {
          const a = this.face[i]!; const b = this.face[(i + 1) % 4]!;
          area += a.x * b.y - b.x * a.y;
        }
        if (area < -0.00001) polygon(context, this.face, this.sides[index]![side % 2 === 1 ? 0 : 1], 1);
      }
      polygon(context, this.top, this.colors[index]!, 1);
      const roof = this.roofs[index];
      const detailScale = factor * camera.z;
      if (roof && detailScale > 0.0001) {
        // Undo the footprint's Y scaling first: only architectural height is
        // compressed. The rooftop stays attached to the deformed roof plane.
        const cy = (this.top[0].y + this.top[2].y) / 2;
        for (let corner = 0; corner < 4; corner += 1) {
          this.detailTop[corner]!.x = this.top[corner]!.x;
          this.detailTop[corner]!.y = cy + (this.top[corner]!.y - cy) / detailScale;
        }
        context.save();
        context.translate(0, cy); context.scale(1, detailScale); context.translate(0, -cy);
        drawRoofDetail(context, roof, this.detailTop, this.colors[index]!, 1);
        context.restore();
      }
    }
  }
}
