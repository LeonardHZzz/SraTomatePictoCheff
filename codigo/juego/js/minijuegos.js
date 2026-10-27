const MJ_W = 640;
const MJ_H = 400;

const MJ_CFG = {
  normal: { frotar: 2200, trazos: 5, cortes: 3, cubrir: 0.85, vueltas: 3, presionar: 8, mantener: 3000, coccion: 2600, tol: 32, alto: 0.55 },
  facil: { frotar: 1100, trazos: 3, cortes: 2, cubrir: 0.6, vueltas: 2, presionar: 4, mantener: 1500, coccion: 1500, tol: 55, alto: 0.4 },
};
const MJ_TOQUES = 5; 

const COLOR_ING = {
  rojo: "#d93025", verde: "#43a047", amarillo: "#fbc02d", blanco: "#f3ede0",
  marron: "#8d5a2b", naranja: "#fb8c00", rosa: "#f48fb1",
};
function colorDe(g, defecto = "#d9b27c") {
  const c = g && CATALOGO.ingredientes[g] && CATALOGO.ingredientes[g].color;
  return COLOR_ING[c] || defecto;
}
function mezclaColores(ids) {
  const cs = ids.map((g) => colorDe(g)).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  if (!cs.length) return "#e2c290";
  const m = [0, 1, 2].map((k) => Math.round(cs.reduce((s, c) => s + c[k], 0) / cs.length));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

const MJ_IMG = {};
function cargarImg(id) {
  if (MJ_IMG[id]) return MJ_IMG[id];
  MJ_IMG[id] = new Promise((res) => {
    const img = new Image();
    let intento = 0;
    img.onload = () => res(img);
    img.onerror = () => {
      intento += 1;
      if (intento === 1 && pictoRemoto(id)) img.src = pictoRemoto(id);
      else if (intento <= 2) img.src = pictoPalabra(typeof etiqueta === "function" ? etiqueta(id) : id);
      else res(img);
    };
    img.src = pictoSrc(id);
  });
  return MJ_IMG[id];
}

const TINTA = "#1a1208";
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function trazo(ctx, fill, ancho = 4) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = ancho;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}
function dibTabla(ctx) {
  rr(ctx, 120, 110, 400, 250, 26);
  trazo(ctx, "#d9a566");
  ctx.fillStyle = "#c48d4f";
  ctx.beginPath();
  ctx.arc(490, 140, 10, 0, 7);
  ctx.fill();
}
function dibImg(ctx, img, cx, cy, s, alpha = 1, rot = 0) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.drawImage(img, -s / 2, -s / 2, s, s);
  ctx.restore();
}
function dibCuchillo(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.beginPath();
  ctx.moveTo(-6, -70);
  ctx.quadraticCurveTo(14, -40, 8, 0);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  trazo(ctx, "#cfd8dc", 3);
  rr(ctx, -9, 0, 18, 46, 6);
  trazo(ctx, "#6d4c2f", 3);
  ctx.restore();
}
function dibCuchara(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 20, 0, 0, 7);
  trazo(ctx, "#b0bec5", 3);
  rr(ctx, -4, 18, 8, 70, 4);
  trazo(ctx, "#b0bec5", 3);
  ctx.restore();
}
function dibEsponja(ctx, x, y) {
  rr(ctx, x - 30, y - 20, 60, 40, 10);
  trazo(ctx, "#ffeb3b", 3);
  rr(ctx, x - 30, y - 20, 60, 12, 6);
  trazo(ctx, "#66bb6a", 3);
}
function dibRodillo(ctx, x, y) {
  rr(ctx, x - 70, y - 14, 140, 28, 14);
  trazo(ctx, "#d7a86e", 3);
  rr(ctx, x - 100, y - 7, 30, 14, 6);
  trazo(ctx, "#8d5a2b", 3);
  rr(ctx, x + 70, y - 7, 30, 14, 6);
  trazo(ctx, "#8d5a2b", 3);
}
function dibOlla(ctx, x, y, sarten = false, contenido = null) {
  if (sarten) {
    ctx.beginPath();
    ctx.ellipse(x, y, 85, 30, 0, 0, 7);
    trazo(ctx, "#455a64");
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 70, 20, 0, 0, 7);
    trazo(ctx, contenido || "#607d8b", 3);
    rr(ctx, x + 80, y - 8, 90, 16, 8);
    trazo(ctx, "#3e2723", 3);
    return;
  }
  rr(ctx, x - 75, y - 55, 150, 95, 18);
  trazo(ctx, "#90a4ae");
  ctx.beginPath();
  ctx.ellipse(x, y - 55, 75, 16, 0, 0, 7);
  trazo(ctx, contenido || "#cfd8dc", 3);
  rr(ctx, x - 100, y - 40, 26, 14, 6);
  trazo(ctx, "#546e7a", 3);
  rr(ctx, x + 74, y - 40, 26, 14, 6);
  trazo(ctx, "#546e7a", 3);
}
function dibCocina(ctx, x, y, encendida, t) {
  rr(ctx, x - 120, y - 20, 240, 130, 14);
  trazo(ctx, "#eceff1");
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 80, 22, 0, 0, 7);
  trazo(ctx, "#37474f");
  for (let i = 0; i < 4; i++) {
    rr(ctx, x - 90 + i * 55, y + 70, 30, 22, 10);
    trazo(ctx, "#b0bec5", 3);
  }
  if (encendida) {
    for (let i = 0; i < 7; i++) {
      const fx = x - 60 + i * 20;
      const h = 22 + 10 * Math.sin(t / 90 + i * 1.7);
      ctx.beginPath();
      ctx.moveTo(fx - 8, y + 5);
      ctx.quadraticCurveTo(fx, y + 5 - h * 1.6, fx + 8, y + 5);
      ctx.fillStyle = i % 2 ? "#ff9800" : "#f44336";
      ctx.fill();
    }
  }
}
function dibHorno(ctx, x, y, w, h, brillo) {
  rr(ctx, x, y, w, h, 16);
  trazo(ctx, "#b0bec5");
  rr(ctx, x + 20, y + 50, w - 40, h - 80, 12);
  trazo(ctx, `rgba(255,${160 - 80 * brillo},40,${0.25 + 0.6 * brillo})`);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 40 + i * 40, y + 25, 9, 0, 7);
    trazo(ctx, "#eceff1", 3);
  }
}
function dibPlato(ctx, x, y, r = 110) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, 7);
  trazo(ctx, "#ffffff");
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.7, r * 0.28, 0, 0, 7);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#bdbdbd";
  ctx.stroke();
}
function dibVaso(ctx, x, y, nivel, color) {
  // y = base del vaso
  const w1 = 120;
  const w2 = 90;
  const h = 150;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w1 / 2, y - h);
  ctx.lineTo(x + w1 / 2, y - h);
  ctx.lineTo(x + w2 / 2, y);
  ctx.lineTo(x - w2 / 2, y);
  ctx.closePath();
  ctx.fillStyle = "rgba(225,245,254,.6)";
  ctx.fill();
  ctx.clip();
  const ny = y - h * nivel;
  ctx.fillStyle = color;
  ctx.fillRect(x - w1, ny, w1 * 2, h);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w1 / 2, y - h);
  ctx.lineTo(x + w1 / 2, y - h);
  ctx.lineTo(x + w2 / 2, y);
  ctx.lineTo(x - w2 / 2, y);
  ctx.closePath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}
function caminoPan(cx, cy) {
  const p = new Path2D();
  p.moveTo(cx - 100, cy + 85);
  p.lineTo(cx - 100, cy - 30);
  p.bezierCurveTo(cx - 130, cy - 110, cx - 20, cy - 120, cx, cy - 85);
  p.bezierCurveTo(cx + 20, cy - 120, cx + 130, cy - 110, cx + 100, cy - 30);
  p.lineTo(cx + 100, cy + 85);
  p.closePath();
  return p;
}
function caminoMasa(cx, cy, r = 125) {
  const p = new Path2D();
  p.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
  return p;
}

// =====================================================================
class Minijuego {
  constructor(canvas, op) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.paso = op.paso;
    this.def = op.def;
    this.receta = op.receta;
    this.modo = op.modo || "normal";
    this.cfg = MJ_CFG[this.modo === "normal" ? "normal" : "facil"];
    this.tocar = this.modo === "tocar";
    this.gesto = CATALOGO.pasos[op.paso].gesto;
    this.alProgreso = op.alProgreso || (() => {});
    this.alTerminar = op.alTerminar || (() => {});
    this.p = 0;
    this.hecho = false;
    this.ayudaUsada = false;
    this.intentos = 0;
    this.validos = 0;
    this.particulas = [];
    this.puntero = null;
    this.abajo = false;
    this.t0 = performance.now();
    this.hitos = new Set();
    this.raf = null;
    this.ultimoT = performance.now();
  }

  async iniciar() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = MJ_W * dpr;
    this.cv.height = MJ_H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ids = [...new Set([...(this.def.objetos || []), ...(this.def.sobre ? [this.def.sobre] : []), `plato_${this.receta.id}`])];
    const imgs = await Promise.all(ids.map(cargarImg));
    this.img = Object.fromEntries(ids.map((id, i) => [id, imgs[i]]));
    this.objs = (this.def.objetos || []).slice(0, 4);
    this._prep();
    this._ev = {
      down: (e) => this._down(e),
      move: (e) => this._move(e),
      up: (e) => this._up(e),
      leave: () => { this.puntero = null; },
    };
    this.cv.addEventListener("pointerdown", this._ev.down);
    this.cv.addEventListener("pointermove", this._ev.move);
    this.cv.addEventListener("pointerup", this._ev.up);
    this.cv.addEventListener("pointercancel", this._ev.up);
    this.cv.addEventListener("pointerleave", this._ev.leave);
    const bucle = (t) => {
      const dt = Math.min(64, t - this.ultimoT);
      this.ultimoT = t;
      this._tick(dt, t);
      this._dibujar(t);
      this.raf = requestAnimationFrame(bucle);
    };
    this.raf = requestAnimationFrame(bucle);
  }

  destruir() {
    cancelAnimationFrame(this.raf);
    clearInterval(this._ayudaTimer);
    Sonido.zumbido(false);
    if (!this._ev) return;
    this.cv.removeEventListener("pointerdown", this._ev.down);
    this.cv.removeEventListener("pointermove", this._ev.move);
    this.cv.removeEventListener("pointerup", this._ev.up);
    this.cv.removeEventListener("pointercancel", this._ev.up);
    this.cv.removeEventListener("pointerleave", this._ev.leave);
  }

  ayudar() {
    if (this.hecho || this._ayudaTimer) return;
    this.ayudaUsada = true;
    this._ayudaTimer = setInterval(() => {
      if (this.hecho) return clearInterval(this._ayudaTimer);
      this._unidad();
    }, 450);
  }

  _setP(p) {
    if (this.hecho) return;
    this.p = Math.max(this.p, Math.min(1, p));
    for (const h of [0.5]) {
      if (this.p >= h && !this.hitos.has(h)) {
        this.hitos.add(h);
        this.alProgreso(h);
      }
    }
    if (this.p >= 1) this._terminar();
  }
  _terminar() {
    if (this.hecho) return;
    this.hecho = true;
    this.p = 1;
    clearInterval(this._ayudaTimer);
    Sonido.zumbido(false);
    Sonido.listo();
    for (let i = 0; i < 40; i++) this._chispa(MJ_W / 2, MJ_H / 2, ["#f4c430", "#e63946", "#2e9e4a", "#2b6cb0"][i % 4]);
    const segundos = (performance.now() - this.t0) / 1000;
    const precision = this.intentos ? this.validos / this.intentos : null;
    setTimeout(() => this.alTerminar({ segundos, ayuda: this.ayudaUsada, precision }), 900);
  }

  _chispa(x, y, color) {
    const a = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 5;
    this.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 4 + Math.random() * 4, color, vida: 1, g: 0.25, tipo: "c" });
  }
  _burbuja(x, y) {
    this.particulas.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random(), r: 6 + Math.random() * 10, vida: 1, g: 0, tipo: "b" });
  }
  _gota(x, y, color) {
    this.particulas.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, r: 5 + Math.random() * 3, color, vida: 1, g: 0.35, tipo: "c" });
  }
  _tira(x, y, color) {
    this.particulas.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -3, w: 18, h: 60, rot: 0, vr: (Math.random() - 0.5) * 0.3, color, vida: 1, g: 0.35, tipo: "t" });
  }

  _pos(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * MJ_W) / r.width, y: ((e.clientY - r.top) * MJ_H) / r.height };
  }
  _down(e) {
    e.preventDefault();
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    const p = this._pos(e);
    this.puntero = p;
    this.abajo = true;
    if (this.hecho) return;
    if (this.tocar) {
      this._unidad();
      return;
    }
    this.trazoPts = [p];
    this._g("down", p);
  }
  _move(e) {
    const p = this._pos(e);
    const prev = this.puntero;
    this.puntero = p;
    if (!this.abajo || this.hecho || this.tocar) return;
    if (this.trazoPts) this.trazoPts.push(p);
    this._g("move", p, prev);
  }
  _up(e) {
    if (!this.abajo) return;
    this.abajo = false;
    if (this.hecho || this.tocar) return;
    this._g("up", this._pos(e));
    this.trazoPts = null;
  }

  _prep() {
    const g = this.gesto;
    const O = this.objs;
    if (g === "frotar") {
      this.dist = 0;
      this.manchas = Array.from({ length: 14 }, () => ({ dx: (Math.random() - 0.5) * 90, dy: (Math.random() - 0.5) * 80, r: 6 + Math.random() * 9, o: Math.floor(Math.random() * Math.max(1, O.length)) }));
    } else if (g === "trazos" || g === "cortar") {
      const n = g === "cortar" ? (O.length >= 3 ? Math.max(1, this.cfg.cortes - 1) : this.cfg.cortes) : (O.length >= 2 ? Math.max(2, this.cfg.trazos - 2) : this.cfg.trazos);
      this.cola = O.map((id) => ({ id, n, hechos: [], guias: Array.from({ length: n }, (_, i) => 0.18 + (0.64 * (i + 0.5)) / n) }));
      this.actual = 0;
      this.total = this.cola.reduce((s, c) => s + c.n, 0);
      this.cuenta = 0;
      this.salida = [];
    } else if (g === "cubrir") {
      this.camino = this.def.sobre === "masa" ? caminoMasa(320, 225) : caminoPan(320, 235);
      this.pintura = document.createElement("canvas");
      this.pintura.width = MJ_W;
      this.pintura.height = MJ_H;
      this.pctx = this.pintura.getContext("2d");
      this.color = colorDe(O[0], "#43a047");
      this.celdas = [];
      for (let x = 170; x < 470; x += 20) for (let y = 100; y < 340; y += 20) if (this.ctx.isPointInPath(this.camino, x + 10, y + 10)) this.celdas.push({ x: x + 10, y: y + 10, ok: false });
      this.cubiertas = 0;
    } else if (g === "girar") {
      this.ang = 0;
      this.vueltas = this.paso === "batir" ? this.cfg.vueltas + 1 : this.cfg.vueltas;
      this.color = mezclaColores(O.length ? O : ["huevo"]);
    } else if (g === "presionar") {
      this.toques = 0;
      this.apriete = 0;
      this.color = colorDe(O[0], "#fb8c00");
    } else if (g === "mantener") {
      this.color = mezclaColores(O);
      this.temblor = 0;
    } else if (g === "arrastrar") {
      const base = this.def.sobre;
      this.camino = base === "masa" ? caminoMasa(410, 220, 115) : base === "pan" ? caminoPan(410, 225) : null;
      this.items = O.map((id, i) => ({ id, x: 95, y: 90 + i * (240 / Math.max(1, O.length - 1 || 1)), x0: 95, y0: 90 + i * (240 / Math.max(1, O.length - 1 || 1)), puesto: false, tx: 0, ty: 0 }));
      if (O.length === 1) this.items[0].y = this.items[0].y0 = 210;
      const spots = [[380, 190], [445, 230], [390, 260], [440, 175]];
      this.items.forEach((it, i) => { [it.tx, it.ty] = spots[i % spots.length]; });
      this.destino = { x: 410, y: 222, r: 125 };
    } else if (g === "fuego" || g === "horno" || g === "servir") {
      const esBebida = this.receta.tipo === "bebida";
      this.item = { x: 150, y: 250, x0: 150, y0: 250, puesto: false };
      if (g === "fuego") this.destino = { x: 470, y: 250, r: 95 };
      if (g === "horno") {
        this.item.y = this.item.y0 = 270;
        this.destino = { x: 470, y: 230, r: 100 };
      }
      if (g === "servir") this.destino = { x: 460, y: esBebida ? 300 : 280, r: 110 };
      this.coccion = 0;
      this.esBebida = esBebida;
    }
  }

  _unidad() {
    if (this.hecho) return;
    const g = this.gesto;
    const u = 1 / MJ_TOQUES;
    if (g === "frotar") {
      this.dist += this.cfg.frotar * u;
      for (let i = 0; i < 6; i++) this._burbuja(320, 230);
      Sonido.burbuja();
      this._setP(this.dist / this.cfg.frotar);
    } else if (g === "trazos" || g === "cortar") {
      const veces = Math.max(1, Math.ceil(this.total * u - 0.001));
      for (let i = 0; i < veces; i++) this._marcar(null);
    } else if (g === "cubrir") {
      const libres = this.celdas.filter((c) => !c.ok);
      const k = Math.ceil(this.celdas.length * this.cfg.cubrir * u);
      for (const c of libres.sort(() => Math.random() - 0.5).slice(0, k)) this._pintar(c.x, c.y, 26);
      Sonido.chof();
    } else if (g === "girar") {
      this.ang += Math.PI * 2 * this.vueltas * u;
      Sonido.giro();
      this._setP(Math.abs(this.ang) / (Math.PI * 2 * this.vueltas));
    } else if (g === "presionar") {
      this._apretar(Math.ceil(this.cfg.presionar * u));
    } else if (g === "mantener") {
      this.temblor = 400;
      Sonido.giro();
      this._setP(this.p + u);
    } else if (g === "arrastrar") {
      const it = this.items.find((i) => !i.puesto);
      if (it) this._colocar(it);
    } else {
      if (!this.item.puesto) this._colocarItem();
      else this.coccion = Math.min(1, this.coccion + u * 1.5);
    }
  }

  _g(tipo, p, prev) {
    const g = this.gesto;
    if (g === "frotar" && tipo === "move" && prev) {
      if (Math.abs(p.x - 320) < 230 && Math.abs(p.y - 230) < 140) {
        const d = Math.hypot(p.x - prev.x, p.y - prev.y);
        this.dist += d;
        if (Math.random() < d / 40) this._burbuja(p.x, p.y);
        if (Math.random() < d / 400) Sonido.burbuja();
        this._setP(this.dist / this.cfg.frotar);
      }
    } else if ((g === "trazos" || g === "cortar") && tipo === "up") {
      this._evaluarTrazo(this.trazoPts || []);
    } else if (g === "cubrir" && (tipo === "down" || tipo === "move")) {
      this._pintar(p.x, p.y, this.modo === "normal" ? 30 : 46);
      if (prev && Math.random() < 0.08) Sonido.chof();
    } else if (g === "girar" && tipo === "move" && prev) {
      const cx = 320;
      const cy = 245;
      const k = 1.6; 
      const d = Math.hypot(p.x - cx, (p.y - cy) * k);
      if (d > 20 && d < 240) {
        const a1 = Math.atan2((prev.y - cy) * k, prev.x - cx);
        const a2 = Math.atan2((p.y - cy) * k, p.x - cx);
        let da = a2 - a1;
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) < Math.PI / 2) {
          const antes = Math.floor(Math.abs(this.ang) / (Math.PI / 2));
          this.ang += da;
          if (Math.floor(Math.abs(this.ang) / (Math.PI / 2)) !== antes) Sonido.giro();
          this._setP(Math.abs(this.ang) / (Math.PI * 2 * this.vueltas));
        }
      }
    } else if (g === "presionar" && tipo === "down") {
      this._apretar(1);
    } else if (g === "arrastrar") {
      if (tipo === "down") this.agarrado = this.items.find((it) => !it.puesto && Math.hypot(p.x - it.x, p.y - it.y) < 60) || null;
      else if (tipo === "move" && this.agarrado) [this.agarrado.x, this.agarrado.y] = [p.x, p.y];
      else if (tipo === "up" && this.agarrado) {
        const it = this.agarrado;
        this.agarrado = null;
        if (Math.hypot(p.x - this.destino.x, p.y - this.destino.y) < this.destino.r) this._colocar(it);
        else this._regresar(it);
      }
    } else if (g === "fuego" || g === "horno" || g === "servir") {
      const it = this.item;
      if (it.puesto) return;
      if (tipo === "down") this.agarrado = Math.hypot(p.x - it.x, p.y - it.y) < 110 ? it : null;
      else if (tipo === "move" && this.agarrado) [it.x, it.y] = [p.x, p.y];
      else if (tipo === "up" && this.agarrado) {
        this.agarrado = null;
        if (Math.hypot(p.x - this.destino.x, p.y - this.destino.y) < this.destino.r) this._colocarItem();
        else this._regresar(it);
      }
    }
  }

  _regresar(it) {
    it.volviendo = true;
    Sonido.error();
  }
  _colocar(it) {
    it.puesto = true;
    it.x = it.tx;
    it.y = it.ty;
    Sonido.pop();
    for (let i = 0; i < 10; i++) this._chispa(it.x, it.y, "#f4c430");
    this._setP(this.items.filter((i) => i.puesto).length / this.items.length);
  }
  _colocarItem() {
    const it = this.item;
    it.puesto = true;
    it.x = this.destino.x;
    it.y = this.gesto === "horno" ? this.destino.y + 10 : this.destino.y - (this.gesto === "fuego" ? 30 : 10);
    Sonido.pop();
    if (this.gesto === "servir") this._setP(1);
    else this._setP(0.3);
  }

  _evaluarTrazo(pts) {
    if (pts.length < 2) return;
    const c = this.cola[this.actual];
    if (!c) return;
    const box = { x: 210, y: 105, w: 220, h: 220 };
    const xs = pts.map((q) => q.x);
    const ys = pts.map((q) => q.y);
    const alto = Math.max(...ys) - Math.min(...ys);
    const largo = pts.reduce((s, q, i) => (i ? s + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), 0);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    this.intentos += 1;
    if (this.gesto === "cortar") {
      if (alto < box.h * this.cfg.alto) return Sonido.error();
      const libres = c.guias.map((gx, i) => ({ i, d: Math.abs(box.x + gx * box.w - mx) })).filter((o) => !c.hechos.includes(o.i));
      libres.sort((a, b) => a.d - b.d);
      if (!libres.length || libres[0].d > this.cfg.tol) return Sonido.error();
      this.validos += 1;
      this._marcar(libres[0].i);
    } else {
      const dentro = pts.some((q) => q.x > box.x - 20 && q.x < box.x + box.w + 20 && q.y > box.y - 20 && q.y < box.y + box.h + 20);
      if (!dentro || largo < 70) return Sonido.error();
      this.validos += 1;
      this._marcar(null, mx);
    }
  }

  _marcar(i, mx = null) {
    const c = this.cola[this.actual];
    if (!c) return;
    if (i == null) {
      const libres = c.guias.map((_, k) => k).filter((k) => !c.hechos.includes(k));
      if (mx != null) libres.sort((a, b) => Math.abs(210 + c.guias[a] * 220 - mx) - Math.abs(210 + c.guias[b] * 220 - mx));
      i = libres[0];
    }
    if (i == null) return;
    c.hechos.push(i);
    this.cuenta += 1;
    const x = 210 + c.guias[i] * 220;
    if (this.gesto === "cortar") {
      Sonido.corte();
      for (let k = 0; k < 8; k++) this._chispa(x, 215, colorDe(c.id));
    } else {
      Sonido.chof();
      this._tira(x, 160, colorDe(c.id, "#c8a165"));
    }
    if (c.hechos.length >= c.n) {
      this.salida.push({ id: c.id, t: 0 });
      this.actual += 1;
    }
    this._setP(this.cuenta / this.total);
  }

  _pintar(x, y, r) {
    if (!this.ctx.isPointInPath(this.camino, x, y) && !this.celdas.some((c) => Math.hypot(c.x - x, c.y - y) < r)) return;
    const pc = this.pctx;
    pc.fillStyle = this.color;
    pc.beginPath();
    pc.arc(x, y, r, 0, Math.PI * 2);
    pc.fill();
    for (const c of this.celdas) {
      if (!c.ok && Math.hypot(c.x - x, c.y - y) < r) {
        c.ok = true;
        this.cubiertas += 1;
      }
    }
    this._setP(this.cubiertas / (this.celdas.length * this.cfg.cubrir));
  }

  _apretar(n) {
    for (let k = 0; k < n; k++) {
      this.toques += 1;
      for (let i = 0; i < 4; i++) this._gota(320 + (Math.random() - 0.5) * 50, 175, this.color);
    }
    this.apriete = 1;
    Sonido.chof();
    this._setP(this.toques / this.cfg.presionar);
  }

  _tick(dt, t) {
    const g = this.gesto;
    if (g === "mantener" && !this.tocar && this.abajo && !this.hecho) {
      Sonido.zumbido(true);
      this.temblor = 120;
      this._setP(this.p + dt / this.cfg.mantener);
    } else if (g === "mantener") Sonido.zumbido(false);
    if ((g === "fuego" || g === "horno") && this.item.puesto && !this.hecho) {
      this.coccion = Math.min(1, this.coccion + dt / this.cfg.coccion);
      this._setP(0.3 + 0.7 * this.coccion);
      if (Math.random() < 0.15) this._burbuja(this.destino.x, this.destino.y - 80);
      if (g === "fuego" && Math.random() < 0.03) Sonido.ruido(0.2, 0.05, 1800);
    }
    for (const it of this.items || []) this._volver(it, dt);
    if (this.item) this._volver(this.item, dt);
    if (this.temblor > 0) this.temblor -= dt;
    if (this.apriete > 0) this.apriete = Math.max(0, this.apriete - dt / 250);
    for (const s of this.salida || []) s.t = Math.min(1, s.t + dt / 600);
    for (const q of this.particulas) {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += q.g;
      if (q.rot != null) q.rot += q.vr;
      q.vida -= q.tipo === "b" ? 0.012 : 0.02;
    }
    this.particulas = this.particulas.filter((q) => q.vida > 0 && q.y < MJ_H + 80);
  }
  _volver(it, dt) {
    if (!it.volviendo) return;
    const k = Math.min(1, dt / 120);
    it.x += (it.x0 - it.x) * k;
    it.y += (it.y0 - it.y) * k;
    if (Math.hypot(it.x - it.x0, it.y - it.y0) < 2) it.volviendo = false;
  }
  _dibujar(t) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, MJ_W, MJ_H);
    // fondo de cocina
    ctx.fillStyle = "#fff6e8";
    ctx.fillRect(0, 0, MJ_W, MJ_H);
    ctx.fillStyle = "#f3d9b0";
    for (let x = 0; x < MJ_W; x += 80) for (let y = 0; y < 100; y += 80) if ((x / 80 + y / 80) % 2 === 0) ctx.fillRect(x, y, 80, 80);
    ctx.fillStyle = "#c47a3a";
    ctx.fillRect(0, 100, MJ_W, MJ_H - 100);
    ctx.fillStyle = "#b06a2e";
    ctx.fillRect(0, 100, MJ_W, 10);

    const sh = this.temblor > 0 ? (Math.random() - 0.5) * 6 : 0;
    ctx.save();
    ctx.translate(sh, 0);
    const fn = {
      frotar: () => this._dFrotar(t), trazos: () => this._dCortar(t), cortar: () => this._dCortar(t),
      cubrir: () => this._dCubrir(t), girar: () => this._dGirar(t), presionar: () => this._dPresionar(t),
      mantener: () => this._dMantener(t), arrastrar: () => this._dArrastrar(t),
      fuego: () => this._dFuego(t), horno: () => this._dHorno(t), servir: () => this._dServir(t),
    }[this.gesto];
    if (fn) fn();
    ctx.restore();

    // partículas
    for (const q of this.particulas) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, q.vida);
      if (q.tipo === "b") {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, 7);
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#64b5f6";
        ctx.stroke();
      } else if (q.tipo === "t") {
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        rr(ctx, -q.w / 2, -q.h / 2, q.w, q.h, 8);
        trazo(ctx, q.color, 2);
      } else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, 7);
        ctx.fillStyle = q.color;
        ctx.fill();
      }
      ctx.restore();
    }

    rr(ctx, 20, MJ_H - 30, MJ_W - 40, 18, 9);
    trazo(ctx, "#fff", 3);
    if (this.p > 0) {
      rr(ctx, 22, MJ_H - 28, (MJ_W - 44) * this.p, 14, 7);
      ctx.fillStyle = this.hecho ? "#2e9e4a" : "#f4c430";
      ctx.fill();
    }
    if (this.hecho) {
      ctx.font = "bold 54px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 8;
      ctx.strokeStyle = TINTA;
      ctx.strokeText("¡LISTO!", MJ_W / 2, 80);
      ctx.fillStyle = "#f4c430";
      ctx.fillText("¡LISTO!", MJ_W / 2, 80);
    } else if (this.tocar) {
      this._etiqueta("TOCA LA PANTALLA");
    }
  }

  _etiqueta(txt) {
    const ctx = this.ctx;
    ctx.font = "bold 22px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    const w = ctx.measureText(txt).width + 30;
    rr(ctx, MJ_W / 2 - w / 2, 14, w, 36, 18);
    trazo(ctx, "#fffdf7", 3);
    ctx.fillStyle = TINTA;
    ctx.fillText(txt, MJ_W / 2, 40);
  }

  _guia(t, tipo) {
    if (this.p > 0.12 || this.abajo || this.tocar) return;
    const ctx = this.ctx;
    const k = (t % 1600) / 1600;
    let x;
    let y;
    if (tipo === "lado") [x, y] = [320 + Math.sin(k * Math.PI * 2) * 120, 230];
    else if (tipo === "abajo") [x, y] = [320, 120 + k * 200];
    else if (tipo === "circulo") [x, y] = [320 + Math.cos(k * Math.PI * 2) * 130, 245 + Math.sin(k * Math.PI * 2) * 80];
    else if (tipo === "derecha") [x, y] = [150 + k * 310, 240 - Math.sin(k * Math.PI) * 60];
    else [x, y] = [320, 200];
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, 7);
    ctx.fillStyle = "rgba(43,108,176,.35)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2b6cb0";
    ctx.stroke();
    ctx.restore();
  }

  _dFrotar(t) {
    const ctx = this.ctx;
    const O = this.objs;
    if (this.paso === "amasar") {
      dibTabla(ctx);
      const p = this.p;
      ctx.beginPath();
      ctx.ellipse(320, 235, 70 + 120 * p, 60 - 22 * p, 0, 0, 7);
      trazo(ctx, "#f3dfb5");
      if (this.puntero) dibRodillo(ctx, this.puntero.x, this.puntero.y);
      else dibRodillo(ctx, 320 + Math.sin(t / 300) * 60, 235);
      this._guia(t, "lado");
      return;
    }
    // lavadero
    rr(ctx, 110, 150, 420, 210, 26);
    trazo(ctx, "#b0bec5");
    rr(ctx, 130, 170, 380, 170, 20);
    trazo(ctx, "#e3f2fd", 3);
    // grifo y chorro
    rr(ctx, 300, 60, 40, 30, 8);
    trazo(ctx, "#90a4ae");
    rr(ctx, 312, 90, 16, 30, 6);
    trazo(ctx, "#90a4ae");
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#4fc3f7";
    for (let i = 0; i < 3; i++) ctx.fillRect(314 + i * 5, 120 + ((t / 8 + i * 15) % 20) - 20, 3, 120);
    ctx.restore();
    const n = Math.max(1, O.length);
    O.forEach((id, i) => {
      const cx = 320 + (i - (n - 1) / 2) * 130;
      dibImg(ctx, this.img[id], cx, 250, n > 2 ? 110 : 140);
    });
    // suciedad que desaparece
    for (const m of this.manchas) {
      const cx = 320 + (m.o - (n - 1) / 2) * 130 + m.dx * (n > 2 ? 0.7 : 1);
      ctx.beginPath();
      ctx.arc(cx, 250 + m.dy, m.r, 0, 7);
      ctx.fillStyle = `rgba(110,76,40,${0.75 * (1 - this.p)})`;
      ctx.fill();
    }
    if (this.puntero && this.abajo) dibEsponja(ctx, this.puntero.x, this.puntero.y);
    this._guia(t, "lado");
  }

  _dCortar(t) {
    const ctx = this.ctx;
    const esCorte = this.gesto === "cortar";
    dibTabla(ctx);
    // bol de piezas listas
    ctx.beginPath();
    ctx.ellipse(560, 330, 60, 24, 0, 0, Math.PI);
    trazo(ctx, "#ffffff");
    for (const s of this.salida) {
      const x = 320 + (560 - 320) * s.t;
      const y = 215 + (310 - 215) * s.t - Math.sin(s.t * Math.PI) * 80;
      dibImg(ctx, this.img[s.id], x, y, 220 - 160 * s.t, 1);
    }
    const c = this.cola[this.actual];
    if (!c) return;
    const img = this.img[c.id];
    const box = { x: 210, y: 105, w: 220, h: 220 };
    if (esCorte && img) {
      const bordes = [0, ...c.guias.map((g, i) => ({ g, i })).sort((a, b) => a.g - b.g).map((o) => o.g), 1];
      const corteEn = (g) => c.hechos.some((i) => c.guias[i] === g);
      const nCortes = c.hechos.length;
      const iw = img.naturalWidth || 100;
      const ih = img.naturalHeight || 100;
      let desp = -nCortes * 7;
      for (let k = 0; k < bordes.length - 1; k++) {
        if (k > 0 && corteEn(bordes[k])) desp += 14;
        const a = bordes[k];
        const b = bordes[k + 1];
        ctx.drawImage(img, a * iw, 0, (b - a) * iw, ih, box.x + a * box.w + desp, box.y, (b - a) * box.w, box.h);
      }
      // guías por cortar
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(26,18,8,.55)";
      c.guias.forEach((g, i) => {
        if (c.hechos.includes(i)) return;
        const x = box.x + g * box.w + (-nCortes * 7);
        ctx.beginPath();
        ctx.moveTo(x, box.y - 10);
        ctx.lineTo(x, box.y + box.h + 10);
        ctx.stroke();
      });
      ctx.restore();
    } else if (img) {
      // pelar: tiras de cáscara sobre el objeto
      dibImg(ctx, img, 320, 215, 220);
      const col = colorDe(c.id, "#c8a165");
      c.guias.forEach((g, i) => {
        if (c.hechos.includes(i)) return;
        rr(ctx, box.x + g * box.w - 20, box.y + 20, 40, box.h - 40, 16);
        ctx.save();
        ctx.globalAlpha = 0.88;
        trazo(ctx, col, 3);
        ctx.restore();
      });
    }
    // trazo actual
    if (this.trazoPts && this.trazoPts.length > 1) {
      ctx.beginPath();
      this.trazoPts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.stroke();
    }
    if (this.cola.length > 1) this._etiqueta(`${this.actual + 1} / ${this.cola.length}`);
    if (esCorte && this.puntero) dibCuchillo(ctx, this.puntero.x, this.puntero.y);
    this._guia(t, "abajo");
  }

  _dCubrir(t) {
    const ctx = this.ctx;
    dibTabla(ctx);
    const base = this.def.sobre === "masa" ? "#f1d9a6" : "#e8c48a";
    ctx.save();
    ctx.fillStyle = base;
    ctx.fill(this.camino);
    ctx.clip(this.camino);
    ctx.drawImage(this.pintura, 0, 0, MJ_W, MJ_H);
    ctx.restore();
    ctx.lineWidth = this.def.sobre === "masa" ? 10 : 12;
    ctx.strokeStyle = this.def.sobre === "masa" ? "#d9a35b" : "#a86b2d";
    ctx.stroke(this.camino);
    ctx.lineWidth = 3;
    ctx.strokeStyle = TINTA;
    ctx.stroke(this.camino);
    dibImg(ctx, this.img[this.objs[0]], 560, 160, 80);
    if (this.puntero) {
      ctx.beginPath();
      ctx.arc(this.puntero.x, this.puntero.y, this.modo === "normal" ? 30 : 46, 0, 7);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(26,18,8,.5)";
      ctx.stroke();
      dibCuchillo(ctx, this.puntero.x + 10, this.puntero.y + 10);
    }
    this._guia(t, "lado");
  }

  _dGirar(t) {
    const ctx = this.ctx;
    const cx = 320;
    const cy = 245;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 200, 125, 0, 0, Math.PI);
    ctx.closePath();
    trazo(ctx, "#90caf9");
    ctx.beginPath();
    ctx.ellipse(cx, cy, 200, 70, 0, 0, Math.PI * 2);
    trazo(ctx, "#e3f2fd");
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 182, 58, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#fff8e1";
    ctx.fillRect(cx - 200, cy - 70, 400, 140);
    ctx.globalAlpha = Math.min(1, this.p * 1.2);
    ctx.fillStyle = this.color;
    ctx.fillRect(cx - 200, cy - 70, 400, 140);
    ctx.globalAlpha = 1;
    const n = Math.max(1, this.objs.length);
    this.objs.forEach((id, i) => {
      const a = this.ang + (i * Math.PI * 2) / n;
      const r = 120 * (1 - 0.7 * this.p);
      dibImg(ctx, this.img[id], cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.35, 70 * (1 - 0.5 * this.p), 1 - 0.75 * this.p, a);
    });
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 182, 58, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    // flecha de giro
    if (this.p < 0.15) {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 130, 80, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(43,108,176,.6)";
      ctx.stroke();
      ctx.restore();
    }
    if (this.puntero) dibCuchara(ctx, this.puntero.x, this.puntero.y);
    this._guia(t, "circulo");
  }

  _dPresionar(t) {
    const ctx = this.ctx;
    dibVaso(ctx, 320, 370, Math.min(1, this.p) * 0.9, this.color);
    const s = 1 - 0.18 * this.apriete;
    ctx.save();
    ctx.translate(320, 150);
    ctx.scale(1 + 0.1 * this.apriete, s);
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    trazo(ctx, this.color);
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    trazo(ctx, "#fff3c4", 2);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 4) * 64, Math.sin((i * Math.PI) / 4) * 64);
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
    ctx.restore();
    if (this.p < 0.12) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200);
      ctx.beginPath();
      ctx.arc(320, 150, 95, 0, 7);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#2b6cb0";
      ctx.stroke();
      ctx.restore();
    }
  }

  _dMantener(t) {
    const ctx = this.ctx;
    // licuadora
    ctx.beginPath();
    ctx.moveTo(240, 70);
    ctx.lineTo(400, 70);
    ctx.lineTo(380, 280);
    ctx.lineTo(260, 280);
    ctx.closePath();
    ctx.fillStyle = "rgba(225,245,254,.7)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    const nivel = 280 - 190 * Math.min(1, this.p * 1.1);
    ctx.globalAlpha = Math.min(1, this.p * 1.3);
    ctx.fillStyle = this.color;
    ctx.fillRect(230, nivel, 180, 300);
    ctx.restore();
    const vel = this.abajo || this.temblor > 0 ? 0.03 : 0.002;
    const n = Math.max(1, this.objs.length);
    this.objs.forEach((id, i) => {
      const a = t * vel + (i * Math.PI * 2) / n;
      dibImg(ctx, this.img[id], 320 + Math.cos(a) * 45, 190 + Math.sin(a) * 50, 64 * (1 - 0.6 * this.p), 1 - 0.7 * this.p, a);
    });
    ctx.beginPath();
    ctx.moveTo(240, 70);
    ctx.lineTo(400, 70);
    ctx.lineTo(380, 280);
    ctx.lineTo(260, 280);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    rr(ctx, 230, 50, 180, 24, 8);
    trazo(ctx, "#455a64");
    rr(ctx, 230, 280, 180, 85, 16);
    trazo(ctx, "#607d8b");
    ctx.beginPath();
    ctx.arc(320, 322, 26, 0, 7);
    trazo(ctx, this.abajo ? "#2e9e4a" : "#e53935");
    if (this.p < 0.12 && !this.abajo) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200);
      ctx.beginPath();
      ctx.arc(320, 322, 40, 0, 7);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#2b6cb0";
      ctx.stroke();
      ctx.restore();
    }
  }

  _base(cx, cy) {
    const ctx = this.ctx;
    if (this.def.sobre === "masa") {
      const c = caminoMasa(cx, cy, 115);
      ctx.fillStyle = "#f1d9a6";
      ctx.fill(c);
      ctx.save();
      ctx.clip(c);
      ctx.fillStyle = "#d32f2f";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 98, 68, 0, 0, 7);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 4;
      ctx.strokeStyle = TINTA;
      ctx.stroke(c);
    } else if (this.def.sobre === "pan") {
      const c = caminoPan(cx, cy);
      ctx.fillStyle = "#e8c48a";
      ctx.fill(c);
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#a86b2d";
      ctx.stroke(c);
      ctx.lineWidth = 3;
      ctx.strokeStyle = TINTA;
      ctx.stroke(c);
    } else dibPlato(ctx, cx, cy + 20, 130);
  }

  _dArrastrar(t) {
    const ctx = this.ctx;
    dibTabla(ctx);
    this._base(this.destino.x, this.destino.y);
    // bandeja de ingredientes
    rr(ctx, 30, 40, 130, 330, 18);
    trazo(ctx, "rgba(255,255,255,.65)", 3);
    const orden = [...this.items].sort((a, b) => (a === this.agarrado) - (b === this.agarrado));
    for (const it of orden) dibImg(ctx, this.img[it.id], it.x, it.y, it.puesto ? 80 : 96, 1, it === this.agarrado ? Math.sin(t / 120) * 0.08 : 0);
    if (this.p < 0.12 && !this.agarrado) {
      const it = this.items.find((i) => !i.puesto);
      if (it) {
        const k = (t % 1800) / 1800;
        const x = it.x0 + (this.destino.x - it.x0) * k;
        const y = it.y0 + (this.destino.y - it.y0) * k - Math.sin(k * Math.PI) * 60;
        ctx.save();
        ctx.globalAlpha = 0.35;
        dibImg(ctx, this.img[it.id], x, y, 80);
        ctx.restore();
      }
    }
  }

  _dFuego(t) {
    const ctx = this.ctx;
    const sarten = this.paso === "freir";
    dibCocina(ctx, this.destino.x, this.destino.y + 30, this.item.puesto, t);
    const it = this.item;
    const cont = this.paso === "hervir" ? "#81d4fa" : mezclaColores(this.objs.length ? this.objs : ["huevo"]);
    dibOlla(ctx, it.x, it.y, sarten, cont);
    const n = Math.min(3, this.objs.length);
    for (let i = 0; i < n; i++) dibImg(ctx, this.img[this.objs[i]], it.x - 40 + i * 40, it.y - (sarten ? 25 : 70), 54, 1, Math.sin(t / 300 + i) * 0.1);
    if (!this.objs.length) dibImg(ctx, this.img[`plato_${this.receta.id}`], it.x, it.y - (sarten ? 30 : 75), 70);
    if (it.puesto) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const y = it.y - 110 - ((t / 20 + i * 30) % 90);
        ctx.beginPath();
        ctx.arc(it.x - 30 + i * 30 + Math.sin(t / 300 + i) * 10, y, 14, 0, 7);
        ctx.fillStyle = "#eceff1";
        ctx.fill();
      }
      ctx.restore();
    } else this._guia(t, "derecha");
  }

  _dHorno(t) {
    const ctx = this.ctx;
    const d = this.destino;
    dibHorno(ctx, d.x - 130, d.y - 130, 260, 270, this.item.puesto ? this.coccion : 0);
    const it = this.item;
    const s = it.puesto ? 0.75 : 1;
    rr(ctx, it.x - 90 * s, it.y - 12 * s, 180 * s, 24 * s, 8);
    trazo(ctx, "#78909c", 3);
    const im = this.def.sobre ? null : this.img[`plato_${this.receta.id}`];
    if (im) dibImg(ctx, im, it.x, it.y - 50 * s, 110 * s);
    if (!it.puesto) this._guia(t, "derecha");
  }

  _dServir(t) {
    const ctx = this.ctx;
    const d = this.destino;
    if (this.esBebida) dibVaso(ctx, d.x, d.y + 70, this.item.puesto ? 0.85 : 0.05, "#ffb74d");
    else dibPlato(ctx, d.x, d.y + 10, 130);
    const it = this.item;
    if (!it.puesto) {
      dibOlla(ctx, it.x, it.y + 40, false, "#ffe0b2");
      dibImg(ctx, this.img[`plato_${this.receta.id}`], it.x, it.y - 30, 120, 1, Math.sin(t / 250) * 0.05);
      this._guia(t, "derecha");
    } else dibImg(ctx, this.img[`plato_${this.receta.id}`], d.x, d.y - (this.esBebida ? 10 : 30), 150);
  }
}
