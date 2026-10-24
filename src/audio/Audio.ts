/**
 * Procedural Web Audio: every SFX is synthesized, plus a small sequencer for the music.
 * v1.0.0 (3D Car Run): an original Western soundtrack (plucked-string guitar, boom-chicka bass,
 * whistle lead, train-beat brushes) and a desert-wind bed — all generated, no samples, no licensed
 * material. Any SFX can be overridden by a real file via `loadOverride(name, url)` (assets/manifest.ts).
 */
export type Sfx =
  | 'coin' | 'lane' | 'up' | 'down' | 'land' | 'power' | 'shield' | 'shieldBreak' | 'crash' | 'explode'
  | 'near' | 'ring' | 'beep' | 'go' | 'mission' | 'click' | 'turbo' | 'respawn' | 'bump' | 'combo' | 'warp' | 'expire' | 'fanfare';

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
  // music
  private seqTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private bpm = 112;
  /** warm lowpass + echo for the music (pads / arp) */
  private musicTone!: BiquadFilterNode;
  private echo!: GainNode;
  intensity = 0; // 0 menu, 1 run, 2 turbo
  private playing = false;

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
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    c.addEventListener('statechange', () => {
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
    this.musicBus.gain.value = this.musicOn ? 0.32 : 0;
    this.musicBus.connect(this.master);
    // soft, airy mix: everything melodic goes through a gentle lowpass; the arp also feeds a
    // dotted-eighth echo so it shimmers like a road at night
    this.musicTone = c.createBiquadFilter();
    this.musicTone.type = 'lowpass';
    this.musicTone.frequency.value = 2600;
    this.musicTone.Q.value = 0.5;
    this.musicTone.connect(this.musicBus);
    this.echo = c.createGain();
    this.echo.gain.value = 0.55;
    const dl = c.createDelay(1);
    dl.delayTime.value = (60 / this.bpm) * 0.75;
    const fb = c.createGain();
    fb.gain.value = 0.32;
    const damp = c.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;
    this.echo.connect(dl).connect(damp).connect(fb).connect(dl);
    damp.connect(this.musicTone);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
    if (this.ctx) this.musicBus.gain.value = on ? 0.32 : 0;
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
        [0, 4, 7, 12].forEach((n, i) => this.osc('triangle', 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), t + i * 0.055, 0.2, 0.12));
        this.noise(t, 0.4, 0.08, 4000, 9000, 1);
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
        this.noise(t, 0.6, 0.6, 2000, 120, 0.7, 'lowpass');
        this.osc('sine', 110, 35, t, 0.6, 0.45);
        break;
      case 'explode':
        this.noise(t, 1.2, 0.7, 1200, 60, 0.6, 'lowpass');
        this.osc('sine', 80, 25, t, 1.0, 0.5);
        break;
      case 'near':
        this.noise(t, 0.18, 0.3, 3000, 8000, 3, 'bandpass', undefined, pan);
        this.osc('square', 1800, 2600, t, 0.08, 0.04);
        break;
      case 'ring':
        [0, 7, 12].forEach((n, i) => this.osc('sine', 880 * Math.pow(2, n / 12), 880 * Math.pow(2, n / 12), t + i * 0.04, 0.3, 0.09));
        break;
      case 'beep':
        this.osc('square', 660, 660, t, 0.12, 0.08);
        break;
      case 'go':
        this.osc('square', 1320, 1320, t, 0.3, 0.09);
        this.osc('sawtooth', 660, 1320, t, 0.3, 0.05);
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
        [0, 4, 7, 12, 16].forEach((n, i) => this.osc('square', 660 * Math.pow(2, n / 12), 660 * Math.pow(2, n / 12), t + i * 0.08, 0.22, 0.06));
        break;
      case 'combo':
        this.osc('triangle', 880, 1760, t, 0.18, 0.09);
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
        [12, 7, 4, 0].reverse().forEach((n, i) => this.osc('sine', 440 * Math.pow(2, n / 12), 440 * Math.pow(2, n / 12), t + i * 0.07, 0.3, 0.1));
        break;
      case 'warp':
        // a new place: desert wind gust + a twang
        this.noise(t, 1.4, 0.32, 300, 1400, 0.8);
        this.pluckKS(52, t + 0.1, 0.16, this.sfxBus);
        break;
      case 'expire':
        this.osc('triangle', 700, 350, t, 0.25, 0.08);
        break;
    }
  }

  // ---------------------------------------------------------------- music
  startMusic() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.seqTimer = window.setInterval(() => this.schedule(), 25);
  }
  stopMusic() {
    this.playing = false;
    if (this.seqTimer !== null) window.clearInterval(this.seqTimer);
    this.seqTimer = null;
    if (this.wind) {
      try {
        this.wind.src.stop();
      } catch {
        /* not started */
      }
      this.wind = null;
    }
  }

  private schedule() {
    const c = this.ctx;
    if (!c) return;
    const spb = 60 / this.bpm / 4; // 16th notes
    while (this.nextTime < c.currentTime + 0.12) {
      this.note(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step = (this.step + 1) % 128;
    }
  }





  /**
   * Plucked string (Karplus-Strong): a short noise burst into a tuned feedback delay with a lowpass in
   * the loop — a nylon / steel guitar twang. Each note owns its tiny graph and stops itself.
   */
  private pluckKS(midi: number, t0: number, vol: number, out: AudioNode, bright = 2600, sustain = 0.985) {
    const c = this.ctx!;
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const burst = c.createGain();
    burst.gain.setValueAtTime(vol, t0);
    burst.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(0.02, 2 / hz + 0.004));
    const dl = c.createDelay(0.1);
    dl.delayTime.value = 1 / hz;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bright;
    const fb = c.createGain();
    fb.gain.value = sustain;
    const env = c.createGain();
    env.gain.setValueAtTime(1, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    src.connect(burst).connect(dl);
    dl.connect(lp).connect(fb).connect(dl);
    lp.connect(env).connect(out);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + 0.03);
    // tear the loop down after the note has died
    window.setTimeout(() => {
      try {
        fb.disconnect();
        env.disconnect();
      } catch {
        /* already gone */
      }
    }, Math.max(0, (t0 - c.currentTime + 1.6) * 1000));
  }

  /** whistle lead (sine with a slow vibrato), sent to the echo — the lone rider */
  private whistle(midi: number, t0: number, dur: number, vol: number) {
    const c = this.ctx!;
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = c.createGain();
    lg.gain.setValueAtTime(0, t0);
    lg.gain.linearRampToValueAtTime(hz * 0.012, t0 + dur * 0.5);
    lfo.connect(lg).connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.06);
    g.gain.setValueAtTime(vol, t0 + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.musicTone);
    g.connect(this.echo);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
  }

  /** desert wind bed: looping noise through a slowly wandering bandpass (very quiet) */
  private wind: { src: AudioBufferSourceNode; g: GainNode } | null = null;
  private startWind() {
    const c = this.ctx;
    if (!c || this.wind) return;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.7;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = c.createGain();
    lg.gain.value = 260;
    lfo.connect(lg).connect(bp.frequency);
    const g = c.createGain();
    g.gain.value = 0.045;
    src.connect(bp).connect(g).connect(this.musicBus);
    src.start();
    lfo.start();
    this.wind = { src, g };
  }

  /**
   * Original procedural Western soundtrack (no samples, no licensed material → safe for commercial use).
   * Andalusian cadence Am – G – F – E at 112 bpm: boom-chicka bass + strummed chords (plucked strings),
   * a whistle melody on the open road, train-beat brushes and a soft kick while racing.
   * Intensity 0 = menu (guitar + whistle), 1 = run (drums + bass drive), 2 = Nitro (double-time strum).
   */
  private note(step: number, t: number, spb: number) {
    const bus = this.musicBus;
    this.startWind();
    // Am – G – F – E (the E bar takes the major third, G#)
    const roots = [45, 43, 41, 40];
    const chords = [
      [0, 7, 12, 15, 19],
      [0, 7, 12, 16, 19],
      [0, 7, 12, 16, 19],
      [0, 7, 12, 16, 20],
    ];
    const bar = Math.floor(step / 16) % 4;
    const phrase = Math.floor(step / 64) % 2;
    const root = roots[bar];
    const ch = chords[bar];
    const s = step % 16;
    const run = this.intensity >= 1;
    // boom: bass root on 1, fifth on 3 (and the pickup in the run)
    if (s === 0 || s === 8 || (run && s === 14)) {
      const m = root + (s === 8 ? 7 : s === 14 ? 12 : 0);
      this.pluckKS(m, t, run ? 0.5 : 0.36, this.musicTone, 900, 0.992);
    }
    // chicka: strummed upper chord on the off-beats (a quick down-strum = 5 strings 12 ms apart)
    const strum = this.intensity >= 2 ? s % 2 === 1 : s === 4 || s === 12 || (run && (s === 6 || s === 14));
    if (strum) ch.slice(1).forEach((iv, i) => this.pluckKS(root + 12 + iv, t + i * 0.012, run ? 0.16 : 0.12, this.musicTone, 3200, 0.975));
    // whistle melody (A minor pentatonic, two phrases) — sparse, with space between lines
    const mel = phrase === 0 ? [[0, 69, 6], [6, 72, 2], [8, 76, 8]] : [[0, 74, 4], [4, 72, 4], [8, 69, 8]];
    if (bar % 2 === 0 || !run)
      for (const [at, m, len] of mel) if (s === at && (bar < 3 || phrase === 1)) this.whistle(m + (bar === 3 ? -1 : 0), t, spb * len * 0.95, run ? 0.035 : 0.045);
    if (!run) return;
    // soft kick on 1 and 3 (and 2 / 4 with Nitro)
    if (s % 8 === 0 || (this.intensity >= 2 && s % 4 === 0)) this.osc('sine', 100, 40, t, 0.22, 0.3, bus);
    // train-beat brushes: 16ths with accents on the off-beats
    this.noise(t, 0.05, s % 4 === 2 ? 0.07 : 0.025, 5200, 4200, 0.9, 'bandpass', bus);
    // rim-click on 2 and 4
    if (s === 4 || s === 12) this.osc('triangle', 1700, 900, t, 0.04, 0.05, bus);
  }
}
