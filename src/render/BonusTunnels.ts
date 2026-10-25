// v2.2 Bonus roads: tunnel sections placed along the road (v1.0.0: mine / log / barn / sea cave).
// Pure visuals — the spawner decides where they are (Spawner.tunnels()); Tunnel Rider uses them.
import * as THREE from 'three';
import { SHOWCASE_RIDE } from '../config.ts';

type Theme = 'desert' | 'forest' | 'country' | 'sea';

// v1.0.0 (3D Car Run): Gold Rush tunnels — gold mine, pine-log tunnel, red barn, sea cave; timber ribs, lantern strip
const LOOK: Record<Theme, { shell: number; rib: number; glow: number; opacity: number }> = {
  desert: { shell: 0x7a4428, rib: 0x5a3a1e, glow: 0xffc860, opacity: 1 },
  forest: { shell: 0x5a4a3a, rib: 0x4a2f1a, glow: 0xffc860, opacity: 1 },
  country: { shell: 0xa8342a, rib: 0xd9b47a, glow: 0xffd27a, opacity: 1 },
  sea: { shell: 0x6a5e52, rib: 0x4a3e32, glow: 0xffc070, opacity: 1 },
};

const R = 9.5;

export class BonusTunnels {
  group = new THREE.Group();
  private items: { g: THREE.Group; from: number; len: number }[] = [];
  private look: (typeof LOOK)[Theme] = LOOK.desert;
  /** v4.0.2 Wall Ride: a timber mine wall along one road edge, only for the ride */
  private wall: { g: THREE.Group; from: number; len: number } | null = null;

  /** a tunnel covers this road distance (Mine Run climbs onto the roof only inside one) */
  inside(dist: number) {
    return this.items.some((it) => dist >= it.from && dist <= it.from + it.len);
  }

  setWall(from: number, to: number, side: number) {
    this.clearWall();
    const L = this.look;
    const len = Math.max(10, to - from);
    const g = new THREE.Group();
    const x = side * (SHOWCASE_RIDE.wallX + 0.2);
    // plank face (the wheels touch it) + heavier posts every 4 m + a top beam
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, len), new THREE.MeshBasicMaterial({ color: L.shell, fog: true }));
    face.position.set(x, 1.3, -len / 2);
    g.add(face);
    const postMat = new THREE.MeshBasicMaterial({ color: L.rib, fog: true });
    const postGeo = new THREE.BoxGeometry(0.5, 3.6, 0.45);
    for (let z = 0; z <= len; z += 4) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x - side * 0.08, 1.4, -z);
      g.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, len), postMat);
    beam.position.set(x - side * 0.05, 3.1, -len / 2);
    g.add(beam);
    // lantern strip along the plank face (reads as a mine gallery)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, len), new THREE.MeshBasicMaterial({ color: L.glow, toneMapped: false, fog: true }));
    strip.position.set(x - side * 0.22, 2.75, -len / 2);
    g.add(strip);
    g.visible = false;
    this.group.add(g);
    this.wall = { g, from, len };
  }

  /**
   * v4.0.2 (owner) Wall Ride gate: three timber barriers joined across the road, with ONE narrow slanted slot
   * at the wall edge — shaped like the leaning car, so only the Wall Ride gets through (on the right side).
   */
  setSlotGates(dists: number[], side: number) {
    const wl = this.wall;
    if (!wl) return;
    const L = this.look;
    const wood = new THREE.MeshBasicMaterial({ color: 0x8a5a30, fog: true });
    const frame = new THREE.MeshBasicMaterial({ color: L.rib, fog: true });
    const glow = new THREE.MeshBasicMaterial({ color: L.glow, toneMapped: false, fog: true });
    const stripe = new THREE.MeshBasicMaterial({ color: 0xc23a22, fog: true });
    const X = SHOWCASE_RIDE.wallX;
    const H = 3.6;
    const D = 0.5;
    // the slot (x from the road centre toward the wall, y up): the leaning car's cross-section + margin
    const S = SHOWCASE_RIDE;
    const sx = X - S.slotW;
    // a narrow upright slot against the wall, above the guardrail: only a car riding the wall fits
    const slot: [number, number][] = [
      [sx, S.slotY0],
      [X, S.slotY0],
      [X, S.slotY1],
      [sx, S.slotY1],
    ];
    const extrude = (pts: [number, number][]) => {
      const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * side, y)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false });
      geo.translate(0, 0, -D / 2);
      return geo;
    };
    for (const d of dists) {
      const g = new THREE.Group();
      g.position.z = -(d - wl.from);
      // left + middle barriers (plain), the wall-side barrier with the slot cut out
      const panels: [number, number][][] = [
        [[-X, 0], [-1.35, 0], [-1.35, H], [-X, H]],
        [[-1.3, 0], [1.3, 0], [1.3, H], [-1.3, H]],
        [[1.35, 0], [X, 0], [X, S.slotY0], [sx, S.slotY0], [sx, S.slotY1], [X, S.slotY1], [X, H], [1.35, H]],
      ];
      for (const pts of panels) g.add(new THREE.Mesh(extrude(pts), wood));
      // posts between the barriers and a top beam: one joined wall
      for (const x of [-X, -1.33, 1.33]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, H + 0.3, D + 0.15), frame);
        post.position.set(x * side, (H + 0.3) / 2, 0);
        g.add(post);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * X, 0.3, D + 0.2), frame);
      beam.position.set(0, H + 0.15, 0);
      g.add(beam);
      // red hazard bands on the solid barriers
      for (const [x0, x1] of [[-X, -1.35], [-1.3, 1.3]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.35, D + 0.04), stripe);
        b.position.set(((x0 + x1) / 2) * side, 1.9, 0);
        g.add(b);
      }
      // lantern outline around the slot: shows the way through
      for (let i = 0; i < slot.length; i++) {
        const [ax, ay] = slot[i];
        const [bx, by] = slot[(i + 1) % slot.length];
        if (ax === X && bx === X) continue; // not along the side wall
        const len = Math.hypot(bx - ax, by - ay);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, D + 0.06), glow);
        bar.position.set(((ax + bx) / 2) * side, (ay + by) / 2, 0);
        bar.rotation.z = Math.atan2(by - ay, (bx - ax) * side);
        g.add(bar);
      }
      // a gold arrow on the beam, pointing down into the slot
      const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 3), glow);
      arrow.rotation.z = -Math.PI / 2;
      arrow.position.set((X - S.slotW / 2) * side, H - 0.32, D / 2 + 0.05);
      g.add(arrow);
      wl.g.add(g);
    }
  }

  private clearWall() {
    if (!this.wall) return;
    this.group.remove(this.wall.g);
    this.wall.g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.wall = null;
  }

  set(sections: { from: number; to: number }[], theme: string | null) {
    for (const it of this.items) {
      this.group.remove(it.g);
      it.g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    }
    this.items = [];
    this.clearWall();
    if (!theme || !(theme in LOOK)) return;
    const L = LOOK[theme as Theme];
    this.look = L;
    for (const s of sections) {
      const len = s.to - s.from;
      const g = new THREE.Group();
      const shellGeo = new THREE.CylinderGeometry(R, R, len, 18, 1, true, Math.PI / 2, Math.PI);
      shellGeo.rotateX(Math.PI / 2);
      shellGeo.translate(0, -0.4, -len / 2);
      const shell = new THREE.Mesh(
        shellGeo,
        new THREE.MeshBasicMaterial({ color: L.shell, side: THREE.DoubleSide, transparent: L.opacity < 1, opacity: L.opacity, depthWrite: L.opacity >= 1, fog: true }),
      );
      g.add(shell);
      const ribMat = new THREE.MeshBasicMaterial({ color: L.rib, fog: true });
      for (let z = 0; z <= len; z += 8) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(R - 0.15, z === 0 || z + 8 > len ? 0.7 : 0.28, 6, 20, Math.PI), ribMat);
        rib.position.set(0, -0.4, -z);
        g.add(rib);
      }
      // a soft light strip along the crown
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, len), new THREE.MeshBasicMaterial({ color: L.glow, toneMapped: false, fog: true }));
      strip.position.set(0, R - 0.55, -len / 2);
      g.add(strip);
      g.visible = false;
      this.group.add(g);
      this.items.push({ g, from: s.from, len });
    }
  }

  update(dist: number) {
    for (const it of this.items) {
      const z = -(it.from - dist);
      it.g.position.z = z;
      // visible from ~260 m ahead until the exit is behind the camera
      it.g.visible = z > -260 && z - it.len < 20;
    }
    const wl = this.wall;
    if (wl) {
      const z = -(wl.from - dist);
      wl.g.position.z = z;
      wl.g.visible = z > -260 && z - wl.len < 20;
      if (z - wl.len > 40) this.clearWall();
    }
  }
}
