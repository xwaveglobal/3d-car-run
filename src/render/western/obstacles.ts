import * as THREE from 'three';
import { LANES } from '../../config.ts';
import type { LiveObstacle } from '../../gameplay/World.ts';
import type { ObstacleType } from '../../gameplay/types.ts';
import type { WorldId } from '../../gameplay/Spawner.ts';
import { WORLD_THEME } from '../../western/themes.ts';
import { atlasTexture } from './atlas.ts';
import { Model } from './kit.ts';

/**
 * 3D Car Run v1.0.0 — Western obstacle looks. Every obstacle keeps EXACTLY the hitbox of
 * src/gameplay/ObstacleRules.ts (fairness is untouched); only the silhouette is new, and it is built
 * to sit inside that box:
 *   crate    1.7 m block in a lane (hop over)      → TNT crate · oil barrels · hay bales · stone block · boulder
 *   barrier  low, 2.5 m wide, ≤ 1.35 m (hop)       → ROAD CLOSED sawhorse · ranch fence · sleepers · pipe · fallen column · log
 *   beam     overhead, underside 0.95 m (dive)     → hanging saloon / mine / Route 66 sign · mine timber · stone lintel · container
 *   traffic  oncoming vehicle 1.7 × 2.6 × 3.6      → pickup trucks · box / log / tanker truck · stagecoach (variant 4)
 *   ring     coin-×2 hoop                          → golden horseshoe (open centre, collect burst)
 *   platform low slab sliding across lanes         → railroad handcar / hay wagon / runaway mine cart
 *   asteroid rock in a lane                        → rolling sandstone boulder
 *   laser    per-lane low / high / block / open    → railroad-crossing gantry: striped booms · hanging planks · plank wall
 *   gate     wall with one door lane               → stockade with swinging saloon doors
 * One shared atlas material (one shader program for every obstacle); readability per world comes
 * from the dark-red hazard outlines and an emissive lift in dark places (setWesternContrast).
 */
export type ObSet = 'valley' | 'town' | 'rail' | 'oil' | 'mine' | 'ruins' | 'storm' | 'night' | 'coast' | 'canyon' | 'badlands' | 'gold' | 'pines' | 'ranch';

export function obstacleSet(w: WorldId): ObSet {
  switch (WORLD_THEME[w].scene) {
    case 'ghosttown': return 'town';
    case 'trainyard': return 'rail';
    case 'oilfield': return 'oil';
    case 'tunnel': return 'mine';
    case 'ruins': return 'ruins';
    case 'sandstorm': return 'storm';
    case 'night': return 'night';
    case 'coast':
    case 'sunsetcoast': return 'coast';
    case 'redrock':
    case 'bridge': return 'canyon';
    case 'badlands': return 'badlands';
    case 'goldcanyon': return 'gold';
    case 'pines': return 'pines';
    case 'ranch': return 'ranch';
    default: return 'valley';
  }
}

// ------------------------------------------------------------------ materials
let obMat: THREE.MeshStandardMaterial | null = null;
/** obstacle material: atlas × vertex colours; its emissive lift brightens obstacles in dark places */
export function obstacleMaterial() {
  if (!obMat) obMat = new THREE.MeshStandardMaterial({ map: atlasTexture(), vertexColors: true, roughness: 0.78, metalness: 0.06, flatShading: true, emissive: 0x000000 });
  return obMat;
}
let litMat: THREE.MeshBasicMaterial | null = null;
function obstacleGlow() {
  if (!litMat) litMat = new THREE.MeshBasicMaterial({ map: atlasTexture(), vertexColors: true, toneMapped: false });
  return litMat;
}
export const EDGE_W = new THREE.LineBasicMaterial({ color: 0xb8301a, transparent: true, opacity: 0.9 });
const GREEN = new THREE.MeshBasicMaterial({ color: 0x3fc45c });
const ARROW = new THREE.MeshBasicMaterial({ color: 0xffc848, toneMapped: false, transparent: true });

/** world readability: hazard outline colour / opacity and the dark-place emissive lift */
export function setWesternContrast(edge: number, opacity: number, lift: number) {
  EDGE_W.color.setHex(edge);
  EDGE_W.opacity = opacity;
  const m = obstacleMaterial();
  m.emissive.setHex(0xffe0b0);
  m.emissiveIntensity = lift * 0.55;
}

function mesh(m: Model, glow = false) {
  const me = new THREE.Mesh(m.bake(), glow ? obstacleGlow() : obstacleMaterial());
  return me;
}
/** hazard outline of a simple box (keeps line count tiny) */
function boxEdge(w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), EDGE_W);
  l.position.set(x, y, z);
  l.rotation.y = ry;
  return l;
}
export interface WView {
  group: THREE.Group;
  update(o: LiveObstacle, t: number, dt: number): void;
  setup(o: LiveObstacle): void;
  collect?(): void;
}

const WOOD = 0x9a6a3a;
const WOOD_D = 0x5a3a1e;

// ------------------------------------------------------------------ builders
function crate(set: ObSet): WView {
  const group = new THREE.Group();
  const variants: THREE.Object3D[] = [];
  const make = (f: (m: Model) => void) => {
    const m = new Model();
    f(m);
    const me = mesh(m);
    group.add(me);
    variants.push(me);
  };
  const tnt = (m: Model) => {
    m.box(1.7, 1.7, 1.7, 0xd8a868, 0, 0.85, 0, 0, { atlas: 'tnt', map: 'all' });
  };
  const barrels = (m: Model, c = 0xb8301a) => {
    for (const x of [-0.42, 0.42]) {
      m.cyl(0.41, 0.41, 1.15, c, x, 0.575, 0, 14, 0, 0, { atlas: 'barrelTop', map: 'all' });
      for (const y of [0.25, 0.9]) m.cyl(0.42, 0.42, 0.05, 0x2a2a2a, x, y, 0, 14);
    }
    m.cyl(0.38, 0.38, 0.55, c, 0, 1.43, 0.05, 14, Math.PI / 2, 0, { atlas: 'barrelTop', map: 'all' });
  };
  const hay = (m: Model) => {
    m.box(1.7, 0.84, 1.3, 0xe8c868, 0, 0.42, 0, 0, { atlas: 'hay', map: 'all' });
    m.box(1.6, 0.84, 1.2, 0xe0c060, 0, 1.26, 0, 0.12, { atlas: 'hay', map: 'all' });
  };
  const stone = (m: Model) => {
    m.box(1.7, 1.7, 1.7, 0xd8c09a, 0, 0.85, 0, 0, { atlas: 'stone', map: 'all' });
    m.box(1.75, 0.18, 1.75, 0xb89a72, 0, 1.62, 0);
  };
  const rock = (m: Model, c = 0xb8603a) => {
    m.ico(0.95, c, 0, 0.82, 0, 0.92, 0.88, 0.9, 0, 0.4);
    m.ico(0.45, c - 0x101008, 0.5, 0.35, 0.45, 1, 0.8, 1);
  };
  const cargo = (m: Model) => {
    m.box(1.7, 1.6, 1.7, 0x6a7a8a, 0, 0.8, 0, 0, { atlas: 'cargo', map: 'side' });
    m.box(1.74, 0.12, 1.74, 0x3a3a3a, 0, 1.62, 0);
  };
  const box = (m: Model) => {
    m.box(1.7, 1.7, 1.7, 0xc89858, 0, 0.85, 0, 0, { atlas: 'planks', map: 'all' });
    for (const s of [-1, 1]) m.box(0.12, 1.72, 1.72, 0x5a3a1e, s * 0.8, 0.85, 0);
  };
  const lists: Record<ObSet, ((m: Model) => void)[]> = {
    valley: [tnt, box, barrels, tnt],
    town: [box, barrels, tnt, box],
    rail: [cargo, box, cargo, tnt],
    oil: [barrels, (m) => barrels(m, 0x2a5a8a), barrels, (m) => barrels(m, 0xd8b030)],
    mine: [tnt, box, tnt, (m) => rock(m, 0x7a5a3a)],
    ruins: [stone, stone, (m) => rock(m, 0xc8a070), stone],
    storm: [box, barrels, tnt, rock],
    night: [box, tnt, barrels, box],
    coast: [box, (m) => rock(m, 0x8a7a6a), box, barrels],
    canyon: [rock, tnt, rock, box],
    badlands: [(m) => barrels(m, 0x3a3a3a), tnt, rock, barrels],
    gold: [tnt, box, tnt, box],
    pines: [box, (m) => rock(m, 0x8a8278), box, tnt],
    ranch: [hay, hay, box, hay],
  };
  lists[set].forEach((f) => make(f));
  const edge = boxEdge(1.72, 1.72, 1.72, 0, 0.86, 0);
  group.add(edge);
  return {
    group,
    setup(o) {
      const v = (o.spec.variant ?? 0) % variants.length;
      const ry = ((o.spec.variant ?? 0) - 1.5) * 0.06;
      variants.forEach((m, i) => {
        m.visible = i === v;
        m.rotation.y = ry;
      });
      edge.rotation.y = ry;
    },
    update() {},
  };
}

function barrier(set: ObSet): WView {
  const group = new THREE.Group();
  const m = new Model();
  if (set === 'ranch' || set === 'pines') {
    for (const x of [-1.15, 0, 1.15]) m.box(0.16, 1.35, 0.16, WOOD_D, x, 0.67, 0);
    for (const y of [0.4, 0.8, 1.2]) m.box(2.6, 0.14, 0.08, set === 'ranch' ? 0xf2ece0 : WOOD, 0, y, 0.05);
  } else if (set === 'rail') {
    for (let i = 0; i < 3; i++) m.box(2.5, 0.28, 0.3, vary2(0x5a3e26, i), 0, 0.15 + i * 0.3, (i - 1) * 0.05, 0, { atlas: 'planksDark', map: 'all' });
    m.box(2.6, 0.12, 0.16, 0x8a8a90, 0, 1.0, 0);
    m.box(0.6, 0.6, 0.28, 0xb8301a, 0, 1.25, 0.02, 0, { atlas: 'crossbuck', map: 'front' });
  } else if (set === 'oil') {
    m.cyl(0.45, 0.45, 2.55, 0x6a6a6a, 0, 0.6, 0, 14, 0, Math.PI / 2);
    for (const x of [-1, 0, 1]) m.cyl(0.5, 0.5, 0.1, 0xd8b030, x, 0.6, 0, 14, 0, Math.PI / 2);
    for (const x of [-0.9, 0.9]) m.box(0.3, 0.3, 0.5, 0x3a3a3a, x, 0.15, 0);
  } else if (set === 'ruins') {
    m.cyl(0.56, 0.6, 2.5, 0xd8c09a, 0, 0.6, 0, 12, 0, Math.PI / 2, { atlas: 'stone', map: 'side' });
    m.box(0.5, 0.4, 1.0, 0xc8a882, 1.0, 0.2, 0.2, 0.3);
  } else if (set === 'mine') {
    m.cyl(0.42, 0.48, 2.6, 0x7a5030, 0, 0.47, 0, 10, 0, Math.PI / 2);
    m.cyl(0.32, 0.36, 2.2, 0x6a4428, 0.1, 1.05, 0.02, 10, 0, Math.PI / 2);
  } else if (set === 'canyon' || set === 'coast' || set === 'badlands') {
    const c = set === 'coast' ? 0x8a7a6a : set === 'badlands' ? 0x7a4a3a : 0xb8603a;
    for (const x of [-0.85, 0, 0.85]) m.ico(0.62, c + (x > 0 ? 0x080604 : 0), x, 0.5, 0, 1.0, 0.9, 0.6, 0, x * 3);
  } else {
    // ROAD CLOSED sawhorse barricade: striped boards on A-frame legs
    for (const s of [-1, 1]) {
      m.box(0.12, 1.4, 0.12, WOOD, s * 1.1, 0.68, 0.18, 0, {}, -0.25);
      m.box(0.12, 1.4, 0.12, WOOD, s * 1.1, 0.68, -0.18, 0, {}, 0.25);
    }
    m.box(2.5, 0.3, 0.1, 0xf2ece0, 0, 1.15, 0, 0, { atlas: 'stripes', map: 'all' });
    m.box(2.5, 0.3, 0.1, 0xf2ece0, 0, 0.62, 0, 0, { atlas: set === 'night' || set === 'storm' ? 'stripes' : 'roadclosed', map: 'front' });
    m.cyl(0.08, 0.08, 0.16, 0xffb030, -1.1, 1.38, 0, 8);
    m.cyl(0.08, 0.08, 0.16, 0xffb030, 1.1, 1.38, 0, 8);
  }
  group.add(mesh(m));
  group.add(boxEdge(2.5, 1.3, 0.35, 0, 0.7, 0));
  return { group, setup() {}, update() {} };
}
function vary2(c: number, i: number) {
  return new THREE.Color(c).offsetHSL(0, 0, (i % 3) * 0.03 - 0.03).getHex();
}

function beam(set: ObSet): WView {
  const group = new THREE.Group();
  const m = new Model();
  const postC = set === 'ruins' ? 0xd0b08a : set === 'rail' || set === 'oil' ? 0x7a7a7a : WOOD_D;
  for (const s of [-1, 1]) m.box(0.3, 6.2, 0.35, postC, 1.38 * s, 3.1, 0);
  // the hanging part: underside at 0.95–1.0 m, everything above it (the hitbox spans 0.95 … 5.95)
  if (set === 'mine') {
    m.box(2.9, 0.6, 0.6, WOOD_D, 0, 1.3, 0);
    m.box(2.9, 0.6, 0.6, WOOD_D, 0, 5.6, 0);
    m.box(0.25, 3.8, 0.25, WOOD, -0.6, 3.4, 0, 0, {}, 0, 0.45);
    m.box(0.25, 3.8, 0.25, WOOD, 0.6, 3.4, 0, 0, {}, 0, -0.45);
    m.box(1.0, 0.9, 0.12, 0xd8b070, 0, 2.1, 0.32, 0, { atlas: 'tnt', map: 'front' });
  } else if (set === 'ruins') {
    m.box(3.0, 1.4, 1.0, 0xd8c09a, 0, 1.7, 0, 0, { atlas: 'stone', map: 'all' });
    m.box(3.1, 0.4, 1.1, 0xc8a882, 0, 2.6, 0);
    m.box(2.6, 2.9, 0.8, 0xd0b48c, 0, 4.4, 0, 0, { atlas: 'stone', map: 'all' });
  } else if (set === 'rail' || set === 'oil') {
    m.box(3.0, 0.3, 0.3, 0x5a5a5a, 0, 6.0, 0);
    m.box(2.6, 2.4, 1.0, set === 'rail' ? 0x2a6a8a : 0xd8b030, 0, 2.2, 0, 0, { atlas: set === 'rail' ? 'cargo' : 'petro', map: set === 'rail' ? 'side' : 'front' });
    m.box(0.06, 2.6, 0.06, 0x3a3a3a, -0.8, 4.7, 0);
    m.box(0.06, 2.6, 0.06, 0x3a3a3a, 0.8, 4.7, 0);
  } else if (set === 'canyon' || set === 'coast' || set === 'badlands') {
    const c = set === 'coast' ? 0x8a7a6a : set === 'badlands' ? 0x6a3e30 : 0xb8603a;
    m.box(3.0, 1.5, 1.2, c, 0, 1.75, 0);
    m.ico(1.5, c - 0x0a0806, 0, 3.6, 0, 1.2, 1.1, 0.7);
    m.plane(0.9, 0.9, 'rockfall', 0, 1.75, 0.61);
  } else {
    // hanging wooden sign under a crossbar
    const sign = set === 'town' ? 'saloon' : set === 'gold' ? 'goldmine' : set === 'night' ? 'motel' : set === 'ranch' || set === 'pines' ? 'hotel' : 'gas';
    m.box(3.0, 0.3, 0.3, WOOD_D, 0, 5.9, 0);
    for (const x of [-0.9, 0.9]) m.box(0.05, 3.0, 0.05, 0x3a3a3a, x, 4.4, 0);
    m.box(2.8, 1.9, 0.22, 0x8a5a2e, 0, 1.97, 0, 0, { atlas: 'planksDark', map: 'side', rep: [2, 1] });
    m.plane(2.6, 1.0, sign, 0, 2.15, 0.12);
    m.box(2.9, 0.18, 0.3, WOOD_D, 0, 1.02, 0);
  }
  group.add(mesh(m));
  group.add(boxEdge(2.6, 0.12, 0.6, 0, 1.0, 0));
  // "go under" cue: a small golden down-chevron bobbing under the beam
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 3), ARROW);
  arrow.rotation.z = Math.PI;
  arrow.position.set(0, 0.6, 0.4);
  group.add(arrow);
  return {
    group,
    setup() {},
    update(_o, t) {
      arrow.position.y = 0.55 + Math.sin(t * 5) * 0.06;
    },
  };
}

function traffic(set: ObSet): WView {
  const group = new THREE.Group();
  const paints = set === 'night' ? [0x8a2a1a, 0x2a4a6a, 0xd8c8a8, 0x3a5a3a] : [0xb8402a, 0xd8b878, 0x2a6a7a, 0xe8e2d6];
  const cars: THREE.Mesh[] = [];
  const headMat = obstacleGlow();
  // pickup truck facing the player (front at +z), wheels on the road; fits 1.7 × 2.6 × 3.6
  paints.forEach((c) => {
    const m = new Model();
    m.box(1.7, 0.7, 3.5, c, 0, 0.85, 0);
    m.box(1.62, 0.75, 1.5, c, 0, 1.55, 0.35);
    m.box(1.5, 0.55, 0.06, 0x1a2028, 0, 1.6, 1.11, 0, {}, -0.2);
    m.box(1.55, 0.06, 1.6, 0x3a2a1a, 0, 1.2, -1.0); // bed floor
    m.box(1.72, 0.32, 0.12, 0x9a9a9a, 0, 0.62, 1.78); // chrome bumper
    m.box(1.0, 0.36, 0.06, 0x2a2a2a, 0, 0.98, 1.76); // grille
    for (const x of [-0.86, 0.86]) for (const z of [-1.15, 1.15]) m.cyl(0.38, 0.38, 0.28, 0x1a1a1a, x, 0.38, z, 12, 0, Math.PI / 2);
    const me = mesh(m);
    const lights = new Model();
    for (const s of [-1, 1]) lights.box(0.32, 0.18, 0.04, 0xfff0c8, s * 0.58, 1.0, 1.77);
    me.add(new THREE.Mesh(lights.bake(), headMat));
    group.add(me);
    cars.push(me);
  });
  // variant 4: the big one — per place a different truck (same footprint as the hitbox)
  const big = new Model();
  if (set === 'oil' || set === 'badlands') {
    big.box(1.7, 1.5, 1.2, 0xd8b030, 0, 1.3, 1.2);
    big.cyl(0.8, 0.8, 2.3, 0xe8e2d6, 0, 1.6, -0.55, 14, Math.PI / 2, 0);
    big.plane(1.8, 0.6, 'petro', 0.81, 1.6, -0.55, Math.PI / 2);
  } else if (set === 'pines' || set === 'mine' || set === 'canyon') {
    big.box(1.7, 1.5, 1.2, 0x3a7a3a, 0, 1.3, 1.2);
    for (const [x, y] of [[-0.45, 1.1], [0.45, 1.1], [0, 1.85], [-0.45, 2.5], [0.45, 2.5]] as const) big.cyl(0.36, 0.36, 2.3, 0x8a5a30, x, y - 0.1, -0.55, 10, Math.PI / 2, 0);
  } else if (set === 'town' || set === 'ranch' || set === 'gold') {
    // stagecoach / hay wagon pulled by its own momentum (no horses): wooden box on spoked wheels
    big.box(1.6, 1.6, 2.8, set === 'ranch' ? 0xe0c060 : 0x7a2a1a, 0, 1.6, -0.2, 0, { atlas: set === 'ranch' ? 'hay' : 'planksDark', map: 'side' });
    big.box(1.7, 0.12, 3.0, 0x3a2410, 0, 2.45, -0.2);
    big.box(1.7, 0.2, 0.9, 0x5a3a1e, 0, 1.2, 1.4);
    for (const x of [-0.86, 0.86])
      for (const z of [-1.2, 1.2]) {
        big.push(x, 0.65, z, 0, 0, Math.PI / 2);
        big.add(new THREE.TorusGeometry(0.62, 0.07, 5, 14), 0x3a2410, 0, 0, 0);
        big.pop();
      }
  } else {
    // box truck with the game's livery
    big.box(1.7, 1.5, 1.2, 0xc8402a, 0, 1.3, 1.2);
    big.box(1.7, 2.3, 2.4, 0xe8e2d6, 0, 1.75, -0.6, 0, { atlas: 'cargo', map: 'side' });
    big.plane(2.2, 1.1, 'billboard', 0.86, 1.9, -0.6, Math.PI / 2);
    big.plane(2.2, 1.1, 'billboard', -0.86, 1.9, -0.6, -Math.PI / 2);
  }
  big.box(1.4, 0.6, 0.06, 0x1a2028, 0, 1.75, 1.81);
  for (const x of [-0.86, 0.86]) for (const z of [-1.2, 1.2]) big.cyl(0.42, 0.42, 0.3, 0x1a1a1a, x, 0.42, z, 12, 0, Math.PI / 2);
  const truck = mesh(big);
  const tl = new Model();
  for (const s of [-1, 1]) tl.box(0.3, 0.16, 0.04, 0xfff0c8, s * 0.55, 1.05, 1.82);
  truck.add(new THREE.Mesh(tl.bake(), headMat));
  group.add(truck);
  group.add(boxEdge(1.72, 2.4, 3.62, 0, 1.25, 0));
  return {
    group,
    setup(o) {
      const v = o.spec.variant ?? 0;
      cars.forEach((c, i) => (c.visible = v < 4 && i === v % 4));
      truck.visible = v >= 4;
    },
    update(_o, t) {
      // a light road rumble (no hover — these drive on the road); place() resets y before this
      group.position.y = Math.abs(Math.sin(t * 18)) * 0.02;
    },
  };
}

function ring(): WView {
  // golden horseshoe hoop (open bottom: the road ahead stays visible) — fly through for Gold Fever
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.25;
  group.add(body);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffc848, transparent: true, toneMapped: false });
  const fine = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.85, toneMapped: false });
  const shoe = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.13, 8, 48, Math.PI * 1.62), mat);
  shoe.rotation.z = -Math.PI / 2 - Math.PI * 0.81 + Math.PI; // opening at the bottom
  body.add(shoe);
  const nails = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.76 + (i / 7) * Math.PI * 1.52 + Math.PI / 2;
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3), fine);
    n.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0);
    nails.add(n);
  }
  body.add(nails);
  // heel calkins
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.32), mat);
    c.position.set(s * 0.78, -1.04, 0);
    body.add(c);
  }
  let got = -1;
  return {
    group,
    setup() {
      got = -1;
      body.scale.setScalar(1);
      body.visible = true;
      mat.opacity = 1;
      fine.opacity = 0.85;
    },
    collect() {
      if (got < 0) got = 0;
    },
    update(_o, t, dt) {
      nails.rotation.z = Math.sin(t * 2) * 0.04;
      if (got >= 0) {
        got += dt;
        const k = Math.min(1, got / 0.35);
        body.scale.setScalar(1 + 0.45 * k * (2 - k));
        mat.opacity = 1 - k;
        fine.opacity = 0.85 * (1 - k);
        body.visible = k < 1;
      } else mat.color.setHex(0xffc848).multiplyScalar(0.92 + 0.08 * Math.sin(t * 5));
    },
  };
}

function platform(set: ObSet): WView {
  const group = new THREE.Group();
  const m = new Model();
  if (set === 'mine' || set === 'gold') {
    m.box(2.2, 0.9, 2.8, 0x8a4a22, 0, 0.6, 0, 0, { atlas: 'corrugated', map: 'side' });
    m.ico(0.9, 0xffc848, 0, 1.05, 0, 1.1, 0.25, 1.4);
  } else if (set === 'ranch' || set === 'pines' || set === 'town') {
    m.box(2.3, 0.3, 3.1, 0x8a5a30, 0, 0.45, 0, 0, { atlas: 'planks', map: 'all' });
    m.box(2.1, 0.5, 2.6, 0xe0c060, 0, 0.85, 0, 0, { atlas: 'hay', map: 'all' });
  } else {
    // railroad handcar: wooden deck, pump lever, iron wheels
    m.box(2.3, 0.25, 3.1, 0x6a4a2a, 0, 0.55, 0, 0, { atlas: 'planksDark', map: 'all' });
    m.box(0.2, 0.5, 0.2, 0x3a3a3a, 0, 0.9, 0);
    m.box(1.6, 0.12, 0.12, 0x3a3a3a, 0, 1.05, 0, 0, {}, 0, 0.25);
  }
  for (const x of [-1.0, 1.0]) for (const z of [-1.1, 1.1]) m.cyl(0.32, 0.32, 0.12, 0x2a2a2a, x, 0.32, z, 10, 0, Math.PI / 2);
  group.add(mesh(m));
  group.add(boxEdge(2.4, 1.1, 3.2, 0, 0.55, 0));
  return { group, setup() {}, update() {} };
}

function boulder(set: ObSet): WView {
  const group = new THREE.Group();
  const c = set === 'night' ? 0x8a6a5a : set === 'ruins' ? 0xc8a070 : set === 'coast' ? 0x8a7a6a : 0xb8603a;
  const geo = new THREE.IcosahedronGeometry(1.2, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.84 + 0.22 * Math.abs(Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7)));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new Model();
  m.add(geo, c);
  m.ico(0.5, c + 0x0c0a08, 0.75, -0.6, 0.6, 1, 0.6, 1);
  const rock = mesh(m);
  rock.position.y = 1.3;
  group.add(rock);
  rock.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), EDGE_W));
  return {
    group,
    setup() {},
    update(_o, _t, dt) {
      rock.rotation.x += dt * 1.6; // rolling toward the car
    },
  };
}

function crossing(set: ObSet): WView {
  // railroad-crossing gantry across the road; per lane: striped booms (low → hop), hanging plank
  // curtain (high → dive), plank wall (block), or a green arrow (open)
  const group = new THREE.Group();
  const frame = new Model();
  const postC = set === 'ruins' ? 0xd0b08a : 0x5a3a1e;
  for (const x of [-3.95, -1.3, 1.3, 3.95]) frame.box(0.3, 6.2, 0.4, postC, x, 3.1, 0);
  frame.box(8.4, 0.35, 0.45, postC, 0, 6.3, 0);
  for (const x of [-3.95, 3.95]) frame.plane(1.4, 1.4, 'crossbuck', x, 4.6, 0.22);
  group.add(mesh(frame));
  const sets: Record<string, THREE.Object3D>[] = [];
  for (let i = 0; i < 3; i++) {
    const low = new Model();
    for (const y of [0.35, 0.8, 1.25]) low.box(2.55, 0.16, 0.1, 0xf2ece0, 0, y, 0, 0, { atlas: 'stripes', map: 'all' });
    const lowM = mesh(low);
    lowM.add(boxEdge(2.55, 1.2, 0.2, 0, 0.8, 0));
    const high = new Model();
    for (let k = 0; k < 6; k++) high.box(2.5, 0.62, 0.12, k % 2 ? 0x8a5a2e : 0xa86a36, 0, 1.4 + k * 0.72, 0, 0, { atlas: 'planksDark', map: 'all' });
    high.plane(1.3, 1.3, 'rockfall', 0, 2.8, 0.08);
    const highM = mesh(high);
    highM.add(boxEdge(2.55, 0.1, 0.2, 0, 1.07, 0));
    const block = new Model();
    block.box(2.55, 5.5, 0.16, 0x8a5a2e, 0, 3.0, 0, 0, { atlas: 'planks', map: 'all', rep: [1, 3] });
    block.plane(2.2, 0.8, 'roadclosed', 0, 2.2, 0.09);
    const blockM = mesh(block);
    blockM.add(boxEdge(2.55, 5.5, 0.2, 0, 3.0, 0));
    const open = new THREE.Group();
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), GREEN);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.05, -1);
    arrow.scale.y = 0.3;
    open.add(arrow);
    const s = { low: lowM, high: highM, block: blockM, open } as Record<string, THREE.Object3D>;
    for (const g of Object.values(s)) {
      g.position.x = LANES[i];
      group.add(g);
    }
    sets.push(s);
  }
  return {
    group,
    setup(o) {
      for (let i = 0; i < 3; i++) {
        const md = o.spec.laser![i];
        for (const k of Object.keys(sets[i])) sets[i][k].visible = k === md;
      }
    },
    update() {},
  };
}

function stockade(set: ObSet): WView {
  // a frontier stockade across the road with one gate (green-painted frame + arrow sign)
  const group = new THREE.Group();
  const logC = set === 'ruins' ? 0xd0b08a : 0x7a5030;
  const walls: THREE.Object3D[] = [];
  const lintels: THREE.Object3D[] = [];
  const frames: THREE.Object3D[] = [];
  const doors: { l: THREE.Object3D; r: THREE.Object3D }[] = [];
  for (let i = 0; i < 3; i++) {
    const x = LANES[i];
    const w = new Model();
    for (let k = 0; k < 6; k++) {
      w.cyl(0.22, 0.22, 6.4, logC + (k % 2 ? 0x080604 : 0), -1.08 + k * 0.43, 3.2, 0, 7);
      w.cone(0.22, 0.6, logC, -1.08 + k * 0.43, 6.7, 0, 7);
    }
    w.box(2.6, 0.25, 0.3, 0x4a2c16, 0, 2.0, 0.25);
    w.box(2.6, 0.25, 0.3, 0x4a2c16, 0, 4.6, 0.25);
    const wall = mesh(w);
    wall.position.x = x;
    wall.add(boxEdge(2.6, 7, 0.6, 0, 3.5, 0));
    group.add(wall);
    walls.push(wall);
    const l = new Model();
    for (let k = 0; k < 6; k++) {
      l.cyl(0.22, 0.22, 4.4, logC, -1.08 + k * 0.43, 4.6, 0, 7);
      l.cone(0.22, 0.6, logC, -1.08 + k * 0.43, 7.1, 0, 7);
    }
    l.box(2.7, 0.5, 0.4, 0x4a2c16, 0, 2.55, 0.2);
    l.plane(2.2, 0.8, set === 'town' ? 'sheriff' : 'goldmine', 0, 3.4, 0.24);
    const lintel = mesh(l);
    lintel.position.x = x;
    group.add(lintel);
    lintels.push(lintel);
    const fr = new THREE.Group();
    for (const [fw, fh, fx, fy] of [[2.5, 0.14, 0, 2.4], [0.14, 2.4, -1.25, 1.2], [0.14, 2.4, 1.25, 1.2]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.7), GREEN);
      f.position.set(fx, fy, 0);
      fr.add(f);
    }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.66, 3), GREEN);
    arrow.rotation.z = Math.PI;
    arrow.position.set(0, 3.2 - 0.3, 0.5);
    fr.add(arrow);
    fr.position.x = x;
    group.add(fr);
    frames.push(fr);
    // swinging saloon doors (hinged at the frame posts)
    const dm = new Model();
    dm.box(1.15, 1.2, 0.08, 0xb07a4a, 0.58, 1.2, 0, 0, { atlas: 'planks', map: 'all' });
    const geoDoor = dm.bake();
    const dl = new THREE.Group();
    dl.add(new THREE.Mesh(geoDoor, obstacleMaterial()));
    dl.position.set(x - 1.2, 0, 0);
    const dr = new THREE.Group();
    const mr = new THREE.Mesh(geoDoor, obstacleMaterial());
    mr.scale.x = -1;
    dr.add(mr);
    dr.position.set(x + 1.2, 0, 0);
    group.add(dl, dr);
    doors.push({ l: dl, r: dr });
  }
  const towers = new Model();
  for (const s of [-1, 1]) {
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]] as const) towers.box(0.18, 8.2, 0.18, 0x5a3a1e, 4.9 * s + dx, 4.1, dz);
    towers.box(1.9, 1.1, 1.9, 0x7a5030, 4.9 * s, 8.4, 0, 0, { atlas: 'planks', map: 'side' });
    towers.cone(1.5, 1.0, 0x4a2c16, 4.9 * s, 9.5, 0, 4);
  }
  group.add(mesh(towers));
  return {
    group,
    setup(o) {
      for (let i = 0; i < 3; i++) {
        const isDoor = i === o.spec.door;
        walls[i].visible = !isDoor;
        lintels[i].visible = isDoor;
        frames[i].visible = isDoor;
        doors[i].l.visible = doors[i].r.visible = isDoor;
      }
    },
    update(o) {
      const d = o.spec.door ?? 1;
      const open = Math.min(1, Math.max(0, (-o.z - 45) / -40 + 1)); // swing open between 85 m and 45 m out
      doors[d].l.rotation.y = -open * 1.45;
      doors[d].r.rotation.y = open * 1.45;
    },
  };
}

function tumbleweed(): WView {
  const group = new THREE.Group();
  const m = new Model();
  for (let i = 0; i < 4; i++) m.add(new THREE.TorusGeometry(0.75, 0.06, 4, 12), 0xa88a5a, 0, 0, 0, i * 0.8, i * 0.6, 0);
  const tw = mesh(m);
  tw.position.y = 1.2;
  group.add(tw);
  return {
    group,
    setup() {},
    update(_o, _t, dt) {
      tw.rotation.x += dt * 3;
    },
  };
}

export function buildWesternObstacle(type: ObstacleType, set: ObSet): WView {
  switch (type) {
    case 'crate': return crate(set);
    case 'barrier': return barrier(set);
    case 'beam': return beam(set);
    case 'traffic': return traffic(set);
    case 'ring': return ring();
    case 'platform': return platform(set);
    case 'asteroid': return boulder(set);
    case 'laser': return crossing(set);
    case 'gate': return stockade(set);
    case 'drone': return tumbleweed();
  }
}
