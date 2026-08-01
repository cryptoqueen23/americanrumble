/**
 * audio.js
 * ------------------------------------------------------------
 * Procedural audio for American Rumble. Everything here is
 * synthesized with the Web Audio API — no external mp3/ogg
 * files, no network requests, no licensing to worry about.
 *
 * - punch()/kick()/block()/ko() -> one-shot impact SFX
 * - startMusic()/stopMusic()    -> looping bass+kick hype beat
 *
 * Browsers block audio until a user gesture, so call unlock()
 * from a click/tap handler (game.js does this on Start Fight).
 * ------------------------------------------------------------
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.crowdTimer = null;
    this.muted = false;
  }

  _ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // Web Audio unsupported — SFX/music calls become no-ops

    this.ctx = new AC();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.masterGain);

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0.55;
    this.crowdGain.connect(this.masterGain);
  }

  /** Call from a user-gesture handler (click/tap) to satisfy autoplay policies. */
  unlock() {
    this._ensureContext();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.9;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------------- low-level building blocks ----------------

  _noiseBurst(dest, duration, filterFreq, peakGain, when) {
    const ctx = this.ctx;
    const t0 = when != null ? when : ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t0);
    src.stop(t0 + duration);
  }

  _thump(dest, freqStart, freqEnd, duration, peakGain, when) {
    const ctx = this.ctx;
    const t0 = when != null ? when : ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  /**
   * Bandpass-filtered noise with a slow amplitude tremolo — layering a few
   * of these at different center frequencies is what reads as "a crowd"
   * rather than a single tone. Used for ambience, reaction swells, and roars.
   */
  _crowdNoise(dest, duration, opts) {
    const ctx = this.ctx;
    const t0 = opts.when != null ? opts.when : ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = opts.freq || 1000;
    band.Q.value = opts.q != null ? opts.q : 0.7;

    const tremolo = ctx.createGain();
    tremolo.gain.value = 1;
    if (opts.tremoloRate) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = opts.tremoloRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = opts.tremoloDepth != null ? opts.tremoloDepth : 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(tremolo.gain);
      lfo.start(t0);
      lfo.stop(t0 + duration);
    }

    const env = ctx.createGain();
    const attack = opts.attack != null ? opts.attack : 0.08;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, opts.peak || 0.3), t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(band);
    band.connect(tremolo);
    tremolo.connect(env);
    env.connect(dest);
    src.start(t0);
    src.stop(t0 + duration);
  }

  /** Short crowd reaction on a landed hit — bigger on unblocked/harder hits. */
  crowdSwell(intensity) {
    if (!this.ctx || this.muted) return;
    const k = intensity || 1;
    this._crowdNoise(this.crowdGain, 0.9, { freq: 500, q: 0.6, peak: 0.32 * k, attack: 0.05, tremoloRate: 7, tremoloDepth: 0.4 });
    this._crowdNoise(this.crowdGain, 1.1, { freq: 1100, q: 0.8, peak: 0.24 * k, attack: 0.07, tremoloRate: 9, tremoloDepth: 0.4 });
    this._crowdNoise(this.crowdGain, 0.7, { freq: 2200, q: 0.9, peak: 0.14 * k, attack: 0.04, tremoloRate: 11, tremoloDepth: 0.35 });
  }

  /** Big crowd pop for a knockout. */
  crowdRoar() {
    if (!this.ctx || this.muted) return;
    [
      { freq: 450, q: 0.5, peak: 0.55, dur: 1.8 },
      { freq: 900, q: 0.7, peak: 0.45, dur: 1.6 },
      { freq: 1800, q: 0.8, peak: 0.30, dur: 1.3 },
      { freq: 3000, q: 1.0, peak: 0.18, dur: 1.0 }
    ].forEach(l => this._crowdNoise(this.crowdGain, l.dur, {
      freq: l.freq, q: l.q, peak: l.peak, attack: 0.05,
      tremoloRate: 5 + Math.random() * 5, tremoloDepth: 0.45
    }));
  }

  /** Continuous low crowd murmur under the whole fight. */
  startCrowd() {
    if (!this.ctx || this.crowdTimer) return;
    const scheduleAhead = 0.5;
    const stepDur = 1.4;
    let nextTime = this.ctx.currentTime;

    const scheduler = () => {
      while (nextTime < this.ctx.currentTime + scheduleAhead) {
        this._crowdNoise(this.crowdGain, stepDur, {
          freq: 320 + Math.random() * 260,
          q: 0.5,
          peak: 0.07 + Math.random() * 0.04,
          attack: 0.3,
          tremoloRate: 3 + Math.random() * 2,
          tremoloDepth: 0.3,
          when: nextTime
        });
        nextTime += stepDur * 0.7; // overlapping so it never goes silent between grains
      }
    };

    scheduler();
    this.crowdTimer = setInterval(scheduler, 200);
  }

  stopCrowd() {
    if (this.crowdTimer) {
      clearInterval(this.crowdTimer);
      this.crowdTimer = null;
    }
  }

  // ---------------- one-shot impact SFX ----------------

  punch(intense) {
    if (!this.ctx || this.muted) return;
    this._noiseBurst(this.sfxGain, 0.08, intense ? 1700 : 1300, 0.7);
    this._thump(this.sfxGain, intense ? 190 : 150, 50, 0.11, 0.8);
  }

  kick(intense) {
    if (!this.ctx || this.muted) return;
    this._noiseBurst(this.sfxGain, 0.12, intense ? 1200 : 900, 0.8);
    this._thump(this.sfxGain, intense ? 150 : 115, 35, 0.18, 0.95);
  }

  grapple() {
    if (!this.ctx || this.muted) return;
    this._noiseBurst(this.sfxGain, 0.18, 700, 0.6);
    this._thump(this.sfxGain, 110, 40, 0.25, 0.7);
  }

  block() {
    if (!this.ctx || this.muted) return;
    this._noiseBurst(this.sfxGain, 0.05, 3200, 0.4);
    this._thump(this.sfxGain, 520, 320, 0.06, 0.3);
  }

  knockdown() {
    if (!this.ctx || this.muted) return;
    this._thump(this.sfxGain, 220, 45, 0.45, 0.9);
    this._noiseBurst(this.sfxGain, 0.22, 500, 0.5);
  }

  ko() {
    if (!this.ctx || this.muted) return;
    this._thump(this.sfxGain, 320, 40, 0.7, 1.0);
    this._noiseBurst(this.sfxGain, 0.32, 500, 0.5);
    this.crowdRoar();
  }

  /** Route a landed-hit event from the engine to the right SFX + crowd reaction. */
  hitSound(moveKey, blocked, intense) {
    if (blocked) { this.block(); this.crowdSwell(0.5); return; }
    if (moveKey === "kick") this.kick(intense);
    else if (moveKey === "grapple" || moveKey === "special") this.grapple();
    else this.punch(intense);
    this.crowdSwell(intense ? 1.3 : 0.9);
  }

  // ---------------- procedural background music ----------------
  // A simple looping bass + kick pattern (no melody/lyrics — original,
  // generated tones only) to give the fight a hype-arena pulse.

  startMusic() {
    if (!this.ctx || this.musicTimer) return;

    this.musicStep = 0;
    const bpm = 96;
    const stepTime = 60 / bpm / 2; // eighth notes
    // low root-ish tones (Hz), 0 = rest
    const bassPattern = [55, 0, 55, 0, 49, 0, 41, 0, 55, 0, 55, 0, 49, 41, 41, 0];
    const kickPattern = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const scheduleAheadTime = 0.15;
    let nextNoteTime = this.ctx.currentTime;

    const scheduleStep = (step, time) => {
      const bassFreq = bassPattern[step % bassPattern.length];
      if (bassFreq) {
        const osc = this.ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = bassFreq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(0.5, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, time + stepTime * 0.9);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + stepTime);
      }
      if (kickPattern[step % kickPattern.length]) {
        this._thump(this.musicGain, 130, 40, 0.15, 0.6, time);
      }
    };

    const scheduler = () => {
      while (nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        scheduleStep(this.musicStep, nextNoteTime);
        nextNoteTime += stepTime;
        this.musicStep++;
      }
    };

    scheduler();
    this.musicTimer = setInterval(scheduler, 50);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

window.audioManager = window.audioManager || new AudioManager();
