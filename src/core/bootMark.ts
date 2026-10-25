/**
 * v4.0.1 boot timeline (owner: "khi mới vào iphone, game bị dừng khá lâu"): a few console lines with the
 * time of each boot phase and every long frame in the first 20 s, so a phone's debug log shows where the
 * first load spends its time. Cheap: a handful of lines once per launch.
 * v4.0.2 (owner: "bấm GO bị lâu lúc khởi động bàn chơi"): the same watch re-opens at every race start
 * (`[go]` lines: the start phases, then the first frames and every long frame of the next 8 s).
 */
let last = 0;
let tag = 'boot';
export function bootMark(name: string) {
  const now = performance.now();
  console.log(`[${tag}] ${name} @${Math.round(now)}ms (+${Math.round(now - last)})`);
  last = now;
}
let frames = 0;
let t0 = 0;
let span = 20000;
let slow = 90;
/** re-open the watch for a race start: marks are tagged [go], frames are counted from here */
export function watchStart(label: string) {
  if (tag === 'go' && performance.now() - t0 < 300) return bootMark(label); // same tap (track → run)
  tag = 'go';
  last = performance.now();
  frames = 0;
  t0 = last;
  span = 8000;
  slow = 50;
  bootMark(label);
}
/** call once per frame with the frame time (ms) and the current state */
export function bootFrame(ms: number, state: string) {
  const now = performance.now();
  if (!t0) t0 = now;
  frames++;
  if (now - t0 > span) return;
  if (frames <= 4 || ms > slow) console.log(`[${tag}] frame #${frames} ${Math.round(ms)}ms (${state}) @${Math.round(now)}ms`);
}
