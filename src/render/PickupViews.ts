import { COIN_LOOK } from '../config.ts';
import * as THREE from 'three';
import { Pool } from '../core/Pool.ts';
import type { LivePickup } from '../gameplay/World.ts';
import type { PickupKind } from '../gameplay/types.ts';
import { coinFaceTexture, glowTexture, labelTexture } from './textures.ts';

const MAX_COINS = 220;

function extrude(shape: THREE.Shape, depth = 0.14) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  g.center();
  return g;
}


/** double chevron » for AIR DASH */
function dashShape() {
  const s = new THREE.Shape();
  const ch = (ox: number) => {
    s.moveTo(ox - 0.22, 0.42);
    s.lineTo(ox + 0.12, 0);
    s.lineTo(ox - 0.22, -0.42);
    s.lineTo(ox - 0.02, -0.42);
    s.lineTo(ox + 0.32, 0);
    s.lineTo(ox - 0.02, 0.42);
    s.closePath();
  };
  ch(-0.18);
  const s2 = new THREE.Shape();
  s2.moveTo(0.04, 0.42);
  s2.lineTo(0.38, 0);
  s2.lineTo(0.04, -0.42);
  s2.lineTo(0.24, -0.42);
  s2.lineTo(0.58, 0);
  s2.lineTo(0.24, 0.42);
  s2.closePath();
  return [s, s2];
}

/** up arrow for SKY ESCAPE */
function escapeShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.56);
  s.lineTo(0.4, 0.12);
  s.lineTo(0.15, 0.12);
  s.lineTo(0.15, -0.5);
  s.lineTo(-0.15, -0.5);
  s.lineTo(-0.15, 0.12);
  s.lineTo(-0.4, 0.12);
  s.closePath();
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.45);
  s.bezierCurveTo(-0.1, -0.35, -0.5, -0.05, -0.5, 0.18);
  s.bezierCurveTo(-0.5, 0.42, -0.25, 0.5, 0, 0.3);
  s.bezierCurveTo(0.25, 0.5, 0.5, 0.42, 0.5, 0.18);
  s.bezierCurveTo(0.5, -0.05, 0.1, -0.35, 0, -0.45);
  return s;
}

/** v1.0.0 (3D Car Run): Western item colours (pickup bubble, HUD chip, burst, car light sweep) */
export const POWER_COLORS: Record<Exclude<PickupKind, 'coin'>, number> = {
  shield: 0x48c8d0, // Sheriff Guard — silver star, turquoise glow (v1.0.7: not gold, so it never reads as a coin)
  magnet: 0xe0402a, // Gold Magnet
  turbo: 0xff8a1a, // Dust Storm Nitro
  double: 0xe8c890, // Double Bounty (EXP ×2)
  life: 0xe0302a, // Extra Life
  super: 0xffb02e, // Canyon Launcher
  dash: 0xff6a3a, // Canyon Dash
  escape: 0xff5030, // Last Stand
  hyper: 0xffd84a, // Eagle Jump
  ghost: 0xdfe8ff, // Ghost Rider
  wall: 0xc8703a, // Canyon Wall Ride
  rail: 0xd8b030, // Rail Rider
  tunnel: 0xffa040, // Mine Runner
  mystery: 0xffc848, // Outlaw Treasure
};

interface PowerView {
  kind: PickupKind;
  group: THREE.Group;
  icon: THREE.Object3D;
}

function starShape(r = 0.5, k = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * k : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}
const std = (color: number, emissive = 0.35, metal = 0.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.32, metalness: metal });

function buildPower(kind: Exclude<PickupKind, 'coin'>): PowerView {
  const group = new THREE.Group();
  const color = POWER_COLORS[kind];
  let icon: THREE.Object3D;
  const mat = std(color, 0.5);
  switch (kind) {
    case 'shield': {
      // Sheriff Guard: a tin star badge with ball tips and a ring
      const g = new THREE.Group();
      const silver = std(0xdfe7ef, 0.3, 0.9);
      const teal = std(0x48c8d0, 0.35, 0.6);
      g.add(new THREE.Mesh(extrude(starShape(0.52, 0.48), 0.12), silver));
      for (let i = 0; i < 5; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 5;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), teal);
        b.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0);
        g.add(b);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 24), teal);
      ring.position.z = 0.1;
      g.add(ring);
      icon = g;
      break;
    }
    case 'magnet': {
      // Gold Magnet: red horseshoe magnet, silver tips, a gold nugget between them
      const g = new THREE.Group();
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 12, 24, Math.PI), mat);
      arc.rotation.z = Math.PI;
      g.add(arc);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, metalness: 0.9, roughness: 0.2 });
      for (const s2 of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), tipMat);
        tip.position.set(0.3 * s2, 0.1, 0);
        g.add(tip);
      }
      const nug = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), std(0xffc848, 0.6, 0.9));
      nug.position.set(0, 0.32, 0);
      g.add(nug);
      icon = g;
      break;
    }
    case 'turbo': {
      // Dust Storm Nitro: a nitro bottle with a flame
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 16), std(0xff8a1a, 0.5, 0.7));
      g.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.18, 12), std(0xe8e4dc, 0.3, 0.9));
      neck.position.y = 0.4;
      g.add(neck);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.12, 16), std(0x3a1a06, 0.1, 0.3));
      band.position.y = -0.05;
      g.add(band);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 10), new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false }));
      flame.rotation.x = Math.PI;
      flame.position.y = -0.5;
      g.add(flame);
      g.rotation.z = -0.35;
      icon = g;
      break;
    }
    case 'life':
      icon = new THREE.Mesh(extrude(heartShape()), mat);
      break;
    case 'super':
    case 'hyper': {
      // Canyon Launcher / Eagle Jump: a little launch ramp with chevrons (hyper: a gold ring around it)
      const g = new THREE.Group();
      const ramp = new THREE.Shape();
      ramp.moveTo(-0.5, -0.3);
      ramp.lineTo(0.5, -0.3);
      ramp.lineTo(0.5, 0.25);
      ramp.closePath();
      const geo = new THREE.ExtrudeGeometry(ramp, { depth: 0.55, bevelEnabled: false });
      geo.center();
      geo.rotateY(Math.PI / 2);
      g.add(new THREE.Mesh(geo, std(0x5a3a1e, 0.15, 0.1)));
      const top = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.14), std(kind === 'hyper' ? 0xffd84a : 0xffb02e, 0.6, 0.2));
      top.rotation.x = -Math.PI / 2 + 0.5;
      top.position.y = 0.04;
      g.add(top);
      const arrow = new THREE.Mesh(extrude(escapeShape(), 0.08), std(0xfff0c0, 0.8, 0.2));
      arrow.scale.setScalar(0.55);
      arrow.position.y = 0.55;
      g.add(arrow);
      if (kind === 'hyper') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xfff3a0, toneMapped: false }));
        g.add(ring);
      }
      icon = g;
      break;
    }
    case 'dash': {
      const geo = new THREE.ExtrudeGeometry(dashShape(), { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
      geo.center();
      icon = new THREE.Mesh(geo, mat);
      break;
    }
    case 'escape': {
      // Last Stand: an up arrow inside a dust-vortex ring
      const g = new THREE.Group();
      g.add(new THREE.Mesh(extrude(escapeShape()), mat));
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58 + i * 0.05, 0.03, 6, 32, Math.PI * 1.4), new THREE.MeshBasicMaterial({ color: 0xf0c890, toneMapped: false }));
        ring.rotation.z = i * 2.1;
        g.add(ring);
      }
      icon = g;
      break;
    }
    case 'double': {
      // Double Bounty: a WANTED-style poster with ×2
      icon = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.2),
        new THREE.MeshBasicMaterial({ map: posterTexture('×2', 'EXP'), transparent: true, side: THREE.DoubleSide, toneMapped: false }),
      );
      break;
    }
    case 'mystery': {
      // Outlaw Treasure: a wooden chest with gold bands and coins under the lid
      const g = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.7 });
      const gold = std(0xffc848, 0.55, 0.9);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.56), wood));
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12, 1, false, 0, Math.PI), wood);
      lid.rotation.z = Math.PI / 2;
      lid.position.y = 0.25;
      g.add(lid);
      for (const x of [-0.28, 0.28]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.58), gold);
        b.position.x = x;
        g.add(b);
      }
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.06), gold);
      lock.position.set(0, 0.12, 0.3);
      g.add(lock);
      icon = g;
      break;
    }
    case 'ghost': {
      // Ghost Rider: a translucent cowboy hat
      const g = new THREE.Group();
      const m2 = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.75, toneMapped: false });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24), m2);
      brim.scale.z = 0.8;
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.42, 16), m2);
      crown.position.y = 0.22;
      g.add(crown);
      icon = g;
      break;
    }
    default: {
      // Gold Rush showcase specials: a labelled badge
      const label = { wall: 'WALL', rail: 'RAIL', tunnel: 'MINE' }[kind as 'wall' | 'rail' | 'tunnel'] ?? '?';
      icon = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1.3),
        new THREE.MeshBasicMaterial({ map: labelTexture(label, color), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }),
      );
      break;
    }
  }
  icon.scale.setScalar(1.25);
  group.add(icon);
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 24, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(bubble);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  glow.scale.setScalar(2.6);
  group.add(glow);
  return { kind, group, icon };
}

/** parchment poster (Double Bounty pickup) */
const posters = new Map<string, THREE.CanvasTexture>();
function posterTexture(big: string, small: string) {
  const key = big + small;
  let t = posters.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ead2a2';
  g.fillRect(4, 4, 120, 152);
  g.strokeStyle = '#6a3a14';
  g.lineWidth = 6;
  g.strokeRect(6, 6, 116, 148);
  g.fillStyle = '#3a1a06';
  g.textAlign = 'center';
  g.font = '22px "Rye", Georgia, serif';
  g.fillText('BOUNTY', 64, 36);
  g.font = '64px "Alfa Slab One", Georgia, serif';
  g.fillText(big, 64, 106);
  g.font = '22px "Alfa Slab One", Georgia, serif';
  g.fillText(small, 64, 140);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  posters.set(key, t);
  return t;
}

/**
 * Coins are a single InstancedMesh (1 draw call for up to 220 coins).
 * Power-ups are pooled individual meshes.
 */
export class PickupViews {
  private coins: THREE.InstancedMesh;
  private coinGlow: THREE.InstancedMesh;
  private powerPools = new Map<PickupKind, Pool<PowerView>>();
  private activePower = new Map<number, PowerView>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3(1, 1, 1);
  private p = new THREE.Vector3();

  constructor(private parent: THREE.Object3D) {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28);
    geo.rotateX(Math.PI / 2);
    const face = coinFaceTexture();
    const side = new THREE.MeshStandardMaterial({ color: 0xe0a030, metalness: COIN_LOOK.sideMetal, roughness: COIN_LOOK.sideRough, emissive: 0xc87010, emissiveIntensity: COIN_LOOK.sideGlow });
    const cap = new THREE.MeshStandardMaterial({ map: face, metalness: COIN_LOOK.capMetal, roughness: COIN_LOOK.capRough, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: COIN_LOOK.capGlow });
    this.coins = new THREE.InstancedMesh(geo, [side, cap, cap], MAX_COINS);
    this.coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coins.count = 0;
    this.coins.frustumCulled = false;
    parent.add(this.coins);
    const glowGeo = new THREE.PlaneGeometry(COIN_LOOK.haloSize, COIN_LOOK.haloSize);
    this.coinGlow = new THREE.InstancedMesh(
      glowGeo,
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffb020, transparent: true, opacity: COIN_LOOK.haloOpacity, blending: THREE.AdditiveBlending, depthWrite: false }),
      MAX_COINS,
    );
    this.coinGlow.count = 0;
    this.coinGlow.frustumCulled = false;
    parent.add(this.coinGlow);
  }

  private pool(kind: Exclude<PickupKind, 'coin'>) {
    let p = this.powerPools.get(kind);
    if (!p) {
      p = new Pool(() => buildPower(kind));
      this.powerPools.set(kind, p);
    }
    return p;
  }

  prewarm() {
    for (const k of Object.keys(POWER_COLORS) as Exclude<PickupKind, 'coin'>[]) this.pool(k).prewarm(1);
  }

  spawn(p: LivePickup) {
    if (p.spec.kind === 'coin') return;
    const v = this.pool(p.spec.kind).acquire();
    this.parent.add(v.group);
    this.activePower.set(p.id, v);
  }

  despawn(p: LivePickup) {
    const v = this.activePower.get(p.id);
    if (!v) return;
    this.parent.remove(v.group);
    this.activePower.delete(p.id);
    this.pool(v.kind as Exclude<PickupKind, 'coin'>).release(v);
  }

  update(pickups: LivePickup[], t: number, camQuat: THREE.Quaternion) {
    let n = 0;
    for (const p of pickups) {
      if (p.spec.kind === 'coin') {
        if (n >= MAX_COINS) continue;
        this.e.set(0, t * COIN_LOOK.spin + p.spec.dist * 0.3, 0);
        this.q.setFromEuler(this.e);
        this.p.set(p.x, p.y + Math.sin(t * 4 + p.spec.dist) * 0.06, p.z);
        this.s.setScalar(p.attracted ? 0.8 : 1);
        this.m.compose(this.p, this.q, this.s);
        this.coins.setMatrixAt(n, this.m);
        this.s.setScalar(1);
        this.m.compose(this.p, camQuat, this.s);
        this.coinGlow.setMatrixAt(n, this.m);
        n++;
      } else {
        const v = this.activePower.get(p.id);
        if (!v) continue;
        v.group.position.set(p.x, p.y + 0.15 + Math.sin(t * 3) * 0.12, p.z);
        v.icon.rotation.y = t * 2.4;
      }
    }
    this.coins.count = n;
    this.coinGlow.count = n;
    this.coins.instanceMatrix.needsUpdate = true;
    this.coinGlow.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (const [, v] of this.activePower) {
      this.parent.remove(v.group);
      this.pool(v.kind as Exclude<PickupKind, 'coin'>).release(v);
    }
    this.activePower.clear();
    this.coins.count = 0;
    this.coinGlow.count = 0;
  }
}
