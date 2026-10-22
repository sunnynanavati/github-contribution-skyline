import { calculateBuildingHeight, maximumContributionCount } from './buildings.js';
import { type Point, type SkylineGeometry } from './geometry.js';
import { polygon, shade } from './roof-details.js';
import { LandmarkMesh } from './LandmarkMesh.js';
import { selectLandmarks } from './landmarks.js';
import type { ContributionGrid, CustomSkylinePalette } from './types.js';
import { splatCamera, collapsePhase, heightFactor, leanPulse, radialDistance, roofSpread } from './animation.js';
import { SKYLINE_DEFAULTS } from './defaults.js';

type Quad = [Point, Point, Point, Point];
const quad = (): Quad => [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

/** Original opaque Canvas geometry with fixed foundations and a center-out squash. */
export class SkylineScene {
  private readonly positions: Float64Array;
  private readonly heights: Float64Array;
  private readonly distances: Float64Array;
  private readonly depths: Float64Array;
  private readonly order: number[];
  private readonly colors: string[] = [];
  private readonly sides: [string, string][] = [];
  private readonly meshes = new Map<number, LandmarkMesh>();
  private readonly top = quad();
  private readonly base = quad();
  private readonly face = quad();
  private readonly compareDepth = (a: number, b: number) => this.depths[a]! - this.depths[b]! || a - b;

  constructor(
    private readonly grid: ContributionGrid,
    private readonly geometry: SkylineGeometry,
    palette: CustomSkylinePalette,
    heightScale: number,
    buildingDetail: boolean,
  ) {
    const count = grid.days.length;
    const maxCount = maximumContributionCount(grid.days);
    this.positions = new Float64Array(count * 2);
    this.heights = new Float64Array(count);
    this.distances = new Float64Array(count);
    this.depths = new Float64Array(count);
    this.order = Array.from({ length: count }, (_, index) => index);
    grid.days.forEach((day, index) => {
      this.positions[index * 2] = day.weekIndex + 0.5 - grid.weeks / 2;
      this.positions[index * 2 + 1] = day.weekday - 3;
      this.heights[index] = calculateBuildingHeight(day.count, maxCount, heightScale, false) * geometry.elevationScale;
      this.distances[index] = radialDistance(day.weekIndex, day.weekday, grid.weeks);
      const color = palette.levels[day.level];
      this.colors.push(color);
      this.sides.push([shade(color, 0.68), shade(color, 0.5)]);
    });
    if (buildingDetail) for (const landmark of selectLandmarks(grid)) {
      this.meshes.set(landmark.index, new LandmarkMesh(landmark.model, this.colors[landmark.index]!));
    }
  }

  draw(context: CanvasRenderingContext2D, time: number): void {
    const camera = splatCamera(time, this.geometry, this.grid.weeks);
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
      const pulse = leanPulse(phase);
      const lean = pulse * SKYLINE_DEFAULTS.lean * Math.min(1, this.heights[index]! / (this.geometry.flatCell * 2.5));
      const dx = radius > 0 ? lean * x / radius : 0;
      const dy = radius > 0 ? lean * y / radius : 0;
      const spread = roofSpread(phase);
      for (let corner = 0; corner < 4; corner += 1) {
        const cx = (corner === 1 || corner === 2 ? 1 : -1) * camera.halfCell;
        const cy = (corner >= 2 ? 1 : -1) * camera.halfCell;
        const base = this.base[corner]!; const top = this.top[corner]!;
        base.x = camera.x + (x + cx) * camera.xx + (y + cy) * camera.xy;
        base.y = camera.y + (x + cx) * camera.yx + (y + cy) * camera.yy;
        top.x = base.x + (cx * (spread - 1) + dx) * camera.xx + (cy * (spread - 1) + dy) * camera.xy;
        top.y = base.y - height + (cx * (spread - 1) + dx) * camera.yx + (cy * (spread - 1) + dy) * camera.yy;
      }
      const mesh = this.meshes.get(index);
      if (mesh && height >= 0.001) {
        // Keep the complete day cell beneath its narrower architectural footprint.
        polygon(context, this.base, this.colors[index]!, 1);
        mesh.draw(context, camera, x, y, this.heights[index]!, factor, dx, dy, spread);
        continue;
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
    }
  }
}
