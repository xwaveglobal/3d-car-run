import * as THREE from 'three';
import { Model, baked, vary } from './kit.ts';

/**
 * 3D Car Run v1.0.0 — Western prop catalogue. Every prop is baked once into a single geometry
 * (vertex colours + atlas uvs, see kit.ts); origin = centre of its footprint on the ground, +z faces
 * the road side the field turns toward. Sizes in metres.
 */
const SAND = 0xd8a868;
const RED = 0xb8603a;
const WOOD = 0x8a5a30;
const WOOD_D = 0x5a3a1e;
const WOOD_L = 0xb08050;
const GREEN = 0x4f7f3a;
const STEEL = 0x8a8a86;
const RUST = 0x9a4a22;

// ------------------------------------------------------------------ nature
export const saguaro = (v = 0) =>
  baked(`saguaro${v}`, () => {
    const m = new Model();
    const h = 4.4 + v * 1.2;
    const c = vary(GREEN, v + 1, 0.05);
    m.cyl(0.32, 0.38, h, c, 0, h / 2, 0, 8);
    m.ico(0.33, c, 0, h, 0, 1, 0.7, 1);
    const arms = v === 2 ? [-1] : [-1, 1];
    arms.forEach((s, i) => {
      const y = h * (0.45 + i * 0.12);
      m.cyl(0.2, 0.2, 0.7, c, s * 0.5, y, 0, 7, 0, Math.PI / 2);
      m.cyl(0.2, 0.22, 1.5 + v * 0.3, c, s * 0.85, y + 0.75 + v * 0.15, 0, 7);
      m.ico(0.21, c, s * 0.85, y + 1.5 + v * 0.3, 0, 1, 0.7, 1);
    });
    return m;
  });

export const shrub = (v = 0) =>
  baked(`shrub${v}`, () => {
    const m = new Model();
    const c = [0x8a8a4a, 0x6a7a3a, 0x9a8a5a][v % 3];
    for (let i = 0; i < 4; i++) m.ico(0.45 + (i % 2) * 0.2, vary(c, i + v * 7, 0.08), Math.cos(i * 1.7) * 0.5, 0.35 + (i % 3) * 0.1, Math.sin(i * 1.7) * 0.5, 1, 0.75, 1, 0);
    return m;
  });

export const pricklyPear = () =>
  baked('pear', () => {
    const m = new Model();
    const pad = (x: number, y: number, z: number, r: number) => m.add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 9).rotateX(Math.PI / 2), 0x5a8a3a, x, y, z, 0, 0, r);
    pad(0, 0.45, 0, 0);
    pad(0.4, 0.95, 0, -0.5);
    pad(-0.35, 1.0, 0.05, 0.6);
    pad(0.1, 1.45, 0, 0.1);
    m.ico(0.08, 0xe0402a, 0.15, 1.88, 0);
    return m;
  });

export const joshua = () =>
  baked('joshua', () => {
    const m = new Model();
    m.cyl(0.18, 0.28, 3, 0x7a6a4a, 0, 1.5, 0, 6);
    for (const [a, l] of [[-0.6, 1.4], [0.7, 1.2], [0.1, 1.0]] as const) {
      m.push(0, 2.8, 0, a * 2, 0, a);
      m.cyl(0.12, 0.16, l, 0x7a6a4a, 0, l / 2, 0, 6);
      m.ico(0.42, 0x5a7a3a, 0, l + 0.2, 0, 1, 1.1, 1);
      m.pop();
    }
    return m;
  });

export const boulder = (v = 0, c = RED) =>
  baked(`boulder${v}-${c}`, () => {
    const m = new Model();
    m.ico(1.2, vary(c, v, 0.05), 0, 0.7, 0, 1.3, 0.75, 1.0, 0, v);
    m.ico(0.6, vary(c, v + 3, 0.08), 1.1, 0.35, 0.4, 1, 0.8, 1);
    if (v % 2) m.ico(0.45, vary(c, v + 5, 0.08), -0.9, 0.3, -0.5, 1, 0.8, 1.2);
    return m;
  });

/** layered mesa / butte (big backdrop) — unit size, scaled by the field */
export const mesa = (v = 0, c = RED) =>
  baked(`mesa${v}-${c}`, () => {
    const m = new Model();
    const seg = 7 + (v % 3);
    const bands = [vary(c, v, 0.04), vary(c - 0x101008, v + 2, 0.05), vary(c + 0x0a0806, v + 4, 0.04), vary(c - 0x080404, v + 6, 0.05)];
    let y = 0;
    const steps = v === 1 ? [[1.0, 0.95, 0.25], [0.85, 0.82, 0.35], [0.8, 0.78, 0.4]] : v === 2 ? [[1.0, 0.7, 0.4], [0.42, 0.36, 0.6]] : [[1.0, 0.92, 0.3], [0.9, 0.88, 0.45], [0.86, 0.84, 0.25]];
    steps.forEach(([rb, rt, h], i) => {
      m.cyl(rt, rb, h, bands[i % 4], 0, y + h / 2, 0, seg);
      y += h;
    });
    m.cyl(steps[steps.length - 1][1] * 0.98, steps[steps.length - 1][1], 0.04, vary(c + 0x101010, v + 9, 0.03), 0, y + 0.02, 0, seg);
    return m;
  });

export const hoodoo = (v = 0) =>
  baked(`hoodoo${v}`, () => {
    const m = new Model();
    let y = 0;
    const cols = [0xc06a40, 0xd88a58, 0xa85a36, 0xe0a070];
    for (let i = 0; i < 4 + v; i++) {
      const r = 0.9 - i * 0.08 + Math.sin(i * 2.1 + v) * 0.15;
      const h = 1.2 + Math.cos(i * 1.3) * 0.3;
      m.cyl(r * 0.85, r, h, cols[(i + v) % 4], Math.sin(i) * 0.1, y + h / 2, 0, 7);
      y += h * 0.95;
    }
    m.cyl(1.1, 0.9, 0.5, 0x8a4a2a, 0, y + 0.2, 0, 7);
    return m;
  });

/** big canyon rock slab (side walls) — unit-ish, scaled */
export const rockWall = (v = 0, c = RED) =>
  baked(`rockwall${v}-${c}`, () => {
    const m = new Model();
    const bands = [c, c - 0x0c0804, c + 0x0c0a06, c - 0x18100a];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(1, 0.26, 1, 1, 1, 1);
      m.add(g, vary(bands[i], v + i, 0.03), Math.sin(i * 1.7 + v) * 0.06, 0.13 + i * 0.25, Math.cos(i * 2.3) * 0.05, Math.sin(i + v) * 0.1);
    }
    m.ico(0.45, vary(c, v + 9), 0.3, 1.05, 0.1, 1, 0.4, 0.9);
    return m;
  });

export const tumbleweed = () =>
  baked('tumble', () => {
    const m = new Model();
    for (let i = 0; i < 3; i++) m.add(new THREE.TorusGeometry(0.45, 0.04, 4, 10), 0xa88a5a, 0, 0.5, 0, i * 1.05, i * 0.7, 0);
    m.ico(0.32, 0x8a7048, 0, 0.5, 0, 1, 1, 1);
    return m;
  });

export const pine = (v = 0) =>
  baked(`pine${v}`, () => {
    const m = new Model();
    const h = 8 + v * 2;
    m.cyl(0.18, 0.3, h * 0.3, 0x5a3a20, 0, h * 0.15, 0, 6);
    for (let k = 0; k < 3; k++) m.cone(h * (0.3 - k * 0.07), h * 0.42, vary(0x2f5a2a, k + v * 3, 0.06), 0, h * (0.42 + k * 0.2), 0, 7);
    return m;
  });

export const deadTree = (v = 0) =>
  baked(`dead${v}`, () => {
    const m = new Model();
    const c = 0x6a5a48;
    m.cyl(0.16, 0.28, 3.4, c, 0, 1.7, 0, 6);
    for (const [a, h, l] of [[0.8, 2.4, 1.6], [-0.7, 2.9, 1.3], [0.3, 3.3, 1.0], [-1.1, 1.8, 1.1]] as const) {
      m.push(0, h, 0, a * 3, 0, a);
      m.cyl(0.05, 0.1, l, c, 0, l / 2, 0, 5);
      m.pop();
    }
    return m;
  });

export const palm = (v = 0) =>
  baked(`palm${v}`, () => {
    const m = new Model();
    const h = 6 + v;
    for (let i = 0; i < 6; i++) m.cyl(0.2 - i * 0.012, 0.22 - i * 0.012, h / 6, vary(0x8a6a44, i), Math.sin(i * 0.4) * 0.25 * (i / 6), (i + 0.5) * (h / 6), 0, 6);
    for (let k = 0; k < 7; k++) {
      m.push(0.25, h, 0, (k / 7) * Math.PI * 2, 0, 0);
      m.box(0.5, 0.06, 2.6, vary(0x3a8a3a, k, 0.08), 0, -0.3, 1.2, 0, {}, 0.45);
      m.pop();
    }
    return m;
  });

export const dune = () =>
  baked('dune', () => {
    const m = new Model();
    const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1.6, 0.35, 1);
    m.add(g, SAND, 0, 0, 0);
    return m;
  });

export const seaStack = (v = 0) =>
  baked(`stack${v}`, () => {
    const m = new Model();
    m.cyl(2.2, 3.4, 9 + v * 3, vary(0x8a7a6a, v), 0, (9 + v * 3) / 2 - 1, 0, 7);
    m.cone(2.4, 2, 0x5a7a3a, 0, 9 + v * 3, 0, 7);
    return m;
  });

// ------------------------------------------------------------------ ranch / roadside
export const windmillTower = () =>
  baked('wmtower', () => {
    const m = new Model();
    const H = 10;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      m.push(sx * 1.1, 0, sz * 1.1, 0, -sz * 0.1, sx * 0.1);
      m.box(0.12, H, 0.12, STEEL, 0, H / 2, 0);
      m.pop();
    }
    for (let k = 1; k < 5; k++) {
      const y = k * 2;
      const w = 2.2 - k * 0.38;
      m.box(w, 0.08, 0.08, STEEL, 0, y, w / 2);
      m.box(w, 0.08, 0.08, STEEL, 0, y, -w / 2);
      m.box(0.08, 0.08, w, STEEL, w / 2, y, 0);
      m.box(0.08, 0.08, w, STEEL, -w / 2, y, 0);
    }
    m.box(0.5, 0.4, 0.5, 0x5a5a5a, 0, H + 0.1, 0);
    // tail vane
    m.box(0.06, 0.06, 2.2, STEEL, 0, H + 0.5, -1.1);
    m.box(0.04, 1.0, 1.2, 0xc8b8a0, 0, H + 0.6, -2.2);
    return m;
  });
/** rotor: origin = hub, spins about +z */
export const windmillRotor = () =>
  baked('wmrotor', () => {
    const m = new Model();
    m.cyl(0.25, 0.25, 0.3, 0x4a4a4a, 0, 0, 0, 10, Math.PI / 2);
    for (let k = 0; k < 14; k++) {
      m.push(0, 0, 0.1, 0, 0, (k / 14) * Math.PI * 2);
      m.box(0.32, 1.7, 0.03, k % 2 ? 0xd8d0c0 : 0xb8b0a0, 0.1, 1.15, 0, 0, {}, 0, 0.3);
      m.pop();
    }
    m.add(new THREE.TorusGeometry(1.9, 0.04, 4, 24), STEEL, 0, 0, 0.1);
    return m;
  });

export const waterTower = () =>
  baked('wtower', () => {
    const m = new Model();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) m.box(0.22, 6, 0.22, WOOD_D, sx * 1.3, 3, sz * 1.3);
    m.box(2.8, 0.15, 0.15, WOOD_D, 0, 3, 1.3);
    m.box(2.8, 0.15, 0.15, WOOD_D, 0, 3, -1.3);
    m.cyl(1.8, 1.8, 2.6, WOOD_L, 0, 7.3, 0, 12, 0, 0, { atlas: 'planks', map: 'side', rep: [3, 1] });
    for (const y of [6.3, 7.3, 8.3]) m.cyl(1.83, 1.83, 0.08, 0x3a3a3a, 0, y, 0, 12);
    m.cone(2.0, 1.2, WOOD_D, 0, 9.2, 0, 12);
    return m;
  });

export const fence = () =>
  baked('fence', () => {
    const m = new Model();
    for (const z of [-3, 0, 3]) m.box(0.14, 1.3, 0.14, WOOD_D, 0, 0.65, z);
    for (const y of [0.45, 0.85, 1.2]) m.box(0.06, 0.12, 6.1, vary(WOOD, y * 10, 0.06), 0.06, y, 0);
    return m;
  });

export const billboard = () =>
  baked('billboard', () => {
    const m = new Model();
    m.box(0.25, 6, 0.25, WOOD_D, -2.6, 3, -0.1);
    m.box(0.25, 6, 0.25, WOOD_D, 2.6, 3, -0.1);
    m.box(7.4, 3.8, 0.2, WOOD_D, 0, 5, -0.12);
    m.plane(7, 3.5, 'billboard', 0, 5, 0.01);
    m.box(7.4, 0.12, 0.6, WOOD, 0, 3.1, 0.2);
    return m;
  });

export const route66 = () =>
  baked('r66', () => {
    const m = new Model();
    m.box(0.12, 3, 0.12, 0x6a6a6a, 0, 1.5, -0.08);
    m.plane(1.3, 1.3, 'route66', 0, 2.9, 0);
    m.box(1.34, 1.34, 0.04, 0x2a2a2a, 0, 2.9, -0.03);
    return m;
  });

export const rockfallSign = () =>
  baked('rfsign', () => {
    const m = new Model();
    m.box(0.1, 2.6, 0.1, 0x6a6a6a, 0, 1.3, -0.06);
    m.plane(1.2, 1.2, 'rockfall', 0, 2.4, 0);
    return m;
  });

export const gasStation = () =>
  baked('gas', () => {
    const m = new Model();
    m.box(6, 3.4, 4, 0xe8dcc8, 0, 1.7, -1, 0, { atlas: 'planks', map: 'all', rep: [2, 1] });
    m.box(6.4, 0.3, 4.4, 0xb8281a, 0, 3.5, -1);
    m.plane(3.6, 0.9, 'gas', 0, 2.9, 1.02);
    m.plane(1, 1, 'window', -1.8, 1.6, 1.02);
    m.plane(1, 1, 'window', 1.8, 1.6, 1.02);
    // canopy + pumps
    m.box(5, 0.3, 3.4, 0xf2ece0, 0, 4.2, 3.2);
    for (const x of [-2.2, 2.2]) m.box(0.2, 4.1, 0.2, 0xf2ece0, x, 2.05, 4.4);
    for (const x of [-1, 1]) {
      m.box(0.6, 1.5, 0.45, 0xc8281a, x, 0.75, 3.4);
      m.box(0.4, 0.35, 0.47, 0xf2ece0, x, 1.25, 3.4);
    }
    return m;
  });

export const motelSign = () =>
  baked('motelsign', () => {
    const m = new Model();
    m.box(0.3, 7, 0.3, 0x5a5a5a, 0, 3.5, 0);
    m.box(3.2, 1.4, 0.3, 0x2a5a6a, 0, 6.6, 0);
    m.plane(3, 1.2, 'motel', 0, 6.6, 0.16);
    m.cone(0.5, 1.2, 0xe0b030, 1.9, 6.3, 0, 3, 0, -Math.PI / 2);
    return m;
  });

export const motel = () =>
  baked('motel', () => {
    const m = new Model();
    m.box(14, 3.2, 5, 0xe8d0a8, 0, 1.6, -1, 0, { atlas: 'brick', map: 'all', rep: [5, 1] });
    m.box(14.6, 0.3, 6.2, 0x7a3a1e, 0, 3.35, -0.4);
    for (let i = 0; i < 6; i++) {
      m.box(0.9, 2, 0.06, 0x6a3a1e, -5.6 + i * 2.25, 1, 1.52);
      m.plane(0.8, 0.8, 'window', -4.85 + i * 2.25, 1.7, 1.53);
    }
    return m;
  });
/** lit windows of the motel (night): drawn with the glow material by the same field */
export const motelLights = () =>
  baked('motellit', () => {
    const m = new Model();
    for (let i = 0; i < 6; i++) if (i !== 2) m.plane(0.8, 0.8, 'windowLit', -4.85 + i * 2.25, 1.7, 1.54);
    m.plane(3, 1.2, 'motel', 0, 6.6, 0.17); // not used by motel (motelSign has its own); harmless
    return m;
  });

// ------------------------------------------------------------------ ghost town facades
const facade = (key: string, sign: 'saloon' | 'hotel' | 'bank' | 'sheriff' | 'store', body: number, w: number, h: number) =>
  baked(`facade-${key}`, () => {
    const m = new Model();
    m.box(w, h, 6, body, 0, h / 2, -3, 0, { atlas: 'planks', map: 'side', rep: [Math.round(w / 3), 2] });
    // false front (taller board) with the sign
    m.box(w, 1.6, 0.25, vary(body, 3, 0.06), 0, h + 0.7, 0.1, 0, { atlas: 'planksDark', map: 'all', rep: [2, 1] });
    m.plane(w * 0.82, 1.1, sign, 0, h + 0.15, 0.24);
    // porch roof on posts + boardwalk
    m.box(w, 0.15, 2.2, WOOD_D, 0, h * 0.72, 1.2);
    for (const x of [-w / 2 + 0.2, 0, w / 2 - 0.2]) m.box(0.16, h * 0.72, 0.16, WOOD_D, x, h * 0.36, 2.2);
    m.box(w, 0.2, 2.4, WOOD, 0, 0.1, 1.2, 0, { atlas: 'planksDark', map: 'all', rep: [3, 1] });
    // windows + door
    m.plane(1.0, 1.1, 'window', -w * 0.3, h * 0.42, 0.01);
    m.plane(1.0, 1.1, 'window', w * 0.3, h * 0.42, 0.01);
    if (sign === 'saloon') {
      m.box(0.6, 1.1, 0.06, WOOD_L, -0.33, 1.0, 0.05);
      m.box(0.6, 1.1, 0.06, WOOD_L, 0.33, 1.0, 0.05);
    } else m.box(1.2, 2.1, 0.06, WOOD_D, 0, 1.05, 0.03);
    if (sign !== 'bank') m.plane(0.5, 0.65, 'wanted', w * 0.3 + 0.9, 1.4, 0.02);
    return m;
  });
export const saloon = () => facade('saloon', 'saloon', 0xb07a4a, 8, 4.4);
export const hotel = () => facade('hotel', 'hotel', 0x9a6a4a, 9, 6.0);
export const bank = () =>
  baked('facade-bank', () => {
    const m = new Model();
    m.box(7, 5, 6, 0xd8c0a0, 0, 2.5, -3, 0, { atlas: 'brick', map: 'side', rep: [3, 2] });
    m.box(7.4, 0.5, 6.4, 0x8a6a4a, 0, 5.25, -3);
    m.plane(5, 1, 'bank', 0, 4.4, 0.01);
    for (const x of [-2.6, 2.6]) m.cyl(0.25, 0.3, 3.6, 0xe8dcc8, x, 1.8, 0.4, 8);
    m.plane(1, 1.2, 'window', -1.6, 2.2, 0.01);
    m.plane(1, 1.2, 'window', 1.6, 2.2, 0.01);
    m.box(1.3, 2.3, 0.06, 0x3a2a1a, 0, 1.15, 0.03);
    return m;
  });
export const sheriff = () => facade('sheriff', 'sheriff', 0x8a5a3a, 7, 4.2);
export const store = () => facade('store', 'store', 0xa88050, 11, 4.8);

export const wagonWheel = () =>
  baked('wheel', () => {
    const m = new Model();
    m.add(new THREE.TorusGeometry(0.7, 0.07, 5, 16), WOOD_D, 0, 0.7, 0);
    for (let k = 0; k < 6; k++) m.box(0.06, 1.35, 0.06, WOOD, 0, 0.7, 0, 0, {}, 0, (k * Math.PI) / 6);
    m.cyl(0.14, 0.14, 0.2, 0x3a2a1a, 0, 0.7, 0, 8, Math.PI / 2);
    return m;
  });

export const barrels = () =>
  baked('barrels', () => {
    const m = new Model();
    for (const [x, z, y] of [[0, 0, 0], [0.75, 0.2, 0], [0.35, 0.1, 0.95]] as const) {
      m.cyl(0.36, 0.33, 0.9, WOOD, x, y + 0.45, z, 10, 0, 0, { atlas: 'planksDark', map: 'side', rep: [3, 1] });
      for (const dy of [0.2, 0.7]) m.cyl(0.37, 0.37, 0.05, 0x3a3a3a, x, y + dy, z, 10);
    }
    return m;
  });

export const wagon = () =>
  baked('wagon', () => {
    const m = new Model();
    m.box(1.8, 0.6, 3.6, WOOD, 0, 1.1, 0, 0, { atlas: 'planks', map: 'side', rep: [2, 1] });
    // canvas cover (half cylinder)
    const cov = new THREE.CylinderGeometry(1.0, 1.0, 3.4, 10, 1, true, -Math.PI / 2, Math.PI);
    cov.rotateX(Math.PI / 2);
    cov.rotateZ(Math.PI / 2);
    m.add(cov, 0xeee2c8, 0, 1.4, 0);
    for (const [x, z, r] of [[-1, -1.2, 0.55], [1, -1.2, 0.55], [-1, 1.2, 0.7], [1, 1.2, 0.7]] as const) {
      m.push(x, r, z, Math.PI / 2, 0, 0);
      m.add(new THREE.TorusGeometry(r, 0.06, 4, 14), WOOD_D, 0, 0, 0);
      m.pop();
    }
    return m;
  });

// ------------------------------------------------------------------ train yard
export const boxcar = (c = 0x8a3a22) =>
  baked(`boxcar${c}`, () => {
    const m = new Model();
    m.box(2.8, 3, 11, c, 0, 2.3, 0, 0, { atlas: 'cargo', map: 'side', rep: [4, 1] });
    m.box(3, 0.2, 11.2, 0x3a3a3a, 0, 3.9, 0);
    m.box(2.4, 0.5, 10.6, 0x2a2a2a, 0, 0.7, 0);
    for (const z of [-3.8, 3.8]) for (const x of [-0.8, 0.8]) m.cyl(0.42, 0.42, 0.2, 0x2a2a2a, x, 0.45, z, 10, 0, Math.PI / 2);
    return m;
  });
export const tankCar = () =>
  baked('tankcar', () => {
    const m = new Model();
    m.cyl(1.4, 1.4, 10, 0x2a2a2e, 0, 2.4, 0, 14, Math.PI / 2);
    m.add(new THREE.SphereGeometry(1.4, 12, 8).scale(1, 1, 0.4), 0x2a2a2e, 0, 2.4, 5);
    m.add(new THREE.SphereGeometry(1.4, 12, 8).scale(1, 1, 0.4), 0x2a2a2e, 0, 2.4, -5);
    m.plane(3, 1.1, 'petro', 1.42, 2.4, 0, Math.PI / 2);
    m.box(2.4, 0.5, 10.4, 0x2a2a2a, 0, 0.7, 0);
    return m;
  });
export const locomotive = () =>
  baked('loco', () => {
    const m = new Model();
    const BLACK = 0x2a2624;
    m.cyl(1.25, 1.25, 7, BLACK, 0, 2.6, 1.2, 14, Math.PI / 2);
    m.cyl(1.28, 1.28, 0.2, 0xb8902a, 0, 2.6, 4.6, 14, Math.PI / 2);
    m.box(3, 3.4, 3.2, 0x7a1e14, 0, 3, -3.6);
    m.box(3.3, 0.25, 3.6, BLACK, 0, 4.8, -3.6);
    m.plane(0.9, 0.9, 'window', 0, 3.4, -1.99);
    m.cyl(0.35, 0.5, 1.6, BLACK, 0, 4.3, 3.8, 10);
    m.cyl(0.6, 0.35, 0.5, BLACK, 0, 5.3, 3.8, 10);
    m.cyl(0.4, 0.4, 0.7, 0xb8902a, 0, 4.0, 1.2, 10);
    // cowcatcher
    m.add(new THREE.ConeGeometry(1.4, 1.4, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.6, 1), 0xb8281a, 0, 0.8, 5.4);
    m.cyl(0.35, 0.35, 0.25, 0xffe8a0, 0, 3.5, 4.7, 10, Math.PI / 2);
    for (const z of [-3.6, -1.2, 1.2, 3.4]) for (const x of [-1, 1]) m.cyl(z > 0 && z < 2 ? 0.9 : 0.55, z > 0 && z < 2 ? 0.9 : 0.55, 0.15, 0xb8281a, x * 1.15, z > 0 && z < 2 ? 0.9 : 0.55, z, 12, 0, Math.PI / 2);
    m.box(2.4, 0.6, 9.6, BLACK, 0, 1.1, 0.4);
    return m;
  });
export const signalPost = () =>
  baked('signal', () => {
    const m = new Model();
    m.box(0.14, 4, 0.14, 0x3a3a3a, 0, 2, 0);
    m.box(0.6, 1.2, 0.3, 0x1a1a1a, 0, 4, 0);
    m.plane(1.4, 1.4, 'crossbuck', 0, 3, 0.1);
    return m;
  });
export const containerStack = (c = 0x2a6a8a) =>
  baked(`cont${c}`, () => {
    const m = new Model();
    m.box(2.4, 2.5, 6, c, 0, 1.25, 0, 0, { atlas: 'cargo', map: 'side', rep: [3, 1] });
    m.box(2.4, 2.5, 6, vary(0xb8642a, c), 0.1, 3.75, 0.3, 0, { atlas: 'cargo', map: 'side', rep: [3, 1] });
    return m;
  });

// ------------------------------------------------------------------ oil field
/** pump jack base (static); its walking beam + horse head is pumpBeam (rocks about x) */
export const pumpBase = () =>
  baked('pumpbase', () => {
    const m = new Model();
    m.box(1.6, 0.4, 5, 0x5a5a5a, 0, 0.2, 0);
    m.add(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6), 0x8a8a2a, -0.5, 1.9, 0, 0, 0.25, 0.12);
    m.add(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6), 0x8a8a2a, 0.5, 1.9, 0, 0, 0.25, -0.12);
    m.add(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6), 0x8a8a2a, 0, 1.9, -0.8, 0, -0.25, 0);
    m.box(0.9, 0.9, 1.2, 0x3a3a3a, 0, 0.85, -1.8);
    m.cyl(0.6, 0.6, 0.15, 0xb8281a, 0.55, 1.1, -1.8, 12, 0, Math.PI / 2);
    m.cyl(0.12, 0.12, 1.2, 0x3a3a3a, 0, 0.6, 2.2, 6);
    return m;
  });
/** walking beam: origin = pivot (field y = 3.6) */
export const pumpBeam = () =>
  baked('pumpbeam', () => {
    const m = new Model();
    m.box(0.35, 0.45, 5.2, 0xd8b030, 0, 0, 0.3);
    // horse head
    m.box(0.4, 1.6, 0.5, 0xd8b030, 0, -0.4, 2.9);
    m.add(new THREE.CylinderGeometry(0.9, 0.9, 0.42, 10, 1, false, 0, Math.PI), 0xd8b030, 0, -0.2, 2.75, 0, Math.PI / 2, Math.PI / 2);
    m.box(0.1, 2.6, 0.1, 0x2a2a2a, 0, -1.9, 3.15);
    m.box(0.3, 0.8, 0.8, 0x3a3a3a, 0, -0.3, -2.3);
    return m;
  });
export const derrick = () =>
  baked('derrick', () => {
    const m = new Model();
    const H = 18;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      m.push(sx * 1.8, 0, sz * 1.8, 0, -sz * 0.09, sx * 0.09);
      m.box(0.16, H, 0.16, WOOD_D, 0, H / 2, 0);
      m.pop();
    }
    for (let k = 1; k < 8; k++) {
      const y = k * 2.2;
      const w = 3.6 - k * 0.36;
      for (const [x, z, ry] of [[0, w / 2, 0], [0, -w / 2, 0], [w / 2, 0, Math.PI / 2], [-w / 2, 0, Math.PI / 2]] as const) {
        m.box(w * 1.4, 0.08, 0.08, WOOD, x, y, z, ry, {}, 0, k % 2 ? 0.6 : -0.6);
      }
    }
    m.box(1.2, 0.5, 1.2, WOOD_D, 0, H + 0.2, 0);
    m.box(4, 2.4, 3, 0x8a5a30, 3.4, 1.2, 0, 0, { atlas: 'planks', map: 'side', rep: [2, 1] });
    return m;
  });
export const oilTank = (v = 0) =>
  baked(`oiltank${v}`, () => {
    const m = new Model();
    const c = v ? 0xe8e2d6 : 0xb8643a;
    m.cyl(4, 4, 5, c, 0, 2.5, 0, 16);
    m.cyl(4.05, 4.05, 0.2, 0x5a5a5a, 0, 5.05, 0, 16);
    m.plane(4.4, 1.2, 'petro', 0, 3, 4.02);
    m.box(0.1, 5.4, 0.6, 0x5a5a5a, 3.6, 2.7, 1.8, 0.6);
    return m;
  });
/** flare stack (badlands): the flame is a separate glow prop */
export const flareStack = () =>
  baked('flare', () => {
    const m = new Model();
    m.cyl(0.25, 0.35, 12, 0x6a6a6a, 0, 6, 0, 8);
    for (const y of [3, 7, 11]) m.cyl(0.38, 0.38, 0.2, 0xb8281a, 0, y, 0, 8);
    return m;
  });
export const flame = () =>
  baked('flame', () => {
    const m = new Model();
    m.cone(0.6, 2.2, 0xffa030, 0, 1.1, 0, 6);
    m.cone(0.35, 1.4, 0xfff0a0, 0, 0.75, 0, 6);
    return m;
  });

// ------------------------------------------------------------------ ruins
export const column = (v = 0) =>
  baked(`column${v}`, () => {
    const m = new Model();
    const h = v === 1 ? 2.5 : 7;
    const c = 0xd8c09a;
    m.box(1.6, 0.5, 1.6, vary(c, v), 0, 0.25, 0);
    m.cyl(0.55, 0.62, h, c, 0, 0.5 + h / 2, 0, 12, 0, 0, { atlas: 'stone', map: 'side', rep: [2, 2] });
    if (v === 0) {
      m.box(1.5, 0.5, 1.5, vary(c, 5), 0, h + 0.75, 0);
      m.box(1.9, 0.3, 1.9, vary(c, 7), 0, h + 1.15, 0);
    } else m.ico(0.6, c, 0, h + 0.5, 0, 1, 0.5, 1);
    return m;
  });
export const arch = () =>
  baked('arch', () => {
    const m = new Model();
    const c = 0xd0b08a;
    for (const x of [-3.2, 3.2]) m.box(1.6, 7, 1.8, c, x, 3.5, 0, 0, { atlas: 'stone', map: 'side', rep: [1, 3] });
    const a = new THREE.TorusGeometry(3.2, 0.8, 4, 12, Math.PI);
    m.add(a.scale(1, 1, 1.1), vary(c, 3), 0, 7, 0);
    m.box(8.4, 1.1, 1.9, vary(c, 4), 0, 10.6, 0, 0, { atlas: 'stone', map: 'side', rep: [3, 1] });
    return m;
  });
export const brokenWall = () =>
  baked('ruinwall', () => {
    const m = new Model();
    const c = 0xc8a882;
    for (let i = 0; i < 6; i++) m.box(1.6, 1.0, 1.2, vary(c, i, 0.08), -4 + i * 1.6, 0.5, 0);
    for (let i = 0; i < 4; i++) m.box(1.6, 1.0, 1.2, vary(c, i + 9, 0.08), -3.2 + i * 1.6, 1.5, 0.05);
    m.box(1.6, 1.0, 1.2, vary(c, 20), -1.6, 2.5, 0);
    m.box(1.4, 0.8, 1.0, vary(c, 21), 3.5, 0.4, 1.4, 0.6);
    return m;
  });
export const obelisk = () =>
  baked('obelisk', () => {
    const m = new Model();
    m.box(2.4, 0.8, 2.4, 0xc8a882, 0, 0.4, 0);
    m.cyl(0.6, 1.0, 9, 0xd8b890, 0, 5.3, 0, 4);
    m.cone(0.62, 1.4, 0xffd27a, 0, 10.5, 0, 4);
    return m;
  });

// ------------------------------------------------------------------ mine / tunnel
/** timber frame over the whole road (origin at the road centre) */
export const mineFrame = () =>
  baked('mineframe', () => {
    const m = new Model();
    for (const x of [-5.6, 5.6]) m.box(0.5, 7.4, 0.5, WOOD_D, x, 3.7, 0);
    m.box(12, 0.55, 0.6, WOOD_D, 0, 7.4, 0);
    for (const s of [-1, 1]) m.box(0.3, 1.8, 0.3, WOOD, s * 4.9, 6.6, 0, 0, {}, 0, s * 0.75);
    return m;
  });
export const lantern = () =>
  baked('lantern', () => {
    const m = new Model();
    m.box(0.3, 0.4, 0.3, 0xffc860, 0, 0, 0);
    return m;
  });
export const mineCart = () =>
  baked('minecart', () => {
    const m = new Model();
    m.box(1.4, 0.9, 2, RUST, 0, 0.9, 0);
    m.ico(0.6, 0xffc848, 0, 1.4, 0, 1.1, 0.5, 1.5);
    for (const z of [-0.6, 0.6]) for (const x of [-0.7, 0.7]) m.cyl(0.25, 0.25, 0.12, 0x2a2a2a, x, 0.3, z, 8, 0, Math.PI / 2);
    return m;
  });
export const mineEntrance = () =>
  baked('mineent', () => {
    const m = new Model();
    m.ico(5, 0x9a5a36, 0, 2, -2, 1.3, 1.0, 0.8);
    m.box(4.2, 4.4, 0.6, 0x1a120a, 0, 2.2, 1.5);
    for (const x of [-2.2, 2.2]) m.box(0.5, 4.8, 0.5, WOOD_D, x, 2.4, 1.8);
    m.box(5.2, 0.6, 0.6, WOOD_D, 0, 4.9, 1.8);
    m.plane(3.6, 1.1, 'goldmine', 0, 5.8, 2.0);
    return m;
  });

// ------------------------------------------------------------------ ranch / pines / coast extras
export const barn = () =>
  baked('barn', () => {
    const m = new Model();
    m.box(8, 5, 7, 0xa8342a, 0, 2.5, 0, 0, { atlas: 'planks', map: 'side', rep: [3, 2] });
    const roof = new THREE.CylinderGeometry(4.7, 4.7, 7.2, 4, 1, false, Math.PI / 4, Math.PI / 2);
    roof.rotateZ(Math.PI / 2);
    m.add(roof.scale(1, 0.8, 1), 0x4a3a36, 0, 4.4, 0);
    m.box(2.8, 3.4, 0.08, 0xf2ece0, 0, 1.7, 3.52);
    m.box(0.12, 3.4, 0.1, 0xa8342a, 0, 1.7, 3.56);
    return m;
  });
export const hayBale = () =>
  baked('hay', () => {
    const m = new Model();
    m.cyl(0.9, 0.9, 1.3, 0xe0c060, 0, 0.9, 0, 12, 0, Math.PI / 2, { atlas: 'hay', map: 'all' });
    return m;
  });
export const cow = (v = 0) =>
  baked(`cow${v}`, () => {
    const m = new Model();
    const c = v ? 0x5a3a24 : 0xf2ece0;
    m.box(0.9, 0.85, 1.8, c, 0, 1.05, 0);
    if (!v) m.box(0.92, 0.5, 0.6, 0x2a2a2a, 0, 1.2, 0.2);
    m.box(0.5, 0.55, 0.6, c, 0, 1.3, 1.1);
    for (const x of [-0.3, 0.3]) for (const z of [-0.7, 0.7]) m.box(0.16, 0.65, 0.16, c, x, 0.33, z);
    m.box(0.6, 0.06, 0.06, 0xe8dcc0, 0, 1.6, 1.1);
    return m;
  });
export const cabin = () =>
  baked('cabin', () => {
    const m = new Model();
    for (let i = 0; i < 6; i++) m.cyl(0.25, 0.25, 6, vary(0x7a5030, i), 0, 0.25 + i * 0.48, 0, 7, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) m.cyl(0.25, 0.25, 4.6, vary(0x6a4428, i + 9), 0, 0.25 + i * 0.48, 0, 7, Math.PI / 2);
    const roof = new THREE.CylinderGeometry(3.4, 3.4, 6.6, 4, 1, false, Math.PI / 4, Math.PI / 2);
    roof.rotateZ(Math.PI / 2);
    m.add(roof.scale(1, 0.6, 1), 0x3a2a1a, 0, 2.9, 0);
    m.cyl(0.35, 0.35, 2, 0x8a7a6a, 2, 4, -1, 7);
    return m;
  });
export const lighthouse = () =>
  baked('lighthouse', () => {
    const m = new Model();
    for (let k = 0; k < 5; k++) m.cyl(1.7 - k * 0.2, 1.9 - k * 0.2, 4, k % 2 ? 0xc8281a : 0xf4f0e6, 0, 2 + k * 4, 0, 12);
    m.cyl(1.2, 1.2, 1.6, 0xfff0a0, 0, 20.8, 0, 10);
    m.cone(1.4, 1.4, 0x2a2a2a, 0, 22.3, 0, 10);
    return m;
  });
export const guardHouse = () =>
  baked('shack', () => {
    const m = new Model();
    m.box(3.2, 2.6, 3, 0x9a9a92, 0, 1.3, 0, 0, { atlas: 'corrugated', map: 'side', rep: [2, 1] });
    m.box(3.6, 0.2, 3.4, 0x6a4a2a, 0, 2.7, 0, 0, {}, 0.12);
    m.plane(0.8, 0.8, 'window', 0.8, 1.5, 1.51);
    return m;
  });
export const wreck = () =>
  baked('wreck', () => {
    const m = new Model();
    m.box(1.8, 0.9, 4.2, RUST, 0, 0.75, 0, 0, { atlas: 'corrugated', map: 'side' });
    m.box(1.6, 0.8, 1.8, 0x7a3a1a, 0, 1.55, -0.3);
    m.cyl(0.4, 0.4, 0.3, 0x2a2a2a, -0.95, 0.35, 1.3, 8, 0, Math.PI / 2);
    m.cyl(0.4, 0.4, 0.3, 0x2a2a2a, 0.95, 0.4, -1.3, 8, 0, Math.PI / 2);
    return m;
  });
export const powerPole = () =>
  baked('ppole', () => {
    const m = new Model();
    m.cyl(0.13, 0.17, 9, WOOD_D, 0, 4.5, 0, 6);
    m.box(2.8, 0.16, 0.16, WOOD_D, 0, 8.4, 0);
    for (const x of [-1.2, -0.4, 0.4, 1.2]) m.cyl(0.05, 0.05, 0.25, 0x6ab0a0, x, 8.6, 0, 5);
    return m;
  });
export const cliff = (v = 0, c = 0x8a7a6a) =>
  baked(`cliff${v}-${c}`, () => {
    const m = new Model();
    for (let i = 0; i < 5; i++) m.ico(1, vary(c, i + v, 0.06), (i - 2) * 0.55, 0.5 + (i % 2) * 0.25, Math.sin(i * 2.2) * 0.2, 0.7, 1.1 + (i % 3) * 0.2, 0.8, 0, i);
    return m;
  });
