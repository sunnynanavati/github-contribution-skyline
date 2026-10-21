import type { Building, V3 } from './landmark-models.js';
import { shade } from './roof-details.js';
import type { splatCamera } from './animation.js';

type Camera = ReturnType<typeof splatCamera>;
interface CachedFace { indices: number[]; colors: string[]; lines: [number, number][]; depth: number; }
const interpolate = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Mesh buffers and facade lines are allocated only when the scene is rebuilt. */
export class LandmarkMesh {
  private readonly vertices: Float64Array;
  private readonly projected: Float64Array;
  private readonly faces: CachedFace[] = [];
  private readonly order: number[];
  private readonly lineColor: string;
  private readonly compare = (a: number, b: number) => this.faces[a]!.depth - this.faces[b]!.depth || a - b;

  constructor(model: Building, color: string) {
    const vertices: number[] = [];
    const top = Math.max(...model.faces.flatMap(face => face.vertices.map(v => v[2])));
    const vertex = (v: V3) => { const index = vertices.length / 3; vertices.push(v[0], v[1], v[2] / top); return index; };
    for (const face of model.faces) {
      const [a, b, c] = face.vertices as [V3, V3, V3, ...V3[]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      // Match the simple buildings' right/left/top lighting and palette hue.
      let light = .50 + .18 * Math.abs(ny / length) + .50 * Math.max(0, nz / length);
      if (face.material === 'recess') light *= .72;
      if (face.material === 'glass') light *= .95;
      if (face.material === 'metal') light = Math.min(1.04, light + .035);
      const cached: CachedFace = {
        indices: face.vertices.map(vertex), depth: 0, lines: [],
        colors: Array.from({ length: 25 }, (_, i) => shade(color, light + (1 - light) * i / 24)),
      };
      if (face.vertices.length === 4 && face.facade !== 'none') {
        const d = face.vertices[3]!;
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > .22) {
          for (const t of [.25, .5, .75]) cached.lines.push([vertex(interpolate(a, b, t)), vertex(interpolate(d, c, t))]);
          if (face.facade === 'grid') for (const t of [.2, .4, .6, .8]) cached.lines.push([vertex(interpolate(a, d, t)), vertex(interpolate(b, c, t))]);
        }
      }
      this.faces.push(cached);
    }
    this.vertices = new Float64Array(vertices);
    this.projected = new Float64Array(vertices.length);
    this.order = this.faces.map((_, i) => i);
    this.lineColor = shade(color, .34);
  }

  draw(context: CanvasRenderingContext2D, camera: Camera, x: number, y: number,
    fullHeight: number, factor: number, dx: number, dy: number, spread: number): void {
    const height = fullHeight * factor * camera.z;
    if (height < .001) return;
    const cell = Math.hypot(camera.xx, camera.xy);
    const tilt = Math.hypot(camera.yx, camera.yy) / cell;
    const size = camera.halfCell * 2;
    for (let i = 0;i < this.vertices.length;i += 3) {
      const z = this.vertices[i + 2]!;
      // Every part shares the same anchored deformation as the original box.
      const xx = this.vertices[i]! * size * (1 + (spread - 1) * z) + dx * z;
      const yy = this.vertices[i + 1]! * size * (1 + (spread - 1) * z) + dy * z;
      this.projected[i] = camera.x + (x + xx) * camera.xx + (y + yy) * camera.xy;
      this.projected[i + 1] = camera.y + (x + xx) * camera.yx + (y + yy) * camera.yy - height * z;
      this.projected[i + 2] = xx * camera.depthX + yy * camera.depthY + z * fullHeight * factor / cell * tilt;
    }
    for (const face of this.faces) {
      face.depth = 0;
      for (const i of face.indices) face.depth += this.projected[i * 3 + 2]! / face.indices.length;
    }
    this.order.sort(this.compare);
    // Opaque faces converge to the cell color as their relief vanishes.
    const flattenColor = Math.round(Math.max(0, 1 - height / 5) * 24);
    for (const i of this.order) {
      const face = this.faces[i]!;
      let area = 0;
      for (let j = 0;j < face.indices.length;j++) {
        const a = face.indices[j]! * 3, b = face.indices[(j + 1) % face.indices.length]! * 3;
        area += this.projected[a]! * this.projected[b + 1]! - this.projected[b]! * this.projected[a + 1]!;
      }
      if (area <= .000001) continue;
      context.beginPath();
      for (let j = 0;j < face.indices.length;j++) {
        const v = face.indices[j]! * 3;
        if (j === 0) context.moveTo(this.projected[v]!, this.projected[v + 1]!);
        else context.lineTo(this.projected[v]!, this.projected[v + 1]!);
      }
      context.closePath(); context.fillStyle = face.colors[flattenColor]!; context.fill();
      // Fine unlit facade lines disappear below readable size. No glowing windows.
      if (cell > 9 && height > 20 && face.lines.length) {
        context.globalAlpha = .22 * Math.min(1, (height - 20) / 22);
        context.strokeStyle = this.lineColor; context.lineWidth = .5;
        context.beginPath();
        for (const [a, b] of face.lines) {
          context.moveTo(this.projected[a * 3]!, this.projected[a * 3 + 1]!);
          context.lineTo(this.projected[b * 3]!, this.projected[b * 3 + 1]!);
        }
        context.stroke(); context.globalAlpha = 1;
      }
    }
  }
}
