/**
 * 3D Car Run v1.0.0 — GOLD RUSH · 3 MIN BONUS RUN (the redesigned Bonus mode). Pure logic, no DOM —
 * tests/goldrush.test.ts runs it in Node.
 *
 * - One Gold Rush run = exactly 180 s of ACTIVE gameplay (driving or respawning). The timer starts when
 *   the race actually starts (after the countdown), freezes while paused, during an ad, a crash
 *   animation or the revive offer, and resumes only with the game.
 * - It advances by the frame's real elapsed time, clamped to 1/20 s per frame: a frozen / backgrounded
 *   tab (the game auto-pauses on hide) or a long stall never skips time, slow motion and boosters never
 *   stretch or shorten it, and it never reads the device clock (changing the clock changes nothing).
 *   A refresh mid-run ends that run without a payout (the play was already counted at its start).
 * - Coins are collected during the run; the completion reward is paid ONCE per run id (a ledger in the
 *   save), so restart / refresh / repeated taps can never pay twice.
 * - A crash keeps the existing rules (hearts, revive offer, last-chance special); a run that ends
 *   before 180 s pays the coins collected (+ the speed bonus) but never the completion reward.
 * - Entry availability is unchanged (src/meta/Bonus.ts: hourly, open 30 min, 3 plays per event).
 */
export const GOLD_RUSH = {
  /** active seconds per run (fixed — no booster or reward changes it) */
  seconds: 180,
  /** warning banner when this many seconds are left */
  warnAt: 30,
  /** big countdown for the last seconds */
  countdownFrom: 10,
  /** per-frame cap (s): a stall or a background tab never skips time */
  maxDt: 1 / 20,
  /** the road is built longer than 180 s at full speed with Nitro all the way (never reached) */
  roadMargin: 1.65,
  /** coins for completing the 3 minutes (× speed-level coin multiplier), as before */
  finishCoins: 300,
};

export type GoldRushEvent = { k: 'warn'; left: number } | { k: 'count'; n: number } | { k: 'end' };

export class GoldRushTimer {
  /** active seconds so far */
  active = 0;
  done = false;
  private warned = false;
  private lastCount = Infinity;

  get left() {
    return Math.max(0, GOLD_RUSH.seconds - this.active);
  }

  /**
   * One frame. `rawDt` = real elapsed seconds of this frame (unscaled), `activeState` = the race is in
   * an active state (run / respawn). Returns what happened this frame (warning, countdown tick, end).
   */
  step(rawDt: number, activeState: boolean): GoldRushEvent[] {
    const ev: GoldRushEvent[] = [];
    if (this.done || !activeState) return ev;
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, GOLD_RUSH.maxDt) : 0;
    this.active = Math.min(GOLD_RUSH.seconds, this.active + dt);
    const left = this.left;
    if (!this.warned && left <= GOLD_RUSH.warnAt) {
      this.warned = true;
      ev.push({ k: 'warn', left: Math.ceil(left) });
    }
    if (left <= GOLD_RUSH.countdownFrom && left > 0) {
      const n = Math.ceil(left);
      if (n < this.lastCount) {
        this.lastCount = n;
        ev.push({ k: 'count', n });
      }
    }
    if (left <= 0) {
      this.done = true;
      ev.push({ k: 'end' });
    }
    return ev;
  }
}

/** "2:35" */
export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Road length for a Gold Rush run: the distance of 180 s at the road speed of each point, times a
 * margin for Nitro (×1.55) — the finish is the TIMER, the road just never runs out.
 * `speedAt(d)` = road speed (m/s) at distance d (Spawner.speed).
 */
export function goldRushRoadLength(speedAt: (d: number) => number) {
  let d = 0;
  for (let t = 0; t < GOLD_RUSH.seconds; t += 0.1) d += speedAt(d) * 0.1;
  return { expected: Math.round(d / 100) * 100, length: Math.round((d * GOLD_RUSH.roadMargin) / 100) * 100 + 500 };
}

/** what a run pays: coins + the speed-level bonus on them, + the completion reward only when completed */
export function goldRushPayout(coins: number, levelReward: number, completed: boolean) {
  const speedBonus = Math.round(coins * (levelReward - 1));
  const finish = completed ? Math.round((GOLD_RUSH.finishCoins * levelReward) / 10) * 10 : 0;
  return { coins, speedBonus, finish, total: coins + speedBonus + finish };
}

/**
 * Credit a run's payout exactly once. `ledger` (persisted in the save) remembers the last run ids that
 * were paid; returns false (and pays nothing) when this run id was already paid.
 */
export function creditOnce(ledger: string[], runId: string, keep = 24): boolean {
  if (ledger.includes(runId)) return false;
  ledger.push(runId);
  while (ledger.length > keep) ledger.shift();
  return true;
}
