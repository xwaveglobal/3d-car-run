import type { WorldId } from '../../gameplay/Spawner.ts';
import type { ThemeLook } from '../Scenery.ts';
import type { ReadabilityProfile } from '../Readability.ts';

/**
 * 3D Car Run v1.0.0 — light, sky and road look of every world (render data only; the gameplay world
 * ids and their obstacle mix are unchanged, see src/western/themes.ts for the names).
 * Warm golden sunlight by day, dusk for the canyons / badlands, a moonlit blue night, a dusty orange
 * whiteout in the sandstorm, lantern light in the mine.
 */
export const LOOKS: Record<WorldId, ThemeLook> = {
  // Desert Valley — high sun, pale blue sky, warm sand haze
  city: {
    skyTop: 0x2a66bc, skyMid: 0x7eb6e6, skyBottom: 0xf0c88e, fog: 0xe2bc88, fogNear: 120, fogFar: 540,
    hemiSky: 0xfff0d8, hemiGround: 0xa8703c, hemi: 1.05, sun: 0xfff0d0, sunI: 2.4, accent: 0xe8a040, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff0c0,
  },
  // Canyon Bridge — afternoon gold over the ravine
  cloud: {
    skyTop: 0x3a68b8, skyMid: 0x9cc0e0, skyBottom: 0xffd2a0, fog: 0xe8c49a, fogNear: 125, fogFar: 552,
    hemiSky: 0xffeed8, hemiGround: 0xa8603a, hemi: 1.03, sun: 0xffe2b0, sunI: 2.33, accent: 0xe08a3a, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xffe0a8,
  },
  // Ghost Town — late golden hour, long warm light
  mega: {
    skyTop: 0x4a5aa0, skyMid: 0xe0a070, skyBottom: 0xffd08a, fog: 0xe0b080, fogNear: 87, fogFar: 456,
    hemiSky: 0xffe0b8, hemiGround: 0x8a5a34, hemi: 0.99, sun: 0xffc880, sunI: 2.23, accent: 0xffb040, stars: 0, cloudSea: 0, cloudTint: 0xfff0e0, openAir: true, glow: 0xffc070,
  },
  // Train Yard — hazy industrial afternoon
  harbor: {
    skyTop: 0x4a74b0, skyMid: 0xa8c0d0, skyBottom: 0xe8d0b0, fog: 0xd8c4a8, fogNear: 100, fogFar: 480,
    hemiSky: 0xf4ecdc, hemiGround: 0x8a7458, hemi: 1.01, sun: 0xfff0d8, sunI: 2.23, accent: 0xd88a3a, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff0d0,
  },
  // Oil Field — bright midday glare
  solar: {
    skyTop: 0x2a70c8, skyMid: 0x90c4ec, skyBottom: 0xf8e4b8, fog: 0xf0dcb0, fogNear: 112, fogFar: 528,
    hemiSky: 0xfffbf0, hemiGround: 0xa88850, hemi: 1.12, sun: 0xfff6dc, sunI: 2.51, accent: 0xd8b030, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff8d8,
  },
  // Rock Tunnel — lantern-lit mine, warm and dark
  tunnel: {
    skyTop: 0x0e0804, skyMid: 0x1e1208, skyBottom: 0x2e1a0a, fog: 0x24160a, fogNear: 26, fogFar: 170,
    hemiSky: 0xffc890, hemiGround: 0x3a2412, hemi: 1.0, sun: 0xffb060, sunI: 1.6, accent: 0xffa040, stars: 0, cloudSea: 0, cloudTint: 0x6a4a2a, openAir: false,
  },
  // Ancient Ruins — warm afternoon, slightly pink haze
  belt: {
    skyTop: 0x3e6ab4, skyMid: 0xb0c4dc, skyBottom: 0xf6d2b0, fog: 0xecccaa, fogNear: 112, fogFar: 516,
    hemiSky: 0xfff0e0, hemiGround: 0xb08a60, hemi: 1.06, sun: 0xffe8c8, sunI: 2.33, accent: 0xe0a050, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xffeccc,
  },
  // Sandstorm — orange whiteout, low visibility (readability keeps hazards outlined)
  storm: {
    skyTop: 0x8a5a2e, skyMid: 0xc0844a, skyBottom: 0xd8a064, fog: 0xc8904e, fogNear: 22, fogFar: 175,
    hemiSky: 0xffd8a0, hemiGround: 0x7a4a24, hemi: 1.2, sun: 0xffc880, sunI: 1.7, accent: 0xffb040, stars: 0, cloudSea: 0, cloudTint: 0xd8a064, openAir: true, glow: 0xffc070,
  },
  // Night Highway — moonlit blue desert, warm roadside lights
  space: {
    skyTop: 0x040818, skyMid: 0x0e1a3e, skyBottom: 0x2a3060, fog: 0x141c3a, fogNear: 60, fogFar: 360,
    hemiSky: 0x9ab0e8, hemiGround: 0x2a2440, hemi: 0.95, sun: 0xc8d8ff, sunI: 1.9, accent: 0xffb040, stars: 1, cloudSea: 0, cloudTint: 0x2a3a6a, openAir: true, glow: 0xdce6ff,
  },
  // Coastal Cliff — clear sea air
  ice: {
    skyTop: 0x2068c8, skyMid: 0x7ab8ec, skyBottom: 0xe0f0f4, fog: 0xc8dcea, fogNear: 125, fogFar: 564,
    hemiSky: 0xf4fbff, hemiGround: 0x6a7a68, hemi: 1.08, sun: 0xfff6e4, sunI: 2.33, accent: 0x3a9ad8, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff8e8,
  },
  // Red Rock Canyon — sunset between sandstone walls
  canyon: {
    skyTop: 0x2a2a5c, skyMid: 0xd86a3a, skyBottom: 0xffb468, fog: 0xc87a4a, fogNear: 70, fogFar: 360,
    hemiSky: 0xffc8a0, hemiGround: 0x6a2e18, hemi: 1.1, sun: 0xffa060, sunI: 2.3, accent: 0xff8a3a, stars: 0.1, cloudSea: 0, cloudTint: 0xffd0b0, openAir: true, glow: 0xff9a50,
  },
  // Badlands — dusk, burning flares
  volcano: {
    skyTop: 0x1a1430, skyMid: 0x7a3a3a, skyBottom: 0xe08048, fog: 0x7a4a3a, fogNear: 60, fogFar: 330,
    hemiSky: 0xe8b090, hemiGround: 0x3a2018, hemi: 1.0, sun: 0xff9050, sunI: 2.0, accent: 0xff7a2a, stars: 0.3, cloudSea: 0, cloudTint: 0xd09080, openAir: true, glow: 0xff8040,
  },
  // Gold Rush places
  desert: {
    skyTop: 0x3a62b0, skyMid: 0xe8b070, skyBottom: 0xffd890, fog: 0xf0c488, fogNear: 112, fogFar: 504,
    hemiSky: 0xffe8c0, hemiGround: 0xb07a40, hemi: 1.1, sun: 0xffd890, sunI: 2.42, accent: 0xffc848, stars: 0, cloudSea: 0, cloudTint: 0xfff0d8, openAir: true, glow: 0xffd070,
  },
  forest: {
    skyTop: 0x3a6ab8, skyMid: 0x9ec4e0, skyBottom: 0xe6ead0, fog: 0xb8c8b0, fogNear: 75, fogFar: 408,
    hemiSky: 0xf0f6e8, hemiGround: 0x4a5a30, hemi: 1.01, sun: 0xfff2d4, sunI: 2.14, accent: 0xd8a040, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff4d8,
  },
  country: {
    skyTop: 0x3a7ad0, skyMid: 0xa8d0f0, skyBottom: 0xf6eac8, fog: 0xe0dcc0, fogNear: 112, fogFar: 516,
    hemiSky: 0xffffff, hemiGround: 0x8a8a4a, hemi: 1.08, sun: 0xfff4d8, sunI: 2.33, accent: 0xe0a040, stars: 0, cloudSea: 0, cloudTint: 0xffffff, openAir: true, glow: 0xfff4d8,
  },
  sea: {
    skyTop: 0x2a3a7a, skyMid: 0xe08a5a, skyBottom: 0xffc890, fog: 0xd8a888, fogNear: 125, fogFar: 552,
    hemiSky: 0xffe0c8, hemiGround: 0x5a5a5a, hemi: 1.03, sun: 0xffb070, sunI: 2.23, accent: 0xff9a40, stars: 0, cloudSea: 0, cloudTint: 0xffe0d0, openAir: true, glow: 0xffa860,
  },
};

/**
 * Readability (unchanged hierarchy, see Readability.ts): daylight → calm road glow, deep red-orange
 * hazard outlines; night / mine / sandstorm → brighter markings and stronger outlines.
 */
const DAY: ReadabilityProfile = { roadGlow: 0.22, roadTone: 1, roadEnv: 0.08, rails: 0.4, edge: 0xb8301a, edgeOpacity: 0.9, hazardLift: 0.04, bloom: 0.16 };
export const READABILITY_W: Record<WorldId, ReadabilityProfile> = {
  city: DAY,
  cloud: DAY,
  mega: { ...DAY, roadTone: 0.96 },
  harbor: { ...DAY, roadTone: 0.95 },
  solar: { ...DAY, roadTone: 1.02 },
  tunnel: { roadGlow: 0.5, roadTone: 1.2, roadEnv: 0.06, rails: 0.6, edge: 0xffa030, edgeOpacity: 1, hazardLift: 0.3, bloom: 0.26 },
  belt: DAY,
  storm: { roadGlow: 0.42, roadTone: 1.1, roadEnv: 0.05, rails: 0.6, edge: 0xc8201a, edgeOpacity: 1, hazardLift: 0.2, bloom: 0.18 },
  space: { roadGlow: 0.62, roadTone: 1.15, roadEnv: 0.14, rails: 0.7, edge: 0xffa03a, edgeOpacity: 1, hazardLift: 0.3, bloom: 0.28 },
  ice: DAY,
  canyon: { ...DAY, roadGlow: 0.3, edge: 0xffd060, hazardLift: 0.1 },
  volcano: { roadGlow: 0.42, roadTone: 1.1, roadEnv: 0.1, rails: 0.6, edge: 0xffd060, edgeOpacity: 1, hazardLift: 0.22, bloom: 0.26 },
  desert: DAY,
  forest: DAY,
  country: DAY,
  sea: { ...DAY, roadGlow: 0.3, edge: 0xffd060, hazardLift: 0.1 },
};

/** road dressing per world (Track.setStyle) */
export interface RoadStyle {
  /** asphalt tint (multiplies the warm asphalt texture) */
  tone: number;
  /** guardrail + post colour */
  rail: number;
  /** concrete curb / deck edge colour */
  deck: number;
  /** pylons under the deck: none, stone piers (bridges), timber trestle */
  piers: 'none' | 'stone' | 'trestle';
  /** roadside poles: telephone poles; lamps = warm street lights (night) */
  poles: 'phone' | 'lamps' | 'none';
  /** roadside sign style */
  signs: 'route66' | 'billboard' | 'none';
  /** warm light pools on the asphalt (night / tunnel) */
  pools: number;
}
const R_DAY: RoadStyle = { tone: 0xffffff, rail: 0xb8b8b0, deck: 0xb8a888, piers: 'none', poles: 'phone', signs: 'route66', pools: 0 };
export const ROAD_STYLE: Record<WorldId, RoadStyle> = {
  city: R_DAY,
  cloud: { ...R_DAY, piers: 'stone', signs: 'none', deck: 0xa89070 },
  mega: { ...R_DAY, tone: 0xf4e8d8, poles: 'phone', signs: 'none', rail: 0x8a6a4a },
  harbor: { ...R_DAY, tone: 0xe8e4dc, signs: 'none' },
  solar: { ...R_DAY, signs: 'billboard' },
  tunnel: { ...R_DAY, tone: 0xe8dccc, rail: 0x8a6a4a, poles: 'none', signs: 'none', pools: 0.12 },
  belt: { ...R_DAY, signs: 'none', rail: 0xc8b090, deck: 0xc8b090 },
  storm: { ...R_DAY, tone: 0xf0dcc0, signs: 'route66' },
  space: { ...R_DAY, tone: 0xd8d8e8, poles: 'lamps', signs: 'billboard', pools: 0.1 },
  ice: { ...R_DAY, piers: 'stone', signs: 'none', deck: 0xa8a49a },
  canyon: { ...R_DAY, tone: 0xf4e0d0, signs: 'route66' },
  volcano: { ...R_DAY, tone: 0xe8d8d0, signs: 'none', poles: 'phone' },
  desert: { ...R_DAY, signs: 'billboard' },
  forest: { ...R_DAY, signs: 'none', rail: 0x8a6a4a },
  country: { ...R_DAY, signs: 'none', rail: 0x8a6a4a },
  sea: { ...R_DAY, piers: 'stone', signs: 'none' },
};

/**
 * v1.0.0 desert dust behind the tyres (Game.tyreSpray): speed where it starts (m/s), puffs per second
 * per tyre at full speed (× the preset's particle density), size, life, and the dust colour per place.
 */
export const DUST = {
  // v4.0.2 (owner, plan 1 + 2): thin streaks that only appear at speed (≈ 120 km/h and up) and thicken
  // towards top speed / Nitro; a short puff on lane changes and landings
  from: 33,
  rate: 9,
  size: 0.42,
  life: 0.5,
  /** streak length (m) at the start of the range and at top speed, width (m) */
  lenMin: 0.8,
  lenMax: 3.2,
  width: 0.34,
  landColor: 0xd8b88a,
  color: {
    city: 0xdcc090, cloud: 0xd0a078, mega: 0xd8b890, harbor: 0xc8b8a0, solar: 0xe0c898, tunnel: 0x8a6a4a,
    belt: 0xe0c8a0, storm: 0xe0b078, space: 0x8a88a8, ice: 0xc8c0b0, canyon: 0xd09070, volcano: 0xa88070,
    desert: 0xe8c890, forest: 0xb8a890, country: 0xd8c8a0, sea: 0xd8b8a0,
  } as Partial<Record<WorldId, number>>,
};
