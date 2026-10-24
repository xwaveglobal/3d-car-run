/**
 * v4.2 procedural road surface (3D upgrade Step 04). Pure data — no Three.js, no DOM — so the same
 * code makes the textures in the game and is unit-tested in Node (seamless tile, lane alignment).
 *
 * Everything is described in road metres: x across the road (0 = centre, ±ROAD.half = deck edges),
 * z along one texture tile (0 … ROAD.tile). Every pattern repeats an exact number of times per tile,
 * so the scrolling tile is seamless; the markings are placed from the gameplay LANES.
 */
import { LANES, ROAD } from '../config.ts';

/** lane-divider centres (between neighbouring lanes) */
export const DIVIDERS: number[] = LANES.slice(1).map((x, i) => (x + LANES[i]) / 2);
/** edge-line centres */
export const EDGES: number[] = [-ROAD.edgeX, ROAD.edgeX];

// ---- tileable value noise (periodic along z with the tile; x needs no wrap)
function hash(i: number, j: number, seed: number) {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** smooth value noise with cells of `cell` metres; z wraps every ROAD.tile metres */
function vnoise(x: number, z: number, cell: number, seed: number) {
  const pz = Math.round(ROAD.tile / cell); // cells per tile (integer: periodic)
  const fx = x / cell + 1000;
  const fz = z / cell;
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fz);
  const tx = fx - i0;
  const tz = fz - j0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const j = ((j0 % pz) + pz) % pz;
  const j1 = (j + 1) % pz;
  const a = hash(i0, j, seed);
  const b = hash(i0 + 1, j, seed);
  const c = hash(i0, j1, seed);
  const d = hash(i0 + 1, j1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

export interface RoadSample {
  /** sRGB colour 0..1 */
  r: number;
  g: number;
  b: number;
  /** PBR roughness 0..1 */
  rough: number;
  /** emissive (markings / studs) 0..1 per channel */
  er: number;
  eg: number;
  eb: number;
}

const near = (v: number, c: number, half: number) => Math.abs(v - c) <= half;
/** distance along z to the nearest of a periodic set of positions */
const zDist = (z: number, every: number, at: number) => {
  const d = (((z - at) % every) + every) % every;
  return Math.min(d, every - d);
};

/** the road at (x, z) metres — v1.0.0 (3D Car Run): sun-bleached desert asphalt, warm white dashes,
 *  yellow edge lines, dusty shoulders (same marking positions, same periodic tile) */
export function roadSample(x: number, z: number, out: RoadSample = { r: 0, g: 0, b: 0, rough: 0, er: 0, eg: 0, eb: 0 }): RoadSample {
  const R = ROAD;
  const ax = Math.abs(x);
  // asphalt: warm grey, three octaves of aggregate grain
  const n1 = vnoise(x, z, 0.5, 1);
  const n2 = vnoise(x, z, 0.12, 2);
  const n3 = vnoise(x, z, 0.03, 3);
  const grain = (n1 - 0.5) * 0.03 + (n2 - 0.5) * 0.035 + (n3 - 0.5) * 0.05;
  const stone = n3 > 0.93 ? 0.06 : n3 < 0.05 ? -0.035 : 0;
  let l = 0.2 + grain + stone;
  let rough = 0.88 + (n2 - 0.5) * 0.1;
  // warm tint (r, g, b multipliers of l)
  let tr = 1.07;
  let tg = 1.0;
  let tb = 0.9;
  const shoulder = ax > R.edgeX + R.edgeW / 2;
  if (shoulder) {
    // dusty shoulder: sand blown onto the sealed strip, fine transverse grooves
    const dust = 0.55 + 0.45 * vnoise(x, z, 0.25, 5);
    l = 0.24 + grain * 0.7 + dust * 0.1 + (zDist(z, 0.3, 0) < 0.03 ? -0.02 : 0);
    rough = 0.94;
    tr = 1.22;
    tg = 1.04;
    tb = 0.78;
  } else {
    // tyre tracks: slightly darker and smoother
    for (const lx of LANES)
      for (const s of [-1, 1]) {
        const d = Math.abs(x - (lx + s * R.trackX)) / (R.trackW / 2);
        if (d < 1) {
          const k = 1 - d * d;
          l -= 0.014 * k;
          rough -= 0.1 * k;
        }
      }
    // sand drifting in from the edges (never reaches the lane centres)
    const toEdge = R.edgeX - ax;
    if (toEdge < 0.55) {
      const k = (1 - toEdge / 0.55) * (0.4 + 0.6 * vnoise(x, z, 0.2, 6));
      l += 0.05 * k;
      tr += 0.1 * k;
      tb -= 0.08 * k;
    }
  }
  let er = 0;
  let eg = 0;
  let eb = 0;
  const wear = 0.8 + 0.2 * vnoise(x, z, 0.05, 4);
  // lane dividers: warm white dashes
  for (const dx of DIVIDERS)
    if (near(x, dx, R.dividerW / 2) && ((z % R.tile) + R.tile) % R.tile < R.dash) {
      l = 0.84 * wear;
      tr = 1.02;
      tg = 1.0;
      tb = 0.94;
      rough = 0.6;
      er = eg = 0.2 * wear;
      eb = 0.18 * wear;
    }
  // edge lines: solid Route-66 yellow
  for (const ex of EDGES)
    if (near(x, ex, R.edgeW / 2)) {
      l = 0.8 * wear;
      tr = 1.08;
      tg = 0.84;
      tb = 0.26;
      rough = 0.6;
      er = 0.24 * wear;
      eg = 0.18 * wear;
      eb = 0.04 * wear;
    }
  // reflective studs: white on the dividers, amber inside the edge lines
  const studZ = zDist(z, R.studEvery, R.dash + (R.studEvery - R.dash) / 2) <= R.stud / 2;
  if (studZ) {
    for (const dx of DIVIDERS)
      if (near(x, dx, R.stud / 2)) {
        l = 0.7;
        tr = tg = tb = 1;
        rough = 0.2;
        er = 0.95;
        eg = 0.92;
        eb = 0.82;
      }
    for (const ex of EDGES)
      if (near(x, ex - Math.sign(ex) * (R.edgeW / 2 + 0.1), R.stud / 2)) {
        l = 0.6;
        tr = 1.1;
        tg = 0.8;
        tb = 0.3;
        rough = 0.2;
        er = 1;
        eg = 0.6;
        eb = 0.12;
      }
  }
  out.r = clamp01(l * tr);
  out.g = clamp01(l * tg);
  out.b = clamp01(l * tb);
  out.rough = clamp01(rough);
  out.er = er;
  out.eg = eg;
  out.eb = eb;
  return out;
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface RoadPixels {
  w: number;
  h: number;
  /** RGBA, sRGB colour */
  color: Uint8Array;
  /** RGBA, roughness in every channel (Three reads G) */
  rough: Uint8Array;
  /** RGBA, emissive colour */
  emissive: Uint8Array;
}

/**
 * Rasterise one road tile: u (columns) = x from −half … +half, v (rows) = z from 0 … tile.
 * Every pixel is sampled at its centre, so row h−1 continues into row 0 (seamless scroll).
 */
export function roadPixels(w: number, h: number): RoadPixels {
  const px = emptyRoadPixels(w, h);
  roadRows(px, 0, h);
  return px;
}

/** v4.0.1: an empty tile, filled row by row with roadRows (the native build fills it in background slices) */
export function emptyRoadPixels(w: number, h: number): RoadPixels {
  return { w, h, color: new Uint8Array(w * h * 4), rough: new Uint8Array(w * h * 4), emissive: new Uint8Array(w * h * 4) };
}

const rowSample: RoadSample = { r: 0, g: 0, b: 0, rough: 0, er: 0, eg: 0, eb: 0 };
/** rasterise rows [j0, j1) of a tile */
export function roadRows(px: RoadPixels, j0: number, j1: number) {
  const { w, h, color, rough, emissive } = px;
  const s = rowSample;
  for (let j = j0; j < j1; j++) {
    const z = ((j + 0.5) / h) * ROAD.tile;
    for (let i = 0; i < w; i++) {
      const x = ((i + 0.5) / w) * 2 * ROAD.half - ROAD.half;
      roadSample(x, z, s);
      const k = (j * w + i) * 4;
      color[k] = Math.round(s.r * 255);
      color[k + 1] = Math.round(s.g * 255);
      color[k + 2] = Math.round(s.b * 255);
      color[k + 3] = 255;
      const rr = Math.round(s.rough * 255);
      rough[k] = rough[k + 1] = rough[k + 2] = rr;
      rough[k + 3] = 255;
      emissive[k] = Math.round(s.er * 255);
      emissive[k + 1] = Math.round(s.eg * 255);
      emissive[k + 2] = Math.round(s.eb * 255);
      emissive[k + 3] = 255;
    }
  }
}

/** road-local x (metres) of texture column i */
export const columnX = (i: number, w: number) => ((i + 0.5) / w) * 2 * ROAD.half - ROAD.half;
