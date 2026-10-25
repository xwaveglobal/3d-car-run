// 3D Car Run server — pure rules (no I/O). Imported by server/index.mjs and by tests/server.test.ts.
//
// The server is the authority for EXP and rank: a client can only claim EXP through POST /runs, and the
// server re-computes it from the distance with the same rates as src/config.ts (EXP.rate, VARIANTS.rateMul).
// tests/server.test.ts fails if these numbers drift from the game's.

/** EXP per metre — must equal EXP.rate in src/config.ts */
export const EXP_RATE = { easy: 0.184, normal: 0.19, hard: 0.318 };
/** road multipliers — must equal VARIANTS[*].rateMul in src/gameplay/Difficulty.ts */
export const RATE_MUL = { endless: 1, track2: 1.25 };
/** Double EXP pickups can add up to this share on top of distance × rate */
export const EXP_SLACK = 1.35;
/** fastest possible average speed (m/s): top speed × Hard × turbo × top rank phase, with margin */
export const MAX_SPEED = 130;
/** rank thresholds — must equal EXP.rank in src/config.ts */
export const RANKS = { D: 0, C: 3000, B: 8000, A: 15000, AA: 26000, AAA: 40000, S: 65000, SS: 85000, SSS: 110000 };

/**
 * Board position (v4.0.2): the average EXP of a pilot's last RANK_WINDOW verified races — it goes up AND
 * down. Must equal RANK_WINDOW / rankScore / pushRecent in src/meta/Rank.ts (tests/server.test.ts).
 * The Class (rankOf) still comes from the best run and never drops.
 */
export const RANK_WINDOW = 5;
export function rankScore(recent) {
  const l = (Array.isArray(recent) ? recent : []).slice(-RANK_WINDOW);
  if (!l.length) return 0;
  return Math.floor(l.reduce((a, b) => a + Math.max(0, Number(b) || 0), 0) / l.length);
}
export function pushRecent(recent, exp) {
  return [...(Array.isArray(recent) ? recent : []), Math.max(0, Math.floor(Number(exp) || 0))].slice(-RANK_WINDOW);
}

export function rankOf(expBest, exp2Best = 0) {
  let r = 'D';
  for (const [k, v] of Object.entries(RANKS)) {
    const pool = ['S', 'SS', 'SSS'].includes(k) ? exp2Best : expBest;
    if (pool >= v) r = k;
  }
  return r;
}

/**
 * Check a finished run and return the EXP the server accepts (0 = rejected).
 * @param {{ variant: string, level: string, distance: number, seconds: number, exp: number }} r
 */
export function verifyRun(r) {
  if (!r || typeof r !== 'object') return { ok: false, exp: 0, why: 'bad run' };
  const rate = EXP_RATE[r.level];
  const mul = RATE_MUL[r.variant];
  const distance = Number(r.distance);
  const seconds = Number(r.seconds);
  const exp = Number(r.exp);
  if (!rate || !mul) return { ok: false, exp: 0, why: 'bad level / road' };
  if (![distance, seconds, exp].every(Number.isFinite) || distance < 0 || seconds <= 0 || exp < 0) return { ok: false, exp: 0, why: 'bad numbers' };
  if (distance > seconds * MAX_SPEED) return { ok: false, exp: 0, why: 'too fast' };
  const base = Math.floor(distance * rate * mul);
  const max = Math.floor(base * EXP_SLACK);
  // accept the client's number when it is plausible, never more than the ceiling
  return { ok: true, exp: Math.max(0, Math.min(Math.floor(exp), max)), base };
}

/**
 * A save sent by a client: progress the server owns (EXP bests) is clamped to the verified values,
 * so editing the save never buys a rank.
 */
export function clampSave(save, verified) {
  if (!save || typeof save !== 'object') return null;
  const s = { ...save };
  s.expBest = Math.min(Number(s.expBest) || 0, verified.expBest);
  s.exp2Best = Math.min(Number(s.exp2Best) || 0, verified.exp2Best);
  s.expWeek = Math.min(Number(s.expWeek) || 0, Math.max(verified.expWeek ?? 0, verified.expBest));
  // the board's recent-race lists are the server's own (never the client's)
  if (Array.isArray(verified.recent)) s.expRecent = verified.recent.slice(-RANK_WINDOW);
  if (Array.isArray(verified.recentWeek)) s.expRecentWeek = verified.recentWeek.slice(-RANK_WINDOW);
  return s;
}

/** short summary shown in the "which progress do you keep?" chooser */
export function summary(save) {
  if (!save) return null;
  return {
    rank: rankOf(Number(save.expBest) || 0, Number(save.exp2Best) || 0),
    exp: Math.max(Number(save.expBest) || 0, Number(save.exp2Best) || 0),
    coins: Number(save.wallet) || 0,
    races: Number(save.totalRuns) || 0,
    name: String(save.name ?? ''),
  };
}

export const normEmail = (e) => String(e ?? '').trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
