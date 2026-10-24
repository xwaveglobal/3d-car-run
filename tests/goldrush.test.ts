/**
 * v1.0.0 GOLD RUSH — 3 MIN BONUS RUN: the active timer is exactly 180 s, pause / stalls / slow motion
 * never change it, the warning and the final countdown fire once, the completion reward is paid once
 * per run, an early end never pays the completion reward, entry limits are unchanged, and the road is
 * always longer than what 180 s can cover.
 */
declare const process: { exit(code: number): never };
import { GOLD_RUSH, GoldRushTimer, creditOnce, fmtClock, goldRushPayout, goldRushRoadLength } from '../src/meta/GoldRush.ts';
import { BONUS, bonusPlaysUsed, bonusState } from '../src/meta/Bonus.ts';
import { LEVELS, type SpeedLevel } from '../src/config.ts';
import { Spawner } from '../src/gameplay/Spawner.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

// ---- exactly 180 s of active play, at any frame rate
for (const fps of [30, 60, 120, 24]) {
  const t = new GoldRushTimer();
  let frames = 0;
  let ended = 0;
  while (!t.done && frames < 1e6) {
    for (const e of t.step(1 / fps, true)) if (e.k === 'end') ended++;
    frames++;
  }
  const secs = frames / fps;
  check(Math.abs(secs - 180) <= 1 / fps + 1e-9 && ended === 1, `${fps} fps: ends after ${secs.toFixed(3)} s of active play (180 s), 'end' fires once`);
}
check(GOLD_RUSH.seconds === 180, 'a Gold Rush run lasts 180 s');
check(BONUS.raceMinutes * 60 === GOLD_RUSH.seconds, 'the Bonus card shows the same 3 minutes');

// ---- paused / crash / revive offer (not active) never consume time
{
  const t = new GoldRushTimer();
  for (let i = 0; i < 600; i++) t.step(1 / 60, true); // 10 s driving
  const a = t.active;
  for (let i = 0; i < 60 * 300; i++) t.step(1 / 60, false); // 5 minutes paused
  check(t.active === a && Math.abs(a - 10) < 1e-6, `pause holds the clock (10.000 s before, ${t.active.toFixed(3)} s after 5 min paused)`);
  for (let i = 0; i < 600; i++) t.step(1 / 60, true);
  check(Math.abs(t.active - 20) < 1e-6, 'resume continues from where it stopped');
}

// ---- a huge frame (background tab, stall, clock jump) never skips time; bad input ignored
{
  const t = new GoldRushTimer();
  t.step(3600, true);
  check(Math.abs(t.active - GOLD_RUSH.maxDt) < 1e-9, `a 1-hour frame advances only ${GOLD_RUSH.maxDt.toFixed(3)} s (clamped)`);
  t.step(-5, true);
  t.step(Number.NaN, true);
  t.step(Number.POSITIVE_INFINITY, true);
  check(Math.abs(t.active - GOLD_RUSH.maxDt) < 1e-9, 'negative / NaN / infinite frame times are ignored');
}

// ---- 30 s warning once, countdown 10 … 1 once each, then end
{
  const t = new GoldRushTimer();
  const ev: string[] = [];
  while (!t.done) for (const e of t.step(1 / 60, true)) ev.push(e.k === 'count' ? `c${e.n}` : e.k === 'warn' ? `w${e.left}` : 'end');
  const warns = ev.filter((e) => e.startsWith('w'));
  const counts = ev.filter((e) => e.startsWith('c')).map((e) => +e.slice(1));
  check(warns.length === 1 && warns[0] === 'w30', `30-second warning fires once (${warns.join(',')})`);
  check(counts.join(',') === '10,9,8,7,6,5,4,3,2,1', `final countdown 10…1 (${counts.join(',')})`);
  check(ev[ev.length - 1] === 'end', 'the run ends right after the countdown');
  const after = t.step(1 / 60, true);
  check(after.length === 0 && t.active === 180, 'nothing happens after the end (timer stays at 180 s)');
}
check(fmtClock(180) === '3:00' && fmtClock(29.2) === '0:30' && fmtClock(0) === '0:00', 'clock format 3:00 / 0:30 / 0:00');

// ---- payout: completion reward only when completed; credited once per run id
for (const lv of ['easy', 'normal', 'hard'] as SpeedLevel[]) {
  const done = goldRushPayout(500, LEVELS[lv].reward, true);
  const early = goldRushPayout(500, LEVELS[lv].reward, false);
  check(done.finish > 0 && early.finish === 0 && done.total - early.total === done.finish, `${lv}: completion pays +${done.finish}, an early end pays coins only (${early.total})`);
}
{
  const ledger: string[] = [];
  const a = creditOnce(ledger, 'evt1:1');
  const b = creditOnce(ledger, 'evt1:1'); // restart / refresh / repeated tap of the same run
  const c = creditOnce(ledger, 'evt1:2'); // the next play of the event
  check(a && !b && c, 'a run is credited once; the next play is a new run');
  for (let i = 0; i < 100; i++) creditOnce(ledger, `x${i}`);
  check(ledger.length <= 24, `the ledger stays small (${ledger.length} ids)`);
}

// ---- entry limits unchanged: hourly, open 30 min, 3 plays per event
{
  const base = new Date(2026, 9, 24, 14, 0, 0).getTime();
  const open = bonusState(base + 10 * 60_000);
  const closed = bonusState(base + 40 * 60_000);
  check(!!open.live && !closed.live, 'an event is open for 30 minutes of each hour');
  check(BONUS.maxPlays === 3 && bonusPlaysUsed({ key: open.live!.key, n: 3 }, open.live!.key) >= BONUS.maxPlays, '3 plays per event (no unlimited entries)');
}

// ---- the road never runs out within 180 s (full speed + Nitro ×1.55 all the way)
for (const lv of ['easy', 'normal', 'hard'] as SpeedLevel[]) {
  const sp = new Spawner();
  sp.level = lv;
  sp.speedMul = LEVELS[lv].speed;
  sp.course = { id: 'probe', name: '', world: 'desert', length: 1, diffOffset: 900, difficulty: 2, coinTarget: 0, reward: 0, sections: [] };
  const road = goldRushRoadLength((d) => sp.speed(d));
  let d = 0;
  for (let t = 0; t < 180; t += 0.05) d += sp.speed(d) * 1.55 * 0.05;
  check(road.length > d, `${lv}: road ${road.length} m > ${Math.round(d)} m (180 s at full speed with Nitro)`);
}

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
