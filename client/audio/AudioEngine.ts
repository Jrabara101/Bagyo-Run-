/**
 * All game sound, synthesized with Web Audio (no audio files, per the competition rules):
 * a kulintang-style music loop, a rain and wind bed that follows the signal level, a siren when
 * the signal rises, and short effects for every game event.
 *
 * Buses: sfx and music (the music bus also carries the rain and wind) feed a master gain.
 * The AudioContext is created on the first user gesture, as browsers require.
 */

/** Kulintang gong set: a pentatonic row, roughly C D E G A across two octaves (Hz). */
const GONGS = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
/** Eight gongs, sixteen steps; -1 is a rest. Two phrases that answer each other. */
const MELODY_A = [0, -1, 2, 3, 4, -1, 3, 2, 0, 2, 3, -1, 2, 1, 0, -1];
const MELODY_B = [5, -1, 4, 3, 4, -1, 5, 6, 7, -1, 6, 4, 3, 2, 1, -1];
/** Low agung on these steps, dabakan drum on these. */
const AGUNG_STEPS = new Set([0, 8]);
const DRUM_STEPS = new Set([2, 6, 10, 13, 14]);

const LOOKAHEAD_SEC = 0.25;
const SCHEDULE_MS = 60;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private melodyGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;

  private volumes = { master: 0.7, sfx: 0.8, music: 0.6 };
  private muted = false;
  private step = 0;
  private bar = 0;
  private nextStepTime = 0;
  private bpm = 96;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private weather = { rain: 0.15, wind: 0.1 };

  /** Call from a user gesture (click, key, tap). Safe to call repeatedly. */
  public unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.connect(this.master);
      this.music = ctx.createGain();
      this.music.connect(this.master);
      this.melodyGain = ctx.createGain();
      this.melodyGain.gain.value = 0;
      this.melodyGain.connect(this.music);
      this.noise = this.makeNoise(2);
      this.buildWeatherBed();
      this.applyVolumes();
      this.applyWeather();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.startMusicClock();
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.volumes = { master, sfx, music };
    this.applyVolumes();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.applyVolumes();
  }

  /** Rain and wind loudness (0..1) and the music tempo follow the signal. */
  public setWeather(rain: number, wind: number, signal: number) {
    this.weather = { rain, wind };
    this.bpm = 92 + (signal - 1) * 10;
    this.applyWeather();
  }

  /** Music in: full during a run, soft on the title and results screens. */
  public setMusicLevel(level: 'run' | 'menu' | 'off') {
    if (!this.ctx || !this.melodyGain) return;
    const target = level === 'run' ? 0.5 : level === 'menu' ? 0.28 : 0;
    this.melodyGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  // ------------------------------------------------------------------ effects

  public footstep(splash: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (splash) this.noiseBurst(ctx.currentTime, 0.09, 'bandpass', 1400, 600, 0.12);
    else this.noiseBurst(ctx.currentTime, 0.05, 'lowpass', 500, 200, 0.1);
  }

  /** Bamboo knock rising: the jump. */
  public jump() {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 'triangle', 330, 660, 0.14, 0.28);
    this.noiseBurst(t, 0.03, 'bandpass', 2400, 2400, 0.08);
  }

  public slide() {
    const t = this.now();
    if (t === null) return;
    this.noiseBurst(t, 0.22, 'bandpass', 1800, 400, 0.3);
  }

  public laneShift() {
    const t = this.now();
    if (t === null) return;
    this.noiseBurst(t, 0.07, 'bandpass', 900, 1500, 0.14);
  }

  /** A small kulintang ding for supplies. */
  public supply() {
    const t = this.now();
    if (t === null) return;
    this.gong(t, GONGS[5], 0.18, 0.35, this.sfx);
  }

  /** Two gongs up for a Go-Bag item. */
  public goBagItem() {
    const t = this.now();
    if (t === null) return;
    this.gong(t, GONGS[4], 0.3, 0.6, this.sfx);
    this.gong(t + 0.09, GONGS[7], 0.3, 0.8, this.sfx);
  }

  public powerUp() {
    const t = this.now();
    if (t === null) return;
    [3, 5, 7].forEach((g, i) => this.gong(t + i * 0.06, GONGS[g], 0.22, 0.5, this.sfx));
  }

  public nearMiss() {
    const t = this.now();
    if (t === null) return;
    this.noiseBurst(t, 0.18, 'highpass', 3000, 6000, 0.12);
    this.tone(t, 'sine', 1200, 1800, 0.12, 0.08);
  }

  /** Thud and splash: a hazard took a heart. */
  public hit() {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 'sine', 140, 45, 0.35, 0.7);
    this.noiseBurst(t, 0.3, 'lowpass', 1200, 300, 0.4);
  }

  public shieldAbsorbed() {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 'triangle', 500, 250, 0.2, 0.3);
    this.gong(t + 0.05, GONGS[2], 0.2, 0.5, this.sfx);
  }

  /** Two-tone radio alert as a quiz question appears. */
  public gateShown() {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 'square', 880, 880, 0.09, 0.08);
    this.tone(t + 0.12, 'square', 660, 660, 0.09, 0.08);
  }

  public gateCorrect() {
    const t = this.now();
    if (t === null) return;
    [0, 2, 4, 7].forEach((g, i) => this.gong(t + i * 0.08, GONGS[g], 0.3, 0.7, this.sfx));
  }

  public gateWrong() {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 'sawtooth', 220, 180, 0.25, 0.12);
    this.tone(t + 0.22, 'sawtooth', 175, 140, 0.35, 0.12);
  }

  public bayanihan() {
    const t = this.now();
    if (t === null) return;
    [0, 2, 4].forEach((g) => this.gong(t, GONGS[g] / 2, 0.5, 1.4, this.sfx));
    [3, 5, 7].forEach((g, i) => this.gong(t + 0.15 + i * 0.1, GONGS[g], 0.3, 0.8, this.sfx));
  }

  public goBagComplete() {
    const t = this.now();
    if (t === null) return;
    [0, 2, 3, 4, 5, 7].forEach((g, i) => this.gong(t + i * 0.07, GONGS[g], 0.28, 0.9, this.sfx));
  }

  /** Warning siren as the signal goes up: louder and longer at higher signals. */
  public siren(level: number) {
    const ctx = this.ctx;
    const t = this.now();
    if (!ctx || t === null || !this.sfx) return;
    const cycles = level >= 4 ? 3 : 2;
    const cycle = 0.9;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    for (let i = 0; i < cycles; i++) {
      osc.frequency.setValueAtTime(420, t + i * cycle);
      osc.frequency.linearRampToValueAtTime(880, t + i * cycle + cycle * 0.55);
      osc.frequency.linearRampToValueAtTime(420, t + (i + 1) * cycle);
    }
    const peak = 0.06 + level * 0.025;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.15);
    gain.gain.setValueAtTime(peak, t + cycles * cycle - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + cycles * cycle);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    osc.start(t);
    osc.stop(t + cycles * cycle + 0.05);
  }

  /** Arrival at the evacuation center. */
  public finish() {
    const t = this.now();
    if (t === null) return;
    const line = [0, 2, 4, 5, 4, 5, 7];
    line.forEach((g, i) => this.gong(t + i * 0.13, GONGS[g], 0.32, 1.2, this.sfx));
    this.gong(t, GONGS[0] / 4, 0.6, 2.5, this.sfx);
  }

  public rescued() {
    const t = this.now();
    if (t === null) return;
    [4, 3, 2, 0].forEach((g, i) => this.gong(t + i * 0.18, GONGS[g], 0.28, 1, this.sfx));
  }

  // ------------------------------------------------------------------ internals

  private now(): number | null {
    return this.ctx ? this.ctx.currentTime : null;
  }

  private applyVolumes() {
    if (!this.ctx || !this.master || !this.sfx || !this.music) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music, t, 0.05);
  }

  private applyWeather() {
    if (!this.ctx || !this.rainGain || !this.windGain || !this.windFilter) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(0.05 + this.weather.rain * 0.3, t, 1.2);
    this.windGain.gain.setTargetAtTime(0.03 + this.weather.wind * 0.35, t, 1.2);
    this.windFilter.Q.setTargetAtTime(1 + this.weather.wind * 4, t, 1.2);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Looping rain hiss and a gusting wind howl, both on the music bus. */
  private buildWeatherBed() {
    const ctx = this.ctx!;
    const rain = ctx.createBufferSource();
    rain.buffer = this.noise;
    rain.loop = true;
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.value = 700;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.value = 7000;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rainHp).connect(rainLp).connect(this.rainGain).connect(this.music!);
    rain.start();

    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    wind.playbackRate.value = 0.7;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.13;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 260;
    gust.connect(gustDepth).connect(this.windFilter.frequency);
    gust.start();
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.music!);
    wind.start();
  }

  private startMusicClock() {
    if (this.scheduler || !this.ctx) return;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduler = setInterval(() => this.scheduleMusic(), SCHEDULE_MS);
  }

  /** Schedules the sixteenth-note steps that fall inside the lookahead window. */
  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.melodyGain) return;
    const stepSec = 60 / this.bpm / 4;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const t = this.nextStepTime;
      const melody = this.bar % 4 === 3 ? MELODY_B : MELODY_A;
      const g = melody[this.step];
      if (g >= 0) this.gong(t, GONGS[g], 0.22, 0.55, this.melodyGain);
      // Babandil: the steady metallic tick that keeps time
      if (this.step % 2 === 0) this.tick(t, this.step % 4 === 0 ? 0.05 : 0.025);
      if (AGUNG_STEPS.has(this.step)) this.gong(t, 87.3, 0.45, 1.6, this.melodyGain);
      if (DRUM_STEPS.has(this.step)) this.drum(t);
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar += 1;
      this.nextStepTime += stepSec;
    }
  }

  /** A struck gong: fundamental, an inharmonic overtone and a quick bright attack. */
  private gong(t: number, freq: number, level: number, decay: number, bus: AudioNode | null) {
    const ctx = this.ctx;
    if (!ctx || !bus) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + 0.005);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    out.connect(bus);
    const partials: [number, number][] = [[1, 1], [2.76, 0.35], [5.4, 0.12]];
    for (const [ratio, amp] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio * 1.005, t);
      osc.frequency.exponentialRampToValueAtTime(freq * ratio, t + 0.08);
      g.gain.value = amp;
      if (ratio > 1) {
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.35);
      }
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }

  private tick(t: number, level: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1568;
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(this.melodyGain!);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** Dabakan: a skin drum, noise through a low band plus a pitched thump. */
  private drum(t: number) {
    const ctx = this.ctx!;
    this.noiseBurst(t, 0.12, 'bandpass', 260, 180, 0.35, this.melodyGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(this.melodyGain!);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private tone(t: number, type: OscillatorType, from: number, to: number, dur: number, level: number) {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(t: number, dur: number, type: BiquadFilterType, from: number, to: number, level: number, bus: AudioNode | null = this.sfx) {
    const ctx = this.ctx;
    if (!ctx || !bus || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(bus);
    src.start(t, Math.random() * 1.5, dur + 0.02);
  }
}

export const audio = new AudioEngine();
