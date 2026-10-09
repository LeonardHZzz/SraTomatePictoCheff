const CFG = {
  H_MAX: 3, // niveles de pista
  ALPHA: 0.3, // tasa de aprendizaje de θ
  META: 0.7, // desempeño esperado
  THETA0: 0.35, // habilidad inicial
  D_MIN: 2, // distractores mínimos de ingredientes
  D_MAX: 6, // distractores máximos de ingredientes
};

const ATRIBUTOS_PASO = ["herramienta", "objeto"];

const log2 = (x) => Math.log(x) / Math.LN2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ahora = () => Date.now();

function rngSemilla(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- Lenguaje --------------------------------------------------------
const DEF = { un: "el", una: "la", unos: "los", unas: "las" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const elIng = (g) => {
  const i = CATALOGO.ingredientes[g];
  return `${i.articulo} ${i.nombre}`;
};
const unRec = (r) => `${r.articulo} ${r.nombre}`;
const elRec = (r) => `${DEF[r.articulo]} ${r.nombre}`;
const enRec = (r) => (DEF[r.articulo] === "el" ? `en el ${r.nombre}` : `en ${elRec(r)}`);
const paraRec = (r) => (DEF[r.articulo] === "el" ? `para el ${r.nombre}` : `para ${elRec(r)}`);
const lista = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

function descPaso(def, receta) {
  const verbo = CATALOGO.pasos[def.paso].nombre;
  let obj;
  if (!def.objetos.length) obj = receta ? elRec(receta) : "";
  else if (def.objetos.length >= 3) obj = "todo";
  else obj = lista(def.objetos.map(elIng));
  const sobre = def.sobre ? ` en ${elIng(def.sobre)}` : "";
  return `${verbo} ${obj}${sobre}`.trim();
}

function fragmento(a, v) {
  if (a === "color") return `de color ${nombreAtributo(a, v)}`;
  if (a === "categoria")
    return {
      fruta: "que sea una fruta", verdura: "que sea una verdura", carne: "que sea carne",
      lacteo: "que sea un lácteo", cereal: "que sea un cereal", bebida: "que sea para tomar",
    }[v] || `que sea ${v}`;
  if (a === "origen")
    return {
      vaca: "que viene de la vaca", gallina: "que viene de la gallina", cerdo: "que viene del cerdo",
      arbol: "que crece en un árbol", huerto: "que crece en el huerto",
    }[v] || `que viene de ${v}`;
  if (a === "sabor") return v === "dulce" ? "que sea dulce" : "que sea ácido";
  if (a === "herramienta")
    return {
      agua: "con agua", cuchillo: "con el cuchillo", bol: "en el bol", olla: "en la olla", fuego: "en el fuego",
      horno: "en el horno", batidora: "con la licuadora", mano: "con las manos", rodillo: "con el rodillo", plato: "en el plato",
    }[v] || `con ${v}`;
  if (a === "objeto") return `con ${elIng(v)}`;
  return v;
}

function pictoValor(a, v) {
  if (a === "herramienta") return `herr_${v}`;
  if (a === "objeto") return v;
  return pictoAtributo(a, v);
}

const FRASES = {
  acierto: ["¡Sí! {G} va {enR}.", "¡Muy bien! {G}.", "¡Eso es! Necesitamos {g}.", "¡Correcto! {G} va aquí.", "¡Bien hecho! {G}."],
  error: ["Mmm… {g} no va {enR}.", "{G} no va aquí.", "Ese no es. {G} no va {enR}.", "Casi. {G} no va {enR}."],
  pista: ["Te doy una pista.", "Mira esta pista.", "Escucha la pista.", "Yo te ayudo."],
  pasoOk: ["¡Sí! Ahora vamos a {p}.", "¡Muy bien! Es momento de {p}.", "¡Eso es! Vamos a {p}."],
  siguiente: ["¡Muy bien! ¿Qué hacemos después?", "¡Excelente! ¿Y ahora qué hacemos?", "¡Qué bien lo haces! ¿Cuál es el siguiente paso?"],
  victoria: ["¡Felicidades! Preparaste {unR}. ¡Qué rico!", "¡Lo lograste! Terminaste {unR}. ¡Ñam, ñam!", "¡Excelente! Cocinaste {unR}. ¡Delicioso!"],
};

function tablaPistasGen(C, objetivos, attr, atributos, nAttrs = 1, dificultad = () => 0) {
  const filas = [];
  for (const g of objetivos) {
    const attrs = atributos.filter((a) => attr(g, a));
    const combos = nAttrs === 1 ? attrs.map((a) => [a]) : attrs.flatMap((a, i) => attrs.slice(i + 1).map((b) => [a, b]));
    for (const A of combos) {
      const S = C.filter((x) => A.every((a) => attr(x, a) === attr(g, a)));
      if (!S.length) continue;
      const correctos = S.filter((x) => objetivos.includes(x)).length;
      filas.push({
        g, A, vals: A.map((a) => attr(g, a)), S,
        ig: log2(C.length) - log2(S.length),
        prec: correctos / S.length,
        clave: `${g}|${A.join("+")}`,
      });
    }
  }
  const ord = (f) => Math.min(...f.A.map((a) => atributos.indexOf(a)));
  filas.sort((p, q) => q.ig - p.ig || q.prec - p.prec || ord(p) - ord(q) || dificultad(p.g) - dificultad(q.g));
  return filas;
}

// =====================================================================
class Perfil {
  constructor(datos = {}) {
    this.theta = datos.theta ?? CFG.THETA0;
    this.jugadas = { ...(datos.jugadas || {}) };
    this.partidas = [];
  }
  actualizar(r, faltas, ayudas) {
    const n = r.ingredientes.length + r.pasos.length;
    const perf = n / (n + faltas + 0.5 * ayudas);
    const antes = this.theta;
    this.theta = clamp01(this.theta + CFG.ALPHA * (perf - CFG.META));
    this.jugadas[r.id] = (this.jugadas[r.id] || 0) + 1;
    this.partidas.push({ receta: r.id, faltas, ayudas, perf, theta_antes: antes, theta: this.theta });
    return { perf, antes };
  }
  exportar() {
    return { theta: this.theta, jugadas: { ...this.jugadas } };
  }
}

// =====================================================================
class Partida {
  constructor(perfil = new Perfil(), opciones = {}) {
    this.perfil = perfil;
    this.politica = opciones.politica || "ig"; // "ig" | "aleatoria" | "sin_pista"
    this.rng = opciones.rng || Math.random;
    this.sinColor = !!opciones.sinColor; // perfil sin pistas de color (daltonismo)
    this.usadas = {};
    this.historial = [];
    this.iniciar();
  }

  iniciar() {
    this.fase = "TIPO";
    this.tipo = null;
    this.receta = null;
    this.despensa = [];
    this.X = new Set(); // ingredientes colocados
    this.W = new Set(); // ingredientes incorrectos elegidos
    this.Y = []; // pasos hechos (en orden)
    this.Wp = new Set(); // pasos distractores descartados
    this.tarjetasPaso = [];
    this.defs = {};
    this.pasoActivo = null;
    this.h = 0;
    this.errores = 0;
    this.erroresPasos = 0;
    this.ayudas = 0;
    this.ayudasMotoras = 0;
    this.motricidad = [];
    this.t = 0;
    this.pistasUsadas = new Set();
    this.atenuados = new Set();
    this.resaltado = null;
    this.ultimaPista = null;
    this.estrellas = 0;
    this.terminada = false;
    this.inicio = null;
    this.accion = {
      tipo: "PREGUNTA_TIPO",
      sprite: "pregunta",
      filas: [["pregunta", "elegir", "plato"]],
      texto: "¿Qué tipo de platillo quieres preparar? Elige: desayuno, almuerzo, postre, bebida o lonche.",
    };
    this._log();
    return this.accion;
  }

  // --- utilidades ----------------------------------------------------
  _frase(clave, vars) {
    const pool = FRASES[clave];
    const usadas = this.usadas[clave] || (this.usadas[clave] = []);
    let libres = pool.map((_, i) => i).filter((i) => !usadas.includes(i));
    if (!libres.length) {
      usadas.length = 0;
      libres = pool.map((_, i) => i);
    }
    const i = libres[Math.floor(this.rng() * libres.length)];
    usadas.push(i);
    return pool[i].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }
  _vars(g) {
    const r = this.receta;
    const v = r ? { r: elRec(r), enR: enRec(r), unR: unRec(r), UnR: cap(unRec(r)) } : {};
    if (g) Object.assign(v, { g: elIng(g), G: cap(elIng(g)) });
    return v;
  }
  _log() {
    this.historial.push({ t: this.t, fase: this.fase, accion: { ...this.accion, filas: this.accion.filas.map((f) => [...f]) } });
  }
  faltan() {
    return this.receta ? this.receta.ingredientes.filter((g) => !this.X.has(g)) : [];
  }
  disponibles() {
    return this.despensa.filter((x) => !this.X.has(x) && !this.W.has(x));
  }
  // pasos
  defPaso(id) {
    return this.defs[id];
  }
  pasosValidos() {
    if (!this.receta) return [];
    return this.receta.pasos
      .filter((p) => !this.Y.includes(p.paso) && p.requiere.every((q) => this.Y.includes(q)))
      .map((p) => p.paso);
  }
  tarjetasDisponibles() {
    return this.tarjetasPaso.filter((id) => !this.Y.includes(id) && !this.Wp.has(id));
  }
  attrPaso(id, a) {
    const d = this.defs[id];
    if (!d) return null;
    if (a === "herramienta") return CATALOGO.pasos[d.paso].herramienta;
    if (a === "objeto") return d.objetos[0] || null;
    return null;
  }
  atributosIng() {
    return this.sinColor ? ATRIBUTOS.filter((a) => a !== "color") : ATRIBUTOS;
  }

  // --- 1. elegir tipo → receta + despensa ---------------------------
  // recetaId solo se usa en experimentos para fijar la receta a evaluar
  eligeTipo(tipoId, recetaId = null) {
    if (this.fase !== "TIPO") return this.accion;
    this.tipo = tipoId;
    this.receta = recetaId ? recetaPorId(recetaId) : this._elegirReceta(tipoId);
    this.despensa = this._armarDespensa(this.receta);
    this._armarPasos(this.receta);
    this.fase = "INGREDIENTES";
    this.inicio = ahora();
    this.t += 1;
    const r = this.receta;
    const n = r.ingredientes.length;
    this.accion = {
      tipo: "PRESENTA_RECETA",
      sprite: "pregunta",
      receta: r.id,
      filas: [["preparar", `plato_${r.id}`], ["necesitar", "ingredientes", "buscar"]],
      texto: `¡Vamos a preparar ${unRec(r)}! Para ${elRec(r)} necesitas ${n} ingredientes. Búscalos en la despensa.`,
    };
    this._log();
    return this.accion;
  }

  _elegirReceta(tipoId) {
    const th = this.perfil.theta;
    let mejor = null;
    let best = Infinity;
    for (const r of recetasDe(tipoId)) {
      const s = Math.abs(dificultadReceta(r) - th) + 0.6 * (this.perfil.jugadas[r.id] || 0) + 0.15 * this.rng();
      if (s < best) [best, mejor] = [s, r];
    }
    return mejor;
  }

  _similitud(x, r) {
    return Math.max(...r.ingredientes.map((g) => ATRIBUTOS.filter((a) => atributo(x, a) && atributo(x, a) === atributo(g, a)).length));
  }

  _barajar(xs) {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  }

  _armarDespensa(r) {
    const th = this.perfil.theta;
    const nd = Math.round(CFG.D_MIN + th * (CFG.D_MAX - CFG.D_MIN));
    const cand = Object.keys(CATALOGO.ingredientes)
      .filter((x) => !r.ingredientes.includes(x))
      .map((x) => ({ x, s: this._similitud(x, r) + 0.9 * this.rng() }));
    cand.sort((a, b) => (th < 0.5 ? a.s - b.s : b.s - a.s));
    return this._barajar([...r.ingredientes, ...cand.slice(0, nd).map((c) => c.x)]);
  }

  // Pasos de la receta + distractores (θ ≥ 0.4: 1, θ ≥ 0.75: 2)
  _armarPasos(r) {
    this.defs = {};
    for (const p of r.pasos) this.defs[p.paso] = p;
    const th = this.perfil.theta;
    const nd = th >= 0.75 ? 2 : th >= 0.4 ? 1 : 0;
    const usados = new Set(r.pasos.map((p) => p.paso));
    const cand = this._barajar(Object.keys(CATALOGO.pasos).filter((k) => !usados.has(k)));
    for (const k of cand.slice(0, nd)) {
      const g = r.ingredientes[Math.floor(this.rng() * r.ingredientes.length)];
      this.defs[k] = { paso: k, objetos: CATALOGO.pasos[k].gesto === "servir" || ["hornear", "freir"].includes(k) ? [] : [g], requiere: [], distractor: true };
    }
    this.tarjetasPaso = this._barajar(Object.keys(this.defs));
  }

  // --- 2. INGREDIENTES ----------------------------------------------------
  elige(g) {
    if (this.fase !== "INGREDIENTES" || this.X.has(g) || this.W.has(g)) return this.accion;
    this.t += 1;
    const r = this.receta;
    if (r.ingredientes.includes(g)) {
      this.X.add(g);
      this._limpiarAyuda();
      if (!this.faltan().length) {
        this.fase = "PASOS";
        this.accion = {
          tipo: "INGREDIENTES_LISTOS",
          sprite: "come",
          ingrediente: g,
          filas: [["si", "ingredientes"], ["primero", "pregunta"]],
          texto: `¡Tenemos todos los ingredientes! Ahora vamos a preparar ${elRec(r)}. ¿Qué hacemos primero?`,
        };
      } else {
        const f = this.faltan().length;
        this.accion = {
          tipo: "ACIERTO",
          sprite: "come",
          ingrediente: g,
          filas: [["si", g]],
          texto: `${this._frase("acierto", this._vars(g))} ${f === 1 ? "Falta 1 ingrediente." : `Faltan ${f} ingredientes.`}`,
        };
      }
    } else {
      this.W.add(g);
      this.errores += 1;
      this.h = Math.min(this.h + 1, CFG.H_MAX);
      this.accion = this._pista({ error: g });
    }
    this._log();
    return this.accion;
  }

  // --- 3. PASOS -------------------------------------------------------------
  eligePaso(id) {
    if (this.fase !== "PASOS" || this.Y.includes(id) || this.Wp.has(id) || !this.defs[id]) return this.accion;
    this.t += 1;
    const d = this.defs[id];
    if (this.pasosValidos().includes(id)) {
      this._limpiarAyuda();
      this.fase = "ACCION";
      this.pasoActivo = id;
      this.inicioPaso = ahora();
      const p = descPaso(d, this.receta);
      this.accion = {
        tipo: "PASO_OK",
        sprite: "idle",
        paso: id,
        filas: [[`paso_${id}`, ...d.objetos.slice(0, 3), ...(d.sobre ? [d.sobre] : [])]],
        texto: `${this._frase("pasoOk", { p })} ${CATALOGO.pasos[id].instruccion}.`,
      };
    } else {
      this.erroresPasos += 1;
      if (d.distractor) this.Wp.add(id);
      this.h = Math.min(this.h + 1, CFG.H_MAX);
      this.accion = this._pistaPaso(id);
    }
    this._log();
    return this.accion;
  }

  // La interfaz avisa que el minijuego del paso activo terminó.
  pasoHecho(metricas = {}) {
    if (this.fase !== "ACCION") return this.accion;
    const id = this.pasoActivo;
    this.Y.push(id);
    this.pasoActivo = null;
    if (metricas.ayuda) this.ayudasMotoras += 1;
    this.motricidad.push({ paso: id, segundos: metricas.segundos ?? (ahora() - this.inicioPaso) / 1000, ayuda: !!metricas.ayuda, precision: metricas.precision ?? null });
    if (this.Y.length === this.receta.pasos.length) return this._victoria();
    this.fase = "PASOS";
    this.t += 1;
    this.accion = {
      tipo: "SIGUIENTE_PASO",
      sprite: "pregunta",
      paso: id,
      filas: [["bien", `paso_${id}`], ["despues", "pregunta"]],
      texto: this._frase("siguiente", {}),
    };
    this._log();
    return this.accion;
  }

  // --- AYUDA (botón o silencio prolongado) -----------------------------
  ayuda(auto = false) {
    if (this.fase !== "INGREDIENTES" && this.fase !== "PASOS") return this.accion;
    this.t += 1;
    this.ayudas += 1;
    this.h = Math.min(this.h + 1, CFG.H_MAX);
    this.accion = this.fase === "INGREDIENTES" ? this._pista({ auto }) : this._pistaPaso(null, auto);
    this._log();
    return this.accion;
  }

  _limpiarAyuda() {
    this.h = 0;
    this.atenuados = new Set();
    this.resaltado = null;
  }

  // Elección de pista según la política del agente
  _elegir(tabla) {
    if (!tabla.length) return null;
    let libres = tabla.filter((f) => !this.pistasUsadas.has(f.clave));
    if (!libres.length) libres = tabla;
    if (this.politica === "aleatoria") return libres[Math.floor(this.rng() * libres.length)];
    return libres[0];
  }

  // Construye la pista para un nivel. Devuelve { nivel, fila, frase, objetivo, S, tabla }.
  _construirPista(C, objetivos, attr, atributos, dificultad, fragFn, directa) {
    let nivel = this.h;
    let tabla = [];
    let sel = null;
    if (nivel === 1 || nivel === 2) {
      if (nivel === 2) {
        tabla = tablaPistasGen(C, objetivos, attr, atributos, 2, dificultad);
        sel = this._elegir(tabla);
      }
      if (!sel) {
        tabla = tablaPistasGen(C, objetivos, attr, atributos, 1, dificultad);
        sel = this._elegir(tabla);
      }
    }
    if (this.politica === "sin_pista" && nivel < 3) {
      this.atenuados = new Set();
      this.resaltado = null;
      this.ultimaPista = { nivel, g: null, A: [], vals: [], S: C, ig: 0, tabla: [] };
      return { nivel, fila: ["intentar"], frase: "Intenta otra vez." };
    }
    if (nivel < 3 && !sel) nivel = 3;
    if (nivel === 3) {
      const g = [...objetivos].sort((a, b) => dificultad(a) - dificultad(b))[0];
      this.resaltado = g;
      this.atenuados = new Set(C.filter((x) => x !== g));
      this.ultimaPista = { nivel, g, A: [], vals: [], S: [g], ig: log2(Math.max(1, C.length)), tabla: [] };
      return { nivel, ...directa(g) };
    }
    this.pistasUsadas.add(sel.clave);
    this.resaltado = null;
    this.atenuados = nivel >= 2 ? new Set(C.filter((x) => !sel.S.includes(x))) : new Set();
    this.ultimaPista = { nivel, g: sel.g, A: sel.A, vals: sel.vals, S: sel.S, ig: sel.ig, tabla: tabla.slice(0, 6) };
    return {
      nivel,
      fila: ["buscar", ...sel.A.map((a, i) => pictoValor(a, sel.vals[i]))],
      frase: fragFn(sel),
    };
  }

  _pista({ error = null, auto = false } = {}) {
    const filas = [];
    const partes = [];
    if (error) {
      filas.push(["no", error]);
      partes.push(this._frase("error", this._vars(error)));
    } else if (auto) partes.push("¿Te ayudo?");
    partes.push(this._frase("pista", {}));
    const p = this._construirPista(
      this.disponibles(), this.faltan(), atributo, this.atributosIng(),
      (g) => CATALOGO.ingredientes[g].dificultad,
      (sel) => `Busca algo ${sel.A.map((a, i) => fragmento(a, sel.vals[i])).join(" y ")}.`,
      (g) => ({ fila: ["buscar", g], frase: `¡Es ${elIng(g)}! Tócalo.` })
    );
    filas.push(p.fila);
    if (p.fila[0] === "intentar") partes[partes.length - 1] = p.frase;
    else partes.push(p.frase);
    return { tipo: "PISTA", fase: "INGREDIENTES", sprite: "pregunta", nivel: p.nivel, error, ingrediente: this.ultimaPista.g, filas, texto: partes.join(" ") };
  }

  _pistaPaso(errorId = null, auto = false) {
    const r = this.receta;
    const filas = [];
    const partes = [];
    if (errorId) {
      const d = this.defs[errorId];
      filas.push(["no", `paso_${errorId}`]);
      partes.push(d.distractor ? `${cap(paraRec(r))} no hay que ${descPaso(d, r)}.` : `Todavía no podemos ${descPaso(d, r)}.`);
    } else if (auto) partes.push("¿Te ayudo?");
    partes.push(this._frase("pista", {}));
    const p = this._construirPista(
      this.tarjetasDisponibles(), this.pasosValidos(), (x, a) => this.attrPaso(x, a), ATRIBUTOS_PASO,
      (id) => r.pasos.findIndex((q) => q.paso === id),
      (sel) => `Primero hay que hacer algo ${sel.A.map((a, i) => fragmento(a, sel.vals[i])).join(" y ")}.`,
      (id) => ({ fila: ["primero", `paso_${id}`], frase: `¡Hay que ${descPaso(this.defs[id], r)}! Tócalo.` })
    );
    filas.push(p.fila[0] === "buscar" ? ["primero", ...p.fila.slice(1)] : p.fila);
    if (p.fila[0] === "intentar") partes[partes.length - 1] = p.frase;
    else partes.push(p.frase);
    return { tipo: "PISTA", fase: "PASOS", sprite: "pregunta", nivel: p.nivel, error: errorId, paso: this.ultimaPista.g, filas, texto: partes.join(" ") };
  }

  // --- 4. victoria ------------------------------------------------------
  _victoria() {
    const r = this.receta;
    this.fase = "VICTORIA";
    this.terminada = true;
    this._limpiarAyuda();
    const faltas = this.errores + this.erroresPasos;
    const total = faltas + this.ayudas;
    this.estrellas = total === 0 ? 3 : total <= 2 ? 2 : 1;
    const { perf, antes } = this.perfil.actualizar(r, faltas, this.ayudas);
    this.resumen = {
      fecha: new Date().toISOString(),
      receta: r.id,
      tipo: r.tipo,
      estrellas: this.estrellas,
      errores_ingredientes: this.errores,
      errores_pasos: this.erroresPasos,
      ayudas: this.ayudas,
      ayudas_motoras: this.ayudasMotoras,
      segundos: this.inicio ? Math.round((ahora() - this.inicio) / 1000) : 0,
      desempeno: Math.round(perf * 100) / 100,
      theta_antes: Math.round(antes * 100) / 100,
      theta: Math.round(this.perfil.theta * 100) / 100,
      motricidad: this.motricidad.map((m) => ({ ...m, segundos: Math.round(m.segundos * 10) / 10 })),
    };
    this.accion = {
      tipo: "VICTORIA",
      sprite: "fiesta",
      receta: r.id,
      filas: [["bien", `plato_${r.id}`]],
      texto: this._frase("victoria", this._vars()),
    };
    this._log();
    return this.accion;
  }
}

function jugarSimulado(receta, politica = "ig", seed = 7, perfil = null, params = {}) {
  const pConoce = params.pConoce ?? 0.5;
  const pOrden = params.pOrden ?? 0.5;
  const pSigue = params.pSigue ?? 0.9;
  const rnd = rngSemilla(seed);
  const p = new Partida(perfil || new Perfil(), { politica, rng: rngSemilla(seed * 31 + 7) });
  p.eligeTipo(receta.tipo, receta.id);
  const conoce = new Set(receta.ingredientes.filter(() => rnd() < pConoce));
  const azar = (xs) => xs[Math.floor(rnd() * xs.length)];
  let guard = 0;
  while (!p.terminada && guard++ < 120) {
    let pick;
    if (p.fase === "INGREDIENTES") {
      const C = p.disponibles().filter((x) => !p.atenuados.has(x));
      if (p.accion.tipo === "PISTA" && rnd() < pSigue) pick = azar(p.ultimaPista.S.filter((x) => C.includes(x)));
      if (!pick) {
        const sabe = p.faltan().filter((g) => conoce.has(g));
        pick = sabe.length ? azar(sabe) : azar(C);
      }
      p.elige(pick);
    } else if (p.fase === "PASOS") {
      const C = p.tarjetasDisponibles().filter((x) => !p.atenuados.has(x));
      if (p.accion.tipo === "PISTA" && rnd() < pSigue) pick = azar(p.ultimaPista.S.filter((x) => C.includes(x)));
      if (!pick) pick = rnd() < pOrden ? azar(p.pasosValidos()) : azar(C);
      p.eligePaso(pick);
    } else if (p.fase === "ACCION") {
      pick = p.pasoActivo;
      p.pasoHecho({ segundos: 0 });
    }
    p.historial[p.historial.length - 1].jugador = pick;
  }
  return p;
}
