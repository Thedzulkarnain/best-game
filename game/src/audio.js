// All sound is code-generated WebAudio: no audio files, no network.
// Short synth blips for every action, plus a quiet generative pentatonic
// music loop that never repeats the same bar twice. M toggles mute.
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];

export class SoundBank {
  constructor() {
    this.ctx = null; this.muted = false; this.musicTimer = null;
    this.musicStep = 0; this.baseNote = 57;
  }
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone(freq, dur, type, vol, slideTo) {
    if (this.muted) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  shoot() { this.tone(740, 0.09, 'sine', 0.10, 420); }
  hit() { this.tone(220, 0.06, 'square', 0.07, 160); }
  kill() { this.tone(520, 0.16, 'triangle', 0.14, 90); this.tone(780, 0.1, 'sine', 0.08, 300); }
  hurt() { this.tone(140, 0.25, 'sawtooth', 0.16, 60); }
  seedHurt() { this.tone(98, 0.3, 'sawtooth', 0.14, 50); }
  dash() { this.tone(300, 0.14, 'sine', 0.10, 900); }
  pickup() { this.tone(880, 0.12, 'sine', 0.12, 1320); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.12), i * 70)); }
  waveHorn() { [392, 523].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.13), i * 120)); }
  bossRoar() { this.tone(70, 0.7, 'sawtooth', 0.2, 38); this.tone(110, 0.5, 'square', 0.1, 55); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.14), i * 130)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.13), i * 150)); }
  click() { this.tone(660, 0.05, 'sine', 0.08); }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  startMusic() {
    if (this.musicTimer || this.muted) return;
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const ctx = this.ensure(); if (!ctx) return;
      const degree = PENTA[Math.floor(Math.random() * PENTA.length)];
      const freq = 440 * Math.pow(2, (this.baseNote + degree - 69) / 12);
      this.tone(freq, 0.5, 'sine', 0.035);
      this.musicStep += 1;
      if (this.musicStep % 8 === 0) this.tone(220, 0.9, 'sine', 0.025);
      if (this.musicStep % 16 === 0) this.baseNote = 57 + (Math.random() < 0.5 ? 0 : 5);
    }, 340);
  }
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
}
