/**
 * v4.0.1 boot timeline (owner: "khi mới vào iphone, game bị dừng khá lâu"): a few console lines with the
 * time of each boot phase and every long frame in the first 20 s, so a phone's debug log shows where the
 * first load spends its time. Cheap: a handful of lines once per launch.
 */
let last = 0;
export function bootMark(name: string) {
  const now = performance.now();
  console.log(`[boot] ${name} @${Math.round(now)}ms (+${Math.round(now - last)})`);
  last = now;
}
let frames = 0;
let t0 = 0;
/** call once per frame with the frame time (ms) and the current state */
export function bootFrame(ms: number, state: string) {
  const now = performance.now();
  if (!t0) t0 = now;
  frames++;
  if (now - t0 > 20000) return;
  if (frames <= 3 || ms > 90) console.log(`[boot] frame #${frames} ${Math.round(ms)}ms (${state}) @${Math.round(now)}ms`);
}
