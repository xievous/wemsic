/**
 * Wemsic's sound effects: a neo-soul band generated with the Web Audio API
 * (electric piano with a vibes double, round bass, punchy drums, a little
 * room). No audio files. Every moment is a short phrase at 118 BPM built on
 * one four-note hook, so the game has a sound of its own.
 */

export type SfxName =
  | 'countBeat' // 3, 2, 1 before the game; arg = the number
  | 'go'
  | 'lockIn'
  | 'someone' // another player answered (big screen); arg = how many have
  | 'tick' // last 5 seconds; arg = seconds left
  | 'reveal'
  | 'correct'
  | 'wrong'
  | 'winner';

/** One 16th note at 118 BPM. */
const S = 60 / 118 / 4;
/** Late 16ths are pushed back this much, for the swing. */
const SWING = 0.035;
/** The wemsic hook: E G A C. */
const HOOK = [76, 79, 81, 84] as const;
/** Notes for "someone answered", climbing as more players lock in. */
const ANSWER_NOTES = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93] as const;
/** Bass for the last five seconds, climbing as time runs out (5 down to 1). */
const TICK_BASS = [45, 47, 48, 50, 52] as const;

const AM9 = [60, 64, 67, 71];
const FMAJ9 = [57, 64, 67, 72];
const G6 = [59, 62, 67, 69];
const CMAJ9 = [59, 62, 64, 67];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const step = (n: number) => n * S + (n % 2 === 1 ? SWING : 0);

export class SfxEngine {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly bus: GainNode;
  private start = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    this.master.connect(limiter).connect(ctx.destination);

    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const room = ctx.createConvolver();
    room.buffer = this.roomImpulse(1.1);
    const wet = ctx.createGain();
    wet.gain.value = 0.14;
    this.bus.connect(room).connect(wet).connect(this.master);
  }

  /** Play one moment at `volume` (0 to 1). */
  play(name: SfxName, arg = 0, volume = 1): void {
    this.master.gain.value = volume;
    this.start = this.ctx.currentTime + 0.02;
    switch (name) {
      case 'countBeat': {
        const note = HOOK[Math.max(0, Math.min(2, 3 - arg))]!;
        this.lead(note, 0, 0.16);
        this.kick(0, 0.8);
        [0.25, 0.5, 0.75].forEach((t) => this.hat(t));
        break;
      }
      case 'go':
        this.lead(HOOK[3], 0, 0.55);
        this.chord(AM9, 0, 0.55);
        this.bass(45, 0);
        this.kick(0);
        this.snare(0);
        this.crash(0);
        break;
      case 'lockIn':
        this.rim(0, 0.15);
        this.lead(79, 0, 0.07);
        this.lead(84, S, 0.14);
        break;
      case 'someone':
        this.lead(ANSWER_NOTES[Math.max(0, arg - 1) % ANSWER_NOTES.length]!, 0, 0.12);
        this.hat(0, 0.07);
        break;
      case 'tick':
        this.kick(0, 0.8);
        this.bass(TICK_BASS[Math.max(0, Math.min(4, 5 - arg))]!, 0);
        this.hat(0.25);
        break;
      case 'reveal': {
        [0, 1, 2, 3].forEach((n) => this.snare(step(n), 0.14 + n * 0.07));
        const t = step(4);
        this.crash(t);
        this.kick(t);
        this.chord(AM9, t, 0.45);
        this.bass(45, t);
        this.lead(84, t, 0.3);
        break;
      }
      case 'correct': {
        HOOK.forEach((m, k) => this.lead(m, step(k), 0.1));
        const t = step(4);
        this.lead(88, t, 0.5);
        this.chord(CMAJ9, t, 0.5);
        this.bass(48, t);
        this.kick(t);
        this.snare(t);
        break;
      }
      case 'wrong':
        [84, 81, 79].forEach((m, k) => this.lead(m, step(k), 0.1));
        this.ep(70, step(3), 0.15, 0.15);
        this.ep(66, step(3) + 0.13, 0.7, 0.15);
        this.bass(41, step(3));
        break;
      case 'winner':
        this.winner();
        break;
    }
  }

  private winner(): void {
    // One bar of the groove, then the hook resolves over a big chord.
    for (let n = 0; n < 16; n++) {
      const t = step(n);
      if ([0, 7, 10].includes(n)) this.kick(t);
      if ([4, 12].includes(n)) this.snare(t);
      this.shaker(t, n % 4 === 2 ? 0.08 : 0.05);
    }
    for (const [n, m] of [[0, 41], [3, 41], [6, 53], [8, 43], [11, 43], [14, 55]] as const) {
      this.bass(m, step(n));
    }
    for (const [n, c] of [[2, FMAJ9], [6, FMAJ9], [10, G6], [14, G6]] as const) {
      this.chord(c, step(n), 0.12);
    }
    for (const [n, m] of [[0, 76], [2, 79], [3, 81], [4, 84], [8, 81], [10, 84], [11, 86]] as const) {
      this.lead(m, step(n), 0.12);
    }
    const end = 16 * S;
    this.lead(88, end, 0.9);
    this.chord(CMAJ9, end, 0.9);
    this.bass(36, end);
    this.kick(end);
    this.snare(end);
    this.crash(end, 0.18);
  }

  // ---- the band ----

  /** Electric piano with a soft vibes double an octave up. */
  private lead(m: number, t: number, dur: number): void {
    this.ep(m, t, Math.max(dur, 0.45), 0.17);
    this.vibes(m + 12, t, dur + 0.3);
  }

  private chord(notes: readonly number[], t: number, dur: number): void {
    notes.forEach((m) => this.ep(m, t, Math.max(dur, 0.4), 0.09));
  }

  /** Two-operator FM electric piano with a bell-like tine. */
  private ep(m: number, t: number, dur: number, v: number): void {
    const at = this.start + t;
    const f = hz(m);
    const end = at + dur + 0.05;
    const car = this.osc('sine', f, at, end);
    const mod = this.osc('sine', f, at, end);
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(f * 1.8, at);
    depth.gain.exponentialRampToValueAtTime(f * 0.08 + 1, at + 0.3);
    mod.connect(depth).connect(car.frequency);
    car.connect(this.env(at, 0.004, v, dur));
    this.osc('sine', f * 7.1, at, at + 0.12).connect(this.env(at, 0.002, v * 0.12, 0.1));
  }

  private vibes(m: number, t: number, dur: number): void {
    const at = this.start + t;
    this.osc('sine', hz(m), at, at + dur + 0.05).connect(this.env(at, 0.003, 0.06, dur));
  }

  /** A round bass note that scoops up into pitch. */
  private bass(m: number, t: number): void {
    const at = this.start + t;
    const f = hz(m);
    const end = at + 0.27;
    const out = this.env(at, 0.006, 0.5, 0.22);
    const body = this.osc('sine', f * 0.94, at, end);
    body.frequency.exponentialRampToValueAtTime(f, at + 0.03);
    body.connect(out);
    this.osc('triangle', f, at, end).connect(out);
  }

  private kick(t: number, v = 0.95): void {
    this.tone(170, t, 0.28, v, 'sine', 46);
    this.noise(t, 0.012, 0.22, 'highpass', 4000);
  }

  private snare(t: number, v = 0.4): void {
    this.noise(t, 0.14, v, 'bandpass', 2000, 0.7);
    this.tone(230, t, 0.07, v * 0.6, 'triangle', 170);
  }

  private rim(t: number, v = 0.2): void {
    this.tone(1750, t, 0.025, v, 'triangle');
    this.noise(t, 0.02, v * 0.6, 'bandpass', 3500, 3);
  }

  private hat(t: number, v = 0.11): void {
    this.noise(t, 0.035, v, 'highpass', 8000);
  }

  private shaker(t: number, v: number): void {
    this.noise(t, 0.05, v, 'highpass', 6500, 1, 0.012);
  }

  private crash(t: number, v = 0.15): void {
    this.noise(t, 1.2, v, 'highpass', 5200, 1, 0.003);
  }

  // ---- building blocks ----

  private osc(type: OscillatorType, f: number, at: number, end: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    o.start(at);
    o.stop(end);
    return o;
  }

  /** A gain node into the band bus that swells to `peak` and dies away over `dur`. */
  private env(at: number, attack: number, peak: number, dur: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(this.bus);
    return g;
  }

  private tone(f: number, t: number, dur: number, v: number, type: OscillatorType, to?: number): void {
    const at = this.start + t;
    const o = this.osc(type, f, at, at + dur + 0.03);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    o.connect(this.env(at, 0.002, v, dur));
  }

  private noise(
    t: number,
    dur: number,
    v: number,
    type: BiquadFilterType,
    f: number,
    q = 1,
    attack = 0.002,
  ): void {
    const at = this.start + t;
    const length = Math.ceil(this.ctx.sampleRate * (dur + 0.02));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.value = f;
    src.connect(filter).connect(this.env(at, attack, v, dur));
    src.start(at);
  }

  private roomImpulse(seconds: number): AudioBuffer {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
    }
    return buffer;
  }
}
