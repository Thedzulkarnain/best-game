// Code-generated WebAudio: an SFX for every action plus a quiet generative
// music loop. No audio files, no network. M toggles mute.
export class SoundBank {
  constructor() {
    this.ctx = null; this.muted = false; this.musicTimer = null; this.musicStep = 0;
  }
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  shoot() { this.tone(720, 0.08, 'square', 0.05, 320); }
  wellThrow() { this.tone(180, 0.25, 'sine', 0.14, 90); }
  wellBoom() { this.tone(90, 0.5, 'sawtooth', 0.2, 30); this.tone(1400, 0.18, 'sine', 0.08, 200); }
  hit() { this.tone(300, 0.05, 'triangle', 0.06, 180); }
  kill() { this.tone(520, 0.16, 'triangle', 0.1, 780); }
  hurt() { this.tone(160, 0.22, 'sawtooth', 0.14, 70); }
  starHurt() { this.tone(220, 0.18, 'sine', 0.1, 110); }
  dash() { this.tone(900, 0.12, 'sine', 0.08, 1600); }
  pickup() { this.tone(880, 0.1, 'sine', 0.09, 1320); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.1), i * 70)); }
  waveHorn() { this.tone(196, 0.4, 'triangle', 0.12, 392); }
  click() { this.tone(600, 0.06, 'sine', 0.08); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.11), i * 130)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sawtooth', 0.09), i * 150)); }
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [220, 261.6, 329.6, 392, 440, 523.2];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = scale[this.musicStep % scale.length];
      this.tone(f, 0.9, 'sine', 0.035);
      if (this.musicStep % 4 === 2) this.tone(f / 2, 1.2, 'triangle', 0.03);
      this.musicStep += 1;
    }, 420);
  }
}
