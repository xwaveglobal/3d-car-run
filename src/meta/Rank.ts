/**
 * v2 RANKS (docs/GAME-DESIGN.md §1)
 *
 * EXP measures skill: run EXP = distance × speed-level rate, and the player's EXP is their BEST
 * run (never summed, never bought). Ranks D → C → B → A → AA → AAA are EXP thresholds (config EXP.rank).
 */
import { EXP, type SpeedLevel } from '../config.ts';

/** D → AAA on Endless; S / SS / SSS only on Track 2 (unlocks at AAA) */
export const CLASSES = ['D', 'C', 'B', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'] as const;
export type RankClass = (typeof CLASSES)[number];
/** the Endless ladder (and cup divisions while cups still exist) */
export const BASE_CLASSES = ['D', 'C', 'B', 'A', 'AA', 'AAA'] as const;
export type BaseClass = (typeof BASE_CLASSES)[number];
export const toBase = (c: RankClass): BaseClass => (CLASSES.indexOf(c) > 5 ? 'AAA' : (c as BaseClass));
export const rankIdx = (c: RankClass) => CLASSES.indexOf(c);
export const rankAtLeast = (c: RankClass, need: RankClass) => rankIdx(c) >= rankIdx(need);

/**
 * v4.0.2 (owner): the leaderboard position moves up AND down. A pilot's rank score is the average EXP of
 * their last RANK_WINDOW EXP races (bots are scored the same way); the Class (D … SSS) still comes from the
 * best run and never drops. Same rule on the server (server/core.mjs rankScore).
 */
export const RANK_WINDOW = 5;
export function rankScore(recent: readonly number[] | undefined) {
  const l = (recent ?? []).slice(-RANK_WINDOW);
  if (!l.length) return 0;
  return Math.floor(l.reduce((a, b) => a + Math.max(0, b), 0) / l.length);
}
/** the list after one more EXP race (keeps the last RANK_WINDOW) */
export function pushRecent(recent: readonly number[] | undefined, exp: number) {
  return [...(recent ?? []), Math.max(0, Math.floor(exp))].slice(-RANK_WINDOW);
}

/** EXP needed to reach each rank */
export const CLASS_MIN: Record<RankClass, number> = EXP.rank;
export const CLASS_COLOR: Record<RankClass, string> = { D: '#9fb3dd', C: '#2fd36b', B: '#4fc3ff', A: '#9b6bff', AA: '#ffc21a', AAA: '#ff4fd8', S: '#ff7a2e', SS: '#ff3b5c', SSS: '#ffe9a8' };

/**
 * The player's rank: Endless counts up to AAA, S tiers come only from Track 2.
 * @param expBest best run on any track · @param exp2Best best run on Track 2
 */
export function playerRank(expBest: number, exp2Best = 0): RankClass {
  const a = Math.min(rankIdx(classFor(expBest)), 5);
  const b = rankIdx(classFor(exp2Best));
  return CLASSES[Math.max(a, b)];
}

/** non-stop minutes to reach a rank at a speed level (design target) */
export const rankMinutes = (c: RankClass, level: SpeedLevel) => EXP.hardMinutes[c] * EXP.timeMul[level];

export function classFor(bolts: number): RankClass {
  let c: RankClass = 'D';
  for (const k of CLASSES) if (bolts >= CLASS_MIN[k]) c = k;
  return c;
}

export function classProgress(bolts: number, rank?: RankClass) {
  const c = rank ?? classFor(bolts);
  const i = CLASSES.indexOf(c);
  const next = CLASSES[i + 1] ?? null;
  const from = CLASS_MIN[c];
  const to = next ? CLASS_MIN[next] : from;
  return { cls: c, next, k: next ? (bolts - from) / (to - from) : 1, need: next ? to - bolts : 0 };
}

/** rivals on the sample boards: rank straight from their EXP */
export const classForScore = (exp: number) => classFor(exp);

/** the EXP badge: a small pill that literally reads "EXP" (owner: the shield icon was unclear) */
// v1.0.5: a brass plate (was cyan → purple) to match the Western wood / bronze UI
export const XPT = `<svg viewBox="0 0 36 20" class="xpt" aria-label="EXP"><rect x="1" y="1" width="34" height="18" rx="5" fill="#d99a3c" stroke="#3a1a06" stroke-width="1.4"/><path d="M2.4 9.5V6a3.6 3.6 0 0 1 3.6-3.6h24a3.6 3.6 0 0 1 3.6 3.6v3.5z" fill="#ffe3a0" opacity=".75"/><path d="M2.4 13.5h31.2V14a3.6 3.6 0 0 1-3.6 3.6H6A3.6 3.6 0 0 1 2.4 14z" fill="#a8641c" opacity=".7"/><text x="18" y="14.4" text-anchor="middle" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="12" fill="#3a1a04" letter-spacing=".3">EXP</text></svg>`;

/** small class badge (hex plate with the letters) */
export function classBadge(c: RankClass, size = 'sm') {
  return `<span class="clsb ${size}" style="--cc:${CLASS_COLOR[c]}">${c}</span>`;
}
