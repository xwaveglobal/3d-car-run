/**
 * 3D Car Run v1.0.0 — the Western desert world identity, one entry per gameplay WorldId.
 *
 * PURE DATA (no Three.js, no DOM): the gameplay world ids, their order on the Endless ladder,
 * their obstacle weights and the fairness rules are UNCHANGED from the proven runner — only what
 * the player sees and reads is new. Render code (src/render/western/*) builds each place from
 * `scene`, the UI shows `name`.
 *
 * Ten themes (the owner's master prompt) + two extra ladder variants (Red Rock Canyon, Badlands)
 * so the 12-world Endless ladder never shows the same place twice in a row; the four Bonus worlds
 * become the Gold Rush places.
 */
import type { WorldId } from '../gameplay/Spawner.ts';

export type SceneKind =
  | 'valley'
  | 'bridge'
  | 'ghosttown'
  | 'trainyard'
  | 'oilfield'
  | 'tunnel'
  | 'ruins'
  | 'sandstorm'
  | 'night'
  | 'coast'
  | 'redrock'
  | 'badlands'
  | 'goldcanyon'
  | 'pines'
  | 'ranch'
  | 'sunsetcoast';

export interface WorldTheme {
  /** player-facing name (banners, world toasts) */
  name: string;
  /** one-line flavour for the race start / guides */
  tag: string;
  /** which scenery set the renderer builds */
  scene: SceneKind;
  /** one of the ten themes of the master prompt (1..10), or 0 = extra variant */
  theme: number;
}

export const WORLD_THEME: Record<WorldId, WorldTheme> = {
  city: { name: 'DESERT VALLEY', tag: 'Open highway · cacti & windmills', scene: 'valley', theme: 1 },
  cloud: { name: 'CANYON BRIDGE', tag: 'High trestles over deep ravines', scene: 'bridge', theme: 2 },
  mega: { name: 'GHOST TOWN', tag: 'Dusty main street · saloon gates', scene: 'ghosttown', theme: 3 },
  harbor: { name: 'TRAIN YARD', tag: 'Locomotives & rail crossings', scene: 'trainyard', theme: 4 },
  solar: { name: 'OIL FIELD', tag: 'Pump jacks & tanker trucks', scene: 'oilfield', theme: 5 },
  tunnel: { name: 'ROCK TUNNEL', tag: 'Lantern-lit mine & falling rock', scene: 'tunnel', theme: 6 },
  belt: { name: 'ANCIENT RUINS', tag: 'Stone arches & fallen columns', scene: 'ruins', theme: 7 },
  storm: { name: 'SANDSTORM', tag: 'Low visibility · moving sand', scene: 'sandstorm', theme: 8 },
  space: { name: 'NIGHT HIGHWAY', tag: 'Moonlit road · roadside lights', scene: 'night', theme: 9 },
  ice: { name: 'COASTAL CLIFF', tag: 'Rocky coast road & sea bridges', scene: 'coast', theme: 10 },
  canyon: { name: 'RED ROCK CANYON', tag: 'Sandstone walls at sunset', scene: 'redrock', theme: 0 },
  volcano: { name: 'BADLANDS', tag: 'Burning flares at dusk', scene: 'badlands', theme: 0 },
  // Gold Rush (Bonus) places
  desert: { name: 'GOLD CANYON', tag: 'Gold Rush · golden hour', scene: 'goldcanyon', theme: 0 },
  forest: { name: 'PINE RIDGE', tag: 'Gold Rush · mountain pines', scene: 'pines', theme: 0 },
  country: { name: 'PRAIRIE RANCH', tag: 'Gold Rush · barns & windmills', scene: 'ranch', theme: 0 },
  sea: { name: 'SUNSET COAST', tag: 'Gold Rush · cliffs & lighthouse', scene: 'sunsetcoast', theme: 0 },
};

export const worldName = (w: WorldId) => WORLD_THEME[w].name;
