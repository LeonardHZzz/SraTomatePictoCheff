// Pantalla de inicio, tutorial «¿Cómo se juega?» y guía con la mano durante el juego.
const GESTO_TXT = {
  frotar: "Mueve el dedo de un lado a otro.",
  trazos: "Pasa el dedo por las líneas.",
  cortar: "Desliza el dedo de arriba hacia abajo para cortar.",
  cubrir: "Pasa el dedo por toda la comida.",
  girar: "Haz círculos con el dedo.",
  presionar: "Toca muchas veces.",
  mantener: "Aprieta el botón y no lo sueltes.",
  arrastrar: "Lleva cada cosa con el dedo hasta su lugar.",
  fuego: "Lleva la olla al fuego con el dedo.",
  horno: "Lleva la comida al horno con el dedo.",
  servir: "Lleva la comida al plato con el dedo.",
};

const PREF = {
  leer(k, def) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  escribir(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { /* sin almacenamiento */ }
  },
};

// ---------------------------------------------------------------------------
// Pantalla de inicio
// ---------------------------------------------------------------------------
const Inicio = {
  abrir() {
    document.querySelectorAll(".overlay.show").forEach((o) => o.classList.remove("show"));
    $("inicio").classList.add("show");
    Guia.ocultar();
  },
  jugar() {
    $("inicio").classList.remove("show");
    if (jugador) {
      render();
      Voz.decir(partida.accion.texto);
      return;
    }
    renderLogin();
    $("login").classList.add("show");
    Voz.decir("¡Hola! Soy la Sra. Tomate. ¿Quién va a cocinar hoy? Toca tu dibujo.");
  },
};

// ---------------------------------------------------------------------------
// Tutorial: tarjetas grandes con pictogramas, cada una se lee en voz alta
// ---------------------------------------------------------------------------
const Tutorial = {
  i: 0,
  alCerrar: null,
  pasos: [
    {
      titulo: "Elige qué cocinar",
      voz: "Primero, toca el dibujo de lo que quieres cocinar.",
      html: () => `<div class="tut-fila">${["tipo_desayuno", "tipo_postre", "tipo_bebida"].map((p) => Tutorial.picto(p)).join("")}</div><div class="tut-mano toca">👆</div>`,
    },
    {
      titulo: "Pon los ingredientes en el plato",
      voz: "Después, toca los ingredientes que van en la receta. También puedes arrastrarlos al plato.",
      html: () => `<div class="tut-fila">${Tutorial.picto("tomate")}<span class="tut-flecha">➜</span>${Tutorial.picto("plato")}</div><div class="tut-mano arrastra">👆</div>`,
    },
    {
      titulo: "¿No sabes? Pide ayuda",
      voz: "Si no sabes cuál es, toca AYUDA y la Sra. Tomate te da una pista. Toca ESCUCHAR para oír otra vez.",
      html: () => `<div class="tut-fila"><div class="tut-boton ayuda">${imgPicto("ayuda", "ayuda")}<b>AYUDA</b></div><div class="tut-boton oir">${imgPicto("oir", "escuchar")}<b>ESCUCHAR</b></div></div>`,
    },
    {
      titulo: "Cocina paso a paso",
      voz: "Luego toca los pasos en orden y haz el movimiento con tu dedo: lavar, cortar, mezclar.",
      html: () => `<div class="tut-fila">${["lavar", "cortar", "mezclar"].map((p, k) => `<div class="tut-num"><b>${k + 1}</b>${Tutorial.picto(`paso_${p}`)}</div>`).join('<span class="tut-flecha">➜</span>')}</div><div class="tut-mano frota">👆</div>`,
    },
    {
      titulo: "¡Gana estrellas!",
      voz: "Al terminar, ganas estrellas. ¡Vamos a cocinar!",
      html: () => `<div class="tut-fila"><img class="tut-chef" src="${SPRITES.come}" alt="Sra. Tomate" /><div class="tut-estrellas"><span>★</span><span>★</span><span>★</span></div></div>`,
    },
  ],
  picto(id) {
    return `<figure class="tut-picto">${imgPicto(id, etiqueta(id))}<figcaption>${etiqueta(id).toUpperCase()}</figcaption></figure>`;
  },
  abrir(alCerrar = null) {
    this.alCerrar = alCerrar;
    this.i = 0;
    $("tutorial").classList.add("show");
    Guia.ocultar();
    this.pintar();
  },
  pintar() {
    const p = this.pasos[this.i];
    const ultimo = this.i === this.pasos.length - 1;
    $("tut-num").textContent = `${this.i + 1}`;
    $("tut-titulo").textContent = p.titulo.toUpperCase();
    const c = $("tut-contenido");
    c.innerHTML = p.html();
    c.classList.remove("pop");
    void c.offsetWidth;
    c.classList.add("pop");
    $("tut-puntos").innerHTML = this.pasos.map((_, k) => `<i class="${k === this.i ? "on" : ""}"></i>`).join("");
    $("tut-atras").disabled = this.i === 0;
    $("tut-siguiente").classList.toggle("oculto", ultimo);
    $("tut-jugar").classList.toggle("oculto", !ultimo);
    Voz.decir(p.voz);
  },
  mover(d) {
    this.i = Math.max(0, Math.min(this.pasos.length - 1, this.i + d));
    this.pintar();
  },
  cerrar() {
    $("tutorial").classList.remove("show");
    PREF.escribir("pictochef.tutorial.visto", true);
    Guia.reiniciar();
    const f = this.alCerrar;
    this.alCerrar = null;
    if (jugador && !$("inicio").classList.contains("show")) Guia.revisar();
    if (f) f();
  },
};

// ---------------------------------------------------------------------------
// Guía en el juego: mano que señala + aro en lo que hay que tocar + voz
// ---------------------------------------------------------------------------
const Guia = {
  VECES: 3, // cuántas veces se muestra cada indicación a un jugador
  activa: PREF.leer("pictochef.guia.activa", true),
  ultimaClave: null,
  vistos: new Set(),
  _partida: null,
  pendiente: null,
  timerTexto: null,
  timerFin: null,
  raf: null,
  desde: null,
  hasta: null,
  foco: null,

  _cuentas() {
    return PREF.leer(`pictochef.guia.${jugador ? jugador.id : "invitado"}`, {});
  },
  _contar(k) {
    const c = this._cuentas();
    c[k] = (c[k] || 0) + 1;
    PREF.escribir(`pictochef.guia.${jugador ? jugador.id : "invitado"}`, c);
  },
  _toca(k) {
    return this.activa && (this._cuentas()[k] || 0) < this.VECES;
  },
  setActiva(b) {
    this.activa = b;
    PREF.escribir("pictochef.guia.activa", b);
    if (!b) this.ocultar();
  },
  // «¿Cómo se juega?» vuelve a mostrar las indicaciones de la fase actual
  reiniciar() {
    PREF.escribir(`pictochef.guia.${jugador ? jugador.id : "invitado"}`, {});
    this.ultimaClave = null;
    this.vistos = new Set();
  },
  // cada indicación se muestra una sola vez por receta
  _nueva(k) {
    if (this._partida !== partida) {
      this._partida = partida;
      this.vistos = new Set();
    }
    if (this.vistos.has(k) || !this._toca(k)) return false;
    this.vistos.add(k);
    this._contar(k);
    return true;
  },

  // Texto de la guía para unirlo a lo que va a decir la Sra. Tomate (Voz.decir cancela lo anterior)
  tomarTexto() {
    const t = this.pendiente;
    this.pendiente = null;
    clearTimeout(this.timerTexto);
    return t;
  },
  _hablar(t) {
    this.pendiente = t;
    clearTimeout(this.timerTexto);
    this.timerTexto = setTimeout(() => {
      const x = this.tomarTexto();
      if (x) Voz.decir(x);
    }, 400);
  },

  // Se llama después de cada render()
  revisar() {
    const f = partida.fase;
    if (!jugador || $("inicio").classList.contains("show") || $("tutorial").classList.contains("show")) return;
    let clave = f;
    if (f === "INGREDIENTES" && partida.accion.tipo === "PISTA") clave = "AYUDA";
    if (f === "PASOS" && partida.accion.tipo === "PISTA") clave = "AYUDA";
    if (clave === this.ultimaClave) return;
    this.ultimaClave = clave;
    this.ocultar();
    if (clave === "TIPO" && this._nueva("tipo")) {
      this.mostrar({ hasta: ".tipo", texto: "Toca el dibujo de lo que quieres cocinar.", foco: "#tipos" });
    } else if (clave === "INGREDIENTES" && this._nueva("ingredientes")) {
      this.mostrar({ desde: "#grid", hasta: "#zona-plato", texto: "Toca un ingrediente de la receta, o arrástralo al plato.", foco: "#grid" });
    } else if (clave === "AYUDA" && this._nueva("ayuda")) {
      this.mostrar({ hasta: "#btn-ayuda", texto: "Si no sabes, toca AYUDA. Para oír otra vez, toca ESCUCHAR." });
    } else if (clave === "PASOS" && this._nueva("pasos")) {
      this.mostrar({ desde: "#grid", hasta: "#zona-cocina", texto: "Ahora toca el paso que sigue, o arrástralo a la cocina.", foco: "#grid" });
    }
  },

  // Al abrir un minijuego: instrucción fija sobre la cocina y voz las primeras veces
  gesto(pasoId) {
    const g = CATALOGO.pasos[pasoId].gesto;
    const modo = jugador ? jugador.ajustes.motor : "normal";
    const txt = modo === "tocar" ? "Toca la pantalla para cocinar." : GESTO_TXT[g] || "Haz el movimiento con el dedo.";
    $("cocina-instr").innerHTML = `${imgPicto(`paso_${pasoId}`, CATALOGO.pasos[pasoId].nombre, "mini")}<span class="mano-mini">👆</span><b>${txt.toUpperCase()}</b>`;
    $("cocina-instr").classList.remove("oculto");
    this.ocultar();
    this.ultimaClave = "ACCION";
    // la Sra. Tomate ya explica el movimiento en voz alta; aquí queda escrito con su dibujo
  },
  finGesto() {
    $("cocina-instr").classList.add("oculto");
  },

  mostrar({ desde = null, hasta, texto, foco = null }) {
    const objetivo = document.querySelector(hasta);
    if (!objetivo) return;
    this.desde = desde;
    this.hasta = hasta;
    this.foco = document.querySelector(foco || hasta);
    if (this.foco) this.foco.classList.add("guia-foco");
    $("guia-banda-txt").textContent = texto.toUpperCase();
    $("guia-banda").classList.remove("oculto");
    $("guia-mano").classList.remove("oculto");
    objetivo.scrollIntoView({ behavior: "smooth", block: "center" });
    this.t0 = performance.now();
    cancelAnimationFrame(this.raf);
    const paso = (t) => {
      this._mover(t);
      this.raf = requestAnimationFrame(paso);
    };
    this.raf = requestAnimationFrame(paso);
    clearTimeout(this.timerFin);
    this.timerFin = setTimeout(() => this.ocultar(), 14000);
    this._hablar(texto);
  },
  _centro(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 90) };
  },
  _mover(t) {
    const b = this._centro(this.hasta);
    if (!b) return this.ocultar();
    const a = this.desde ? this._centro(this.desde) : null;
    const k = ((t - this.t0) % 2200) / 2200;
    let x;
    let y;
    let s = 1;
    if (a) {
      const e = Math.min(1, k / 0.75);
      const ee = e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2;
      x = a.x + (b.x - a.x) * ee;
      y = a.y + (b.y - a.y) * ee - Math.sin(ee * Math.PI) * 60;
      s = k < 0.08 || k > 0.75 ? 0.85 : 1;
    } else {
      x = b.x;
      y = b.y + Math.abs(Math.sin(k * Math.PI * 2)) * -18;
      s = k % 0.5 < 0.08 ? 0.85 : 1;
    }
    const m = $("guia-mano");
    m.style.transform = `translate(${x - 20}px, ${y - 6}px) scale(${s})`;
  },
  ocultar() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timerFin);
    this.raf = null;
    document.querySelectorAll(".guia-foco").forEach((e) => e.classList.remove("guia-foco"));
    $("guia-mano").classList.add("oculto");
    $("guia-banda").classList.add("oculto");
  },
};

// La voz de la guía se une a lo que dice la Sra. Tomate en ese momento
(() => {
  const decir = Voz.decir.bind(Voz);
  Voz.decir = (textos, opts) => {
    const extra = Guia.tomarTexto();
    const lista = Array.isArray(textos) ? [...textos] : [textos];
    if (extra) lista.push(extra);
    decir(lista, opts);
  };
})();
