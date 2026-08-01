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
  }

  /** Route a landed-hit event from the engine to the right SFX. */
  hitSound(moveKey, blocked, intense) {
    if (blocked) { this.block(); return; }
    if (moveKey === "kick") this.kick(intense);
    else if (moveKey === "grapple" || moveKey === "special") this.grapple();
    else this.punch(intense);
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
