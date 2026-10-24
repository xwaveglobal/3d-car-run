/**
 * v2.2 Missions = long career chains (separate from the 4 Daily challenges).
 * Each chain has tiers with growing coin rewards; finishing tiers raises the pilot level.
 * Three chains are "active" (the ones closest to their next tier). Pure logic, no DOM.
 */
import type { SaveData } from '../core/Save.ts';
import { CLASSES, playerRank } from './Rank.ts';

export interface CareerStats {
  km: number;
  coins: number;
  bonus: number;
  specials: number;
  bests: number;
  worlds: string[];
  gates: number;
  /** v1.0.8 lifetime counters (optional: older saves start them at 0) */
  near?: number;
  rings?: number;
  hearts?: number;
  hard?: number;
  powerups?: number;
  dodges?: number;
  grCoins?: number;
  clean?: number;
  /** longest single race, km */
  farKm?: number;
  /** tiers already paid per chain id */
  tier: Record<string, number>;
}

export const careerDefaults = (): CareerStats => ({ km: 0, coins: 0, bonus: 0, specials: 0, bests: 0, worlds: [], gates: 0, tier: {} });

export interface Chain {
  id: string;
  icon: string; // icon key (ui maps it)
  text: (t: number) => string;
  tiers: number[];
  rewards: number[];
  value: (s: SaveData) => number;
  /** v1.0.8: a Western name shown above the goal */
  title?: string;
}

const RANK_NAMES = ['D', 'C', 'B', 'A', 'AA', 'AAA'];
const c = (s: SaveData) => s.career ?? careerDefaults();
const k = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

const n = (v: number | undefined) => v ?? 0;

export const CHAINS: Chain[] = [
  { id: 'rank', title: 'Climb the Ranks', icon: 'rank', text: (t) => `Reach rank ${RANK_NAMES[t]}`, tiers: [1, 2, 3, 4, 5], rewards: [300, 500, 800, 1200, 2000], value: (s) => Math.min(5, CLASSES.indexOf(playerRank(s.expBest, s.exp2Best))) },
  { id: 'km', title: 'Long Trail', icon: 'flag', text: (t) => `Drive ${k(t)} km in total`, tiers: [50, 200, 1000, 5000], rewards: [200, 500, 1200, 3000], value: (s) => Math.floor(c(s).km) },
  { id: 'worlds', title: 'Frontier Explorer', icon: 'globe', text: (t) => `Visit ${t} Endless worlds`, tiers: [3, 6, 9, 12], rewards: [200, 400, 700, 1200], value: (s) => c(s).worlds.length },
  { id: 'gates', title: 'Gate Crasher', icon: 'gate', text: (t) => `Break through ${t} rank gates`, tiers: [1, 5, 15, 40], rewards: [200, 400, 900, 2000], value: (s) => c(s).gates },
  { id: 'bonus', title: 'Gold Fever', icon: 'gift', text: (t) => `Finish ${t} Gold Rush${t > 1 ? 'es' : ''}`, tiers: [1, 5, 20, 50], rewards: [200, 400, 900, 2000], value: (s) => c(s).bonus },
  { id: 'specials', title: 'Trick Rider', icon: 'rocket', text: (t) => `Use ${t} specials`, tiers: [3, 10, 50, 150], rewards: [150, 300, 800, 1800], value: (s) => c(s).specials },
  { id: 'coins', title: 'Prospector', icon: 'coin', text: (t) => `Collect ${k(t)} coins on the road`, tiers: [5000, 25000, 100000, 500000], rewards: [200, 600, 1500, 4000], value: (s) => c(s).coins },
  { id: 'cars', title: 'Stable Owner', icon: 'car', text: (t) => `Unlock ${t} cars`, tiers: [2, 3, 4, 6], rewards: [300, 600, 1000, 2000], value: (s) => s.unlocked.length },
  { id: 'bests', title: 'Personal Legend', icon: 'trophy', text: (t) => `Beat your best EXP ${t} times`, tiers: [3, 10, 25, 60], rewards: [200, 400, 800, 1600], value: (s) => c(s).bests },
  { id: 'races', title: 'Saddle Up', icon: 'play', text: (t) => `Play ${t} races`, tiers: [10, 50, 200, 1000], rewards: [100, 300, 800, 2000], value: (s) => s.totalRuns },
  // v1.0.8 (owner: "thêm nhiều mission hấp dẫn"): ten more chains on lifetime counters
  { id: 'near', title: 'Close Shave', icon: 'target', text: (t) => `Pull off ${k(t)} near misses`, tiers: [25, 100, 400, 1500], rewards: [150, 400, 900, 2200], value: (s) => n(c(s).near) },
  { id: 'rings', title: 'Lucky Horseshoe', icon: 'shoe', text: (t) => `Drive through ${k(t)} golden horseshoes`, tiers: [20, 100, 400, 1200], rewards: [150, 400, 900, 2000], value: (s) => n(c(s).rings) },
  { id: 'hearts', title: 'Doc’s Remedy', icon: 'heart', text: (t) => `Pick up ${t} hearts on the road`, tiers: [5, 25, 80, 250], rewards: [150, 350, 800, 1800], value: (s) => n(c(s).hearts) },
  { id: 'hard', title: 'Rough Rider', icon: 'flame', text: (t) => `Finish ${t} races on Hard`, tiers: [3, 15, 50, 150], rewards: [200, 500, 1100, 2500], value: (s) => n(c(s).hard) },
  { id: 'powerups', title: 'Supply Run', icon: 'bolt', text: (t) => `Grab ${k(t)} road power-ups`, tiers: [15, 60, 250, 800], rewards: [150, 350, 800, 1800], value: (s) => n(c(s).powerups) },
  { id: 'dodges', title: 'Tumbleweed Dancer', icon: 'shield', text: (t) => `Dodge ${k(t)} obstacles`, tiers: [200, 1000, 5000, 20000], rewards: [150, 400, 1000, 2500], value: (s) => n(c(s).dodges) },
  { id: 'far', title: 'Iron Horse', icon: 'flag', text: (t) => `Drive ${t} km in one race`, tiers: [3, 6, 10, 15, 25], rewards: [200, 400, 800, 1500, 3000], value: (s) => Math.floor(n(c(s).farKm)) },
  { id: 'grcoins', title: 'Mother Lode', icon: 'coin', text: (t) => `Grab ${k(t)} coins in Gold Rush runs`, tiers: [500, 3000, 15000, 60000], rewards: [200, 500, 1200, 3000], value: (s) => n(c(s).grCoins) },
  { id: 'clean', title: 'Not a Scratch', icon: 'trophy', text: (t) => `${t} race${t > 1 ? 's' : ''} of 500+ EXP without losing a heart`, tiers: [1, 5, 20, 60], rewards: [250, 500, 1100, 2400], value: (s) => n(c(s).clean) },
  { id: 'pilot', title: 'Sheriff of the Road', icon: 'rank', text: (t) => `Reach pilot level ${t}`, tiers: [10, 20, 35, 55], rewards: [400, 800, 1600, 3500], value: (s) => pilotLevel(s) },
];

export interface ChainView {
  id: string;
  title?: string;
  icon: string;
  text: string;
  value: number;
  target: number;
  reward: number;
  tier: number;
  tiers: number;
  /** all tiers done */
  maxed: boolean;
}

export function chainView(s: SaveData, ch: Chain): ChainView {
  const t = c(s).tier[ch.id] ?? 0;
  const maxed = t >= ch.tiers.length;
  const i = Math.min(t, ch.tiers.length - 1);
  return { id: ch.id, title: ch.title, icon: ch.icon, text: ch.text(ch.tiers[i]), value: Math.min(ch.value(s), ch.tiers[i]), target: ch.tiers[i], reward: ch.rewards[i], tier: t, tiers: ch.tiers.length, maxed };
}

/** pilot level = 1 + every tier finished */
export function pilotLevel(s: SaveData) {
  return 1 + Object.values(c(s).tier).reduce((a, b) => a + b, 0);
}

/** the 3 active chains: not maxed, closest to their next tier first */
export function activeChains(s: SaveData): ChainView[] {
  return CHAINS.map((ch) => chainView(s, ch))
    .filter((v) => !v.maxed)
    .sort((a, b) => b.value / b.target - a.value / a.target)
    .slice(0, 3);
}

/** finishes every reached tier (any chain, not just the active 3); returns what was completed */
export function settleCareer(s: SaveData): { text: string; reward: number }[] {
  s.career ??= careerDefaults();
  const out: { text: string; reward: number }[] = [];
  for (const ch of CHAINS) {
    for (let guard = 0; guard < 10; guard++) {
      const t = s.career.tier[ch.id] ?? 0;
      if (t >= ch.tiers.length || ch.value(s) < ch.tiers[t]) break;
      s.career.tier[ch.id] = t + 1;
      out.push({ text: ch.text(ch.tiers[t]), reward: ch.rewards[t] });
    }
  }
  return out;
}

/**
 * v1.0.8 (owner: "để trước khoảng 20 mission chưa mở khóa"): the missions waiting after the active three —
 * the next tier of every other chain, then the later tiers — shown locked (dimmed) to tease what comes next.
 */
export function upcomingMissions(s: SaveData, count = 20): { title: string; text: string; reward: number; icon: string }[] {
  const active = new Set(activeChains(s).map((v) => v.id));
  const out: { title: string; text: string; reward: number; icon: string; d: number }[] = [];
  for (const ch of CHAINS) {
    const t = c(s).tier[ch.id] ?? 0;
    for (let i = t + (active.has(ch.id) ? 1 : 0); i < ch.tiers.length; i++) {
      out.push({ title: ch.title ?? '', text: ch.text(ch.tiers[i]), reward: ch.rewards[i], icon: ch.icon, d: (i - t) * 10 + ch.rewards[i] / 1000 });
    }
  }
  return out.sort((a, b) => a.d - b.d).slice(0, count).map(({ d: _d, ...m }) => m);
}
