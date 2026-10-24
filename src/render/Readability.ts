import type { WorldId } from '../gameplay/Spawner.ts';
import { READABILITY_W } from './western/looks.ts';

/**
 * VISUAL READABILITY SYSTEM — one profile per world.
 *
 * Hierarchy (most → least prominent):
 *   1 obstacles & threats  (red/orange hazard outlines, never dimmed)
 *   2 safe lanes           (green arrows / cyan cues on the road)
 *   3 player vehicle
 *   4 collectibles         (gold)
 *   5 decorations          (lane glow, rails, holograms — toned down where they compete)
 *   6 background           (sky, fog, buildings)
 *
 * Colour language: red/orange = danger · yellow = warning · cyan/blue = navigation ·
 * green = safe opening · gold = collectible · purple = special mechanic.
 */
export interface ReadabilityProfile {
  /** road lane-marking glow (emissive) */
  roadGlow: number;
  /** road base brightness (1 = texture as-is) */
  roadTone: number;
  /** road reflectiveness (neon reflections) */
  roadEnv: number;
  /** side rail / ring glow multiplier */
  rails: number;
  /** obstacle hazard outline colour + opacity */
  edge: number;
  edgeOpacity: number;
  /** extra emissive lift on dark obstacle metal so it separates from a dark road */
  hazardLift: number;
  /** base bloom strength (before the comfort factor) */
  bloom: number;
}

/** v1.0.0 (3D Car Run): Western daylight / dusk / night / mine profiles — src/render/western/looks.ts */
export const READABILITY: Record<WorldId, ReadabilityProfile> = READABILITY_W;

/** Eye-comfort preset (Settings → Comfort visuals, on by default). */
export const COMFORT = {
  bloomMul: 0.55,
  turboBloom: 0.06,
  flashOpacity: 0.3,
  pulse: 0.35,
};
