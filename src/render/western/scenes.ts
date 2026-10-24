import * as THREE from 'three';
import type { GraphicsPreset } from '../../config.ts';
import type { WorldId } from '../../gameplay/Spawner.ts';
import { WORLD_THEME, type SceneKind } from '../../western/themes.ts';
import { glowMaterial, propMaterial } from './atlas.ts';
import { dustTexture, groundTex, puffTexture, type GroundKind } from './ground.ts';
import { Ground, NEAR, PropField, type FieldOpts } from './PropField.ts';
import * as P from './props.ts';
import { addFarFade, wrapZ } from '../envFx.ts';

/**
 * 3D Car Run v1.0.0 — the Western places. Each world id gets its scenery set (src/western/themes.ts):
 * a scrolling ground, roadside props as instanced fields (one draw call per prop type, shared atlas
 * material), a far backdrop of mesas / cliffs with parallax, sky extras (clouds, moon) and
 * atmosphere (dust motes, sand streaks, embers). Nothing here touches gameplay.
 */
export interface Theme {
  group: THREE.Group;
  update(dist: number, t: number, dt: number): void;
  setQuality?(p: GraphicsPreset): void;
}

/** ground level beside the road (the deck top is y = 0: a low embankment) */
const GY = -0.42;

class Build {
  group = new THREE.Group();
  fields: { f: PropField; dense: boolean }[] = [];
  grounds: Ground[] = [];
  anim: ((dist: number, t: number, dt: number) => void)[] = [];
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  ground(kind: GroundKind, tile = 30, y = GY, color = 0xffffff, w = 760, xOff = 0) {
    const g = new Ground(groundTex(kind), tile, y, w, 900, color, xOff);
    this.group.add(g.mesh);
    this.grounds.push(g);
    return g;
  }
  /** a dusty shoulder strip on both sides of the deck (dirt fading into the ground) */
  shoulders(kind: GroundKind = 'dirt', color = 0xffffff, w = 5) {
    for (const s of [-1, 1]) this.ground(kind, 12, GY + 0.02, color, w, s * (4.6 + w / 2));
  }
  field(geo: THREE.BufferGeometry, o: Partial<FieldOpts> & Pick<FieldOpts, 'count' | 'x'>, glow = false, dense = true) {
    const f = new PropField(geo, glow ? glowMaterial() : propMaterial(), { range: 480, y: GY, seed: this.seed++, ...o });
    this.group.add(f.mesh);
    this.fields.push({ f, dense });
    return f;
  }
  /** far backdrop: big silhouettes with parallax (never re-roll visibly: very long range) */
  backdrop(geo: THREE.BufferGeometry, count: number, x: [number, number], scale: [number, number], stretch: [number, number] = [0.8, 1.3], y = GY - 2, side: 0 | -1 | 1 = 0) {
    return this.field(geo, { count, x, scale, stretch, range: 900, parallax: 0.22, y, side, zOff: -60 }, false, false);
  }
  clouds(n: number, tint = 0xffffff, opacity = 0.85, y: [number, number] = [55, 110]) {
    const mat = new THREE.SpriteMaterial({ map: puffTexture(), color: tint, transparent: true, opacity, depthWrite: false, fog: false });
    const items: { s: THREE.Sprite; base: number }[] = [];
    let r = this.seed * 13 + 5;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(mat);
      s.position.set((i % 2 ? 1 : -1) * (40 + rnd() * 220), y[0] + rnd() * (y[1] - y[0]), 0);
      s.scale.set(60 + rnd() * 80, 26 + rnd() * 26, 1);
      this.group.add(s);
      items.push({ s, base: rnd() * 700 });
    }
    this.anim.push((dist, t) => {
      for (const it of items) it.s.position.z = wrapZ(it.base, dist * 0.08 + t * 0.6, 700, -60);
    });
  }
  /** drifting dust motes (day) / embers (badlands) near the road */
  motes(n: number, color = 0xf8e0b8, size = 0.5, opacity = 0.55, rise = 0.3, spread = 26) {
    const pos = new Float32Array(n * 3);
    const base = new Float32Array(n * 3);
    let r = this.seed * 7 + 3;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      base[i * 3] = (rnd() * 2 - 1) * spread;
      base[i * 3 + 1] = rnd() * 7;
      base[i * 3 + 2] = rnd() * 160;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dustTexture(), color, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false }));
    pts.frustumCulled = false;
    this.group.add(pts);
    this.anim.push((dist, t) => {
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        pos[k] = base[k] + Math.sin(t * 0.5 + i) * 1.2;
        pos[k + 1] = GY + ((base[k + 1] + t * rise * (0.5 + (i % 5) * 0.2)) % 8);
        pos[k + 2] = wrapZ(base[k + 2], dist * 0.9 + t * 2, 160, 20);
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  /** blowing sand streaks (sandstorm): thin warm lines racing sideways */
  streaks(n: number) {
    const pos = new Float32Array(n * 6);
    const seeds: number[] = [];
    let r = this.seed * 3 + 1;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) seeds.push(rnd(), rnd(), rnd());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xf0c890, transparent: true, opacity: 0.5, depthWrite: false }));
    lines.frustumCulled = false;
    this.group.add(lines);
    this.anim.push((dist, t) => {
      for (let i = 0; i < n; i++) {
        const [a, b, c] = [seeds[i * 3], seeds[i * 3 + 1], seeds[i * 3 + 2]];
        const x = ((a * 120 + t * (18 + b * 14)) % 120) - 60;
        const y = GY + 0.2 + b * 6;
        const z = wrapZ(c * 140, dist * 0.95, 140, 15);
        pos.set([x, y, z, x - 2.4 - b * 2, y - 0.25, z + 0.6], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  /** a sky sprite (moon / big sun disc) */
  skyDisc(color: number, size: number, x: number, y: number, z: number, opacity = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.42, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(255,255,255,.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    // moon craters (subtle)
    g.fillStyle = 'rgba(160,170,200,.35)';
    for (const [cx, cy, r] of [[50, 52, 8], [74, 70, 6], [60, 80, 5], [78, 48, 4]]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, fog: false, toneMapped: false }));
    s.scale.setScalar(size);
    s.position.set(x, y, z);
    this.group.add(s);
    return s;
  }
  done(): Theme {
    const fields = this.fields;
    const grounds = this.grounds;
    const anim = this.anim;
    return {
      group: this.group,
      update(dist, t, dt) {
        for (const g of grounds) g.update(dist);
        for (const { f } of fields) f.update(dist, t);
        for (const a of anim) a(dist, t, dt);
      },
      setQuality(p) {
        for (const { f, dense } of fields) f.setDensity(dense ? p.cityDensity : Math.max(0.7, p.cityDensity));
      },
    };
  }
}

// ------------------------------------------------------------------ shared pieces
const NEARX: [number, number] = [7.5, 40];

function desertBase(b: Build, ground: GroundKind = 'sand', groundColor = 0xd4a06c, mesaColor = 0xb8603a, mesaCount = 12) {
  b.ground(ground, 30, GY, groundColor);
  b.shoulders('dirt', groundColor);
  b.field(P.dune(), { count: 10, x: [26, 90], scale: [8, 16], range: 560 }, false, false);
  b.backdrop(P.mesa(0, mesaColor), Math.ceil(mesaCount * 0.5), [110, 300], [26, 44], [0.7, 1.2]);
  b.backdrop(P.mesa(1, mesaColor), Math.ceil(mesaCount * 0.3), [130, 320], [30, 50], [0.6, 1.0]);
  b.backdrop(P.mesa(2, mesaColor + 0x080604), Math.ceil(mesaCount * 0.3), [100, 260], [14, 24], [0.8, 1.4]);
}

function cactusFields(b: Build, n = 26, x = NEARX) {
  b.field(P.saguaro(0), { count: Math.ceil(n * 0.7), x, scale: [1.0, 1.5] });
  b.field(P.saguaro(1), { count: Math.ceil(n * 0.5), x: [x[0] + 3, x[1] + 14], scale: [1.0, 1.6] });
  b.field(P.saguaro(2), { count: Math.ceil(n * 0.4), x, scale: [0.9, 1.3] });
  b.field(P.shrub(0), { count: Math.ceil(n * 1.6), x: [6.2, 45], scale: [0.8, 1.8] });
  b.field(P.shrub(1), { count: n, x: [6.2, 55], scale: [0.7, 1.6] });
  b.field(P.pricklyPear(), { count: Math.ceil(n * 0.6), x: [6.4, 30], scale: [0.9, 1.4] });
}

function windmills(b: Build, n: number, x: [number, number]) {
  const o = { count: n, x, scale: [1, 1] as [number, number], faceRoad: true, range: 560, seed: 900 + n, clear: 0 };
  b.field(P.windmillTower(), { ...o, y: GY });
  const rotor = b.field(P.windmillRotor(), { ...o, y: GY + 10.1 });
  // the tower field and the rotor field roll identical slots (same seed / options): the rotor sits
  // on its tower; it turns about its own +z axis (toward the road)
  rotor.spin = (i, t, e) => {
    e.z = t * (1.6 + (i % 3) * 0.3) + i;
  };
}

// ------------------------------------------------------------------ the places
function valley(b: Build) {
  desertBase(b);
  cactusFields(b, 30);
  b.field(P.joshua(), { count: 8, x: [10, 50], scale: [0.9, 1.3] });
  b.field(P.boulder(0), { count: 12, x: [8, 55], scale: [0.6, 1.8] });
  b.field(P.boulder(1, 0xc08050), { count: 8, x: [12, 60], scale: [0.8, 2.2] });
  windmills(b, 4, [20, 60]);
  b.field(P.waterTower(), { count: 2, x: [22, 45], range: 620, scale: [1, 1.1] });
  b.field(P.route66(), { count: 3, x: [6.4, 7.2], faceRoad: true, range: 360, y: GY });
  b.field(P.billboard(), { count: 2, x: [12, 18], faceRoad: true, range: 520 });
  b.field(P.gasStation(), { count: 1, x: [16, 22], faceRoad: true, range: 700 });
  b.field(P.tumbleweed(), { count: 6, x: [6, 30], scale: [0.6, 1.2] });
  b.clouds(12);
  b.motes(80);
}

function bridge(b: Build) {
  // the road crosses a deep ravine: far floor, canyon walls rising on both sides
  b.ground('redrock', 40, -62, 0xd0a080);
  b.field(P.rockWall(0), { count: 14, x: [60, 100], y: -62, scale: [26, 40], stretch: [2.2, 3.4], range: 620, yaw: 0.5, clear: 40 });
  b.field(P.rockWall(1, 0xa8582e), { count: 10, x: [80, 140], y: -62, scale: [30, 46], stretch: [2.4, 3.6], range: 680, yaw: 0.6, clear: 50 });
  b.field(P.hoodoo(0), { count: 10, x: [20, 50], y: -62, scale: [4, 7], range: 560 });
  b.field(P.hoodoo(1), { count: 6, x: [26, 60], y: -62, scale: [5, 8], range: 560 });
  b.backdrop(P.mesa(0), 6, [160, 320], [30, 50], [0.9, 1.3], -40);
  b.backdrop(P.mesa(2, 0xc87048), 4, [140, 300], [16, 26], [1.4, 2.0], -40);
  b.field(P.arch(), { count: 2, x: [40, 70], y: -62, scale: [4, 5], range: 700, faceRoad: true });
  b.clouds(14);
  b.motes(40);
}

function ghostTown(b: Build) {
  b.ground('dirt', 24, GY, 0xe8d0a8);
  b.shoulders('dirt', 0xf0d8b0, 3);
  // main street: false-front buildings close to the road on both sides
  const street = { x: [9.5, 10.5] as [number, number], faceRoad: true, range: 260, scale: [1, 1] as [number, number], clear: 7.4 };
  b.field(P.saloon(), { ...street, count: 5 });
  b.field(P.hotel(), { ...street, count: 4 });
  b.field(P.store(), { ...street, count: 4 });
  b.field(P.sheriff(), { ...street, count: 4 });
  b.field(P.bank(), { ...street, count: 3 });
  b.field(P.barrels(), { count: 10, x: [6.4, 9], scale: [0.9, 1.1] });
  b.field(P.wagonWheel(), { count: 6, x: [6.4, 9], faceRoad: true, yaw: 0.6 });
  b.field(P.wagon(), { count: 3, x: [7, 9.5], yaw: 0.4, range: 520 });
  b.field(P.waterTower(), { count: 2, x: [26, 40], range: 600 });
  b.field(P.deadTree(0), { count: 8, x: [22, 60], scale: [0.8, 1.4] });
  b.field(P.tumbleweed(), { count: 10, x: [5, 25], scale: [0.6, 1.2] });
  desertBackdrop(b, 0xc06a40);
  b.clouds(8, 0xfff0e0);
  b.motes(110, 0xf8d8a8);
}
function desertBackdrop(b: Build, c = 0xb8603a) {
  b.backdrop(P.mesa(0, c), 6, [120, 300], [26, 44], [0.7, 1.2]);
  b.backdrop(P.mesa(2, c), 4, [100, 260], [14, 24], [0.8, 1.4]);
}

function trainYard(b: Build) {
  b.ground('gravel', 24, GY, 0xf0e4d4);
  for (const s of [-1, 1]) b.ground('rails', 16, GY + 0.03, 0xffffff, 26, s * 21);
  // trains on the yard tracks (x ≈ 12…30 both sides)
  const track = (x: number) => ({ x: [x, x + 0.01] as [number, number], yaw: 0, range: 520 });
  b.field(P.locomotive(), { ...track(12.4), count: 2 });
  b.field(P.boxcar(0x8a3a22), { ...track(12.4), count: 6, zOff: -12 });
  b.field(P.boxcar(0x5a6a3a), { ...track(18.6), count: 6 });
  b.field(P.tankCar(), { ...track(24.8), count: 5 });
  b.field(P.boxcar(0x2a5a7a), { ...track(31), count: 5, zOff: -30 });
  b.field(P.containerStack(0x2a6a8a), { count: 6, x: [38, 60], yaw: 0.2, range: 560 });
  b.field(P.containerStack(0xb8642a), { count: 6, x: [40, 64], yaw: 0.3, range: 560 });
  b.field(P.signalPost(), { count: 6, x: [7, 9], faceRoad: true, range: 420 });
  b.field(P.waterTower(), { count: 2, x: [36, 50], range: 620 });
  b.field(P.guardHouse(), { count: 3, x: [8, 10], faceRoad: true, range: 600 });
  b.field(P.powerPole(), { count: 10, x: [35, 36], yaw: 0, range: 480 });
  desertBackdrop(b, 0xa8704a);
  b.clouds(10, 0xf0f0f0);
  b.motes(50, 0xe8dcc8);
}

function oilField(b: Build) {
  b.ground('cracked', 34, GY, 0xf4e4c4);
  b.shoulders('dirt');
  const pumps = { count: 7, x: [14, 50] as [number, number], range: 520, seed: 4242, scale: [1, 1] as [number, number], clear: 0 };
  b.field(P.pumpBase(), { ...pumps });
  const beam = b.field(P.pumpBeam(), { ...pumps, y: GY + 3.6 });
  beam.spin = (i, t, e) => {
    e.x = Math.sin(t * 1.4 + i * 1.3) * 0.32;
  };
  b.field(P.derrick(), { count: 5, x: [30, 80], range: 620 });
  b.field(P.oilTank(0), { count: 4, x: [24, 50], range: 600 });
  b.field(P.oilTank(1), { count: 4, x: [30, 60], range: 600 });
  b.field(P.wreck(), { count: 3, x: [8, 14], range: 600 });
  b.field(P.shrub(2), { count: 20, x: [6.5, 40], scale: [0.6, 1.3] });
  b.field(P.powerPole(), { count: 10, x: [10, 11], yaw: 0, range: 480 });
  b.field(P.billboard(), { count: 2, x: [12, 16], faceRoad: true, range: 600 });
  desertBackdrop(b, 0xb87048);
  b.clouds(6);
  b.motes(60);
}

function tunnel(b: Build) {
  // a lantern-lit mine: rock walls and a rock ceiling around the road (static, the texture scrolls),
  // timber frames every few metres, lanterns on the posts, old mine carts in the niches
  b.ground('dirt', 14, GY, 0x7a5a3a);
  const rock = groundTex('redrock').clone();
  rock.needsUpdate = true;
  rock.wrapS = rock.wrapT = THREE.RepeatWrapping;
  rock.repeat.set(30, 1.2);
  const wallMat = new THREE.MeshStandardMaterial({ map: rock, color: 0x8a6044, roughness: 1, side: THREE.DoubleSide });
  for (const s2 of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(320, 15.4), wallMat);
    wall.rotation.y = (Math.PI / 2) * -s2;
    // the right wall's u runs toward +z: mirror it so both walls scroll toward the camera with the road
    if (s2 === 1) wall.scale.x = -1;
    wall.position.set(6.6 * s2, GY + 7.3, NEAR - 160);
    b.group.add(wall);
  }
  const ceilTex = rock.clone();
  ceilTex.needsUpdate = true;
  ceilTex.repeat.set(1.2, 30);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 320), new THREE.MeshStandardMaterial({ map: ceilTex, color: 0x5a3e2a, roughness: 1, side: THREE.FrontSide }));
  // faces down only, above the SKY ESCAPE cruise height + camera (never fills the screen from above)
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 14.6, NEAR - 160);
  b.group.add(ceil);
  b.anim.push((dist) => {
    rock.offset.x = (dist / (320 / 30)) % 1;
    ceilTex.offset.y = -(dist / (320 / 30)) % 1; // v runs toward +z on the ceiling
  });
  b.field(P.mineFrame(), { count: 40, x: [0, 0.001], side: 1, yaw: 0, range: 240, y: GY, clear: 0 });
  b.field(P.lantern(), { count: 40, x: [5.25, 5.26], y: 5.2, side: -1, yaw: 0, range: 240, seed: 77, clear: 0 }, true);
  b.field(P.lantern(), { count: 40, x: [5.25, 5.26], y: 5.2, side: 1, yaw: 0, range: 240, seed: 78, zOff: -3, clear: 0 }, true);
  b.field(P.mineCart(), { count: 5, x: [5.6, 5.7], yaw: 0, range: 300, clear: 0 });
  b.field(P.barrels(), { count: 6, x: [5.4, 5.5], yaw: 0, range: 300, clear: 0, scale: [0.7, 0.8] });
  b.motes(70, 0xffd8a0, 0.35, 0.5, 0.15, 6);
}

function ruins(b: Build) {
  desertBase(b, 'sand', 0xf4e4cc, 0xc89060, 10);
  b.field(P.column(0), { count: 12, x: [9, 30], range: 480 });
  b.field(P.column(1), { count: 10, x: [8, 34], range: 480 });
  b.field(P.arch(), { count: 3, x: [14, 30], faceRoad: true, range: 560, scale: [0.9, 1.1] });
  b.field(P.brokenWall(), { count: 6, x: [10, 36], faceRoad: true, range: 520 });
  b.field(P.obelisk(), { count: 2, x: [24, 40], range: 640 });
  b.field(P.palm(0), { count: 8, x: [9, 40], scale: [0.9, 1.2] });
  b.field(P.boulder(2, 0xc8a070), { count: 10, x: [8, 50], scale: [0.6, 1.6] });
  b.field(P.shrub(0), { count: 16, x: [6.5, 40], scale: [0.6, 1.3] });
  b.clouds(10);
  b.motes(60);
}

function sandstorm(b: Build) {
  b.ground('sand', 26, GY, 0xe8c494);
  b.shoulders('dirt', 0xf0d0a0);
  b.field(P.deadTree(1), { count: 12, x: [8, 40], scale: [0.8, 1.5] });
  b.field(P.wreck(), { count: 4, x: [8, 18], range: 520 });
  b.field(P.waterTower(), { count: 2, x: [16, 30], range: 560 });
  b.field(P.powerPole(), { count: 12, x: [9, 10], yaw: 0, range: 420 });
  b.field(P.dune(), { count: 14, x: [12, 60], scale: [6, 14], range: 520 });
  b.field(P.route66(), { count: 3, x: [6.4, 7.2], faceRoad: true, range: 360 });
  b.field(P.tumbleweed(), { count: 14, x: [5, 30], scale: [0.6, 1.3] });
  b.streaks(260);
  b.motes(220, 0xf0c890, 0.9, 0.5, 0.2, 30);
}

function night(b: Build) {
  b.ground('sand', 30, GY, 0x6a6a90);
  b.shoulders('dirt', 0x7a7a98);
  cactusFields(b, 22);
  b.field(P.motel(), { count: 2, x: [16, 20], faceRoad: true, range: 620, seed: 515, clear: 0 });
  b.field(P.motelLights(), { count: 2, x: [16, 20], faceRoad: true, range: 620, seed: 515, clear: 0 }, true);
  b.field(P.motelSign(), { count: 2, x: [8, 10], faceRoad: true, range: 620 });
  b.field(P.gasStation(), { count: 1, x: [15, 20], faceRoad: true, range: 700 });
  b.field(P.boulder(0, 0x9a6a5a), { count: 10, x: [8, 50], scale: [0.6, 1.8] });
  b.backdrop(P.mesa(0, 0x5a4a6a), 6, [120, 300], [26, 44], [0.7, 1.2]);
  b.backdrop(P.mesa(2, 0x4a3a5a), 4, [100, 260], [14, 24], [0.8, 1.4]);
  b.skyDisc(0xe8eeff, 60, 70, 120, -560);
  // distant town lights on the horizon
  const n = 160;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(i % 2 ? 1 : -1) * (60 + ((i * 37) % 240)), GY + 1 + ((i * 13) % 7) * 0.6, -300 - ((i * 53) % 300)], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lights = new THREE.Points(g, new THREE.PointsMaterial({ map: dustTexture(), color: 0xffc070, size: 3.2, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  lights.frustumCulled = false;
  b.group.add(lights);
  b.anim.push((dist) => (lights.position.z = (dist * 0.1) % 60));
}

function coast(b: Build, sunset = false) {
  // sea on the right, far below; rocky cliffs and a coast road on the left
  const seaY = -16;
  b.ground('sea', 40, seaY, sunset ? 0xd8a080 : 0xffffff, 700, 360);
  b.ground('beach', 24, seaY + 0.2, sunset ? 0xe0b090 : 0xffffff, 16, 18);
  b.ground(sunset ? 'prairie' : 'gravel', 30, GY, sunset ? 0xd8b080 : 0xd8d0c0, 360, -186);
  b.field(P.cliff(0, 0x8a7a6a), { count: 18, x: [9, 30], side: -1, scale: [3, 6], stretch: [1.4, 2.6], range: 520 });
  b.field(P.cliff(1, 0x9a8a72), { count: 14, x: [30, 70], side: -1, scale: [8, 14], stretch: [1.6, 2.6], range: 560 });
  b.field(P.seaStack(0), { count: 6, x: [40, 120], side: 1, y: seaY, scale: [1, 1.6], range: 620 });
  b.field(P.seaStack(1), { count: 4, x: [60, 160], side: 1, y: seaY, scale: [1.2, 2], range: 640 });
  b.field(P.cliff(2, 0x8a7a6a), { count: 12, x: [7, 12], side: 1, y: seaY, scale: [3, 4], stretch: [2.1, 2.4], range: 360, clear: 5.2 });
  b.field(P.palm(1), { count: 8, x: [8, 26], side: -1, scale: [0.9, 1.2] });
  b.field(P.shrub(1), { count: 18, x: [6.5, 30], side: -1, scale: [0.6, 1.4] });
  b.field(P.lighthouse(), { count: 1, x: [70, 90], side: 1, y: seaY + 6, range: 900 });
  b.clouds(12, sunset ? 0xffd8c0 : 0xffffff);
  if (sunset) b.skyDisc(0xffc070, 90, -40, 30, -600, 0.9);
}

function redRock(b: Build) {
  b.ground('redrock', 30, GY, 0xe8b090);
  b.shoulders('dirt', 0xe0a880);
  b.field(P.rockWall(0), { count: 18, x: [16, 30], scale: [18, 28], stretch: [1.6, 2.6], range: 520, yaw: 0.4 });
  b.field(P.rockWall(1, 0xa8502a), { count: 12, x: [30, 60], scale: [24, 36], stretch: [2, 3], range: 560, yaw: 0.5 });
  b.field(P.hoodoo(0), { count: 10, x: [8, 22], scale: [1, 1.6] });
  b.field(P.hoodoo(1), { count: 6, x: [10, 26], scale: [1, 1.8] });
  b.field(P.boulder(0), { count: 14, x: [7, 20], scale: [0.6, 1.8] });
  b.field(P.shrub(0), { count: 14, x: [6.5, 18], scale: [0.6, 1.2] });
  b.field(P.rockfallSign(), { count: 2, x: [6.4, 7], faceRoad: true, range: 420 });
  b.motes(60, 0xffc8a0);
}

function badlands(b: Build) {
  b.ground('cracked', 34, GY, 0xb88a78);
  b.shoulders('dirt', 0xb08878);
  b.field(P.deadTree(0), { count: 14, x: [8, 50], scale: [0.8, 1.5] });
  b.field(P.deadTree(1), { count: 10, x: [10, 60], scale: [0.8, 1.6] });
  b.field(P.hoodoo(0), { count: 10, x: [14, 60], scale: [1.2, 2.2] });
  const flares = { count: 5, x: [26, 60] as [number, number], range: 560, seed: 3131, scale: [1, 1] as [number, number], clear: 0 };
  b.field(P.flareStack(), flares);
  const fl = b.field(P.flame(), { ...flares, y: GY + 12 }, true);
  fl.spin = (i, t, e) => {
    e.z = Math.sin(t * 9 + i) * 0.12;
  };
  b.field(P.derrick(), { count: 3, x: [40, 80], range: 640 });
  b.backdrop(P.mesa(0, 0x6a3a3a), 6, [120, 300], [26, 44], [0.7, 1.2]);
  b.backdrop(P.mesa(2, 0x5a3030), 4, [100, 260], [14, 24], [0.8, 1.4]);
  b.motes(90, 0xff9a40, 0.35, 0.8, 1.4, 34); // embers
}

function goldCanyon(b: Build) {
  desertBase(b, 'sand', 0xffe4b0, 0xc87040, 12);
  cactusFields(b, 18);
  b.field(P.mineEntrance(), { count: 2, x: [14, 20], faceRoad: true, range: 600 });
  b.field(P.mineCart(), { count: 6, x: [7, 12], range: 480 });
  b.field(P.wagon(), { count: 2, x: [9, 14], range: 560 });
  b.field(P.boulder(1, 0xc87848), { count: 12, x: [8, 50], scale: [0.6, 2] });
  b.field(P.billboard(), { count: 2, x: [12, 16], faceRoad: true, range: 560 });
  b.clouds(10, 0xfff0d8);
  b.motes(120, 0xffe0a0, 0.45, 0.65);
}

function pines(b: Build) {
  b.ground('pines', 26, GY, 0xffffff);
  b.shoulders('dirt', 0xd8c8a8);
  b.field(P.pine(0), { count: 30, x: [8, 50], scale: [0.8, 1.3] });
  b.field(P.pine(1), { count: 24, x: [12, 70], scale: [0.9, 1.4] });
  b.field(P.cabin(), { count: 2, x: [14, 22], faceRoad: true, range: 600 });
  b.field(P.boulder(0, 0x8a8278), { count: 12, x: [7, 40], scale: [0.6, 1.6] });
  b.field(P.fence(), { count: 16, x: [7.2, 7.3], yaw: 0, range: 300 });
  b.backdrop(P.mesa(1, 0x6a7a6a), 6, [120, 300], [30, 50], [0.8, 1.2]);
  b.clouds(12);
  b.motes(30, 0xf0f0d0);
}

function ranch(b: Build) {
  b.ground('prairie', 34, GY, 0xffffff);
  b.shoulders('dirt', 0xe0d0a8);
  b.field(P.barn(), { count: 3, x: [16, 30], faceRoad: true, range: 600 });
  b.field(P.hayBale(), { count: 14, x: [8, 40], scale: [0.9, 1.1] });
  b.field(P.fence(), { count: 30, x: [7.4, 7.5], yaw: 0, range: 180 });
  windmills(b, 4, [22, 60]);
  b.field(P.cow(0), { count: 8, x: [10, 40] });
  b.field(P.cow(1), { count: 6, x: [10, 40] });
  b.field(P.waterTower(), { count: 1, x: [30, 40], range: 700 });
  b.backdrop(P.mesa(0, 0xa86a48), 6, [120, 300], [26, 44], [0.7, 1.2]);
  b.clouds(14);
  b.motes(40, 0xf0e8c8);
}

const BUILD: Record<SceneKind, (b: Build) => void> = {
  valley,
  bridge,
  ghosttown: ghostTown,
  trainyard: trainYard,
  oilfield: oilField,
  tunnel,
  ruins,
  sandstorm,
  night,
  coast: (b) => coast(b, false),
  redrock: redRock,
  badlands,
  goldcanyon: goldCanyon,
  pines,
  ranch,
  sunsetcoast: (b) => coast(b, true),
};

export function buildWestern(id: WorldId): Theme {
  const kind = WORLD_THEME[id].scene;
  const b = new Build(id.length * 97 + kind.length * 13 + 1);
  BUILD[kind](b);
  return b.done();
}

/** the far-fade must also cover the ground planes' far edge (they are long, not recycled) */
export function fadeGround(mat: THREE.Material) {
  addFarFade(mat, NEAR - 900);
}
