import * as THREE from 'three';
import { LANES } from '../config.ts';
import { Pool } from '../core/Pool.ts';
import type { LiveObstacle } from '../gameplay/World.ts';
import type { ObstacleType } from '../gameplay/types.ts';
import type { WorldId } from '../gameplay/Spawner.ts';
import { Guides } from './Guides.ts';
import { buildWesternObstacle, obstacleSet, setWesternContrast, type ObSet } from './western/obstacles.ts';

/**
 * v1.0.0 (3D Car Run): every obstacle is a Western prop built in src/render/western/obstacles.ts —
 * same hitboxes (ObstacleRules.ts), one look per place. This file keeps the pooling / placement.
 */

/** world readability: hazard outline colour/opacity and the dark-place emissive lift */
export function setObstacleContrast(edge: number, opacity: number, lift: number) {
  setWesternContrast(edge, opacity, lift);
}

/** comfort: soften flicker/pulse animations */
export const OBSTACLE_FX = { pulse: 1 };

export interface ObstacleView {
  type: ObstacleType;
  /** pool key: place set + type */
  key?: string;
  group: THREE.Group;
  update(o: LiveObstacle, t: number, dt: number): void;
  setup(o: LiveObstacle): void;
  /** v4.2.1: the car flew through (ring) — play the collect feedback */
  collect?(): void;
}

/** Pools one view type per obstacle type; attaches/detaches from the scene. */
export class ObstacleViews {
  /** v1.0.0: the Western prop set of the current place */
  private set: ObSet = 'valley';
  /** the obstacles of this world id get its place's look (hitboxes unchanged) */
  setWorld(w: WorldId) {
    this.set = obstacleSet(w);
  }
  private pools = new Map<string, Pool<ObstacleView>>();
  private active = new Map<number, ObstacleView>();
  guides: Guides;

  constructor(private parent: THREE.Object3D) {
    this.guides = new Guides(parent);
  }

  private pool(type: ObstacleType, set: ObSet = this.set) {
    const key = `${set}:${type}`;
    let p = this.pools.get(key);
    if (!p) {
      p = new Pool(() => {
        const w = buildWesternObstacle(type, set);
        const v: ObstacleView = { type, key, group: w.group, update: w.update, setup: w.setup, collect: w.collect };
        return v;
      });
      this.pools.set(key, p);
    }
    return p;
  }
  private poolOf(v: ObstacleView) {
    const k = v.key ?? `valley:${v.type}`;
    return this.pool(v.type, k.slice(0, k.indexOf(':')) as ObSet);
  }

  prewarm() {
    const counts: [ObstacleType, number][] = [
      ['crate', 8], ['barrier', 4], ['beam', 4], ['drone', 3], ['laser', 2], ['traffic', 3], ['ring', 3], ['platform', 2], ['asteroid', 4], ['gate', 1],
    ];
    for (const [t, n] of counts) this.pool(t).prewarm(n);
  }

  spawn(o: LiveObstacle) {
    const v = this.pool(o.spec.type).acquire();
    v.setup(o);
    v.group.visible = true;
    this.parent.add(v.group);
    this.active.set(o.id, v);
    this.place(o, v);
    this.guides.spawn(o);
  }

  despawn(o: LiveObstacle) {
    this.guides.despawn(o);
    const v = this.active.get(o.id);
    if (!v) return;
    this.parent.remove(v.group);
    this.active.delete(o.id);
    this.poolOf(v).release(v);
  }

  /** v4.2.1: the car flew through a ring — its collect animation */
  collect(o: LiveObstacle) {
    this.active.get(o.id)?.collect?.();
  }

  /** the view object of a live obstacle (debug overlay) */
  viewOf(id: number): THREE.Object3D | undefined {
    return this.active.get(id)?.group;
  }

  hide(o: LiveObstacle) {
    const v = this.active.get(o.id);
    if (v) v.group.visible = false;
  }

  private place(o: LiveObstacle, v: ObstacleView) {
    const t = o.spec.type;
    const x = t === 'drone' || t === 'platform' ? o.sx : t === 'laser' || t === 'gate' ? 0 : LANES[o.spec.lane];
    v.group.position.set(x, 0, o.z);
    if (t === 'traffic') v.group.rotation.y = 0;
  }

  update(obstacles: LiveObstacle[], t: number, dt: number) {
    for (const o of obstacles) {
      const v = this.active.get(o.id);
      if (!v) continue;
      if (o.smashed) v.group.visible = false;
      this.place(o, v);
      v.update(o, t, dt);
    }
    this.guides.update(obstacles, t);
  }

  clear() {
    for (const [, v] of this.active) {
      this.parent.remove(v.group);
      this.poolOf(v).release(v);
    }
    this.active.clear();
    this.guides.clear();
  }
}
