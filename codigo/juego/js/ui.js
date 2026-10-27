const SPRITES = {
  idle: "../../datos/sprites/SraTomateIddle.png",
  pregunta: "../../datos/sprites/SraTomateQuestion.png",
  come: "../../datos/sprites/SraTomateEat.png",
};
Object.values(SPRITES).forEach((s) => { new Image().src = s; });

const INACTIVIDAD_MS = 30000; // sin respuesta: la Sra. Tomate ofrece ayuda
const INACTIVIDAD_GESTO_MS = 25000; // minijuego sin terminar: ofrece ayuda motora

let jugador = null;
let perfil = new Perfil();
let partida = new Partida(perfil);
let minijuego = null;
let timerInactivo = null;
let timerGesto = null;
let regPendienteBorrar = null;

const $ = (id) => document.getElementById(id);

// --- Etiquetas de pictogramas (palabra bajo cada picto) ---------------
function etiqueta(id) {
  if (CATALOGO.ingredientes[id]) return nombreIng(id);
  if (id.startsWith("plato_")) return recetaPorId(id.slice(6))?.nombre || "plato";
  if (id.startsWith("paso_") && CATALOGO.pasos[id.slice(5)]) return CATALOGO.pasos[id.slice(5)].nombre;
  return CATALOGO.conceptos[id] || id;
}
function nombreValor(a, v) {
  if (a === "herramienta") return CATALOGO.conceptos[`herr_${v}`] || v;
  if (a === "objeto") return nombreIng(v);
  return nombreAtributo(a, v);
}

// =====================================================================
// Sra. Tomate: sprites y animaciones
// =====================================================================
const Chef = {
  base: "idle",
  timer: null,
  set(estado) {
    this.base = estado === "pregunta" ? "pregunta" : "idle";
    this._pintar(this.base);
    const m = $("mascot");
    m.classList.remove("rebota", "pregunta", "fiesta");
    void m.offsetWidth;
    m.classList.add(estado === "pregunta" ? "pregunta" : estado === "fiesta" ? "fiesta" : "rebota");
    if (estado === "come" || estado === "fiesta") this.masticar(estado === "fiesta" ? 8 : 4);
  },
  _pintar(k) {
    $("sprite").src = SPRITES[k];
  },
  masticar(veces = 4, ms = 170) {
    clearInterval(this.timer);
    let n = 0;
    this.timer = setInterval(() => {
      this._pintar(n % 2 === 0 ? "come" : this.base);
      if (++n >= veces * 2) {
        clearInterval(this.timer);
        this.timer = null;
        this._pintar(this.base);
      }
    }, ms);
  },
  hablar(on) {
    if (on) {
      if (this.timer) return;
      let n = 0;
      this.timer = setInterval(() => this._pintar(n++ % 2 === 0 ? "come" : this.base), 190);
    } else {
      clearInterval(this.timer);
      this.timer = null;
      this._pintar(this.base);
    }
  },
};
Voz.alEmpezar = () => Chef.hablar(true);
Voz.alTerminar = () => Chef.hablar(false);

// =====================================================================
// Render del juego
// =====================================================================
function renderBurbuja(a) {
  $("msg").textContent = a.texto;
  $("pictos").innerHTML = a.filas
    .map((fila) => `<div class="fila">${fila
      .map((id) => `<figure class="picto">${imgPicto(id, etiqueta(id))}<figcaption>${etiqueta(id).toUpperCase()}</figcaption></figure>`)
      .join("")}</div>`)
    .join("");
  const b = $("bubble");
  b.classList.remove("pop", "pista");
  void b.offsetWidth;
  b.classList.add("pop");
  if (a.tipo === "PISTA") b.classList.add("pista");
}

function renderCentro() {
  const f = partida.fase;
  const enTipo = f === "TIPO";
  $("tipos").classList.toggle("oculto", !enTipo);
  $("receta").classList.toggle("oculto", enTipo);
  const enPasos = ["PASOS", "ACCION"].includes(f) || (f === "VICTORIA" && partida.Y.length);
  $("centro-titulo").textContent = enTipo ? "¿Qué quieres preparar?" : enPasos ? "¡A cocinar!" : "Mi receta";
  $("receta").classList.toggle("modo-pasos", !!enPasos);
  if (enTipo) {
    $("tipos").innerHTML = CATALOGO.tipos
      .map((t) => `<button class="tipo" data-tipo="${t.id}" data-narrar="${t.nombre}">
        ${imgPicto(t.picto, t.nombre)}<span>${t.nombre.toUpperCase()}</span></button>`)
      .join("");
    return;
  }
  const r = partida.receta;
  const img = $("receta-img");
  img.dataset.picto = `plato_${r.id}`;
  delete img.dataset.remoto;
  img.onerror = () => pictoFallback(img);
  img.alt = r.nombre;
  img.src = pictoSrc(`plato_${r.id}`);
  $("receta-nombre").textContent = r.nombre.toUpperCase();

  const puestos = [...partida.X];
  const n = r.ingredientes.length;
  let html = "";
  for (let i = 0; i < n; i++) {
    const g = puestos[i];
    html += g
      ? `<div class="slot lleno" data-slot="${g}" data-narrar="${nombreIng(g)}">${imgPicto(g, nombreIng(g))}<span>${nombreIng(g).toUpperCase()}</span></div>`
      : `<div class="slot vacio"><b>?</b></div>`;
  }
  $("slots").innerHTML = html;
  const fl = n - puestos.length;
  $("progreso").innerHTML = fl
    ? `${imgPicto("falta", "falta", "mini")} Falta${fl > 1 ? "n" : ""} <b>${fl}</b> ingrediente${fl > 1 ? "s" : ""}`
    : `${imgPicto("listo", "listo", "mini")} ¡Ingredientes completos!`;

  // línea de pasos
  $("linea-pasos").classList.toggle("oculto", !enPasos);
  $("zona-cocina").classList.toggle("oculto", !["PASOS", "ACCION"].includes(f));
  if (enPasos) {
    const np = r.pasos.length;
    let lh = "";
    for (let i = 0; i < np; i++) {
      const id = partida.Y[i];
      const activo = !id && f === "ACCION" && i === partida.Y.length;
      const pid = id || (activo ? partida.pasoActivo : null);
      lh += `<div class="paso-slot ${id ? "hecho" : activo ? "activo" : ""}"><b>${i + 1}</b>${pid ? `${imgPicto(`paso_${pid}`, etiqueta(`paso_${pid}`))}<span>${etiqueta(`paso_${pid}`).toUpperCase()}</span>` : "<i>?</i>"}</div>`;
      if (i < np - 1) lh += `<div class="flecha">➜</div>`;
    }
    $("linea-pasos").innerHTML = lh;
  }
}

function tarjetaIng(g, enTipo) {
  const nom = nombreIng(g);
  const usado = partida.X.has(g);
  const mal = partida.W.has(g);
  const at = partida.atenuados.has(g);
  const res = partida.resaltado === g;
  const cls = ["card", usado && "usado", mal && "mal", at && "atenuado", res && "resaltado", enTipo && "inactivo"].filter(Boolean).join(" ");
  const activa = !enTipo && !usado && !mal && !at && partida.fase === "INGREDIENTES";
  return `<button class="${cls}" data-ing="${g}" data-narrar="${nom}" ${activa ? 'data-arrastrar="ing"' : ""} ${usado || mal || at ? 'aria-disabled="true"' : ""}>
    ${imgPicto(g, nom)}<span>${nom.toUpperCase()}</span></button>`;
}

function tarjetaPaso(id) {
  const d = partida.defPaso(id);
  const nom = CATALOGO.pasos[id].nombre;
  const hecho = partida.Y.includes(id);
  const mal = partida.Wp.has(id);
  const at = partida.atenuados.has(id);
  const res = partida.resaltado === id;
  const bloqueada = partida.fase !== "PASOS";
  const cls = ["card", "card-paso", hecho && "usado", mal && "mal", at && "atenuado", res && "resaltado", bloqueada && !hecho && "inactivo"].filter(Boolean).join(" ");
  const activa = !hecho && !mal && !at && !bloqueada;
  const desc = descPaso(d, partida.receta);
  const objs = [...d.objetos.slice(0, 3), ...(d.sobre ? [d.sobre] : [])];
  return `<button class="${cls}" data-paso="${id}" data-narrar="${desc}" ${activa ? 'data-arrastrar="paso"' : ""} ${hecho || mal || at ? 'aria-disabled="true"' : ""}>
    ${imgPicto(`paso_${id}`, nom)}
    <div class="objs">${objs.map((g) => imgPicto(g, nombreIng(g), "mini-obj")).join("")}</div>
    <span>${nom.toUpperCase()}</span></button>`;
}

function renderDerecha() {
  const f = partida.fase;
  const enTipo = f === "TIPO";
  const enPasos = ["PASOS", "ACCION"].includes(f);
  $("der-titulo").textContent = enPasos ? "Pasos" : "Despensa";
  $("despensa-nota").textContent = enTipo
    ? "Primero elige qué platillo preparar."
    : enPasos
      ? f === "ACCION" ? "¡Haz el gesto en la cocina!" : "Toca o arrastra el paso que sigue."
      : "Toca o arrastra los ingredientes al plato.";
  const grid = $("grid");
  grid.classList.toggle("cerrada", enTipo);
  grid.classList.toggle("pasos", enPasos);
  if (enPasos) grid.innerHTML = partida.tarjetasPaso.map(tarjetaPaso).join("");
  else grid.innerHTML = (enTipo ? Object.keys(CATALOGO.ingredientes) : partida.despensa).map((g) => tarjetaIng(g, enTipo)).join("");
}

function renderTerapeuta() {
  const p = partida;
  const th = p.perfil.theta;
  let html = `<strong>Panel del terapeuta · razonamiento del agente</strong>
    <div class="kv"><span>Jugador</span><b>${jugador ? jugador.nombre : "—"} · gestos ${jugador ? MODOS_MOTOR[jugador.ajustes.motor].nombre : "normal"}</b></div>
    <div class="kv"><span>Habilidad estimada θ</span><b>${th.toFixed(2)}</b></div><div class="bar"><i style="width:${th * 100}%"></i></div>
    <div class="kv"><span>Fase</span><b>${p.fase}</b></div>
    <div class="kv"><span>Turno · errores ingr. · errores pasos · ayudas</span><b>${p.t} · ${p.errores} · ${p.erroresPasos} · ${p.ayudas}</b></div>
    <div class="kv"><span>Nivel de pista h</span><b>${p.h} / ${CFG.H_MAX}</b></div>`;
  if (p.receta) {
    const C = p.fase === "INGREDIENTES" ? p.disponibles() : p.tarjetasDisponibles();
    html += `<div class="kv"><span>Receta (dificultad)</span><b>${p.receta.nombre} (${dificultadReceta(p.receta).toFixed(2)})</b></div>
      <div class="kv"><span>Despensa: correctos + distractores</span><b>${p.receta.ingredientes.length} + ${p.despensa.length - p.receta.ingredientes.length}</b></div>
      <div class="kv"><span>Pasos: receta + distractores</span><b>${p.receta.pasos.length} + ${p.tarjetasPaso.length - p.receta.pasos.length}</b></div>
      <div class="kv"><span>Tarjetas visibles |C| · H(C)</span><b>${C.length} · ${C.length ? log2(C.length).toFixed(2) : 0} bits</b></div>`;
    if (["PASOS", "ACCION"].includes(p.fase)) {
      html += `<div class="kv"><span>Hechos · válidos ahora</span><b>${p.Y.join(" → ") || "—"} · ${p.pasosValidos().join(", ") || "—"}</b></div>`;
    }
  }
  const up = p.ultimaPista;
  if (up && ["INGREDIENTES", "PASOS"].includes(p.fase) && p.accion.tipo === "PISTA") {
    const nomObj = (g) => (CATALOGO.ingredientes[g] ? nombreIng(g) : CATALOGO.pasos[g] ? CATALOGO.pasos[g].nombre : "—");
    html += `<div class="sub">Última pista · nivel ${up.nivel} · objetivo <b>${up.g ? nomObj(up.g) : "—"}</b> · |S| = ${up.S.length} · IG = ${up.ig.toFixed(2)} bits</div>`;
    if (up.tabla.length) {
      html += `<table><tr><th>objetivo</th><th>atributo(s)</th><th>|S|</th><th>IG</th></tr>${up.tabla
        .map((f) => `<tr><td>${nomObj(f.g)}</td><td>${f.A.map((a, i) => nombreValor(a, f.vals[i])).join(" + ")}</td><td>${f.S.length}</td><td>${f.ig.toFixed(2)}</td></tr>`)
        .join("")}</table>`;
    }
  }
  const dq = p.decisiones[p.decisiones.length - 1];
  if (dq && p.accion.tipo === "PISTA") {
    const e = QL.describir(dq.estado);
    const nombresRasgo = p.fase === "PASOS"
      ? { rasgo1: "utensilio", rasgo2: "objeto", rasgo3: "—" }
      : { rasgo1: "color", rasgo2: "grupo", rasgo3: "origen/sabor" };
    const etiquetaAccion = (a) => (nombresRasgo[a] ? `pista de ${nombresRasgo[a]}` : { animar: "solo animar", doble: "pista doble", directa: "pista directa" }[a]);
    const rel = { ayuda: "pidió ayuda / silencio", nada: "no comparte nada", prematuro: "paso fuera de orden" }[e.relacion] || `comparte ${nombresRasgo[e.relacion]}`;
    const vmax = dq.q ? Math.max(...dq.q.map(Math.abs), 0.01) : 1;
    html += `<div class="sub"><b>Q-Learning</b> · política <b>${p.politica}</b>${dq.defecto ? " · estado no visto en el entrenamiento (acción por defecto)" : ""} · retorno acumulado ${p.retorno.toFixed(2)}</div>
      <div class="kv"><span>Estado</span><b>${dq.estado}</b></div>
      <div class="sub">errores seguidos ${e.errores} · nivel ${e.nivel} · tarjetas ${e.tarjetas} · respuesta ${e.velocidad} · última ayuda ${e.ultima} · error: ${rel} · rasgo más informativo: ${nombresRasgo[e.mejor] || e.mejor}</div>
      <table><tr><th>acción</th><th>Q(s,a)</th><th></th></tr>${QL.ACCIONES.map((a, i) => {
        const v = dq.q ? dq.q[i] : 0;
        const elegida = a === dq.accion;
        return `<tr style="${dq.mascara[i] ? "" : "opacity:.35"}${elegida ? ";font-weight:800;background:#fff3bf" : ""}"><td>${elegida ? "➜ " : ""}${etiquetaAccion(a)}${dq.mascara[i] ? "" : " (no válida)"}</td><td>${v.toFixed(3)}</td><td style="width:40%"><div class="bar"><i style="width:${Math.max(0, (v / vmax) * 100)}%"></i></div></td></tr>`;
      }).join("")}</table>`;
  }
  if (p.motricidad.length) {
    html += `<div class="sub">Motricidad: ${p.motricidad.map((m) => `${CATALOGO.pasos[m.paso].nombre} ${m.segundos.toFixed(1)}s${m.ayuda ? " (ayuda)" : ""}${m.precision != null ? ` · precisión ${(m.precision * 100).toFixed(0)}%` : ""}`).join(" · ")}</div>`;
  }
  $("belief").innerHTML = html;
}

function renderVictoria() {
  const win = $("win");
  if (partida.fase !== "VICTORIA") {
    win.classList.remove("show");
    return;
  }
  const r = partida.receta;
  $("win-txt").textContent = partida.accion.texto;
  const img = $("win-img");
  img.dataset.picto = `plato_${r.id}`;
  delete img.dataset.remoto;
  img.onerror = () => pictoFallback(img);
  img.alt = r.nombre;
  img.src = pictoSrc(`plato_${r.id}`);
  $("estrellas").innerHTML = [1, 2, 3].map((i) => `<span class="${i <= partida.estrellas ? "on" : ""}">★</span>`).join("");
  setTimeout(() => {
    win.classList.add("show");
    confeti();
    Sonido.fanfarria();
    masticarVictoria();
  }, 900);
}

function masticarVictoria() {
  const s = $("win-sprite");
  let n = 0;
  const t = setInterval(() => {
    s.src = n % 2 ? SPRITES.idle : SPRITES.come;
    if (++n > 12) {
      clearInterval(t);
      s.src = SPRITES.idle;
    }
  }, 200);
}

let tUltimo = Date.now(); // momento en que la Sra. Tomate habló por última vez (tiempo de respuesta)
const segundosRespuesta = () => (Date.now() - tUltimo) / 1000;

function render() {
  const a = partida.accion;
  tUltimo = Date.now();
  renderBurbuja(a);
  renderCentro();
  renderDerecha();
  renderTerapeuta();
  renderVictoria();
  Chef.set(a.sprite);
  $("btn-ayuda").disabled = !["INGREDIENTES", "PASOS"].includes(partida.fase);
  programarInactividad();
}

// =====================================================================
// Minijuego (fase ACCION)
// =====================================================================
function abrirMinijuego() {
  cerrarMinijuego();
  const id = partida.pasoActivo;
  const cv = $("lienzo");
  cv.classList.remove("oculto");
  $("cocina-espera").classList.add("oculto");
  $("btn-ayuda-motora").classList.remove("oculto", "late");
  minijuego = new Minijuego(cv, {
    paso: id,
    def: partida.defPaso(id),
    receta: partida.receta,
    modo: jugador ? jugador.ajustes.motor : "normal",
    alProgreso: () => Voz.decir(["¡Sigue así!", "¡Muy bien, ya casi!", "¡Eso es, continúa!"][Math.floor(Math.random() * 3)]),
    alTerminar: (m) => {
      const verbo = CATALOGO.pasos[id].nombre;
      cerrarMinijuego();
      const a = partida.pasoHecho(m);
      if (a.tipo === "VICTORIA") Jugadores.registrarPartida(partida.resumen, perfil);
      render();
      Voz.decir([`¡Listo! Terminamos de ${verbo}.`, a.texto]);
    },
  });
  minijuego.iniciar();
  setTimeout(() => cv.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  clearTimeout(timerGesto);
  timerGesto = setTimeout(() => {
    if (!minijuego || minijuego.hecho) return;
    $("btn-ayuda-motora").classList.add("late");
    Voz.decir("¿Te ayudo? Toca el botón te ayudo.");
  }, INACTIVIDAD_GESTO_MS);
}

function cerrarMinijuego() {
  clearTimeout(timerGesto);
  if (minijuego) minijuego.destruir();
  minijuego = null;
  $("lienzo").classList.add("oculto");
  $("cocina-espera").classList.remove("oculto");
  $("btn-ayuda-motora").classList.add("oculto");
}

// =====================================================================
// Efectos
// =====================================================================
function volar(desde, selectorDestino) {
  const destino = document.querySelector(selectorDestino);
  if (!desde || !destino || !desde.animate) return;
  const a = desde.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  const clon = desde.cloneNode();
  clon.className = "volando";
  Object.assign(clon.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(clon);
  destino.style.visibility = "hidden";
  clon.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)" },
      { transform: `translate(${(b.left - a.left) / 2}px, ${(b.top - a.top) / 2 - 80}px) scale(1.25) rotate(-10deg)`, offset: 0.5 },
      { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}) rotate(0deg)` },
    ],
    { duration: 650, easing: "ease-in-out" }
  ).onfinish = () => {
    clon.remove();
    destino.style.visibility = "";
    destino.parentElement.classList.add("aterriza");
  };
}

function sacudir(sel) {
  const el = document.querySelector(sel);
  if (el) el.classList.add("sacude");
}

function confeti() {
  const c = $("confeti");
  const colores = ["#e63946", "#f4c430", "#2e9e4a", "#2b6cb0", "#ff8c42", "#c44536"];
  c.innerHTML = Array.from({ length: 70 }, (_, i) => {
    const x = Math.random() * 100;
    const d = 1.8 + Math.random() * 1.6;
    const del = Math.random() * 0.6;
    return `<i style="left:${x}vw;background:${colores[i % colores.length]};animation-duration:${d}s;animation-delay:${del}s"></i>`;
  }).join("");
  setTimeout(() => (c.innerHTML = ""), 4200);
}

// =====================================================================
// Acciones del jugador (todas se narran en voz alta)
// =====================================================================
function onTipo(id) {
  const t = tipoPorId(id);
  const a = partida.eligeTipo(id);
  render();
  Voz.decir([`Elegiste ${t.nombre}.`, a.texto]);
}

function onIngrediente(g, boton) {
  if (partida.fase === "TIPO") {
    Voz.decir("Primero elige qué platillo quieres preparar.");
    return;
  }
  if (partida.fase !== "INGREDIENTES" || partida.X.has(g) || partida.W.has(g) || partida.atenuados.has(g)) {
    Voz.narrar(nombreIng(g));
    return;
  }
  const img = boton && boton.querySelector("img");
  const a = partida.elige(g, segundosRespuesta());
  render();
  if (a.tipo === "ACIERTO" || a.tipo === "INGREDIENTES_LISTOS") {
    Sonido.acierto();
    volar(img, `.slot[data-slot="${g}"] img`);
  } else {
    Sonido.error();
    sacudir(`.card[data-ing="${g}"]`);
  }
  Voz.decir([`Elegiste ${elIng(g)}.`, a.texto]);
}

function onPaso(id, boton) {
  if (partida.fase !== "PASOS" || partida.Y.includes(id) || partida.Wp.has(id) || partida.atenuados.has(id)) {
    Voz.narrar(descPaso(partida.defPaso(id), partida.receta));
    return;
  }
  const desc = descPaso(partida.defPaso(id), partida.receta);
  const a = partida.eligePaso(id, segundosRespuesta());
  render();
  if (a.tipo === "PASO_OK") {
    Sonido.acierto();
    abrirMinijuego();
  } else {
    Sonido.error();
    sacudir(`.card[data-paso="${id}"]`);
  }
  Voz.decir([`Elegiste ${desc}.`, a.texto]);
}

function onAyuda(auto = false) {
  if (!["INGREDIENTES", "PASOS"].includes(partida.fase)) return;
  const a = partida.ayuda(auto, segundosRespuesta());
  render();
  Voz.decir(auto ? a.texto : ["Pediste ayuda.", a.texto]);
}

function onAyudaMotora() {
  if (!minijuego) return;
  $("btn-ayuda-motora").classList.remove("late");
  minijuego.ayudar();
  Voz.decir("¡Te ayudo! Lo hacemos juntos.");
}

function otroPlatillo() {
  cerrarMinijuego();
  partida = new Partida(perfil, { sinColor: jugador ? jugador.ajustes.sinColor : false });
  render();
  Voz.decir(partida.accion.texto);
}

function programarInactividad() {
  clearTimeout(timerInactivo);
  if (!["INGREDIENTES", "PASOS"].includes(partida.fase) || partida.h >= CFG.H_MAX) return;
  timerInactivo = setTimeout(() => {
    if (Voz.hablando) return programarInactividad();
    onAyuda(true);
  }, INACTIVIDAD_MS);
}

// =====================================================================
// Arrastrar y soltar (ingredientes al plato, pasos a la cocina)
// =====================================================================
const Arrastre = {
  ini: null,
  fantasma: null,
  ignorarClic: false,

  init() {
    // las imágenes no deben iniciar el arrastre nativo del navegador (cancela el gesto)
    document.addEventListener("dragstart", (e) => e.preventDefault());
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest("[data-arrastrar]");
      if (!el || e.button > 0) return;
      this.ini = { el, x: e.clientX, y: e.clientY, tipo: el.dataset.arrastrar, id: el.dataset.ing || el.dataset.paso };
    });
    document.addEventListener("pointermove", (e) => {
      if (!this.ini) return;
      if (!this.fantasma) {
        if (Math.hypot(e.clientX - this.ini.x, e.clientY - this.ini.y) < 12) return;
        const img = this.ini.el.querySelector("img");
        this.fantasma = img.cloneNode();
        this.fantasma.className = "fantasma";
        document.body.appendChild(this.fantasma);
        this.ini.el.classList.add("arrastrando");
        this._zona().classList.add("objetivo");
      }
      Object.assign(this.fantasma.style, { left: `${e.clientX - 50}px`, top: `${e.clientY - 50}px` });
      this._zona().classList.toggle("encima", this._dentro(e));
    });
    const fin = (e) => {
      if (!this.ini) return;
      const ini = this.ini;
      this.ini = null;
      if (!this.fantasma) return;
      const dentro = this._dentro(e, ini.tipo);
      this.fantasma.remove();
      this.fantasma = null;
      ini.el.classList.remove("arrastrando");
      document.querySelectorAll(".objetivo, .encima").forEach((z) => z.classList.remove("objetivo", "encima"));
      this.ignorarClic = true;
      setTimeout(() => (this.ignorarClic = false), 50);
      if (!dentro) return;
      if (ini.tipo === "ing") onIngrediente(ini.id, ini.el);
      else onPaso(ini.id, ini.el);
    };
    document.addEventListener("pointerup", fin);
    document.addEventListener("pointercancel", () => {
      if (this.fantasma) this.fantasma.remove();
      this.fantasma = null;
      this.ini = null;
    });
  },
  _zona(tipo = this.ini && this.ini.tipo) {
    return tipo === "paso" ? $("zona-cocina") : $("zona-plato");
  },
  _dentro(e, tipo) {
    const r = this._zona(tipo).getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  },
};

// =====================================================================
// Jugadores: inicio de sesión, nuevo jugador, logros y registro
// =====================================================================
function renderLogin() {
  const lista = Jugadores.lista();
  $("login-lista").innerHTML =
    lista
      .map((j) => {
        const e = Jugadores.estadisticas(j);
        return `<button class="jugador" data-jugador="${j.id}" data-narrar="${j.nombre}">
          ${imgPicto(j.avatar, j.nombre)}<span>${j.nombre.toUpperCase()}</span>
          <small>★ ${e.estrellas} · ${e.recetas} recetas</small></button>`;
      })
      .join("") +
    `<button class="jugador nuevo" id="btn-nuevo-jugador" data-narrar="Nuevo jugador"><b>+</b><span>NUEVO</span><small>jugador</small></button>`;
  $("aviso-memoria").textContent = Jugadores.enMemoria
    ? "Este navegador no permite guardar: el progreso se perderá al cerrar. Usa Registro → Respaldo JSON."
    : "";
}

let nuevoAvatar = AVATARES[0];
let nuevoMotor = "normal";
function abrirNuevo() {
  $("login").classList.remove("show");
  $("nuevo").classList.add("show");
  $("nuevo-nombre").value = "";
  nuevoAvatar = AVATARES[Jugadores.lista().length % AVATARES.length];
  nuevoMotor = "normal";
  renderNuevo();
  setTimeout(() => $("nuevo-nombre").focus(), 50);
  Voz.decir("Escribe tu nombre y elige tu dibujo.");
}
function renderNuevo() {
  $("nuevo-avatares").innerHTML = AVATARES.map(
    (a) => `<button class="avatar ${a === nuevoAvatar ? "sel" : ""}" data-avatar="${a}" data-narrar="${nombreIng(a)}">${imgPicto(a, nombreIng(a))}</button>`
  ).join("");
  const pict = { normal: "herr_mano", facil: "bien", tocar: "elegir" };
  $("nuevo-motor").innerHTML = Object.entries(MODOS_MOTOR)
    .map(([k, m]) => `<button class="motor ${k === nuevoMotor ? "sel" : ""}" data-motor="${k}" data-narrar="${m.nombre}. ${m.desc}">
      ${imgPicto(pict[k], m.nombre)}<span>${m.nombre.toUpperCase()}</span><small>${m.desc}</small></button>`)
    .join("");
}
function crearJugador() {
  const nombre = $("nuevo-nombre").value.trim();
  if (!nombre) {
    $("nuevo-nombre").focus();
    Voz.decir("Primero escribe el nombre.");
    return;
  }
  const j = Jugadores.crear({ nombre, avatar: nuevoAvatar, motor: nuevoMotor, sinColor: $("nuevo-sincolor").checked });
  $("nuevo").classList.remove("show");
  entrarJugador(j.id);
}

function entrarJugador(id) {
  jugador = Jugadores.entrar(id);
  if (!jugador) return;
  perfil = new Perfil(jugador.perfil);
  $("login").classList.remove("show");
  $("chip-jugador").classList.remove("oculto");
  const av = $("chip-avatar");
  av.dataset.picto = jugador.avatar;
  delete av.dataset.remoto;
  av.onerror = () => pictoFallback(av);
  av.alt = jugador.nombre;
  av.src = pictoSrc(jugador.avatar);
  $("chip-nombre").textContent = jugador.nombre;
  cerrarMinijuego();
  partida = new Partida(perfil, { sinColor: jugador.ajustes.sinColor });
  render();
  const e = Jugadores.estadisticas(jugador);
  const saludo = e.partidas ? `¡Hola otra vez, ${jugador.nombre}!` : `¡Hola, ${jugador.nombre}! Soy la Sra. Tomate.`;
  Voz.decir([saludo, partida.accion.texto]);
}

function cambiarJugador() {
  cerrarMinijuego();
  Jugadores.salir();
  jugador = null;
  $("chip-jugador").classList.add("oculto");
  $("win").classList.remove("show");
  renderLogin();
  $("login").classList.add("show");
  Voz.decir("¿Quién va a cocinar hoy?");
}

function abrirLogros() {
  if (!jugador) return;
  const e = Jugadores.estadisticas(jugador);
  $("logros-tit").textContent = `Logros de ${jugador.nombre}`;
  $("logros-stats").innerHTML = `
    <div><b>${e.estrellas}</b><span>★ estrellas</span></div>
    <div><b>${e.recetas}/${CATALOGO.recetas.length}</b><span>recetas</span></div>
    <div><b>${e.partidas}</b><span>partidas</span></div>
    <div><b>${e.racha}</b><span>días seguidos</span></div>`;
  $("logros-recetas").innerHTML = CATALOGO.recetas
    .map((r) => {
      const s = jugador.logros[r.id] || 0;
      return `<div class="receta-logro ${s ? "hecha" : ""}" data-narrar="${r.nombre}${s ? `, ${s} estrellas` : ", todavía no"}">
        ${imgPicto(`plato_${r.id}`, r.nombre)}<span>${r.nombre.toUpperCase()}</span>
        <i>${[1, 2, 3].map((k) => `<em class="${k <= s ? "on" : ""}">★</em>`).join("")}</i></div>`;
    })
    .join("");
  $("win").classList.remove("show");
  $("logros").classList.add("show");
  Voz.decir(`Tienes ${e.estrellas} estrellas y preparaste ${e.recetas} recetas distintas. ¡Sigue cocinando!`);
}

function abrirRegistro() {
  const sel = $("reg-jugador");
  const lista = Jugadores.lista();
  sel.innerHTML = lista.length
    ? lista.map((j) => `<option value="${j.id}" ${jugador && j.id === jugador.id ? "selected" : ""}>${j.nombre}</option>`).join("")
    : `<option value="">(sin jugadores)</option>`;
  regPendienteBorrar = null;
  renderRegistro();
  $("registro").classList.add("show");
}

function sparkline(vals) {
  if (vals.length < 2) return "";
  const w = 260;
  const h = 60;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - v * h}`).join(" ");
  return `<svg class="spark" viewBox="-4 -4 ${w + 8} ${h + 8}" width="${w + 8}" height="${h + 8}" role="img" aria-label="Evolución de la habilidad">
    <polyline points="${pts}" fill="none" stroke="#c44536" stroke-width="3"/><line x1="0" y1="${h - CFG.META * h}" x2="${w}" y2="${h - CFG.META * h}" stroke="#999" stroke-dasharray="4 4"/></svg>`;
}

function renderRegistro() {
  const j = Jugadores.porId($("reg-jugador").value);
  if (!j) {
    $("reg-detalle").innerHTML = "<p>Aún no hay jugadores registrados.</p>";
    return;
  }
  const e = Jugadores.estadisticas(j);
  const ps = [...j.partidas].reverse();
  const nomR = (id) => recetaPorId(id)?.nombre || id;
  $("reg-detalle").innerHTML = `
    <div class="reg-resumen">
      <div>${imgPicto(j.avatar, j.nombre, "reg-av")}</div>
      <div><b>${j.nombre}</b><br>Desde ${j.creado.slice(0, 10)} · ${e.partidas} partidas · ${e.dias} días · racha ${e.racha}<br>
        θ actual <b>${j.perfil.theta.toFixed(2)}</b> ${sparkline([CFG.THETA0, ...j.partidas.map((p) => p.theta)])}</div>
      <div class="reg-ajustes">
        <label>Gestos <select id="reg-motor">${Object.entries(MODOS_MOTOR).map(([k, m]) => `<option value="${k}" ${k === j.ajustes.motor ? "selected" : ""}>${m.nombre}</option>`).join("")}</select></label>
        <label><input type="checkbox" id="reg-sincolor" ${j.ajustes.sinColor ? "checked" : ""}/> Sin pistas de color</label>
        <button type="button" id="reg-borrar" class="peligro">${regPendienteBorrar === j.id ? "¿Seguro? Toca otra vez" : "Borrar jugador"}</button>
      </div>
    </div>
    <div class="tabla-scroll"><table class="reg-tabla">
      <tr><th>Fecha</th><th>Receta</th><th>★</th><th>Err. ingr.</th><th>Err. pasos</th><th>Ayudas</th><th>Ayuda gesto</th><th>Tiempo</th><th>θ</th><th>Motricidad (s por paso)</th></tr>
      ${ps.map((p) => `<tr><td>${p.fecha.slice(0, 16).replace("T", " ")}</td><td>${nomR(p.receta)}</td><td>${p.estrellas}</td><td>${p.errores_ingredientes}</td><td>${p.errores_pasos}</td><td>${p.ayudas}</td><td>${p.ayudas_motoras}</td><td>${p.segundos}s</td><td>${p.theta_antes.toFixed(2)}→${p.theta.toFixed(2)}</td>
        <td>${(p.motricidad || []).map((m) => `${CATALOGO.pasos[m.paso]?.nombre || m.paso} ${m.segundos}${m.ayuda ? "*" : ""}`).join(", ")}</td></tr>`).join("") || `<tr><td colspan="10">Sin partidas todavía.</td></tr>`}
    </table></div>
    <p class="nota">* = con ayuda en el gesto. Los datos se guardan solo en este navegador; usa «Respaldo JSON» para llevarlos a otra computadora.</p>`;
  $("reg-motor").onchange = (ev) => {
    Jugadores.ajustar(j.id, { ajustes: { motor: ev.target.value } });
    if (jugador && jugador.id === j.id) jugador = Jugadores.porId(j.id);
  };
  $("reg-sincolor").onchange = (ev) => {
    Jugadores.ajustar(j.id, { ajustes: { sinColor: ev.target.checked } });
    if (jugador && jugador.id === j.id) {
      jugador = Jugadores.porId(j.id);
      partida.sinColor = ev.target.checked;
    }
  };
  $("reg-borrar").onclick = () => {
    if (regPendienteBorrar !== j.id) {
      regPendienteBorrar = j.id;
      renderRegistro();
      return;
    }
    Jugadores.borrar(j.id);
    regPendienteBorrar = null;
    if (jugador && jugador.id === j.id) {
      $("registro").classList.remove("show");
      cambiarJugador();
      return;
    }
    abrirRegistro();
  };
}

// =====================================================================
// Eventos
// =====================================================================
function initEventos() {
  document.addEventListener("click", (e) => {
    if (Arrastre.ignorarClic) return;
    const tipo = e.target.closest("[data-tipo]");
    if (tipo) return onTipo(tipo.dataset.tipo);
    const ing = e.target.closest("[data-ing]");
    if (ing) return onIngrediente(ing.dataset.ing, ing);
    const paso = e.target.closest("[data-paso]");
    if (paso) return onPaso(paso.dataset.paso, paso);
    const jug = e.target.closest("[data-jugador]");
    if (jug) return entrarJugador(jug.dataset.jugador);
    if (e.target.closest("#btn-nuevo-jugador")) return abrirNuevo();
    const av = e.target.closest("[data-avatar]");
    if (av) {
      nuevoAvatar = av.dataset.avatar;
      renderNuevo();
      return Voz.narrar(nombreIng(nuevoAvatar));
    }
    const mo = e.target.closest("[data-motor]");
    if (mo) {
      nuevoMotor = mo.dataset.motor;
      renderNuevo();
      return Voz.narrar(MODOS_MOTOR[nuevoMotor].nombre);
    }
    const cerrar = e.target.closest("[data-cerrar]");
    if (cerrar) $(cerrar.dataset.cerrar).classList.remove("show");
  });

  // Narración al pasar el ratón o el foco del teclado (apoyo a la lectura)
  let narrTimer = null;
  let ultimo = null;
  const narrarDe = (el) => {
    if (!el || el === ultimo || Arrastre.fantasma) return;
    ultimo = el;
    clearTimeout(narrTimer);
    narrTimer = setTimeout(() => Voz.narrar(el.dataset.narrar), 350);
  };
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest("[data-narrar]");
    if (el) narrarDe(el);
    else {
      ultimo = null;
      clearTimeout(narrTimer);
    }
  });
  document.addEventListener("focusin", (e) => narrarDe(e.target.closest("[data-narrar]")));

  $("btn-ayuda").addEventListener("click", () => onAyuda(false));
  $("btn-ayuda-motora").addEventListener("click", onAyudaMotora);
  $("btn-oir").addEventListener("click", () => Voz.decir(partida.accion.texto));
  $("btn-otro").addEventListener("click", otroPlatillo);
  $("btn-nueva").addEventListener("click", otroPlatillo);
  $("chip-jugador").addEventListener("click", cambiarJugador);
  $("btn-logros").addEventListener("click", abrirLogros);
  $("btn-win-logros").addEventListener("click", abrirLogros);
  $("btn-registro").addEventListener("click", abrirRegistro);
  $("nuevo-crear").addEventListener("click", crearJugador);
  $("nuevo-nombre").addEventListener("keydown", (e) => e.key === "Enter" && crearJugador());
  $("nuevo-cancelar").addEventListener("click", () => {
    $("nuevo").classList.remove("show");
    renderLogin();
    $("login").classList.add("show");
  });
  $("reg-jugador").addEventListener("change", () => {
    regPendienteBorrar = null;
    renderRegistro();
  });
  $("reg-csv").addEventListener("click", () => descargar(`pictochef_registro_${new Date().toISOString().slice(0, 10)}.csv`, Jugadores.csv(), "text/csv;charset=utf-8"));
  $("reg-json").addEventListener("click", () => descargar(`pictochef_respaldo_${new Date().toISOString().slice(0, 10)}.json`, Jugadores.json(), "application/json"));
  $("reg-importar").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const n = Jugadores.importar(await f.text());
      abrirRegistro();
      renderLogin();
      $("reg-detalle").insertAdjacentHTML("afterbegin", `<p class="ok">Respaldo importado: ${n} jugador(es) nuevo(s).</p>`);
    } catch (err) {
      $("reg-detalle").insertAdjacentHTML("afterbegin", `<p class="peligro-txt">No se pudo importar: ${err.message}</p>`);
    }
    e.target.value = "";
  });

  $("terapeuta").addEventListener("change", (e) => $("belief").classList.toggle("visible", e.target.checked));
  $("voz").addEventListener("change", (e) => Voz.setActiva(e.target.checked));
  $("sonidos").addEventListener("change", (e) => (Sonido.activo = e.target.checked));
  $("pasar").addEventListener("change", (e) => Voz.setLeerAlPasar(e.target.checked));
  $("sel-voz").addEventListener("change", (e) => {
    Voz.elegirVoz(e.target.value);
    Voz.decir("Hola, así sueno ahora.");
  });
  $("vel").addEventListener("input", (e) => {
    Voz.setRate(Number(e.target.value));
    $("vel-txt").textContent = Number(e.target.value).toFixed(2);
  });
  $("probar").addEventListener("click", () => Voz.decir("¡Hola! Soy la Sra. Tomate. Vamos a cocinar juntos."));
  window.addEventListener("beforeunload", () => jugador && Jugadores.salir());
}

function initVoz() {
  Voz.alCargar = () => {
    const sel = $("sel-voz");
    sel.innerHTML = Voz.voces.length
      ? Voz.voces.map((v) => `<option value="${v.name}" ${Voz.voz && v.name === Voz.voz.name ? "selected" : ""}>${v.name} (${v.lang})</option>`).join("")
      : `<option>No hay voces en español instaladas</option>`;
    $("voz").checked = Voz.activa;
    $("pasar").checked = Voz.leerAlPasar;
    $("vel").value = Voz.rate;
    $("vel-txt").textContent = Voz.rate.toFixed(2);
  };
  Voz.init();
  if (!window.speechSynthesis) $("nota-voz").textContent = "Este navegador no tiene síntesis de voz. Usa Chrome o Edge.";
}

window.addEventListener("DOMContentLoaded", () => {
  Jugadores.cargar();
  initVoz();
  initEventos();
  Arrastre.init();
  renderLogin();
  render();
});
