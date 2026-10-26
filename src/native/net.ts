/**
 * v4.0.2 (owner: "a weak network must show a small running loading icon — everything else keeps working"):
 * every call that waits on the network (ads, share, TikTok missions, sign-in) is tracked here; the canvas UI
 * draws a small spinning badge while one of them has been waiting a moment. Nothing ever waits on it.
 */
interface Wait {
  showAt: number;
  until: number;
  why: string;
}
const pending = new Map<number, Wait>();
let next = 0;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** track a network promise; the badge shows after `showAfter` ms (never longer than `maxMs`) */
export function netTrack<T>(p: Promise<T>, why: string, showAfter = 450, maxMs = 30000): Promise<T> {
  const k = ++next;
  const t = now();
  pending.set(k, { showAt: t + showAfter, until: t + maxMs, why });
  const done = () => pending.delete(k);
  p.then(done, done);
  return p;
}

/** what the badge should say (null = nothing waiting long enough) */
export function netWaiting(): string | null {
  const t = now();
  for (const [k, w] of pending) {
    if (t > w.until) {
      pending.delete(k);
      continue;
    }
    if (t >= w.showAt) return w.why;
  }
  return null;
}
