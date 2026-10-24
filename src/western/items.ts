/**
 * 3D Car Run v1.0.0 — Western identity of every existing item and special.
 *
 * Names, one-liners and how-to texts only: the mechanics, durations, cooldowns, prices and spawn
 * weights stay exactly as they were (src/config.ts, src/gameplay/Run.ts, src/meta/Daily.ts).
 * Every proposed name of the master prompt is mapped to an EXISTING ability — nothing new was added:
 *
 *   existing (id)              → 3D Car Run name       master-prompt identity
 *   shield                     → Sheriff Guard          "Shield → Sheriff Guard"
 *   magnet                     → Gold Magnet            "Magnet → Gold Magnet"
 *   turbo (smashes obstacles)  → Dust Storm Nitro       "Nitro → Dust Storm Nitro" + Bull Rush smash look
 *   dash (Air Dash)            → Canyon Dash            "Air Dash → Canyon Dash / Canyon Air Dash"
 *   ring pass = coins ×2 (8 s) → Gold Fever             "Double Coins → Gold Fever"
 *   ghost (Gold Rush showcase) → Ghost Rider            "Temporary Protection → Ghost Rider"
 *   super (Roadster Jump)      → Canyon Launcher        "Jump Booster → Canyon Launcher"
 *   hyper (HYPER JUMP)         → Eagle Jump             (the bigger launcher; no prompt name)
 *   mystery (box)              → Outlaw Treasure        "Coin Chest → Outlaw Treasure"
 *   escape (SOS)               → Last Stand             "Emergency Rescue → Last Stand" + Sandstorm Escape VFX
 *   last-chance auto special   → LAST STAND RESCUE      "Last Stand Rescue — emergency survival activation"
 *   double (EXP ×2)            → Double Bounty          (not in the prompt table: EXP, not coins)
 *   life                       → Extra Life
 *   wall / rail / tunnel       → Canyon Wall Ride / Rail Rider / Mine Runner (Gold Rush showcases)
 */
export type ItemId = 'shield' | 'magnet' | 'turbo' | 'double' | 'life' | 'super' | 'dash' | 'escape' | 'hyper' | 'ghost' | 'wall' | 'rail' | 'tunnel' | 'mystery';

/** big pickup title (HUD) */
export const ITEM_LABEL: Record<ItemId, string> = {
  shield: 'SHERIFF GUARD',
  magnet: 'GOLD MAGNET',
  turbo: 'DUST STORM NITRO',
  double: 'DOUBLE BOUNTY',
  life: 'EXTRA LIFE',
  super: 'CANYON LAUNCHER',
  dash: 'CANYON DASH',
  escape: 'LAST STAND',
  hyper: 'EAGLE JUMP',
  ghost: 'GHOST RIDER',
  wall: 'CANYON WALL RIDE',
  rail: 'RAIL RIDER',
  tunnel: 'MINE RUNNER',
  mystery: 'OUTLAW TREASURE',
};

/** pickup sub-line */
export const ITEM_SUB: Record<ItemId, string> = {
  shield: '',
  magnet: 'gold flies to you',
  turbo: 'bull-rush through obstacles',
  double: 'EXP ×2 for a while',
  life: '+1 heart',
  super: 'tap LAUNCHER to jump',
  dash: 'leap across 2 lanes',
  escape: 'tap RESCUE to escape',
  hyper: 'fires by itself',
  ghost: 'ride through everything · AAA special',
  wall: 'ride the canyon wall · AAA special',
  rail: 'ride the rail · AAA special',
  tunnel: 'run the mine roof · AAA special',
  mystery: 'a random reward',
};

/** Saddle Bag / shop item names (title case) */
export const ITEM_NAME_W = {
  super: 'Canyon Launcher',
  hyper: 'Eagle Jump',
  shield: 'Sheriff Guard',
  escape: 'Last Stand',
  turbo: 'Dust Storm Nitro',
  magnet: 'Gold Magnet',
  double: 'Double Bounty',
  life: 'Extra Life',
} as const;

/** the three carried specials (HUD button labels, short names, one-liners, how-to) */
export const SPECIAL_SHORT_W = { escape: 'Last Stand', super: 'Launcher', hyper: 'Eagle' } as const;
export const SPECIAL_LINE_W = { escape: 'Escape just before a crash', super: 'Jump a whole block', hyper: 'Soar over a long stretch' } as const;
export const SPECIAL_HOW_W = {
  escape: 'Tap RESCUE just before a crash: a dust vortex lifts you out, you glide down safely.',
  super: 'Tap LAUNCHER: jump over a whole block of obstacles.',
  hyper: 'Tap EAGLE: soar high over a long stretch.',
} as const;
/** HUD button captions */
export const HUD_LAUNCH = 'LAUNCHER';
export const HUD_EAGLE = 'EAGLE';
export const HUD_RESCUE = 'RESCUE';
/** Gold Fever: the horseshoe hoop doubles coins for 8 s */
export const GOLD_FEVER = 'GOLD FEVER';
