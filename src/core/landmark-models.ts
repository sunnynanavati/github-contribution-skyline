/** Original architectural meshes, bounded by one contribution cell. */
export type V3 = [number, number, number];
export type Facade = 'vertical' | 'grid' | 'fluted' | 'louver' | 'none';
export interface Face { vertices: V3[]; material: 'stone' | 'glass' | 'metal' | 'recess'; facade: Facade; }
export const approvedIds = ['deco', 'faceted', 'pyramid', 'lantern', 'blade'] as const;
export type LandmarkId = typeof approvedIds[number];
export interface Building { id: LandmarkId; name: string; faces: Face[]; }
type Plan = [number, number][];
const rectangle = (w: number, d: number, x = 0, y = 0): Plan => [[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]];
const chamfer = (w: number, d: number, c: number): Plan => [[-w / 2 + c, -d / 2], [w / 2 - c, -d / 2], [w / 2, -d / 2 + c], [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c], [-w / 2, -d / 2 + c]];
const octagon = (radius: number): Plan => Array.from({ length: 8 }, (_, i) => [Math.cos(Math.PI / 8 + i * Math.PI / 4) * radius, Math.sin(Math.PI / 8 + i * Math.PI / 4) * radius]);

class Model {
  faces: Face[] = [];
  loft(bottom: Plan, top: Plan, z0: number, z1: number | number[], material: Face['material'] = 'stone', facade: Facade = 'vertical') {
    const lower = bottom.map(([x, y]) => [x, y, z0] as V3);
    const upper = top.map(([x, y], i) => [x, y, typeof z1 === 'number' ? z1 : z1[i]!] as V3);
    for (let i = 0;i < bottom.length;i++) {
      const j = (i + 1) % bottom.length;
      this.faces.push({ vertices: [lower[i]!, lower[j]!, upper[j]!, upper[i]!], material, facade });
    }
    this.faces.push({ vertices: upper, material: material === 'glass' ? 'metal' : material, facade: 'none' });
    return this;
  }
  block(w: number, d: number, z0: number, z1: number, material: Face['material'] = 'stone', facade: Facade = 'vertical', x = 0, y = 0) { return this.loft(rectangle(w, d, x, y), rectangle(w, d, x, y), z0, z1, material, facade); }
  cap(plan: Plan, z: number, tip: number, material: Face['material'] = 'metal') {
    for (let i = 0;i < plan.length;i++) { const a = plan[i]!, b = plan[(i + 1) % plan.length]!; this.faces.push({ vertices: [[...a, z], [...b, z], [0, 0, tip]], material, facade: 'none' }); }
    return this;
  }
  fins(w: number, d: number, z0: number, z1: number, count = 4) {
    for (let i = 0;i < count;i++) {
      const t = (i + .5) / count - .5;
      this.block(.024, .036, z0, z1, 'metal', 'none', t * w, d / 2 + .007);
      this.block(.024, .036, z0, z1, 'metal', 'none', t * w, -d / 2 - .007);
      this.block(.036, .024, z0, z1, 'metal', 'none', w / 2 + .007, t * d);
      this.block(.036, .024, z0, z1, 'metal', 'none', -w / 2 - .007, t * d);
    }
    return this;
  }
}
function design(id: LandmarkId, name: string, build: (model: Model) => void): Building {
  const model = new Model();
  build(model);
  return { id, name, faces: model.faces };
}

export const buildings: readonly Building[] = [
  design('deco', 'Deco needle', m => {
    m.block(1, .88, 0, .22, 'stone', 'none').block(.92, .8, .22, 1.05, 'stone', 'grid');
    m.block(.73, .66, 1.05, 4.05).fins(.73, .66, 1.1, 4.12, 5);
    m.block(.63, .56, 4.05, 4.45).block(.48, .43, 4.45, 4.79).block(.32, .3, 4.79, 5.05, 'metal', 'fluted');
    m.loft(octagon(.115), octagon(.08), 5.05, 5.34, 'metal', 'none').cap(octagon(.08), 5.34, 5.78);
  }),
  design('faceted', 'Faceted pinnacle', m => {
    m.block(.98, .98, 0, .19, 'stone', 'none');
    m.loft(chamfer(.94, .94, .045), chamfer(.86, .86, .26), .19, 5.02, 'glass', 'grid');
    m.loft(chamfer(.8, .8, .23), chamfer(.8, .8, .23), 5.02, 5.15, 'recess', 'louver');
    m.loft(chamfer(.86, .86, .26), chamfer(.65, .65, .20), 5.15, 5.38, 'metal', 'none');
    m.loft(octagon(.055), octagon(.022), 5.38, 5.82, 'metal', 'none');
  }),
  design('pyramid', 'Pyramid crown', m => {
    m.block(.96, .88, 0, .22, 'stone', 'none').block(.84, .76, .22, 4.52, 'glass', 'grid');
    for (const x of [-.405, .405]) for (const y of [-.365, .365]) m.block(.045, .045, .22, 4.56, 'stone', 'none', x, y);
    m.block(.9, .82, 4.52, 4.66, 'metal', 'louver').cap(rectangle(.86, .78), 4.66, 5.7);
  }),
  design('lantern', 'Octagonal lantern', m => {
    m.loft(octagon(.52), octagon(.52), 0, .23, 'stone', 'none');
    m.loft(octagon(.46), octagon(.46), .23, 4.64, 'stone', 'fluted');
    m.loft(octagon(.49), octagon(.49), 4.64, 4.76, 'metal', 'none');
    m.loft(octagon(.35), octagon(.35), 4.76, 5.25, 'recess', 'vertical');
    for (const [x, y] of octagon(.35)) m.block(.045, .045, 4.76, 5.29, 'stone', 'none', x, y);
    m.loft(octagon(.43), octagon(.43), 5.25, 5.34, 'metal', 'none').cap(octagon(.43), 5.34, 5.73);
  }),
  design('blade', 'Blade crown', m => {
    m.block(.96, .92, 0, .22, 'stone', 'none').block(.76, .8, .22, 5.02, 'glass', 'vertical');
    m.fins(.76, .8, .22, 5.13, 5).block(.47, .5, 5.02, 5.28, 'recess', 'louver');
    m.loft(rectangle(.075, .83, -.355, 0), rectangle(.075, .83, -.355, 0), 5.02, [5.46, 5.46, 5.75, 5.75], 'metal', 'none');
    m.loft(rectangle(.075, .83, .355, 0), rectangle(.075, .83, .355, 0), 5.02, [5.29, 5.29, 5.54, 5.54], 'metal', 'none');
  }),
];
