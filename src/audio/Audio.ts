/**
 * Procedural Web Audio: every SFX is synthesized; the music is rendered once into seamless loops.
 * v1.0.3 (3D Car Run): a Western / cowboy soundtrack — "Campfire" on Home (fingerpicked guitar +
 * harmonica) and "Dust Trail Gallop" in races (boom-chicka guitar, whistle, train beat, clip-clop; a
 * banjo layer joins during Nitro). The instruments are computed in src/audio/westernSynth.ts (exact
 * pitch — the v1.0.0 Web Audio feedback-loop guitar played every note at ~40 Hz). The loops render in
 * the background a few ms at a time, then play as looping buffers (no scheduler timer, cheap on phones).
 * All generated: no samples, no licensed material. Any SFX can be overridden by a real file via
 * `loadOverride(name, url)` (assets/manifest.ts).
 */
import { platform } from '../platform.ts';
import { bgAdd } from '../core/bgWork.ts';

/**
 * v4.0.2: AudioContext.suspend() / resume() return a Promise in browsers but nothing on TikTok iOS
 * ("undefined is not an object (evaluating 'c2.suspend().catch')"), and may even throw. Never let that
 * break the caller (the visibility handler that also saves the game).
 */
function safeCall(c: { suspend?: () => unknown; resume?: () => unknown } | null | undefined, k: 'suspend' | 'resume') {
  try {
    const r = c?.[k]?.() as { catch?: (f: () => void) => void } | undefined;
    if (r && typeof r.catch === 'function') r.catch(() => undefined);
  } catch {
    /* ignore */
  }
}
import { campPlan, ridePlan, renderBell, renderPluck, renderStrum, type Plan } from './westernSynth.ts';

/** render rate of the music / SFX buffers (guitar, whistle, drums sound complete at 24 kHz) */
const SYNTH_SR = 24000;
/**
 * v4.0 native (owner: "tiếng hơi bị rè … lúc đâm bị xẹt"): the mini-game Web Audio has no AudioParam automation
 * (envelopes became hard steps = clicks / crackle) and may lack the compressor (= clipping) and resample 24 kHz
 * buffers crudely. On native every SFX is BAKED once into a PCM buffer with sample-accurate envelopes (same
 * recipes), music + SFX render at the context's own rate, gain fades step in small increments, and the master is
 * lower (headroom instead of a compressor).
 */
const NATIVE_MASTER = 0.6;
export type Sfx =
  | 'coin' | 'lane' | 'up' | 'down' | 'land' | 'power' | 'shield' | 'shieldBreak' | 'crash' | 'explode'
  | 'near' | 'ring' | 'beep' | 'go' | 'mission' | 'click' | 'turbo' | 'respawn' | 'bump' | 'combo' | 'warp' | 'expire' | 'fanfare';

/**
 * v3: make a partial Web Audio implementation (a mini-game runtime's tt.createWebAudioContext)
 * usable: missing node factories fall back to a pass-through gain, missing AudioParam automation
 * falls back to timed value changes. Every sound and the music then play instead of going silent.
 */
function compat(c: any) {
  const fixParam = (p: any) => {
    if (!p || typeof p !== 'object') return p;
    const at = (t: number, fn: () => void) => {
      const ms = Math.max(0, (t - (c.currentTime ?? 0)) * 1000);
      if (ms < 4) fn();
      else setTimeout(fn, ms);
    };
    const set = (v: number) => {
      try {
        p.value = v;
      } catch {
        /* read-only */
      }
    };
    if (typeof p.setValueAtTime !== 'function') p.setValueAtTime = (v: number, t: number) => (at(t, () => set(v)), p);
    if (typeof p.exponentialRampToValueAtTime !== 'function') p.exponentialRampToValueAtTime = (v: number, t: number) => (at(t, () => set(v)), p);
    if (typeof p.linearRampToValueAtTime !== 'function') p.linearRampToValueAtTime = (v: number, t: number) => (at(t, () => set(v)), p);
    if (typeof p.setTargetAtTime !== 'function') p.setTargetAtTime = (v: number, t: number) => (at(t, () => set(v)), p);
    if (typeof p.cancelScheduledValues !== 'function') p.cancelScheduledValues = () => p;
    return p;
  };
  const fakeParam = (v: number) => fixParam({ value: v });
  const PARAMS = ['gain', 'frequency', 'detune', 'Q', 'pan', 'delayTime', 'threshold', 'ratio', 'knee', 'attack', 'release', 'playbackRate'];
  const fixNode = (n: any) => {
    if (!n) return n;
    for (const k of PARAMS) {
      if (k in n) {
        if (n[k] && typeof n[k] === 'object') fixParam(n[k]);
      }
    }
    // an oscillator without detune (the pads detune two saws)
    if (n.frequency && !n.detune) {
      try {
        n.detune = fakeParam(0);
      } catch {
        /* ignore */
      }
    }
    return n;
  };
  /** a pass-through node standing in for a missing one (gain = 1, extra params ignored) */
  const passThrough = (extra: Record<string, unknown>) => {
    const g = c.createGain();
    for (const [k, v] of Object.entries(extra)) {
      try {
        if (!(k in g)) g[k] = v;
      } catch {
        /* ignore */
      }
    }
    return fixNode(g);
  };
  const wrap = (name: string, fallback: (() => any) | null) => {
    const orig = typeof c[name] === 'function' ? c[name].bind(c) : null;
    c[name] = (...a: unknown[]) => {
      let n = null;
      try {
        n = orig ? orig(...a) : null;
      } catch {
        n = null;
      }
      if (!n && fallback) n = fallback();
      return fixNode(n);
    };
  };
  wrap('createGain', null);
  wrap('createOscillator', null);
  wrap('createBufferSource', null);
  wrap('createDynamicsCompressor', () => passThrough({ threshold: fakeParam(-14), ratio: fakeParam(4) }));
  wrap('createBiquadFilter', () => passThrough({ type: 'lowpass', frequency: fakeParam(1000), Q: fakeParam(1) }));
  wrap('createDelay', () => passThrough({ delayTime: fakeParam(0) }));
  if (typeof c.createStereoPanner === 'function') wrap('createStereoPanner', null);
  // v4.0 (3D Car Run native): the canyon reverb — a missing convolver just passes the music through
  wrap('createConvolver', () => passThrough({ buffer: null }));
}

export class Audio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private overrides = new Map<string, AudioBuffer>();
  private pendingOverrides: [string, string][] = [];
  sfxOn = true;
  musicOn = true;
  private coinPitch = 0;
  private coinPitchT = 0;
  // music: rendered loops + their layer gains
  private reverb!: ConvolverNode;
  private songs: { camp?: AudioBuffer; base?: AudioBuffer; drums?: AudioBuffer; nitro?: AudioBuffer } = {};
  private rendering = false;
  private layers: Partial<Record<'camp' | 'base' | 'drums' | 'nitro', { src: AudioBufferSourceNode; g: GainNode }>> = {};
  private sfxBufs: Record<string, AudioBuffer> = {};
  /** v4.0 native: bake SFX (see NATIVE_MASTER) */
  private baked = platform.native;
  /** render rate: the context's own on native (no runtime resampling), 24 kHz on the web */
  private sr = SYNTH_SR;
  /** the buffer a recipe writes into while baking (null = live Web Audio nodes) */
  private rt: Float32Array | null = null;
  private bakedSfx = new Map<string, AudioBuffer>();
  private _intensity = 0;
  /** 0 = Home / menus (Campfire), 1 = racing (Gallop), 2 = Nitro (+ banjo) */
  get intensity() {
    return this._intensity;
  }
  set intensity(v: number) {
    if (v === this._intensity) return;
    const was = this._intensity;
    this._intensity = v;
    this.applyIntensity(was);
  }
  playing = false;

  /** called when the context becomes able to sound (first gesture, back from background) */
  onRunning: (() => void) | null = null;
  /** performance.now() of the last request per SFX (Step 06.5 latency instrumentation) */
  lastPlayed: Partial<Record<Sfx, number>> = {};
  /** true once the context is running (sound can actually be heard) */
  get running() {
    return this.ctx?.state === 'running';
  }

  /**
   * Must be called from a real user gesture (browser autoplay policy) — Game calls it on every tap /
   * key until the context runs, so the first VALID gesture anywhere (Play, a menu button, the canvas)
   * unlocks sound; Settings is never needed. Creates the context once; afterwards only resumes it
   * (also from the iOS 'interrupted' state). Inside the gesture a 1-sample silent buffer is started:
   * WebKit only unlocks output when something starts from the gesture itself.
   */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') {
        safeCall(this.ctx, 'resume');
        this.prime();
        // v4.0.2: some runtimes fire no 'statechange' — start the music once the resume has landed
        const c0 = this.ctx;
        setTimeout(() => {
          if (c0.state === 'running') this.onRunning?.();
        }, 120);
      }
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let made: AudioContext;
    try {
      made = new AC({ latencyHint: 'interactive' });
    } catch {
      made = new AC(); // a runtime that takes no options
    }
    this.ctx = made;
    const c = this.ctx;
    // v4.0 native: the mini-game Web Audio is partial — fill the gaps (see compat above)
    try {
      compat(c);
    } catch (e) {
      console.warn('[audio] compat', e);
    }
    (c as unknown as { addEventListener?: (t: string, f: () => void) => void }).addEventListener?.('statechange', () => {
      if (c.state === 'running') this.onRunning?.();
    });
    if (c.state !== 'running') safeCall(c, 'resume');
    if (this.baked) this.sr = Math.min(48000, Math.max(22050, Math.round(c.sampleRate || 44100)));
    this.master = c.createGain();
    this.master.gain.value = this.baked ? NATIVE_MASTER : 0.8;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
    this.sfxBus.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.42 : 0;
    this.musicBus.connect(this.master);
    // canyon reverb on the music (generated impulse: 1.8 s of decaying, darkening noise)
    this.reverb = c.createConvolver();
    // v4.0.2: the reverb tail (1.8 s of decaying noise) is built in slices of 4096 samples (it was one
    // 100+ ms block on a phone without a JIT, right after the first tap)
    const irStep = (() => {
      const len = Math.round(c.sampleRate * 1.8);
      const chans = [new Float32Array(len), new Float32Array(len)];
      let ch = 0,
        i = 0,
        lp = 0;
      return () => {
        const d = chans[ch];
        const end = Math.min(len, i + 4096);
        for (; i < end; i++) {
          const k = i / len;
          lp += (Math.random() * 2 - 1 - lp) * (0.5 - k * 0.42);
          d[i] = lp * Math.pow(1 - k, 2.6) * (i < c.sampleRate * 0.012 ? 0 : 1);
        }
        if (i < len) return false;
        if (ch === 0) {
          ch = 1;
          i = 0;
          lp = 0;
          return false;
        }
        const ir = c.createBuffer(2, len, c.sampleRate);
        if (ir.copyToChannel) {
          ir.copyToChannel(chans[0], 0);
          ir.copyToChannel(chans[1], 1);
        } else {
          ir.getChannelData(0).set(chans[0]);
          ir.getChannelData(1).set(chans[1]);
        }
        if (this.reverb) this.reverb.buffer = ir;
        return true;
      };
    })();
    if (this.baked) bgAdd('reverb', irStep, { delay: 1500, prio: 6 });
    else while (!irStep()) {
      /* web: at once */
    }
    const wet = c.createGain();
    wet.gain.value = 0.22;
    this.reverb.connect(wet).connect(this.musicBus);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (this.baked) this.buildSfx(true);
    else this.buildSfx();
    this.prebake();
    for (const [n, u] of this.pendingOverrides) void this.loadOverride(n, u);
    this.pendingOverrides.length = 0;
    this.prime();
    if (c.state === 'running') void Promise.resolve().then(() => this.onRunning?.()); // (no queueMicrotask on TikTok Android)
  }

  /** silent 1-sample buffer started from the current gesture (WebKit output unlock) */
  private prime() {
    const c = this.ctx;
    if (!c) return;
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  }

  /** app hidden: stop the audio clock (no sounds pile up); shown: try to resume (a later tap also does) */
  setHidden(hidden: boolean) {
    const c = this.ctx;
    if (!c) return;
    if (hidden) {
      if (c.state === 'running') safeCall(c, 'suspend');
    } else if (c.state !== 'running') safeCall(c, 'resume');
  }

  async loadOverride(name: string, url: string) {
    if (!this.ctx) {
      this.pendingOverrides.push([name, url]);
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.overrides.set(name, buf);
    } catch {
      /* keep procedural */
    }
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.value = on ? 0.9 : 0;
  }
  /** silence everything while an ad plays */
  duck(on: boolean) {
    if (this.ctx) this.master.gain.value = on ? 0 : this.baked ? NATIVE_MASTER : 0.8;
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.value = on ? 0.42 : 0;
  }

  // ---------------------------------------------------------------- helpers
  private osc(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, bus?: AudioNode, pan = 0) {
    if (this.rt) return bakeOsc(this.rt, this.sr, type, f0, f1, t0, dur, vol);
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out: AudioNode = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    o.connect(g);
    out.connect(bus ?? this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(t0: number, dur: number, vol: number, f0: number, f1: number, q = 1, type: BiquadFilterType = 'bandpass', bus?: AudioNode, pan = 0) {
    if (this.rt) return bakeNoise(this.rt, this.sr, t0, dur, vol, f0, f1, q, type);
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g);
    let out: AudioNode = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    out.connect(bus ?? this.sfxBus);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.02);
  }

  /** @param opt.delay seconds after now on the AUDIO clock (sample-accurate; never a timer) */
  play(name: Sfx, opt: { pan?: number; delay?: number } = {}) {
    // v4.0.2: a sound that fails (partial mini-game Web Audio) must never break the frame that asked for it
    try {
      this.playSfx(name, opt);
    } catch (e) {
      console.warn('[audio] play', name, e);
    }
  }
  private playSfx(name: Sfx, opt: { pan?: number; delay?: number }) {
    this.lastPlayed[name] = performance.now();
    if (!this.ctx || !this.sfxOn) return;
    const c = this.ctx;
    const t = c.currentTime + (opt.delay ?? 0);
    const ov = this.overrides.get(name);
    if (ov) {
      const s = c.createBufferSource();
      s.buffer = ov;
      s.connect(this.sfxBus);
      s.start(t);
      return;
    }
    const pan = opt.pan ?? 0;
    let step = 0;
    if (name === 'coin') {
      // rising pitch on fast streaks
      if (t - this.coinPitchT > 0.6) this.coinPitch = 0;
      this.coinPitchT = t;
      step = Math.min(this.coinPitch, 12);
      this.coinPitch++;
    }
    if (this.baked) {
      const b = this.bakedBuf(name, step);
      if (b) this.playBaked(b, t, pan);
      return;
    }
    this.recipe(name, t, pan, step);
  }

  /** v4.0 native: one SFX rendered into a buffer (cached; coin per pitch step) */
  private bakedBuf(name: Sfx, step = 0) {
    const key = name === 'coin' ? `coin${step}` : name;
    let b = this.bakedSfx.get(key);
    if (b) return b;
    const c = this.ctx;
    if (!c) return null;
    const len = Math.round(this.sr * 2.4);
    const out = new Float32Array(len);
    this.rt = out;
    try {
      this.recipe(name, 0.004, 0, step);
    } finally {
      this.rt = null;
    }
    // headroom (no compressor on some runtimes; Crash + Explosion play together): peaks ≤ 0.5
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0.5) for (let i = 0; i < len; i++) out[i] *= 0.5 / peak;
    // trim the silent tail, fade the last 5 ms (never a click at the end)
    let end = len;
    while (end > 1 && Math.abs(out[end - 1]) < 1e-4) end--;
    end = Math.min(len, end + 32);
    const fade = Math.min(end, Math.round(this.sr * 0.005));
    for (let i = 0; i < fade; i++) out[end - 1 - i] *= i / fade;
    b = c.createBuffer(1, Math.max(1, end), this.sr);
    b.getChannelData(0).set(out.subarray(0, Math.max(1, end)));
    this.bakedSfx.set(key, b);
    return b;
  }
  private playBaked(b: AudioBuffer, t: number, pan: number) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = b;
    let out: AudioNode = s;
    if (pan && typeof c.createStereoPanner === 'function') {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      s.connect(p);
      out = p;
    }
    out.connect(this.sfxBus);
    s.start(t);
  }
  /** v4.0 native: bake every SFX a little at a time after start (the first play never waits) */
  private prebake() {
    if (!this.baked) return;
    const all: [Sfx, number][] = (['click', 'coin', 'go', 'beep', 'lane', 'crash', 'land', 'up', 'down', 'near', 'power', 'bump', 'shield', 'shieldBreak', 'explode', 'ring', 'fanfare', 'mission', 'combo', 'turbo', 'respawn', 'warp', 'expire'] as Sfx[]).map((n) => [n, 0]);
    for (let i = 1; i <= 12; i++) all.push(['coin', i]);
    // v4.0.2: one SFX per step through the shared background queue (held while the player touches the screen);
    // the common ones (click, coin, go…) come first so a tap never waits for them
    bgAdd(
      'sfx',
      () => {
        const j = all.shift();
        if (!j) return true;
        try {
          this.bakedBuf(j[0], j[1]);
        } catch (e) {
          console.warn('[audio] bake', e);
        }
        return !all.length;
      },
      { delay: 600, prio: 3 },
    );
  }

  /** the SFX recipes (live Web Audio nodes on the web, written into a buffer while baking) */
  private recipe(name: Sfx, t: number, pan: number, step: number) {
    switch (name) {
      case 'coin': {
        // gold "ching": bright metal ping + a short shimmer; rising pitch on fast streaks
        const base = 1568 * Math.pow(2, step / 24);
        this.osc('triangle', base, base, t, 0.08, 0.08);
        this.osc('sine', base * 2.01, base * 2.01, t + 0.02, 0.22, 0.06);
        this.osc('sine', base * 1.5, base * 1.5, t + 0.05, 0.18, 0.09);
        break;
      }
      case 'lane':
        this.noise(t, 0.16, 0.22, 900, 3200, 1.4, 'bandpass', undefined, pan);
        this.osc('sine', 300, 520, t, 0.1, 0.05, undefined, pan);
        break;
      case 'bump':
        this.osc('sine', 160, 90, t, 0.12, 0.2, undefined, pan);
        break;
      case 'up':
        // engine rev + a dusty whoosh as the wheels leave the road
        this.noise(t, 0.45, 0.28, 1800, 600, 0.7);
        this.osc('sawtooth', 110, 240, t, 0.3, 0.05);
        break;
      case 'down':
        this.osc('sawtooth', 500, 140, t, 0.22, 0.07);
        this.noise(t, 0.22, 0.18, 2500, 400, 0.8);
        break;
      case 'land':
        // tyres hit the road + a crunch of sand
        this.osc('sine', 120, 50, t, 0.18, 0.24);
        this.noise(t, 0.35, 0.3, 900, 200, 0.6, 'lowpass');
        break;
      case 'power':
        // pickup: a bright guitar strum + a spur jingle
        this.playBuf('strumD', t, 0.55, pan);
        this.playBuf('bell', t + 0.05, 0.12, pan, 1.5);
        break;
      case 'shield':
        this.osc('sine', 400, 900, t, 0.35, 0.12);
        this.osc('sine', 600, 1350, t + 0.04, 0.35, 0.06);
        break;
      case 'shieldBreak':
        this.noise(t, 0.45, 0.28, 3800, 1000, 1.6); // softer (v4.0)
        this.osc('triangle', 900, 200, t, 0.35, 0.12);
        break;
      case 'crash':
        // body hit + splintering wood + a metal clank
        this.noise(t, 0.6, 0.55, 2000, 120, 0.7, 'lowpass');
        this.osc('sine', 110, 35, t, 0.6, 0.42);
        this.noise(t + 0.02, 0.3, 0.3, 700, 300, 2.5, 'bandpass');
        this.playBuf('bellLow', t + 0.03, 0.14, 0, 0.55);
        break;
      case 'explode':
        this.noise(t, 1.2, 0.7, 1200, 60, 0.6, 'lowpass');
        this.osc('sine', 80, 25, t, 1.0, 0.5);
        break;
      case 'near':
        // whip crack: a fast rising swish ending in a sharp snap
        this.noise(t, 0.12, 0.22, 900, 5000, 1.5, 'bandpass', undefined, pan);
        this.noise(t + 0.11, 0.035, 0.2, 5000, 2600, 0.8, 'highpass', undefined, pan); // softer (v4.0: no harsh hiss)
        break;
      case 'ring':
        [0, 7, 12].forEach((n, i) => this.osc('sine', 880 * Math.pow(2, n / 12), 880 * Math.pow(2, n / 12), t + i * 0.04, 0.3, 0.09));
        break;
      case 'beep':
        // countdown: a saloon bell
        this.playBuf('bell', t, 0.4, 0, 0.67);
        break;
      case 'go':
        // starting pistol + ricochet, then the bell an octave up
        this.noise(t, 0.16, 0.7, 5000, 400, 0.7, 'lowpass');
        this.osc('sine', 140, 45, t, 0.18, 0.35);
        this.osc('sine', 2600, 1100, t + 0.06, 0.32, 0.035);
        this.playBuf('bell', t + 0.02, 0.32, 0, 1);
        break;
      case 'fanfare':
        // class promotion: a sheriff's bugle call (G – C – E – G, the last one held) over a drum roll
        this.noise(t, 0.8, 0.1, 1800, 1800, 0.6, 'bandpass');
        [[0, 0.16], [5, 0.16], [9, 0.16], [12, 0.7]].forEach(([n, d], i) => {
          const f = 392 * Math.pow(2, n / 12);
          this.osc('sawtooth', f, f, t + 0.12 + i * 0.17, d, 0.045);
          this.osc('triangle', f, f, t + 0.12 + i * 0.17, d, 0.07);
        });
        this.osc('sine', 1568, 1568, t + 0.75, 0.6, 0.04);
        break;
      case 'mission':
        // a full G-chord strum, then a banjo lick up the chord
        this.playBuf('strumG', t, 0.7);
        ['b1', 'b2', 'b3', 'b4'].forEach((k, i) => this.playBuf(k, t + 0.18 + i * 0.075, 0.42));
        break;
      case 'combo':
        // spur jingle
        this.playBuf('bell', t, 0.16, 0, 2);
        this.playBuf('bell', t + 0.05, 0.12, 0, 2.5);
        break;
      case 'click':
        // metal-on-wood UI click (a hammered bronze stud)
        this.osc('triangle', 1400, 900, t, 0.04, 0.06);
        this.noise(t, 0.03, 0.08, 3000, 1500, 2, 'bandpass');
        break;
      case 'turbo':
        // Dust Storm Nitro: engine roar + a rushing gust
        this.noise(t, 1.1, 0.35, 250, 2400, 0.7);
        this.osc('sawtooth', 70, 210, t, 0.8, 0.1);
        this.osc('square', 140, 260, t, 0.5, 0.03);
        break;
      case 'respawn':
        // back in the saddle: a quick banjo run up
        ['b1', 'b2', 'b3', 'b4'].forEach((k, i) => this.playBuf(k, t + i * 0.06, 0.4));
        break;
      case 'warp':
        // a new place: desert wind gust + a low guitar twang
        this.noise(t, 1.4, 0.26, 300, 1400, 0.8);
        this.playBuf('twang', t + 0.1, 0.5);
        break;
      case 'expire':
        this.osc('triangle', 700, 350, t, 0.25, 0.08);
        break;
    }
  }

  // ---------------------------------------------------------------- Western SFX buffers
  private buf(x: Float32Array) {
    const c = this.ctx!;
    const b = c.createBuffer(1, x.length, this.sr);
    b.getChannelData(0).set(x);
    return b;
  }
  private buildSfx(spread = false) {
    const make: [string, () => Float32Array][] = [
      ['bell', () => renderBell(this.sr, 1318, 0.9)],
      ['bellLow', () => renderBell(this.sr, 784, 1.2)],
      ['strumG', () => renderStrum(this.sr, [43, 50, 55, 59, 62, 67], 0.22, 0.018)],
      ['strumD', () => renderStrum(this.sr, [50, 57, 62, 66, 69], 0.22, 0.012)],
      ['twang', () => renderPluck(this.sr, 40, 0.5, 1.2)],
      ['b1', () => renderPluck(this.sr, 67, 0.9, 0.5)],
      ['b2', () => renderPluck(this.sr, 71, 0.9, 0.5)],
      ['b3', () => renderPluck(this.sr, 74, 0.9, 0.5)],
      ['b4', () => renderPluck(this.sr, 79, 0.9, 0.7)],
    ];
    if (!spread) {
      for (const [k, f] of make) this.sfxBufs[k] = this.buf(f());
      return;
    }
    // native: one buffer per step of the background queue (a missing one just stays silent until it is ready)
    bgAdd(
      'sfx:bank',
      () => {
        const j = make.shift();
        if (j && !this.sfxBufs[j[0]]) this.sfxBufs[j[0]] = this.buf(j[1]());
        return !make.length;
      },
      { prio: 3 },
    );
  }
  private playBuf(k: string, t: number, vol: number, pan = 0, rate = 1) {
    const c = this.ctx!;
    const b = this.sfxBufs[k];
    if (!b) return;
    if (this.rt) return bakeMix(this.rt, this.sr, b.getChannelData(0), b.sampleRate, t, vol, rate);
    const s = c.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(g);
    let out: AudioNode = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    out.connect(this.sfxBus);
    s.start(t);
  }

  // ---------------------------------------------------------------- music
  startMusic() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    void this.renderSongs();
    this.applyIntensity(-1);
  }
  stopMusic() {
    this.playing = false;
    for (const k of Object.keys(this.layers) as (keyof typeof this.layers)[]) this.stopLayer(k);
  }

  /** render the loops once, a few ms at a time (never a long frame); Home's loop first */
  private async renderSongs() {
    if (this.rendering || this.songs.camp) return;
    this.rendering = true;
    // v4.0.2: the loops render through the shared background queue (core/bgWork.ts) — small slices, one job at
    // a time, held while the player is touching the screen — instead of their own timers
    const run = <T,>(p: Plan<T>, name: string, prio: number) =>
      new Promise<T>((resolve, reject) => {
        let i = 0;
        bgAdd(
          name,
          () => {
            const j = p.jobs[i];
            if (j && j() !== false) i++; // false = a resumable note with more to do
            if (i < p.jobs.length) return false;
            try {
              resolve(p.done());
            } catch (e) {
              reject(e);
            }
            return true;
          },
          { prio },
        );
      });
    try {
      this.songs.camp = this.buf(await run(campPlan(this.sr), 'music:camp', 2));
      this.applyIntensity(-1);
      const ride = await run(ridePlan(this.sr), 'music:ride', 4);
      this.songs.base = this.buf(ride.base);
      this.songs.drums = this.buf(ride.drums);
      this.songs.nitro = this.buf(ride.nitro);
      this.applyIntensity(-1);
    } finally {
      this.rendering = false;
    }
  }

  /** v4.0 native: a gain fade in many small steps on a timer (no AudioParam automation there) */
  private fadeGain(g: GainNode, to: number, sec: number) {
    if (!this.baked) return false;
    const from = g.gain.value;
    const n = Math.max(1, Math.round((sec * 1000) / 16));
    let i = 0;
    const id = setInterval(() => {
      i++;
      try {
        g.gain.value = from + (to - from) * Math.min(1, i / n);
      } catch {
        /* read-only on some runtimes */
      }
      if (i >= n) clearInterval(id);
    }, 16);
    return true;
  }

  private stopLayer(k: keyof typeof this.layers, fade = 0.4) {
    const L = this.layers[k];
    if (!L || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.fadeGain(L.g, 0, fade)) {
      const src = L.src;
      setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      }, fade * 1000 + 60);
      delete this.layers[k];
      return;
    }
    L.g.gain.cancelScheduledValues(t);
    L.g.gain.setValueAtTime(L.g.gain.value, t);
    L.g.gain.linearRampToValueAtTime(0, t + fade);
    try {
      L.src.stop(t + fade + 0.05);
    } catch {
      /* already stopped */
    }
    delete this.layers[k];
  }

  /** start a set of layers together from the top of the loop (they stay in sync) */
  private startLayers(keys: (keyof typeof this.layers)[], vols: number[], fade = 0.6) {
    const c = this.ctx!;
    const t = c.currentTime + 0.06;
    keys.forEach((k, i) => {
      const b = this.songs[k];
      if (!b || this.layers[k]) return;
      const src = c.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = c.createGain();
      if (this.baked) {
        g.gain.value = 0;
        this.fadeGain(g, vols[i], fade);
      } else {
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vols[i], t + fade);
      }
      src.connect(g);
      g.connect(this.musicBus);
      g.connect(this.reverb);
      src.start(t);
      this.layers[k] = { src, g };
    });
  }

  private setLayer(k: keyof typeof this.layers, v: number, tc = 0.25) {
    const L = this.layers[k];
    if (!L || !this.ctx) return;
    if (this.fadeGain(L.g, v, tc * 3)) return;
    L.g.gain.setTargetAtTime(v, this.ctx.currentTime, tc);
  }

  private static VOL = { camp: 0.9, base: 0.85, drums: 0.7, nitro: 0.55 };

  /** Home ↔ race: crossfade songs (the race song starts from its top); Nitro adds the banjo layer */
  private applyIntensity(was: number) {
    if (!this.ctx || !this.playing) return;
    const V = Audio.VOL;
    const racing = this._intensity >= 1;
    if (!racing) {
      if (was >= 1 || was === -1) for (const k of ['base', 'drums', 'nitro'] as const) this.stopLayer(k, 0.8);
      if (this.songs.camp && !this.layers.camp) this.startLayers(['camp'], [V.camp], 1.2);
      return;
    }
    if (this.layers.camp) this.stopLayer('camp', 0.6);
    if (this.songs.base && !this.layers.base) {
      this.startLayers(['base', 'drums', 'nitro'], [V.base, V.drums, this._intensity >= 2 ? V.nitro : 0], 0.5);
      return;
    }
    this.setLayer('nitro', this._intensity >= 2 ? V.nitro : 0, this._intensity >= 2 ? 0.08 : 0.5);
  }
}

// ---------------------------------------------------------------- v4.0 native: offline renderers for the recipes
const env = (i: number, n: number, a: number, vol: number) => {
  // exponential attack 0.0001 → vol over `a` samples, then exponential decay to 0.0001 at n (as the live ramps)
  if (i < a) return 0.0001 * Math.pow(vol / 0.0001, i / a);
  return vol * Math.pow(0.0001 / vol, (i - a) / Math.max(1, n - a));
};
function bakeOsc(out: Float32Array, sr: number, type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number) {
  const s0 = Math.round(t0 * sr);
  const n = Math.round(dur * sr);
  const a = Math.max(1, Math.round(0.008 * sr));
  const fe = Math.max(20, f1);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const f = f0 === f1 ? f0 : f0 * Math.pow(fe / f0, i / n);
    ph += f / sr;
    ph -= Math.floor(ph);
    let v: number;
    if (type === 'sine') v = Math.sin(ph * Math.PI * 2);
    else if (type === 'triangle') v = 1 - 4 * Math.abs(ph - 0.5);
    else if (type === 'square') v = ph < 0.5 ? 0.8 : -0.8;
    else v = 2 * ph - 1; // sawtooth
    if (s0 + i >= 0) out[s0 + i] += v * env(i, n, a, vol);
  }
}
function bakeNoise(out: Float32Array, sr: number, t0: number, dur: number, vol: number, f0: number, f1: number, q: number, type: BiquadFilterType) {
  const s0 = Math.round(t0 * sr);
  const n = Math.round(dur * sr);
  const a = Math.max(1, Math.round(0.01 * sr));
  const fe = Math.max(30, f1);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    if (i % 32 === 0) {
      // RBJ biquad, frequency swept exponentially (as the live filter)
      const f = Math.min(sr * 0.45, f0 * Math.pow(fe / f0, i / n));
      const w = (2 * Math.PI * f) / sr;
      const cs = Math.cos(w);
      const al = Math.sin(w) / (2 * Math.max(0.0001, q));
      const a0 = 1 + al;
      if (type === 'lowpass') {
        b0 = (1 - cs) / 2 / a0; b1 = (1 - cs) / a0; b2 = b0;
      } else if (type === 'highpass') {
        b0 = (1 + cs) / 2 / a0; b1 = -(1 + cs) / a0; b2 = b0;
      } else {
        b0 = al / a0; b1 = 0; b2 = -al / a0;
      }
      a1 = (-2 * cs) / a0;
      a2 = (1 - al) / a0;
    }
    const x = Math.random() * 2 - 1;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    if (s0 + i >= 0) out[s0 + i] += y * env(i, n, a, vol);
  }
}
function bakeMix(out: Float32Array, sr: number, src: Float32Array, srcSr: number, t0: number, vol: number, rate: number) {
  const s0 = Math.round(t0 * sr);
  const step = (rate * srcSr) / sr;
  for (let i = 0, p = 0; p < src.length - 1 && s0 + i < out.length; i++, p += step) {
    const k = Math.floor(p);
    const fr = p - k;
    if (s0 + i >= 0) out[s0 + i] += (src[k] * (1 - fr) + src[k + 1] * fr) * vol;
  }
}
