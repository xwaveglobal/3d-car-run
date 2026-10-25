import * as THREE from 'three';
import { glowTexture } from './textures.ts';
import { Rng } from '../core/Rng.ts';

const MAX = 2400;
const rng = new Rng(99);

/**
 * GPU-friendly particle pool: one Points draw call for every effect in the game.
 * `locked` particles belong to the world and scroll toward the camera with the
 * road (exhaust trails, debris); unlocked ones move with the car's frame.
 */
export class Particles {
  points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private baseSize = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private locked = new Uint8Array(MAX);
  private head = 0;
  private geo: THREE.BufferGeometry;

  /** @param additive true = glowing sparks/energy; false = soft smoke and dust */
  /** v4.0.2: soft smoke fades IN as well as out (no puff popping into view) and stays lighter */
  private soft: boolean;
  constructor(pixelRatio: number, additive = true) {
    this.soft = !additive;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTexture() }, scale: { value: 420 * pixelRatio } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vColor; varying float vAlpha;
        uniform float scale;
        void main(){ vColor = color; vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = size * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vColor; varying float vAlpha;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); if (vAlpha <= 0.0) discard;
          ${additive ? 'gl_FragColor = vec4(vColor * t.r * vAlpha * 1.6, t.r * vAlpha);' : 'gl_FragColor = vec4(vColor, t.r * vAlpha * 0.8);'} }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
  }

  setPixelRatio(pr: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = 420 * pr;
  }

  emit(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    color: THREE.Color | number,
    size: number, life: number,
    opts: { drag?: number; grav?: number; locked?: boolean; grow?: number } = {},
  ) {
    const i = this.head;
    this.head = (this.head + 1) % MAX;
    const i3 = i * 3;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    const c = typeof color === 'number' ? tmpC.setHex(color) : color;
    this.col[i3] = c.r;
    this.col[i3 + 1] = c.g;
    this.col[i3 + 2] = c.b;
    this.baseSize[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.drag[i] = opts.drag ?? 1.5;
    this.grav[i] = opts.grav ?? 0;
    this.locked[i] = opts.locked ? 1 : 0;
    this.grow[i] = opts.grow ?? 0;
  }

  /** v4.2.1 share of burst particles drawn (graphics preset: LOW 0.5 · MEDIUM 0.8 · HIGH 1) */
  density = 1;
  burst(x: number, y: number, z: number, n: number, color: number, speed: number, size: number, life: number, opts: { grav?: number; locked?: boolean; drag?: number; up?: number } = {}) {
    n = Math.max(1, Math.round(n * this.density));
    for (let k = 0; k < n; k++) {
      const th = rng.next() * Math.PI * 2;
      const ph = Math.acos(rng.range(-1, 1));
      const s = speed * rng.range(0.4, 1);
      this.emit(
        x, y, z,
        Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s + (opts.up ?? 0), Math.sin(ph) * Math.sin(th) * s,
        color, size * rng.range(0.6, 1.2), life * rng.range(0.6, 1.1),
        { grav: opts.grav, locked: opts.locked, drag: opts.drag ?? 2.5 },
      );
    }
  }

  update(dt: number, worldSpeed: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const i3 = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= d;
      this.vel[i3 + 1] = this.vel[i3 + 1] * d - this.grav[i] * dt;
      this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += (this.vel[i3 + 2] + (this.locked[i] ? worldSpeed : 0)) * dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = this.soft ? k * k * Math.min(1, (1 - k) * 5) * 0.7 : k * k;
      this.size[i] = this.baseSize[i] * (1 + this.grow[i] * (1 - k));
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true;
    a.color.needsUpdate = true;
    a.size.needsUpdate = true;
    a.alpha.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.alpha.fill(0);
  }
}
const tmpC = new THREE.Color();
const tmpC2 = new THREE.Color();

/** a dust streak: soft across, dense at the tyre end (top, v = 1) fading out toward the tail */
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d')!;
  const along = g.createLinearGradient(0, 0, 0, 128);
  along.addColorStop(0, 'rgba(255,255,255,0.95)');
  along.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  along.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = along;
  g.fillRect(0, 0, 32, 128);
  // soft sides
  g.globalCompositeOperation = 'destination-in';
  const across = g.createLinearGradient(0, 0, 32, 0);
  across.addColorStop(0, 'rgba(0,0,0,0)');
  across.addColorStop(0.5, 'rgba(0,0,0,1)');
  across.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = across;
  g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * v4.0.2 (owner: "khói nhanh, giống thật" → plan 1 + 2): thin dust streaks behind the rear tyres, lying on
 * the road and stretched along the direction of travel — longer with speed. One instanced draw call; each
 * streak thins out over its short life (no per-instance alpha needed).
 */
export class DustStreaks {
  mesh: THREE.InstancedMesh;
  private n = 64;
  private x = new Float32Array(this.n);
  private y = new Float32Array(this.n);
  private z = new Float32Array(this.n);
  private life = new Float32Array(this.n);
  private max = new Float32Array(this.n);
  private len = new Float32Array(this.n);
  private wid = new Float32Array(this.n);
  private head = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  private p = new THREE.Vector3();
  private sc = new THREE.Vector3();
  private mat: THREE.MeshBasicMaterial;

  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ map: streakTexture(), color: 0xf2e0b8, transparent: true, opacity: 0.72, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.mat, this.n);
    this.mesh.frustumCulled = false;
    this.mesh.count = this.n;
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < this.n; i++) this.mesh.setMatrixAt(i, this.m);
  }
  setColor(c: number) {
    this.mat.color.setHex(c);
  }
  /** a streak at (x, y, z), `len` metres long (along the road), `w` wide, living `life` seconds */
  emit(x: number, y: number, z: number, len: number, w: number, life: number) {
    const i = this.head;
    this.head = (this.head + 1) % this.n;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.len[i] = len;
    this.wid[i] = w;
    this.life[i] = life;
    this.max[i] = life;
  }
  update(dt: number, worldSpeed: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      this.life[i] -= dt;
      // the dust hangs in the car's slipstream: it trails just behind the tyres and drifts back slowly
      // (fixed to the road it would pass the camera in a tenth of a second at top speed)
      this.z[i] += Math.min(worldSpeed, 60) * 0.05 * dt;
      const k = Math.max(0, this.life[i] / this.max[i]);
      // fade in fast, then thin out and grow a little longer
      const a = Math.min(1, (1 - k) * 6) * k;
      this.p.set(this.x[i], this.y[i], this.z[i] + this.len[i] / 2);
      this.sc.set(this.wid[i] * (0.5 + a * 0.7), this.len[i] * (1 + (1 - k) * 0.3), 1);
      this.m.compose(this.p, this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.life.fill(0);
  }
}

/** Streaking speed lines around the camera; intensity follows speed/turbo. */
/**
 * Speed streaks: long light trails rushing past along BOTH SIDES of the road (rails, building
 * lights), plus a few in the sky. Brighter, longer and faster with speed; per-streak colour
 * (white / world accent / red tail-light / blue) like long-exposure city traffic.
 */
export class SpeedLines {
  lines: THREE.LineSegments;
  private n = 140;
  private data: { x: number; y: number; z: number; len: number; c: number }[] = [];
  private arr: Float32Array;
  private col: Float32Array;
  intensity = 0;
  constructor() {
    this.arr = new Float32Array(this.n * 6);
    this.col = new Float32Array(this.n * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.arr, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.lines.frustumCulled = false;
    for (let i = 0; i < this.n; i++) this.data.push(this.spawn({ x: 0, y: 0, z: 0, len: 0, c: 0 }, true));
  }
  private spawn(d: { x: number; y: number; z: number; len: number; c: number }, anyZ = false) {
    const side = rng.next() < 0.82;
    if (side) {
      // just outside the road: rails / barriers (low) and building lights (higher)
      const s = rng.next() < 0.5 ? -1 : 1;
      d.x = s * rng.range(5.4, 13);
      d.y = rng.next() < 0.6 ? rng.range(0.25, 1.6) : rng.range(1.6, 7);
    } else {
      const a = rng.next() * Math.PI * 2;
      const r = rng.range(5, 14);
      d.x = Math.cos(a) * r;
      d.y = 3 + Math.abs(Math.sin(a)) * r * 0.7;
    }
    d.z = anyZ ? rng.range(-140, 10) : rng.range(-160, -100);
    d.len = rng.range(5, 16);
    d.c = rng.next();
    return d;
  }
  update(dt: number, speed: number, color: THREE.Color) {
    const m = this.lines.material as THREE.LineBasicMaterial;
    m.opacity = Math.min(0.85, this.intensity);
    this.lines.visible = m.opacity > 0.01;
    if (!this.lines.visible) return;
    const v = speed * 2.4;
    for (let i = 0; i < this.n; i++) {
      const d = this.data[i];
      d.z += v * dt;
      if (d.z > 12) this.spawn(d);
      const len = d.len * (0.4 + this.intensity * 1.4);
      this.arr.set([d.x, d.y, d.z, d.x, d.y, d.z - len], i * 6);
      // colour: mostly white-ish, some world accent, some red (tail lights) and blue
      if (d.c < 0.45) tmpC.setRGB(0.9, 0.95, 1);
      else if (d.c < 0.7) tmpC.copy(color).lerp(tmpC2.setRGB(1, 1, 1), 0.3);
      else if (d.c < 0.86) tmpC.setRGB(1, 0.25, 0.3);
      else tmpC.setRGB(0.3, 0.6, 1);
      // head bright, tail fades to black (additive → transparent)
      this.col.set([tmpC.r, tmpC.g, tmpC.b, 0, 0, 0], i * 6);
    }
    (this.lines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lines.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Fresnel shield bubble around the car. */
/**
 * SHIELD: a soft cloud of light motes hugging the car's silhouette (a rounded box around the
 * body), drifting slowly along the surface. Constant brightness — it never flickers or flashes.
 * API kept: { mesh, mat } with uniforms time / strength.
 */
export function makeShield() {
  const N = 120;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const r = new Rng(7);
  // car-shaped envelope (half extents) around the body
  const hx = 0.98, hy0 = -0.42, hy1 = 0.6, hz = 1.86;
  for (let i = 0; i < N; i++) {
    // pick a point on the rounded-box surface: random direction, pushed out to the envelope
    let x = r.range(-1, 1), y = r.range(-1, 1), z = r.range(-1, 1);
    const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1;
    x /= m; y /= m; z /= m;
    // soften the corners (superellipse look)
    const k = 0.82 + 0.18 * (1 - Math.abs(x * y * z));
    pos[i * 3] = x * hx * k;
    pos[i * 3 + 1] = (y < 0 ? -y * hy0 : y * hy1) * k;
    pos[i * 3 + 2] = z * hz * k;
    seed[i] = r.range(0, 6.283);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0x8fd8ff) }, time: { value: 0 }, strength: { value: 1 }, scale: { value: Math.min(2, window.devicePixelRatio || 1) } },
    vertexShader: `attribute float seed; uniform float time; uniform float scale; varying float vA;
      void main(){
        vec3 p = position;
        // slow drift along the envelope (no blinking: alpha stays constant)
        float a = time * 0.6 + seed;
        p += normalize(position + 1e-4) * 0.05 * sin(a);
        p.z += 0.08 * sin(a * 0.7 + seed * 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (9.0 + 4.0 * fract(seed)) * scale * (10.0 / -mv.z);
        vA = 0.55 + 0.25 * fract(seed * 3.7);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float strength; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
        float soft = smoothstep(0.25, 0.0, d);
        gl_FragColor = vec4(color, soft * soft * vA * 0.42 * strength); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, mat };
}

/** Expanding torus rings (respawn, pickups, world portal flash). */
export class RingPulses {
  group = new THREE.Group();
  private rings: { m: THREE.Mesh; t: number; life: number; scale: number; locked: boolean }[] = [];
  private geo = new THREE.TorusGeometry(1, 0.06, 8, 48);
  /** rings are disabled (eye comfort: expanding rings read as flashes) */
  enabled = false;
  spawn(pos: THREE.Vector3, color: number, scale = 3, life = 0.6, horizontal = false, locked = false) {
    if (!this.enabled) return;
    let r = this.rings.find((x) => x.t >= x.life);
    if (!r) {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      this.group.add(m);
      r = { m, t: 0, life, scale, locked };
      this.rings.push(r);
    }
    r.t = 0;
    r.life = life;
    r.scale = scale;
    r.locked = locked;
    r.m.position.copy(pos);
    r.m.rotation.set(horizontal ? Math.PI / 2 : 0, 0, 0);
    (r.m.material as THREE.MeshBasicMaterial).color.setHex(color);
    r.m.visible = true;
  }
  update(dt: number, worldSpeed: number) {
    for (const r of this.rings) {
      if (r.t >= r.life) {
        r.m.visible = false;
        continue;
      }
      r.t += dt;
      const k = Math.min(1, r.t / r.life);
      r.m.scale.setScalar(0.2 + r.scale * (1 - Math.pow(1 - k, 3)));
      (r.m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.4; // soft rings, never a flash
      if (r.locked) r.m.position.z += worldSpeed * dt;
    }
  }
}

/** Car debris chunks for the destruction animation. */
export class Debris {
  group = new THREE.Group();
  private parts: { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; t: number }[] = [];
  private locked = false;
  private mat = new THREE.MeshStandardMaterial({ color: 0xf3f5fa, roughness: 0.3, metalness: 0.3 });
  private glow = new THREE.MeshBasicMaterial({ color: 0xffc860, toneMapped: false });
  constructor() {
    const geos = [
      new THREE.BoxGeometry(0.6, 0.2, 0.8),
      new THREE.CylinderGeometry(0.3, 0.34, 0.2, 14),
      new THREE.BoxGeometry(0.4, 0.15, 0.5),
      new THREE.TorusGeometry(0.26, 0.05, 6, 16),
    ];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(geos[i % geos.length], i % 4 === 3 ? this.glow : this.mat);
      m.visible = false;
      this.group.add(m);
      this.parts.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 0 });
    }
  }
  explode(pos: THREE.Vector3, bodyColor: number, glowColor: number, locked = false) {
    this.locked = locked;
    this.mat.color.setHex(bodyColor);
    this.glow.color.setHex(glowColor);
    for (const p of this.parts) {
      p.m.visible = true;
      p.m.position.copy(pos).add(new THREE.Vector3(rng.range(-0.6, 0.6), rng.range(-0.2, 0.4), rng.range(-0.8, 0.8)));
      p.v.set(rng.range(-6, 6), rng.range(4, 11), rng.range(-4, 6));
      p.w.set(rng.range(-12, 12), rng.range(-12, 12), rng.range(-12, 12));
      p.t = 2.2;
    }
  }
  update(dt: number, worldSpeed = 0) {
    for (const p of this.parts) {
      if (p.t <= 0) continue;
      p.t -= dt;
      if (this.locked) p.m.position.z += worldSpeed * dt;
      p.v.y -= 22 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.w.x * dt;
      p.m.rotation.y += p.w.y * dt;
      p.m.rotation.z += p.w.z * dt;
      if (p.t <= 0) p.m.visible = false;
    }
  }
  clear() {
    for (const p of this.parts) {
      p.t = 0;
      p.m.visible = false;
    }
  }
}

/** Big glowing portal ring that marks a world boundary on the road ahead. */
/**
 * v1.0.0 (3D Car Run): the world-change marker is a wooden welcome gate over the road whose sign names
 * the next place ("WELCOME TO GHOST TOWN"); setColor tints its lantern strip with the place's accent.
 */
export function makePortal() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.9, flatShading: true });
  for (const s2 of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 9, 9), wood);
    post.position.set(5.6 * s2, 4.1, 0);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.7, 0.8), wood);
  beam.position.y = 8.6;
  g.add(beam);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (label: string) => {
    const x = c.getContext('2d')!;
    x.fillStyle = '#5a3a1e';
    x.fillRect(0, 0, 1024, 160);
    for (let i = 0; i < 2; i++) {
      x.fillStyle = `rgba(0,0,0,${0.1 + i * 0.08})`;
      x.fillRect(0, i * 80, 1024, 80);
    }
    x.strokeStyle = '#c8924a';
    x.lineWidth = 10;
    x.strokeRect(6, 6, 1012, 148);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#ffd98a';
    x.font = '34px "Alfa Slab One", Georgia, serif';
    x.fillText('WELCOME TO', 512, 42);
    let sz = 76;
    x.font = `${sz}px "Rye", Georgia, serif`;
    while (x.measureText(label).width > 940 && sz > 20) x.font = `${(sz -= 4)}px "Rye", Georgia, serif`;
    x.lineWidth = 8;
    x.strokeStyle = '#2a1206';
    x.strokeText(label, 512, 106);
    x.fillStyle = '#fff1d0';
    x.fillText(label, 512, 106);
    tex.needsUpdate = true;
  };
  draw('THE WEST');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.72), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  sign.position.set(0, 7.3, 0.12);
  g.add(sign);
  const board = new THREE.Mesh(new THREE.BoxGeometry(11.3, 2.0, 0.2), wood);
  board.position.set(0, 7.3, 0);
  g.add(board);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc860, toneMapped: false });
  for (const x2 of [-4.5, -1.5, 1.5, 4.5]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), lampMat);
    lamp.position.set(x2, 8.0, 0.5);
    g.add(lamp);
  }
  g.visible = false;
  let last = '';
  return {
    group: g,
    setColor(col: THREE.Color) {
      lampMat.color.copy(col).lerp(new THREE.Color(0xffc860), 0.6);
    },
    /** name the place behind the gate */
    setLabel(label: string) {
      if (label !== last) draw((last = label));
    },
    update(_dt: number) {},
  };
}
