/**
 * v1.0.3 Western music & SFX synthesis — pure functions that write samples into Float32Arrays (no Web
 * Audio graph, no DOM), so they run in Node tests and render once into AudioBuffers at start-up.
 *
 * Why: the v1.0.0 soundtrack built each guitar note as a Web Audio feedback loop (Karplus-Strong with a
 * DelayNode). Web Audio forces any delay inside a cycle up to one render quantum (128 samples), so every
 * note above ~340 Hz — and in practice every note — came out at ~40 Hz: a buzzing, out-of-tune drone.
 * Here the plucked strings are computed sample by sample with an exact fractional delay.
 *
 * Everything is original and generated (no samples, no licensed material).
 */

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** deterministic noise so renders (and tests) are repeatable */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

/**
 * Plucked string (Karplus-Strong with a fractional delay and a tunable damping filter).
 * @param bright 0..1 — how much of the pick attack stays (banjo bright, bass dark)
 * @param decay seconds to fall ~60 dB
 */
export function pluck(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number, bright = 0.5, decay = 1.6, seed = 7) {
  const step = pluckSteps(out, sr, at, hz, vol, dur, bright, decay, seed);
  while (!step()) {
    /* render to the end */
  }
}

/** v4.0.1: samples written per call of a resumable voice (the native build yields between calls) */
export const STEP_SAMPLES = 4096;

/** pluck as a resumable job: each call writes up to STEP_SAMPLES samples, returns true when done (same output) */
export function pluckSteps(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number, bright = 0.5, decay = 1.6, seed = 7) {
  const damp = 0.5 - bright * 0.12; // averaging filter weight (higher = darker)
  // loop delay D (fractional); the averaging filter adds ~damp samples, so take it off
  const D = Math.max(2, sr / hz - damp);
  const M = Math.ceil(D) + 2;
  const buf = new Float32Array(M);
  const r = rng(seed + Math.round(hz * 13));
  // pick: noise shaped by brightness (dark = smoothed noise), normalised
  let prev = 0;
  const sm = 0.15 + (1 - bright) * 0.75;
  for (let i = 0; i < M; i++) {
    prev = prev * sm + r() * (1 - sm);
    buf[i] = prev;
  }
  let pk = 0;
  for (const v of buf) pk = Math.max(pk, Math.abs(v));
  for (let i = 0; i < M; i++) buf[i] /= pk || 1;
  // per-period loss so the note decays in `decay` seconds (−60 dB)
  const loss = Math.pow(0.001, 1 / (decay * hz));
  const n = Math.min(out.length - at, Math.floor(dur * sr));
  let last = 0;
  let w = 0;
  let i = 0;
  return () => {
    const end = Math.min(n, i + STEP_SAMPLES);
    for (; i < end; i++) {
      // read D samples behind the write head (linear interpolation)
      const pos = w - D;
      const i0 = Math.floor(pos);
      const f = pos - i0;
      const a = buf[((i0 % M) + M) % M];
      const b = buf[(((i0 + 1) % M) + M) % M];
      const y = a + (b - a) * f;
      buf[w] = (y * (1 - damp) + last * damp) * loss;
      last = y;
      w = (w + 1) % M;
      // tiny attack ramp avoids a click, a release fade at the end of the slot
      const env = Math.min(1, i / (sr * 0.002)) * (i > n - sr * 0.02 ? (n - i) / (sr * 0.02) : 1);
      out[at + i] += y * vol * env;
    }
    return i >= n;
  };
}

/** harmonica: reedy (odd + even partials), breathy, slow vibrato, soft attack */
export function harmonica(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number, seed = 3) {
  const step = harmonicaSteps(out, sr, at, hz, vol, dur, seed);
  while (!step()) {
    /* render to the end */
  }
}
export function harmonicaSteps(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number, seed = 3) {
  const r = rng(seed);
  const n = Math.min(out.length - at, Math.floor(dur * sr));
  const parts = [1, 0.55, 0.42, 0.22, 0.16, 0.08];
  let ph = 0;
  let breath = 0;
  let i = 0;
  return () => {
    const end = Math.min(n, i + STEP_SAMPLES);
    for (; i < end; i++) {
      const t = i / sr;
      const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.25);
      ph += (2 * Math.PI * hz * vib) / sr;
      let s = 0;
      for (let k = 0; k < parts.length; k++) s += parts[k] * Math.sin(ph * (k + 1));
      breath = breath * 0.9 + r() * 0.1;
      const att = Math.min(1, t / 0.06);
      const rel = i > n - sr * 0.08 ? (n - i) / (sr * 0.08) : 1;
      const k = at + i;
      if (k >= 0) out[k] += (s * 0.42 + breath * 0.35) * vol * att * rel;
    }
    return i >= n;
  };
}

/** lone-rider whistle: near-sine with vibrato that grows into the note */
export function whistle(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number) {
  const step = whistleSteps(out, sr, at, hz, vol, dur);
  while (!step()) {
    /* render to the end */
  }
}
export function whistleSteps(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur: number) {
  const n = Math.min(out.length - at, Math.floor(dur * sr));
  let ph = 0;
  let i = 0;
  return () => {
    const end = Math.min(n, i + STEP_SAMPLES);
    for (; i < end; i++) {
      const t = i / sr;
      const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5.6 * t) * Math.min(1, t / (dur * 0.6));
      ph += (2 * Math.PI * hz * vib) / sr;
      const s = Math.sin(ph) + 0.08 * Math.sin(ph * 2);
      const att = Math.min(1, t / 0.05);
      const rel = i > n - sr * 0.1 ? (n - i) / (sr * 0.1) : 1;
      const k = at + i;
      if (k >= 0) out[k] += s * vol * att * rel;
    }
    return i >= n;
  };
}

/** drum / percussion voices */
export function kick(out: Float32Array, sr: number, at: number, vol: number) {
  const n = Math.min(out.length - at, Math.floor(0.3 * sr));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = 48 + 90 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / sr;
    out[at + i] += Math.sin(ph) * vol * Math.exp(-t * 11);
  }
}

/** brush on a snare (train beat): filtered noise swish */
export function brush(out: Float32Array, sr: number, at: number, vol: number, len = 0.09, seed = 11) {
  const r = rng(seed + at);
  const n = Math.min(out.length - at, Math.floor(len * sr));
  let lp = 0;
  let hp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = r();
    lp += (x - lp) * 0.45;
    const y = lp - hp;
    hp += (lp - hp) * 0.08;
    out[at + i] += y * vol * Math.min(1, t / 0.006) * Math.exp(-t * (3 / len));
  }
}

/** shaker / tambourine jingle: bright short noise */
export function shaker(out: Float32Array, sr: number, at: number, vol: number, seed = 5) {
  const r = rng(seed + at);
  const n = Math.min(out.length - at, Math.floor(0.05 * sr));
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const x = r();
    const y = x - prev;
    prev = x;
    out[at + i] += y * vol * Math.exp((-i / sr) * 70);
  }
}

/** woodblock "clip-clop" (horse hooves): short damped sine + a knock */
export function clop(out: Float32Array, sr: number, at: number, hz: number, vol: number) {
  const n = Math.min(out.length - at, Math.floor(0.08 * sr));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[at + i] += (Math.sin(2 * Math.PI * hz * t) * 0.8 + Math.sin(2 * Math.PI * hz * 2.7 * t) * 0.25) * vol * Math.exp(-t * 60);
  }
}

/** a bell "ding" (saloon / dinner bell): inharmonic partials with a long ring */
export function bell(out: Float32Array, sr: number, at: number, hz: number, vol: number, dur = 1.2) {
  const n = Math.min(out.length - at, Math.floor(dur * sr));
  const P: [number, number, number][] = [
    [1, 1, 2.2],
    [2.76, 0.5, 4],
    [5.4, 0.25, 7],
    [8.93, 0.12, 10],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    for (const [m, a, d] of P) s += Math.sin(2 * Math.PI * hz * m * t) * a * Math.exp(-t * d);
    out[at + i] += s * vol * Math.min(1, t / 0.002);
  }
}

/** loop seam: anything that rang past the end is folded back onto the start (seamless loops) */
export function foldTail(full: Float32Array, loopLen: number) {
  const out = full.slice(0, loopLen);
  for (let i = loopLen; i < full.length; i++) out[i - loopLen] += full[i];
  return out;
}

/** soft clip + normalise to a target peak */
export function master(x: Float32Array, peak = 0.8) {
  let pk = 0;
  for (let i = 0; i < x.length; i++) {
    x[i] = Math.tanh(x[i] * 1.1);
    pk = Math.max(pk, Math.abs(x[i]));
  }
  const k = pk > 0 ? peak / pk : 1;
  for (let i = 0; i < x.length; i++) x[i] *= k;
  return x;
}

/** master as resumable steps (same result): soft clip + peak in one pass, then the gain, STEP_SAMPLES × 4 per call */
export function masterSteps(get: () => Float32Array, peak: number, done: (x: Float32Array) => void) {
  let x: Float32Array | null = null;
  let i = 0;
  let pk = 0;
  let phase = 0;
  let k = 1;
  const N = STEP_SAMPLES * 4;
  return () => {
    x ??= get();
    if (phase === 0) {
      const end = Math.min(x.length, i + N);
      for (; i < end; i++) {
        x[i] = Math.tanh(x[i] * 1.1);
        pk = Math.max(pk, Math.abs(x[i]));
      }
      if (i < x.length) return false;
      k = pk > 0 ? peak / pk : 1;
      phase = 1;
      i = 0;
      return false;
    }
    const end = Math.min(x.length, i + N);
    for (; i < end; i++) x[i] *= k;
    if (i < x.length) return false;
    done(x);
    return true;
  };
}

// ------------------------------------------------------------------------------------------- songs

/** a song = one loop, in layers that share the same length (crossfaded by intensity) */
export interface SongSpec {
  bpm: number;
  bars: number;
}

export const SONGS = {
  /** Home: "Campfire" — fingerpicked G-major guitar + harmonica, 84 bpm */
  camp: { bpm: 84, bars: 8 },
  /** races: "Dust Trail Gallop" — A minor boom-chicka, train beat, whistle, 132 bpm */
  ride: { bpm: 132, bars: 8 },
} satisfies Record<string, SongSpec>;

const beatLen = (s: SongSpec, sr: number) => (60 / s.bpm) * sr;
export const loopLength = (s: SongSpec, sr: number) => Math.round(beatLen(s, sr) * 4 * s.bars);

/** a render split into small jobs (the browser runs them a few ms at a time, never freezing a frame) */
export interface Plan<T> {
  /** a job returns false when it has more to do (call it again — v4.0.1 resumable voices) */
  jobs: (() => void | boolean)[];
  done: () => T;
}
export function runPlan<T>(p: Plan<T>): T {
  for (const j of p.jobs) while (j() === false) {
    /* resumable job: keep going */
  }
  return p.done();
}
export const renderCamp = (sr: number) => runPlan(campPlan(sr));
export const renderRide = (sr: number) => runPlan(ridePlan(sr));

/** Campfire (Home): G | C | G | D | G | C | D | G, Travis picking + harmonica */
/** a resumable job created on its first call (keeps the note's buffers out of memory until its turn) */
const lazy = (make: () => () => boolean) => {
  let step: (() => boolean) | null = null;
  return () => (step ??= make())();
};

export function campPlan(sr: number): Plan<Float32Array> {
  const jobs: (() => void | boolean)[] = [];
  const S = SONGS.camp;
  const bl = beatLen(S, sr);
  const L = loopLength(S, sr);
  const out = new Float32Array(L + sr * 3);
  // root (bass string), chord tones for the picking hand
  const prog: [number, number[]][] = [
    [43, [55, 59, 62, 67]], // G
    [48, [55, 60, 64, 67]], // C
    [43, [55, 59, 62, 67]], // G
    [50, [54, 57, 62, 66]], // D
    [43, [55, 59, 62, 67]], // G
    [48, [55, 60, 64, 67]], // C
    [50, [54, 57, 62, 66]], // D
    [43, [55, 59, 62, 67]], // G
  ];
  prog.forEach(([root, tones], bar) => {
    const b0 = bar * 4 * bl;
    // alternating bass: root on 1 & 3, fifth on 2 & 4
    for (let beat = 0; beat < 4; beat++) {
      const m = beat % 2 === 0 ? root : root + 7;
      jobs.push(lazy(() => pluckSteps(out, sr, Math.round(b0 + beat * bl), mtof(m), 0.32, 1.6, 0.25, 2.2, bar * 4 + beat)));
    }
    // picked melody notes on the off-eighths
    const pat = [3, 2, 1, 2, 3, 1, 2, 0];
    pat.forEach((ti, k) => {
      const at = Math.round(b0 + (k * 0.5 + 0.5) * bl);
      if (k % 2 === 0) jobs.push(lazy(() => pluckSteps(out, sr, at, mtof(tones[ti]), 0.16, 1.4, 0.55, 1.8, bar * 31 + k)));
      else jobs.push(lazy(() => pluckSteps(out, sr, at, mtof(tones[ti]), 0.12, 1.2, 0.5, 1.5, bar * 17 + k)));
    });
  });
  // harmonica: a calm phrase over bars 1–4, answered over 5–8 (G major pentatonic)
  const mel: [number, number, number][] = [
    // [beat from start, midi, beats]
    [0, 71, 2], [2, 74, 2], [4, 76, 3], [7, 74, 1], [8, 71, 3], [11, 69, 1], [12, 66, 3], [15, 69, 1],
    [16, 71, 2], [18, 74, 2], [20, 76, 2], [22, 79, 2], [24, 78, 2], [26, 74, 2], [28, 71, 4],
  ];
  for (const [b, m, len] of mel) jobs.push(lazy(() => harmonicaSteps(out, sr, Math.round(b * bl), mtof(m), 0.07, (len * bl) / sr * 0.95, b + 1)));
  let res: Float32Array = new Float32Array(0);
  jobs.push(masterSteps(() => foldTail(out, L), 0.7, (x) => (res = x)));
  return { jobs, done: () => res };
}

/** Dust Trail Gallop (races) — three layers: base, drums, nitro */
export function ridePlan(sr: number): Plan<{ base: Float32Array; drums: Float32Array; nitro: Float32Array }> {
  const jobs: (() => void | boolean)[] = [];
  const S = SONGS.ride;
  const bl = beatLen(S, sr);
  const L = loopLength(S, sr);
  const base = new Float32Array(L + sr * 3);
  const drums = new Float32Array(L + sr * 2);
  const nitro = new Float32Array(L + sr * 2);
  // Am | Am | G | G | F | F | E | E
  const prog: [number, number[]][] = [
    [45, [57, 60, 64, 69]],
    [45, [57, 60, 64, 69]],
    [43, [55, 59, 62, 67]],
    [43, [55, 59, 62, 67]],
    [41, [53, 57, 60, 65]],
    [41, [53, 57, 60, 65]],
    [40, [52, 56, 59, 64]],
    [40, [52, 56, 59, 64]],
  ];
  prog.forEach(([root, tones], bar) => {
    const b0 = bar * 4 * bl;
    for (let beat = 0; beat < 4; beat++) {
      const at = Math.round(b0 + beat * bl);
      // boom (bass: root / fifth) on 1 & 3, chicka (strum) on 2 & 4
      if (beat % 2 === 0) jobs.push(lazy(() => pluckSteps(base, sr, at, mtof(beat === 0 ? root : root + 7), 0.42, 0.9, 0.2, 1.1, bar * 8 + beat)));
      else tones.forEach((m, i) => jobs.push(lazy(() => pluckSteps(base, sr, at + Math.round(i * sr * 0.011), mtof(m), 0.1, 0.5, 0.6, 0.55, bar * 40 + beat * 5 + i))));
      // drums: kick 1 & 3, train-beat brushes (accent on the "and"), clip-clop gallop
      if (beat % 2 === 0) jobs.push(() => kick(drums, sr, at, 0.55));
      for (let s = 0; s < 4; s++) brush(drums, sr, Math.round(at + (s * bl) / 4), s === 2 ? 0.16 : 0.07, 0.07);
      jobs.push(() => clop(drums, sr, at, 820, 0.12));
      jobs.push(() => clop(drums, sr, Math.round(at + bl * 0.5), 640, 0.09));
      jobs.push(() => clop(drums, sr, Math.round(at + bl * 0.75), 700, 0.09));
      // nitro: banjo roll (16ths over the chord) + tambourine
      for (let s = 0; s < 4; s++) {
        const m = tones[(beat * 4 + s) % tones.length] + 12;
        jobs.push(lazy(() => pluckSteps(nitro, sr, Math.round(at + (s * bl) / 4), mtof(m), 0.09, 0.35, 0.95, 0.35, bar * 64 + beat * 4 + s)));
        if (s % 2 === 1) jobs.push(() => shaker(nitro, sr, Math.round(at + (s * bl) / 4), 0.12, bar * 9 + s));
      }
    }
  });
  // whistle melody (A minor, a spaghetti-western line; E bars use the G#)
  const mel: [number, number, number][] = [
    [0, 76, 1.5], [1.5, 81, 0.5], [2, 79, 1], [3, 76, 1], [4, 74, 1], [5, 76, 3],
    [8, 74, 1.5], [9.5, 79, 0.5], [10, 77, 1], [11, 74, 1], [12, 71, 1], [13, 74, 3],
    [16, 72, 1.5], [17.5, 77, 0.5], [18, 76, 1], [19, 72, 1], [20, 69, 1], [21, 72, 3],
    [24, 71, 1], [25, 68, 1], [26, 71, 1], [27, 74, 1], [28, 76, 4],
  ];
  for (const [b, m, len] of mel) jobs.push(lazy(() => whistleSteps(base, sr, Math.round(b * bl), mtof(m), 0.085, (len * bl) / sr * 0.92)));
  const res: { base: Float32Array; drums: Float32Array; nitro: Float32Array } = { base: new Float32Array(0), drums: new Float32Array(0), nitro: new Float32Array(0) };
  jobs.push(masterSteps(() => foldTail(base, L), 0.62, (x) => (res.base = x)));
  jobs.push(masterSteps(() => foldTail(drums, L), 0.5, (x) => (res.drums = x)));
  jobs.push(masterSteps(() => foldTail(nitro, L), 0.4, (x) => (res.nitro = x)));
  return { jobs, done: () => res };
}

/** short SFX buffers (Western flavour) */
export function renderStrum(sr: number, tones: number[], vol = 0.25, gap = 0.016) {
  const out = new Float32Array(Math.round(sr * 1.4));
  tones.forEach((m, i) => pluck(out, sr, Math.round(i * gap * sr), mtof(m), vol, 1.3, 0.6, 1.2, i + 3));
  return master(out, 0.85);
}

export function renderBell(sr: number, hz: number, dur = 1.2) {
  const out = new Float32Array(Math.round(sr * dur));
  bell(out, sr, 0, hz, 0.5, dur);
  return master(out, 0.8);
}

/** single plucked note (banjo / guitar) for arpeggio SFX */
export function renderPluck(sr: number, midi: number, bright = 0.7, dur = 0.9) {
  const out = new Float32Array(Math.round(sr * dur));
  pluck(out, sr, 0, mtof(midi), 0.5, dur, bright, dur * 0.9, midi);
  return master(out, 0.8);
}
