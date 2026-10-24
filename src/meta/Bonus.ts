/**
 * v2 BONUS events (docs/GAME-DESIGN.md §5) — replace the old cups.
 *
 * v4.6 (owner): every hour (local time: 00:00, 01:00, …) a Bonus road opens for 30 minutes and can be
 * played up to 3 times. Each event is a Gold Rush place (Gold Canyon → Pine Ridge → Prairie Ranch → Sunset
 * Coast, rotating). v1.0.0 (3D Car Run): GOLD RUSH — every run lasts exactly 3 minutes of active gameplay
 * (src/meta/GoldRush.ts), coins only, completion reward paid once. Special items lie on the road and
 * fire by themselves when picked up. Pure logic — no DOM.
 */
import type { BonusWorld } from '../gameplay/Spawner.ts';

export const BONUS = {
  everyHours: 1,
  openMinutes: 30,
  /** plays per event (v4.6) */
  maxPlays: 3,
  /** v1.0.0 Gold Rush: a run lasts 3 minutes of ACTIVE gameplay (the timer, src/meta/GoldRush.ts) */
  raceMinutes: 3,
  /** coins for reaching the finish line (× speed-level coin multiplier) */
  finishCoins: 300,
  themes: ['desert', 'forest', 'country', 'sea'] as BonusWorld[],
};

export const BONUS_NAME: Record<BonusWorld, string> = {
  desert: 'Gold Canyon',
  forest: 'Pine Ridge',
  country: 'Prairie Ranch',
  sea: 'Sunset Coast',
};

/** section names along each Bonus road (one per ~5 minutes) */
export const BONUS_SECTIONS: Record<BonusWorld, string[]> = {
  desert: ['Prospector Gate', 'Cactus Flats', 'Red Mesas', 'Mirage Mile', 'Nugget Run', 'Sunset Straight'],
  forest: ['Timber Gate', 'Fern Valley', 'Old Bridge', 'Misty Hills', 'Ranger Pass', 'Lakeside'],
  country: ['Ranch Gate', 'Wheat Fields', 'Windmill Row', 'Hay Bales', 'Barn Bend', 'Cattle Lane'],
  sea: ['Cove Gate', 'Palm Bluffs', 'Smuggler Bay', 'Lighthouse Point', 'Sea Arches', 'Sunset Pier'],
};

export interface BonusSlot {
  theme: BonusWorld;
  start: number;
  end: number;
  key: string;
}

/** the slot that contains `now` (open for its first BONUS.openMinutes) */
function slotAt(now: number): BonusSlot {
  const d = new Date(now);
  const h = d.getHours();
  const startH = h - (h % BONUS.everyHours);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startH, 0, 0, 0).getTime();
  // rotate the theme across days too (the same hour shows a different place tomorrow)
  const dayIdx = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  const idx = dayIdx * (24 / BONUS.everyHours) + startH / BONUS.everyHours;
  const theme = BONUS.themes[((idx % BONUS.themes.length) + BONUS.themes.length) % BONUS.themes.length];
  return { theme, start, end: start + BONUS.openMinutes * 60000, key: `${start}` };
}

/** live event (null when closed) + the next one */
export function bonusState(now = Date.now()) {
  const cur = slotAt(now);
  const live = now < cur.end ? cur : null;
  const next = live ? slotAt(cur.start + BONUS.everyHours * 3600000) : slotAt(cur.start + BONUS.everyHours * 3600000);
  return { live, next };
}

/** plays already used in this event (save.bonusPlays = { key, n }) */
export const bonusPlaysUsed = (rec: { key: string; n: number } | undefined, key: string) => (rec && rec.key === key ? rec.n : 0);

