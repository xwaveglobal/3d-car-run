import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { uvRect, type AtlasKey } from './atlas.ts';

/**
 * 3D Car Run v1.0.0 — tiny modelling kit for the Western props and obstacles.
 *
 * A model is a list of parts (primitive geometry + colour + optional atlas picture). `bake()` merges
 * them into ONE BufferGeometry with position / normal / color / uv, so a whole prop draws with the
 * shared atlas material (atlas.ts) in a single call — or as one InstancedMesh for many copies.
 */
export interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.Color;
  /** picture from the atlas on the faces the uv mode selects; none = plain colour */
  atlas?: AtlasKey;
  /** 'all' = map the primitive's own uvs into the rect · 'front' = only faces whose normal points +z (signs) */
  map?: 'all' | 'front' | 'side';
  /** repeat of the picture across the primitive's uvs (planks on a long wall) */
  rep?: [number, number];
}

const C = new THREE.Color();
export const col = (hex: number) => new THREE.Color(hex);

export class Model {
  parts: Part[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  private get top() {
    return this.stack[this.stack.length - 1];
  }
  /** push a transform for the following parts (translate, rotate y/x/z, scale) */
  push(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }
  add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, opt: Partial<Pick<Part, 'atlas' | 'map' | 'rep'>> = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
    const g = geo.clone();
    g.applyMatrix4(this.top.clone().multiply(m));
    this.parts.push({ geo: g, color: col(color), ...opt });
    return this;
  }
  box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, ry = 0, opt: Partial<Pick<Part, 'atlas' | 'map' | 'rep'>> = {}, rx = 0, rz = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, ry, rx, rz, opt);
  }
  cyl(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 8, rx = 0, rz = 0, opt: Partial<Pick<Part, 'atlas' | 'map' | 'rep'>> = {}) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, 0, rx, rz, opt);
  }
  cone(r: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 7, rx = 0, rz = 0) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, 0, rx, rz);
  }
  ico(r: number, color: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 0, ry = 0) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    g.scale(sx, sy, sz);
    return this.add(g, color, x, y, z, ry);
  }
  /** a flat picture (sign) facing +z */
  plane(w: number, h: number, atlas: AtlasKey, x = 0, y = 0, z = 0, ry = 0, color = 0xffffff) {
    return this.add(new THREE.PlaneGeometry(w, h), color, x, y, z, ry, 0, 0, { atlas, map: 'all' });
  }
  /** merge into one geometry (vertex colours + atlas uvs) */
  bake(): THREE.BufferGeometry {
    return bake(this.parts);
  }
}

export function bake(parts: Part[]): THREE.BufferGeometry {
  const white = uvRect('white');
  const wu = (white[0] + white[2]) / 2;
  const wv = (white[1] + white[3]) / 2;
  const geos: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.color.toArray(colors, i * 3);
    const uv = new Float32Array(n * 2);
    const src = g.attributes.uv as THREE.BufferAttribute | undefined;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const r = p.atlas ? uvRect(p.atlas) : null;
    const [ru, rv] = p.rep ?? [1, 1];
    for (let i = 0; i < n; i++) {
      let use = !!r && !!src;
      if (use && p.map === 'front') use = nor.getZ(i) > 0.7;
      if (use && p.map === 'side') use = Math.abs(nor.getY(i)) < 0.5;
      if (use) {
        // repeat inside the rect by folding (keeps one picture per face when rep = 1)
        let u = src!.getX(i) * ru;
        let v = src!.getY(i) * rv;
        u = ru > 1 ? u - Math.floor(u - 1e-6) : u;
        v = rv > 1 ? v - Math.floor(v - 1e-6) : v;
        uv[i * 2] = r![0] + (r![2] - r![0]) * Math.min(1, Math.max(0, u));
        uv[i * 2 + 1] = r![1] + (r![3] - r![1]) * Math.min(1, Math.max(0, v));
      } else {
        uv[i * 2] = wu;
        uv[i * 2 + 1] = wv;
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.attributes.position.clone());
    out.setAttribute('normal', g.attributes.normal.clone());
    out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geos.push(out);
  }
  const merged = mergeGeometries(geos, false)!;
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** colour helpers: slight random variation of a base colour (deterministic per seed) */
export function vary(hex: number, seed: number, amt = 0.06) {
  const r = Math.sin(seed * 12.9898) * 43758.5453;
  const k = (r - Math.floor(r) - 0.5) * 2 * amt;
  C.setHex(hex).offsetHSL(0, 0, k);
  return C.getHex();
}

/** a memo for baked geometries (built once per key) */
const memo = new Map<string, THREE.BufferGeometry>();
export function baked(key: string, make: () => Model): THREE.BufferGeometry {
  let g = memo.get(key);
  if (!g) memo.set(key, (g = make().bake()));
  return g;
}
