const Sonido = {
  activo: true,
  ctx: null,
  _zumbido: null,

  _c() {
    if (!this.activo) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    } catch (e) {
      return null;
    }
  },

  tono(freq = 600, dur = 0.12, tipo = "sine", vol = 0.15, desliz = 0) {
    const c = this._c();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (desliz) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + desliz), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  },

  ruido(dur = 0.08, vol = 0.2, filtro = 2500) {
    const c = this._c();
    if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filtro;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination);
    s.start();
  },

  acierto() { this.tono(660, 0.1, "triangle", 0.18); setTimeout(() => this.tono(990, 0.16, "triangle", 0.18), 90); },
  error() { this.tono(220, 0.22, "square", 0.08, -80); },
  corte() { this.ruido(0.07, 0.35, 3200); },
  burbuja() { this.tono(500 + Math.random() * 500, 0.08, "sine", 0.08, 400); },
  pop() { this.tono(420, 0.08, "triangle", 0.15, 300); },
  chof() { this.ruido(0.12, 0.25, 900); },
  giro() { this.ruido(0.1, 0.06, 600); },
  listo() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tono(f, 0.18, "triangle", 0.16), i * 110)); },
  fanfarria() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tono(f, 0.22, "triangle", 0.17), i * 140)); },

  zumbido(on) {
    const c = this._c();
    if (!c) return;
    if (on && !this._zumbido) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.value = 95;
      g.gain.value = 0.04;
      o.connect(g).connect(c.destination);
      o.start();
      this._zumbido = { o, g };
    } else if (!on && this._zumbido) {
      try { this._zumbido.o.stop(); } catch (e) { /* ya detenido */ }
      this._zumbido = null;
    }
  },
};
