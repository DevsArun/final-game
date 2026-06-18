// Minimal WebAudio SFX (synthesised, no asset files). Degrades to no-op when
// AudioContext is unavailable (e.g. headless harness).
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = (typeof window !== "undefined") && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
  }

  // Call from a user gesture to satisfy autoplay policies.
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) { this.muted = m; }

  _tone(freq, start, dur, type = "sawtooth", gain = 0.18) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  horn(def) {
    this._ensure();
    if (!this.ctx || this.muted) return;
    const freqs = (def && def.freq) || [330];
    const dur = (def && def.dur) || 0.4;
    freqs.forEach((f, i) => this._tone(f, i * (dur * 0.35), dur, "square", 0.16));
  }

  cash() {
    this._ensure();
    this._tone(660, 0, 0.12, "triangle", 0.14);
    this._tone(990, 0.1, 0.16, "triangle", 0.14);
  }

  crash() {
    this._ensure();
    if (!this.ctx || this.muted) return;
    // short noise burst
    const t0 = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buffer;
    g.gain.setValueAtTime(0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    src.connect(g).connect(this.ctx.destination);
    src.start(t0);
  }

  level() {
    this._ensure();
    this._tone(523, 0, 0.12, "triangle", 0.14);
    this._tone(659, 0.1, 0.12, "triangle", 0.14);
    this._tone(784, 0.2, 0.18, "triangle", 0.14);
  }
}
