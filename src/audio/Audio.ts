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
import { campPlan, ridePlan, renderBell, renderPluck, renderStrum, type Plan } from './westernSynth.ts';

/** render rate of the music / SFX buffers (guitar, whistle, drums sound complete at 24 kHz) */
const SYNTH_SR = 24000;
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
        this.ctx.resume().catch(() => undefined);
        this.prime();
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
    if (c.state !== 'running') c.resume().catch(() => undefined);
    this.master = c.createGain();
    this.master.gain.value = 0.8;
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
    const ir = c.createBuffer(2, Math.round(c.sampleRate * 1.8), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const k = i / d.length;
        lp += (Math.random() * 2 - 1 - lp) * (0.5 - k * 0.42);
        d[i] = lp * Math.pow(1 - k, 2.6) * (i < c.sampleRate * 0.012 ? 0 : 1);
      }
    }
    this.reverb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.22;
    this.reverb.connect(wet).connect(this.musicBus);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.buildSfx();
    for (const [n, u] of this.pendingOverrides) void this.loadOverride(n, u);
    this.pendingOverrides.length = 0;
    this.prime();
    if (c.state === 'running') queueMicrotask(() => this.onRunning?.());
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
      if (c.state === 'running') c.suspend().catch(() => undefined);
    } else if (c.state !== 'running') c.resume().catch(() => undefined);
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
    if (this.ctx) this.master.gain.value = on ? 0 : 0.8;
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.value = on ? 0.42 : 0;
  }

  // ---------------------------------------------------------------- helpers
  private osc(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, bus?: AudioNode, pan = 0) {
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
    switch (name) {
      case 'coin': {
        // gold "ching": bright metal ping + a short shimmer; rising pitch on fast streaks
        if (t - this.coinPitchT > 0.6) this.coinPitch = 0;
        this.coinPitchT = t;
        const base = 1568 * Math.pow(2, Math.min(this.coinPitch, 12) / 24);
        this.coinPitch++;
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
        this.noise(t, 0.45, 0.4, 6000, 1200, 2);
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
        this.noise(t + 0.11, 0.035, 0.5, 6000, 3000, 0.8, 'highpass', undefined, pan);
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
    const b = c.createBuffer(1, x.length, SYNTH_SR);
    b.getChannelData(0).set(x);
    return b;
  }
  private buildSfx() {
    this.sfxBufs = {
      bell: this.buf(renderBell(SYNTH_SR, 1318, 0.9)),
      bellLow: this.buf(renderBell(SYNTH_SR, 784, 1.2)),
      strumG: this.buf(renderStrum(SYNTH_SR, [43, 50, 55, 59, 62, 67], 0.22, 0.018)),
      strumD: this.buf(renderStrum(SYNTH_SR, [50, 57, 62, 66, 69], 0.22, 0.012)),
      twang: this.buf(renderPluck(SYNTH_SR, 40, 0.5, 1.2)),
      b1: this.buf(renderPluck(SYNTH_SR, 67, 0.9, 0.5)),
      b2: this.buf(renderPluck(SYNTH_SR, 71, 0.9, 0.5)),
      b3: this.buf(renderPluck(SYNTH_SR, 74, 0.9, 0.5)),
      b4: this.buf(renderPluck(SYNTH_SR, 79, 0.9, 0.7)),
    };
  }
  private playBuf(k: string, t: number, vol: number, pan = 0, rate = 1) {
    const c = this.ctx!;
    const b = this.sfxBufs[k];
    if (!b) return;
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
    const run = async <T,>(p: Plan<T>) => {
      let t0 = performance.now();
      for (const j of p.jobs) {
        j();
        if (performance.now() - t0 > 6) {
          await new Promise((r) => setTimeout(r, 0));
          t0 = performance.now();
        }
      }
      return p.done();
    };
    try {
      this.songs.camp = this.buf(await run(campPlan(SYNTH_SR)));
      this.applyIntensity(-1);
      const ride = await run(ridePlan(SYNTH_SR));
      this.songs.base = this.buf(ride.base);
      this.songs.drums = this.buf(ride.drums);
      this.songs.nitro = this.buf(ride.nitro);
      this.applyIntensity(-1);
    } finally {
      this.rendering = false;
    }
  }

  private stopLayer(k: keyof typeof this.layers, fade = 0.4) {
    const L = this.layers[k];
    if (!L || !this.ctx) return;
    const t = this.ctx.currentTime;
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
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vols[i], t + fade);
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
