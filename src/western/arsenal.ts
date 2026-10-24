/**
 * v1.0.8 "Outlaw Arsenal" (owner: "vũ khí đặc biệt thêm 20 cái … unlock theo tiền cao … nâng giá dần … để hơi mờ"):
 * 20 upgraded specials. Each one fires like one of the three basic specials (Canyon Launcher, Eagle Jump, Last
 * Stand — same flight, same fairness) and adds perks on use: a coin magnet, a Sheriff Guard, bonus coins, extra
 * safe time after landing, or a second use in the same race. Pure data (no DOM, no Three.js).
 *
 * Unlock once with coins (prices climb from 5,000 to 125,000), then buy charges (one charge = one race).
 * Locked ones are shown dimmed with their unlock price. Training only covers the three basic specials.
 */
import type { SpecialKey } from '../meta/Daily.ts';

export interface ArsenalPerks {
  /** coin magnet for N seconds after the special fires */
  magnet?: number;
  /** a Sheriff Guard that blocks N hits, given when the special fires */
  shield?: number;
  /** coins paid when the special fires */
  coins?: number;
  /** extra seconds of safety after landing */
  safe?: number;
  /** uses in one race (default 1) */
  charges?: number;
}

export interface ArsenalItem {
  /** stored id ('x:' + key) */
  id: string;
  name: string;
  /** which basic special it fires as */
  base: SpecialKey;
  /** one-time unlock price (coins) */
  unlock: number;
  /** price of one charge (coins) */
  price: number;
  perks: ArsenalPerks;
  /** tint of the tile (CSS colour) */
  tint: string;
}

const A = (key: string, name: string, base: SpecialKey, unlock: number, price: number, perks: ArsenalPerks, tint: string): ArsenalItem => ({ id: `x:${key}`, name, base, unlock, price, perks, tint });

export const ARSENAL: ArsenalItem[] = [
  A('dusty', 'Dusty Launcher', 'super', 5000, 2200, { magnet: 4 }, '#c8924a'),
  A('bronco', 'Bronco Buck', 'escape', 6000, 1600, { coins: 150 }, '#b8603a'),
  A('silverspur', 'Silver Spur', 'super', 7500, 2500, { coins: 200 }, '#b8c4cc'),
  A('sheriffleap', 'Sheriff’s Leap', 'super', 9000, 2800, { shield: 1 }, '#48c8d0'),
  A('tumbleweed', 'Tumbleweed Escape', 'escape', 11000, 2000, { magnet: 6 }, '#c8a060'),
  A('hawk', 'Hawk Dive', 'hyper', 13000, 4600, { magnet: 5 }, '#d8a040'),
  A('golddigger', 'Gold Digger', 'super', 15000, 3200, { coins: 400 }, '#f0c050'),
  A('stagecoach', 'Stagecoach Rescue', 'escape', 18000, 2600, { shield: 1 }, '#8a6a40'),
  A('thunderbird', 'Thunderbird', 'hyper', 21000, 5000, { safe: 2 }, '#6aa8d8'),
  A('twinbarrel', 'Twin Barrels', 'super', 25000, 4200, { charges: 2 }, '#a85a30'),
  A('prairiefire', 'Prairie Fire', 'hyper', 29000, 5400, { coins: 500 }, '#e0602a'),
  A('ironmustang', 'Iron Mustang', 'escape', 34000, 3200, { shield: 2 }, '#8a949c'),
  A('eaglewing', 'Desert Eagle Wing', 'hyper', 40000, 6200, { magnet: 8, coins: 300 }, '#e0b050'),
  A('marshal', 'Marshal’s Badge', 'super', 47000, 5000, { shield: 1, magnet: 6 }, '#d8d0b0'),
  A('comanchemoon', 'Comanche Moon', 'escape', 55000, 4000, { charges: 2 }, '#9a8ad0'),
  A('goldensaddle', 'Golden Saddle', 'super', 64000, 5800, { coins: 800 }, '#ffd060'),
  A('stormrider', 'Storm Rider', 'hyper', 75000, 7200, { safe: 3, shield: 1 }, '#5a8ab8'),
  A('bountyhunter', 'Bounty Hunter', 'hyper', 88000, 8000, { coins: 1000, magnet: 6 }, '#c87a3a'),
  A('phoenix', 'Phoenix Stand', 'escape', 105000, 5600, { shield: 2, coins: 600 }, '#ff7a3a'),
  A('legend', 'Legend of the West', 'hyper', 125000, 10000, { charges: 2, shield: 1, magnet: 8 }, '#ffe08a'),
];

export const arsenalById = (id: string | null | undefined) => (id ? ARSENAL.find((a) => a.id === id) ?? null : null);
export const isArsenalId = (id: string | null | undefined): id is string => !!id && id.startsWith('x:');

/** one short line of what an arsenal special adds (English; i18n falls back to it) */
export function perkLine(p: ArsenalPerks) {
  const out: string[] = [];
  if (p.charges && p.charges > 1) out.push(`${p.charges} uses per race`);
  if (p.shield) out.push(p.shield > 1 ? `Sheriff Guard ×${p.shield}` : 'Sheriff Guard');
  if (p.magnet) out.push(`magnet ${p.magnet}s`);
  if (p.coins) out.push(`+${p.coins} coins`);
  if (p.safe) out.push(`+${p.safe}s safe`);
  return out.join(' · ');
}
