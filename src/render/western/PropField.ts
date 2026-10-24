import * as THREE from 'three';
import { Rng } from '../../core/Rng.ts';
import { addFarFade, wrapZ } from '../envFx.ts';

/** z where recycled scenery leaves the screen (behind the camera) */
export const NEAR = 40;

export interface FieldOpts {
  /** instances (max; the graphics preset can draw fewer) */
  count: number;
  /** scroll range (m) — the field repeats every `range` metres */
  range: number;
  /** |x| range on each side of the road */
  x: [number, number];
  /** base height (ground level for these props) */
  y?: number;
  /** uniform scale range */
  scale?: [number, number];
  /** extra random vertical scale (tall / short variants) */
  stretch?: [number, number];
  /** sides: both (alternating), left only (-1) or right only (+1) */
  side?: 0 | -1 | 1;
  /** random yaw (rad) — default full turn; 0 = face the road */
  yaw?: number;
  /** face the road (signs): yaw toward the road + small jitter */
  faceRoad?: boolean;
  /** parallax: scroll speed relative to the road (far backdrops < 1) */
  parallax?: number;
  /** extra y jitter */
  yJitter?: number;
  seed?: number;
  /** don't fade in at the far end (very far backdrops) */
  noFade?: boolean;
  /** z offset of the whole field (far backdrops start further out) */
  zOff?: number;
  /** v1.0.0: the prop's inner edge never comes closer to the road centre than this (m; default 6.3,
   *  just outside the guardrail and the poles). Uses the baked geometry's footprint × scale. */
  clear?: number;
}

interface Slot {
  x: number;
  y: number;
  s: number;
  sy: number;
  yaw: number;
  base: number;
  prevZ: number;
}

/**
 * Many copies of one baked prop, scrolling past by modulo (no spawning, one draw call).
 * A copy that wraps around to the far end is re-rolled (new side offset, size, turn), so the road
 * never shows the same pattern twice in a row.
 */
export class PropField {
  mesh: THREE.InstancedMesh;
  private slots: Slot[] = [];
  private rng: Rng;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private sv = new THREE.Vector3();
  private drawn: number;
  /** optional per-instance extra rotation over time (windmill rotors, pump jacks) */
  spin: ((i: number, t: number, e: THREE.Euler) => void) | null = null;

  /** footprint half-extent toward the road (random yaw: radius in xz; faceRoad: front depth) */
  private ext = 0;
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, private o: FieldOpts) {
    this.rng = new Rng(o.seed ?? 7);
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const yaw = o.faceRoad ? 0.35 : (o.yaw ?? Math.PI * 2);
    if (o.faceRoad) this.ext = bb.max.z + Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)) * Math.sin(0.35);
    else if (yaw < 0.05) this.ext = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x));
    else this.ext = Math.max(Math.hypot(bb.min.x, bb.min.z), Math.hypot(bb.max.x, bb.max.z), Math.hypot(bb.min.x, bb.max.z), Math.hypot(bb.max.x, bb.min.z));
    this.mesh = new THREE.InstancedMesh(geo, mat, o.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    // each field its own phase along the road (fields sharing a seed — tower + rotor — stay aligned)
    const phase = this.rng.next();
    for (let i = 0; i < o.count; i++) {
      const s: Slot = { x: 0, y: 0, s: 1, sy: 1, yaw: 0, base: ((i * 0.6180339887 + phase) % 1) * o.range, prevZ: 0 };
      this.roll(s, i);
      this.slots.push(s);
    }
    this.drawn = o.count;
    // far fade per re-entry distance: a SHARED material would take the shortest range of every field
    // in every world, so each distance gets its own clone (same program, different uniforms)
    if (!o.noFade) this.mesh.material = fadeMaterial(mat, NEAR - o.range + (o.zOff ?? 0));
    this.update(0, 0);
  }
  private roll(s: Slot, i: number) {
    const o = this.o;
    const side = o.side ? o.side : i % 2 === 0 ? -1 : 1;
    s.s = o.scale ? this.rng.range(o.scale[0], o.scale[1]) : 1;
    const want = this.rng.range(o.x[0], o.x[1]);
    // props with a clearance push themselves out until their inner edge is off the road
    s.x = side * (o.clear === 0 ? want : Math.max(want, (o.clear ?? 6.3) + this.ext * s.s));
    s.sy = o.stretch ? this.rng.range(o.stretch[0], o.stretch[1]) : 1;
    s.y = (o.y ?? 0) + (o.yJitter ? this.rng.range(-o.yJitter, o.yJitter) : 0);
    s.yaw = o.faceRoad ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) + this.rng.range(-0.35, 0.35) : this.rng.range(0, o.yaw ?? Math.PI * 2);
  }
  /** share of the copies drawn (graphics preset) */
  setDensity(k: number) {
    this.drawn = Math.max(1, Math.round(this.o.count * k));
    this.mesh.count = this.drawn;
  }
  update(dist: number, t: number) {
    const o = this.o;
    const d = dist * (o.parallax ?? 1);
    for (let i = 0; i < this.drawn; i++) {
      const s = this.slots[i];
      const z = wrapZ(s.base, d, o.range, NEAR) + (o.zOff ?? 0);
      if (z < s.prevZ - o.range / 2) this.roll(s, i);
      s.prevZ = z;
      this.e.set(0, s.yaw, 0, 'YXZ');
      if (this.spin) this.spin(i, t, this.e);
      this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(s.x, s.y, z), this.q, this.sv.set(s.s, s.s * s.sy, s.s));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const fadeCache = new Map<THREE.Material, Map<number, THREE.Material>>();
/** a clone of `mat` that fades in from the fog at `spawnZ` (cached per 20 m bucket) */
export function fadeMaterial(mat: THREE.Material, spawnZ: number) {
  const key = Math.ceil(spawnZ / 20) * 20; // always the nearer bucket: fully fogged at the spawn point
  let byZ = fadeCache.get(mat);
  if (!byZ) fadeCache.set(mat, (byZ = new Map()));
  let m = byZ.get(key);
  if (!m) {
    m = mat.clone();
    addFarFade(m, key);
    byZ.set(key, m);
  }
  return m;
}

/** a scrolling textured ground plane (world-space tiling, no seams) */
export class Ground {
  mesh: THREE.Mesh;
  private tex: THREE.Texture;
  constructor(tex: THREE.Texture, private tile: number, y: number, w = 700, len = 900, color = 0xffffff, xOff = 0) {
    this.tex = tex.clone();
    this.tex.needsUpdate = true;
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.repeat.set(w / tile, len / tile);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshStandardMaterial({ map: this.tex, color, roughness: 0.96, metalness: 0 }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(xOff, y, -len / 2 + NEAR);
  }
  update(dist: number) {
    this.tex.offset.y = (dist / this.tile) % 1;
  }
}
