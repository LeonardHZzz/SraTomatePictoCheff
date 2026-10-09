const Voz = {
  activa: true,
  leerAlPasar: true,
  rate: 0.9,
  pitch: 1.05,
  voz: null,
  voces: [],
  hablando: 0,
  alEmpezar: null,
  alTerminar: null,

  _guardar() {
    try {
      localStorage.setItem("pictochef.voz", JSON.stringify({
        nombre: this.voz && this.voz.name, rate: this.rate, activa: this.activa, leerAlPasar: this.leerAlPasar,
      }));
    } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }
  },
  _leer() {
    try {
      return JSON.parse(localStorage.getItem("pictochef.voz") || "{}");
    } catch (e) {
      return {};
    }
  },

  puntaje(v) {
    const n = `${v.name} ${v.voiceURI}`;
    let s = 0;
    if (/natural|neural|online|premium|enhanced/i.test(n)) s += 60;
    if (/google/i.test(n)) s += 40;
    if (/camila|dalia|elvira|paloma|sabina|helena|laura|paulina|m[oó]nica|lupe|penélope|ximena|salome|larissa/i.test(n)) s += 25;
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    if (lang === "es-pe") s += 20;
    else if (/es-(419|mx|us|co|cl|ar)/.test(lang)) s += 12;
    else if (lang === "es-es") s += 6;
    if (/espeak|compact/i.test(n)) s -= 40;
    return s;
  },

  cargar() {
    if (!window.speechSynthesis) return;
    const todas = speechSynthesis.getVoices();
    this.voces = todas.filter((v) => /^es([-_]|$)/i.test(v.lang)).sort((a, b) => this.puntaje(b) - this.puntaje(a));
    const pref = this._leer();
    if (pref.rate) this.rate = pref.rate;
    if (typeof pref.activa === "boolean") this.activa = pref.activa;
    if (typeof pref.leerAlPasar === "boolean") this.leerAlPasar = pref.leerAlPasar;
    this.voz = this.voces.find((v) => v.name === pref.nombre) || this.voces[0] || null;
    if (this.alCargar) this.alCargar();
  },

  init() {
    if (!window.speechSynthesis) return;
    this.cargar();
    speechSynthesis.onvoiceschanged = () => this.cargar();
  },

  elegirVoz(nombre) {
    this.voz = this.voces.find((v) => v.name === nombre) || this.voz;
    this._guardar();
  },
  setRate(r) {
    this.rate = r;
    this._guardar();
  },
  setActiva(b) {
    this.activa = b;
    if (!b) this.callar();
    this._guardar();
  },
  setLeerAlPasar(b) {
    this.leerAlPasar = b;
    this._guardar();
  },

  callar() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    this.hablando = 0;
    if (this.alTerminar) this.alTerminar();
  },

  _utter(texto) {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = this.voz ? this.voz.lang : "es-PE";
    if (this.voz) u.voice = this.voz;
    u.rate = this.rate;
    u.pitch = this.pitch;
    u.volume = 1;
    return u;
  },

  frases(texto) {
    return String(texto).split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  },

  decir(textos, { anim = true } = {}) {
    if (!this.activa || !window.speechSynthesis) return;
    const lista = (Array.isArray(textos) ? textos : [textos]).flatMap((t) => this.frases(t));
    if (!lista.length) return;
    speechSynthesis.cancel();
    this.hablando = 0;
    lista.forEach((t, i) => {
      const u = this._utter(t);
      if (anim) {
        u.onstart = () => {
          this.hablando += 1;
          if (i === 0 && this.alEmpezar) this.alEmpezar();
        };
        const fin = () => {
          if (i === lista.length - 1) {
            this.hablando = 0;
            if (this.alTerminar) this.alTerminar();
          }
        };
        u.onend = fin;
        u.onerror = fin;
      }
      speechSynthesis.speak(u);
    });
  },

  narrar(texto) {
    if (!this.activa || !this.leerAlPasar || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    if (this.alTerminar) this.alTerminar();
    speechSynthesis.speak(this._utter(texto));
  },
};
