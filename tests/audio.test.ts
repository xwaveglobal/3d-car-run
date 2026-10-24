/**
 * v1.0.3 audio: the plucked strings are in tune (the v1.0.0 Web Audio feedback loop played ~40 Hz for every
 * note), the loops are seamless, finite and never clip, and rendering stays cheap enough for a phone.
 */
declare const process: { exit(code: number): never };
import { SONGS, loopLength, mtof, pluck, renderCamp, renderRide, renderStrum, renderBell } from '../src/audio/westernSynth.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

/** fundamental by autocorrelation (first strong peak) */
function pitch(x: Float32Array, sr: number) {
  const s = Math.floor(sr * 0.05);
  const n = Math.floor(sr * 0.08);
  const ac = (L: number) => {
    let v = 0;
    for (let i = 0; i < n; i++) v += x[s + i] * x[s + i + L];
    return v;
  };
  const a0 = ac(0);
  let best = 0;
  let bl = 0;
  for (let L = Math.floor(sr / 1400); L < Math.floor(sr / 50); L++) {
    const v = ac(L);
    if (v > best) {
      best = v;
      bl = L;
    }
    if (bl && v < best * 0.5 && best > a0 * 0.5) break; // first strong peak only (avoid octave errors)
  }
  // parabolic refinement
  const y0 = ac(bl - 1), y1 = ac(bl), y2 = ac(bl + 1);
  const d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
  return sr / (bl + d);
}

const sr = 32000;
for (const m of [40, 45, 52, 57, 64, 69, 76, 81]) {
  const x = new Float32Array(sr);
  pluck(x, sr, 0, mtof(m), 0.5, 1, 0.5, 1.6);
  const got = pitch(x, sr);
  const err = Math.abs(got / mtof(m) - 1);
  check(err < 0.006, `pluck midi ${m}: ${got.toFixed(1)} Hz (want ${mtof(m).toFixed(1)}, ${(err * 100).toFixed(2)} %)`);
}

const finite = (x: Float32Array) => x.every((v) => Number.isFinite(v));
const peak = (x: Float32Array) => x.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
let t = performance.now();
const camp = renderCamp(sr);
const tc = performance.now() - t;
t = performance.now();
const ride = renderRide(sr);
const tr = performance.now() - t;
check(camp.length === loopLength(SONGS.camp, sr) && finite(camp) && peak(camp) <= 0.9 && peak(camp) > 0.3, `Campfire loop: ${(camp.length / sr).toFixed(2)} s, peak ${peak(camp).toFixed(2)}, rendered in ${tc.toFixed(0)} ms`);
for (const [k, v] of Object.entries(ride)) check(v.length === loopLength(SONGS.ride, sr) && finite(v) && peak(v) <= 0.9 && peak(v) > 0.2, `Gallop ${k}: ${(v.length / sr).toFixed(2)} s, peak ${peak(v).toFixed(2)}`);
check(tc + tr < 4000, `all loops render in ${(tc + tr).toFixed(0)} ms (Node; phones render in the background)`);
// seamless: the last and first samples are close (no click at the loop point)
for (const [k, v] of Object.entries({ camp, ...ride })) check(Math.abs(v[v.length - 1] - v[0]) < 0.25, `${k}: no jump at the loop point (${Math.abs(v[v.length - 1] - v[0]).toFixed(3)})`);
check(finite(renderStrum(sr, [55, 59, 62, 67])) && finite(renderBell(sr, 1320)), 'SFX buffers render');

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
