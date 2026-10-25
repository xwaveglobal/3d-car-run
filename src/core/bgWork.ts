/**
 * v4.0.2 (owner: "the first taps on Home still stutter"): ONE queue for every piece of background work the
 * game does after start-up — the road tile, the sound bank, the music loops, the reverb tail.
 *
 * Before, each of those ran on its own timers, so on a phone without a JIT they stacked into 50–130 ms frames
 * right when the player started tapping. Now:
 *  - only one job runs at a time, a few ms per tick, then the frame gets a rest;
 *  - nothing runs for a moment after a touch, a screen change or a race start (`bgPause`);
 *  - a job is a step function: it does a small slice and returns true when it is finished.
 * Pure timing logic, no DOM / Three.js.
 */
/** true = finished, false = call again, a number = not ready: try again after that many ms */
export type BgStep = () => boolean | number;

interface Job {
  name: string;
  step: BgStep;
  /** not before this time (performance.now ms) */
  at: number;
  /** lower = sooner */
  prio: number;
}

const queue: Job[] = [];
let pausedUntil = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
/** ms of work per tick and the rest between ticks (set by the platform: phones get small slices) */
let budget = 6;
let rest = 4;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function bgConfig(o: { budget?: number; rest?: number }) {
  if (o.budget) budget = o.budget;
  if (o.rest !== undefined) rest = o.rest;
}

/** queue a job (runs after `delay` ms, in priority order) */
export function bgAdd(name: string, step: BgStep, o: { delay?: number; prio?: number } = {}) {
  queue.push({ name, step, at: now() + (o.delay ?? 0), prio: o.prio ?? 5 });
  queue.sort((a, b) => a.prio - b.prio || a.at - b.at);
  kick(0);
}

/** hold all background work for `ms` (a touch, a screen change, a race start) */
export function bgPause(ms: number) {
  pausedUntil = Math.max(pausedUntil, now() + ms);
}

/** jobs still waiting (diagnostics) */
export function bgPending() {
  return queue.map((j) => j.name);
}

function kick(ms: number) {
  if (timer !== null) return;
  timer = setTimeout(tick, Math.max(0, ms));
}

function tick() {
  timer = null;
  if (!queue.length) return;
  const t = now();
  if (t < pausedUntil) return kick(pausedUntil - t + 4);
  const t0 = t;
  let n = 0;
  // (a step cap too: a clock that does not move — some runtimes — can never spin this loop forever)
  while (queue.length && n++ < 64) {
    const ready = queue.findIndex((j) => j.at <= now());
    if (ready < 0) break;
    const j = queue[ready];
    let done: boolean | number = true;
    try {
      done = j.step();
    } catch (e) {
      console.warn(`[bg] ${j.name}`, e);
    }
    if (typeof done === 'number') {
      j.at = now() + done;
      queue.sort((a, b) => a.prio - b.prio || a.at - b.at);
    } else if (done) queue.splice(queue.indexOf(j), 1);
    if (now() - t0 >= budget) break;
  }
  if (!queue.length) return;
  const next = Math.min(...queue.map((j) => j.at)) - now();
  kick(Math.max(rest, next));
}
