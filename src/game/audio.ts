/**
 * Hybrid 140 BPM Arkham-Noir + Desi Action Soundtrack & Foley Engine
 * Blends the bundled custom track (/assets/aistudio/audio__music__3471c297.mp3)
 * seamlessly with a procedural 140 BPM Dark Knight orchestral strings, sub-bass brass,
 * plucked sitar/mandolin riff, dholak percussion, rain ambience, and combat foley.
 * Zero upload UI — starts automatically upon user play interaction.
 */

const CUSTOM_TRACK_URL = '/assets/aistudio/audio__music__3471c297.mp3';

// D Phrygian / Bhairav-inspired minor action scale (Hz)
const BASS_SEQ = [73.42, 73.42, 77.78, 73.42, 87.31, 82.41, 77.78, 65.41]; // D2, Eb2, F2, E2, C2
const STRING_ARP = [
  293.66, 311.13, 349.23, 440.0, 349.23, 311.13, 293.66, 220.0,
  293.66, 349.23, 440.0, 466.16, 440.0, 349.23, 311.13, 293.66,
];
const SITAR_RIFF = [
  587.33, 0, 622.25, 587.33, 0, 440.0, 466.16, 440.0,
  587.33, 622.25, 698.46, 0, 622.25, 587.33, 466.16, 440.0,
];

export class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private sfxBus: GainNode | null = null;
  private customTrackEl: HTMLAudioElement | null = null;
  private customTrackGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private stepTimer: number | null = null;
  private stepIndex = 0;
  private intensity = 0.45; // 0.3 title -> 0.75 combat -> 1.0 boss/bhensa
  private slowMoDucked = false;
  private muted = false;
  private started = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public start(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.78;
      this.masterGain.connect(this.ctx.destination);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 14000;
      this.musicFilter.Q.value = 0.8;

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.62;
      this.musicBus.connect(this.musicFilter);
      this.musicFilter.connect(this.masterGain);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.92;
      this.sfxBus.connect(this.masterGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.setupRainAmbience();
      this.setupBundledTrack();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (this.customTrackEl && this.customTrackEl.paused) {
      void this.customTrackEl.play().catch(() => {
        // Ignore autoplay restriction until next gesture
      });
    }

    if (!this.started) {
      this.started = true;
      this.startSequencer();
    }
  }

  private setupBundledTrack(): void {
    if (!this.ctx || !this.musicBus) return;
    try {
      const audio = new Audio(CUSTOM_TRACK_URL);
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      const source = this.ctx.createMediaElementSource(audio);
      this.customTrackGain = this.ctx.createGain();
      this.customTrackGain.gain.value = 0.56;
      source.connect(this.customTrackGain);
      this.customTrackGain.connect(this.musicBus);
      this.customTrackEl = audio;
    } catch {
      // Fallback gracefully to pure 140 BPM procedural score if media element fails
      this.customTrackEl = null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 2.8;
    }
    return buf;
  }

  private setupRainAmbience(): void {
    if (!this.ctx || !this.noiseBuffer || !this.masterGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.55;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.065;

    src.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    src.start();
    this.rainNode = src;
  }

  public setIntensity(value: number): void {
    this.intensity = Math.max(0.25, Math.min(1, value));
    if (this.customTrackGain && this.ctx) {
      const target = 0.42 + this.intensity * 0.24;
      this.customTrackGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
    }
  }

  public setSlowMotionDuck(active: boolean): void {
    if (this.slowMoDucked === active) return;
    this.slowMoDucked = active;
    if (this.musicFilter && this.ctx) {
      this.musicFilter.frequency.setTargetAtTime(
        active ? 680 : 14000,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  private startSequencer(): void {
    if (this.stepTimer !== null) return;
    // 140 BPM -> 16th note = 60 / 140 / 4 = 107.14ms
    const stepMs = (60 / 140 / 4) * 1000;
    this.stepTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
      this.playSequencerStep(this.stepIndex);
      this.stepIndex = (this.stepIndex + 1) % 32;
    }, stepMs);
  }

  private playSequencerStep(step: number): void {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const step16 = step % 16;

    // 1. Driving Dark Knight Ostinato Strings (16th pulse)
    const strFreq = STRING_ARP[step16];
    this.playOstinatoString(now, strFreq, 0.055 * (0.55 + this.intensity * 0.65));

    // 2. Deep Hans Zimmer Sub-Bass Brass on bar hits
    if (step16 === 0 || step16 === 6 || step16 === 10) {
      const bassFreq = BASS_SEQ[Math.floor(step / 4) % BASS_SEQ.length];
      this.playSubBrass(now, bassFreq, 0.16 * (0.6 + this.intensity * 0.55), step16 === 0 ? 0.42 : 0.24);
    }

    // 3. Dholak / Action Percussion (140 BPM drive)
    if (step16 === 0 || step16 === 3 || step16 === 8 || step16 === 11) {
      this.playDholakThump(now, step16 === 0 || step16 === 8 ? 105 : 145, 0.14 * this.intensity);
    }
    if ((step16 === 4 || step16 === 12 || (this.intensity > 0.72 && step16 === 14))) {
      this.playPercSlap(now, 0.085 * this.intensity);
    }

    // 4. Plucked Mandolin / Sitar Motif in higher combat intensity
    if (this.intensity >= 0.55) {
      const sitarFreq = SITAR_RIFF[step16];
      if (sitarFreq > 0) {
        this.playSitarPluck(now, sitarFreq, 0.068 * this.intensity);
      }
    }
  }

  private playOstinatoString(time: number, freq: number, gainPeak: number): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.1, time);
    filter.Q.value = 1.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.105);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.115);
  }

  private playSubBrass(time: number, freq: number, gainPeak: number, dur: number): void {
    if (!this.ctx || !this.musicBus) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 0.5, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + dur);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private playSitarPluck(time: number, freq: number, gainPeak: number): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.992, time + 0.14);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 3.4, time);
    filter.Q.value = 3.2;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.17);
  }

  private playDholakThump(time: number, freq: number, gainPeak: number): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.45, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.09);
    gain.gain.setValueAtTime(gainPeak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playPercSlap(time: number, gainPeak: number): void {
    if (!this.ctx || !this.noiseBuffer || !this.musicBus) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    src.start(time);
    src.stop(time + 0.075);
  }

  // ---- COMBAT FOLEY SFX ----

  public playPunch(heavy = false): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 180 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + (heavy ? 0.16 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.48 : 0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.18 : 0.11));
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.19);
    this.playNoiseBurst(now, heavy ? 0.25 : 0.16, 1200, 0.09);
  }

  public playCounterParry(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    // Metallic blade/gauntlet ring + deep cinematic bass drop
    [1320, 1980, 2640].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxBus) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.38);
      gain.gain.setValueAtTime(0.18 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.44);
    });
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.36);
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sub.connect(subGain);
    subGain.connect(this.sfxBus);
    sub.start(now);
    sub.stop(now + 0.4);
  }

  public playShieldClang(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playBatarangThrow(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.17);
    this.playNoiseBurst(now, 0.14, 2800, 0.12);
  }

  public playSmokeBomb(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    this.playPunch(false);
    this.playNoiseBurst(now + 0.03, 0.24, 900, 0.45);
  }

  public playWhistleAndBhensa(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    // Sharp two-tone finger whistle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1650, now);
    osc.frequency.linearRampToValueAtTime(2550, now + 0.14);
    osc.frequency.setValueAtTime(1950, now + 0.17);
    osc.frequency.linearRampToValueAtTime(2950, now + 0.34);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.4);

    // Deep thunderous buffalo snort & hoof roar
    const roar = this.ctx.createOscillator();
    const roarFilter = this.ctx.createBiquadFilter();
    const roarGain = this.ctx.createGain();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(92, now + 0.18);
    roar.frequency.exponentialRampToValueAtTime(48, now + 0.85);
    roarFilter.type = 'lowpass';
    roarFilter.frequency.value = 320;
    roarGain.gain.setValueAtTime(0.001, now + 0.18);
    roarGain.gain.linearRampToValueAtTime(0.38, now + 0.28);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    roar.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(this.sfxBus);
    roar.start(now + 0.18);
    roar.stop(now + 0.92);
  }

  public playExplosion(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(135, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 0.45);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(subGain);
    subGain.connect(this.sfxBus);
    sub.start(now);
    sub.stop(now + 0.5);
    this.playNoiseBurst(now, 0.38, 650, 0.44);
  }

  public playLaserBeam(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(170, now + 0.55);
    lfo.frequency.value = 34;
    lfoGain.gain.value = 28;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.6);
    lfo.stop(now + 0.6);
  }

  public playSamosaHeal(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxBus) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.16, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.24);
    });
  }

  public playThunder(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(now, 0.26, 260, 0.95);
  }

  public playCapeWhoosh(): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(now, 0.14, 700, 0.18);
  }

  private playNoiseBurst(time: number, gainPeak: number, filterFreq: number, dur: number): void {
    if (!this.ctx || !this.noiseBuffer || !this.sfxBus) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  public dispose(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.customTrackEl) {
      this.customTrackEl.pause();
      this.customTrackEl = null;
    }
    if (this.rainNode) {
      try {
        this.rainNode.stop();
      } catch {
        // Ignore already stopped
      }
      this.rainNode = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.started = false;
  }
}
