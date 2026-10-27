const CFG = {
  H_MAX: 3, // niveles de pista
  ALPHA: 0.3, // tasa de aprendizaje de θ
  META: 0.7, // desempeño esperado
  THETA0: 0.35, // habilidad inicial
  D_MIN: 2, // distractores mínimos de ingredientes
  D_MAX: 5, // distractores máximos (despensa ≤ 9 tarjetas)
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
    this.tablaQ = opciones.tablaQ !== undefined ? opciones.tablaQ : (typeof TABLA_Q !== "undefined" ? TABLA_Q : null);
    this.politica = opciones.politica || (this.tablaQ ? "q" : "ig"); // "q" | "ig" | "aleatoria" | "sin_pista"
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
    this.Y = []; // pasos hechos 
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
    this.errSeg = 0;
    this.ultimaQ = null;
    this.pendiente = null;
    this.usoDirecta = false;
    this.retorno = 0;
    this.costoAyuda = 0;
    this.decisiones = [];
    this.accion = {
      tipo: "PREGUNTA_TIPO",
      sprite: "pregunta",
      filas: [["pregunta", "elegir", "plato"]],
      texto: "¿Qué tipo de platillo quieres preparar? Elige: desayuno, almuerzo, postre, bebida o lonche.",
    };
    this._log();
    return this.accion;
  }

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

  elige(g, segundos = null) {
    if (this.fase !== "INGREDIENTES" || this.X.has(g) || this.W.has(g)) return this.accion;
    this.t += 1;
    const r = this.receta;
    const acierto = r.ingredientes.includes(g);
    this._resultado(acierto);
    if (acierto) {
      this.X.add(g);
      this._limpiarAyuda();
      this.errSeg = 0;
      this.ultimaQ = null;
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
      const relacion = this._relacionIng(g);
      this.W.add(g);
      this.errores += 1;
      this.errSeg += 1;
      if (this.politica !== "q") this.h = Math.min(this.h + 1, CFG.H_MAX);
      this.accion = this._pista({ error: g, relacion, segundos });
    }
    this._log();
    return this.accion;
  }

  eligePaso(id, segundos = null) {
    if (this.fase !== "PASOS" || this.Y.includes(id) || this.Wp.has(id) || !this.defs[id]) return this.accion;
    this.t += 1;
    const d = this.defs[id];
    const acierto = this.pasosValidos().includes(id);
    this._resultado(acierto);
    if (acierto) {
      this._limpiarAyuda();
      this.errSeg = 0;
      this.ultimaQ = null;
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
      const relacion = this._relacionPaso(id);
      this.erroresPasos += 1;
      this.errSeg += 1;
      if (d.distractor) this.Wp.add(id);
      if (this.politica !== "q") this.h = Math.min(this.h + 1, CFG.H_MAX);
      this.accion = this._pistaPaso(id, false, relacion, segundos);
    }
    this._log();
    return this.accion;
  }

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

  ayuda(auto = false, segundos = null) {
    if (this.fase !== "INGREDIENTES" && this.fase !== "PASOS") return this.accion;
    this.t += 1;
    this.ayudas += 1;
    if (this.politica !== "q") this.h = Math.min(this.h + 1, CFG.H_MAX);
    this.accion = this.fase === "INGREDIENTES"
      ? this._pista({ auto, relacion: "ayuda", segundos })
      : this._pistaPaso(null, auto, "ayuda", segundos);
    this._log();
    return this.accion;
  }

  _limpiarAyuda() {
    this.h = 0;
    this.atenuados = new Set();
    this.resaltado = null;
  }

  // --- Q-Learning: estado, máscara, relación del error y recompensas ---------------
  _atributosFase(fase) {
    return fase === "INGREDIENTES" ? this.atributosIng() : ATRIBUTOS_PASO;
  }
  _attrsRasgo(fase, rasgo) {
    const permitidos = this._atributosFase(fase);
    return QL.RASGOS[fase][rasgo].filter((a) => permitidos.includes(a));
  }
  mascaraQ(fase, objetivos, attr) {
    const permitidos = this._atributosFase(fase);
    return QL.ACCIONES.map((nombre) => {
      if (nombre === "animar" || nombre === "directa") return true;
      if (nombre === "doble") return objetivos.some((g) => permitidos.filter((a) => attr(g, a)).length >= 2);
      const attrs = this._attrsRasgo(fase, nombre);
      return objetivos.some((g) => attrs.some((a) => attr(g, a)));
    });
  }
  _relacionIng(x) {
    const M = this.faltan();
    for (const rasgo of ["rasgo1", "rasgo2", "rasgo3"]) {
      for (const a of QL.RASGOS.INGREDIENTES[rasgo]) {
        const v = atributo(x, a);
        if (v && M.some((g) => atributo(g, a) === v)) return rasgo;
      }
    }
    return "nada";
  }
  _relacionPaso(id) {
    if (!this.defs[id].distractor) return "prematuro";
    const V = this.pasosValidos();
    for (const rasgo of ["rasgo1", "rasgo2"]) {
      const a = QL.RASGOS.PASOS[rasgo][0];
      const v = this.attrPaso(id, a);
      if (v && V.some((q) => this.attrPaso(q, a) === v)) return rasgo;
    }
    return "nada";
  }
  _mejorRasgo(fase, C, objetivos, attr, mascara, dificultad) {
    for (const f of tablaPistasGen(C, objetivos, attr, this._atributosFase(fase), 1, dificultad)) {
      for (const rasgo of ["rasgo1", "rasgo2", "rasgo3"]) {
        if (mascara[QL.ACCIONES.indexOf(rasgo)] && QL.RASGOS[fase][rasgo].includes(f.A[0])) return rasgo;
      }
    }
    return "ninguno";
  }
  _resultado(acierto) {
    const p = this.pendiente;
    if (p && !p.resuelta) {
      const r = acierto ? QL.R_ACIERTO : QL.R_ERROR;
      p.r += r;
      p.resuelta = true;
      this.retorno += r;
      this.decisiones[this.decisiones.length - 1].resultado = acierto ? "acierto" : "error";
    }
  }
  _accionDefecto(fase, C, objetivos, attr, mascara, dificultad) {
    if (this.errSeg >= 3) return QL.ACCIONES.indexOf("directa");
    if (this.errSeg === 2 && mascara[QL.ACCIONES.indexOf("doble")]) return QL.ACCIONES.indexOf("doble");
    for (const f of tablaPistasGen(C, objetivos, attr, this._atributosFase(fase), 1, dificultad)) {
      for (const rasgo of ["rasgo1", "rasgo2", "rasgo3"]) {
        const i = QL.ACCIONES.indexOf(rasgo);
        if (mascara[i] && QL.RASGOS[fase][rasgo].includes(f.A[0])) return i;
      }
    }
    return QL.ACCIONES.indexOf("directa");
  }
  _decidirQ(fase, C, objetivos, attr, relacion, segundos, dificultad) {
    const m = this.mascaraQ(fase, objetivos, attr);
    const mejor = this._mejorRasgo(fase, C, objetivos, attr, m, dificultad);
    const estado = QL.discretizar(fase, this.errSeg, this.perfil.theta, C.length, segundos, this.ultimaQ, relacion, mejor);
    const k = QL.clave(estado);
    if (this.tablaQ && this.tablaQ.conocido(k)) return { k, m, a: this.tablaQ.mejor(k, m), defecto: false };
    return { k, m, a: this._accionDefecto(fase, C, objetivos, attr, m, dificultad), defecto: true };
  }
  _registrarQ(k, m, a, defecto) {
    const nombre = QL.ACCIONES[a];
    const r0 = -QL.COSTO[nombre] + (nombre === this.ultimaQ ? QL.R_REPITE : 0);
    this.retorno += r0;
    this.costoAyuda += QL.COSTO[nombre];
    this.pendiente = { s: k, a, r: r0, resuelta: false };
    this.ultimaQ = nombre;
    if (nombre === "directa") this.usoDirecta = true;
    const q = this.tablaQ ? this.tablaQ.valores(k).map((v) => Math.round(v * 1000) / 1000) : null;
    this.decisiones.push({ estado: k, accion: nombre, defecto, mascara: m, q, resultado: null });
  }
  _etiquetaBase(fase, nivel, A) {
    if (nivel === 0) return QL.ACCIONES.indexOf("animar");
    if (nivel >= 3) return QL.ACCIONES.indexOf("directa");
    if (A.length >= 2) return QL.ACCIONES.indexOf("doble");
    for (const rasgo of ["rasgo1", "rasgo2", "rasgo3"]) {
      if (A.length && QL.RASGOS[fase][rasgo].includes(A[0])) return QL.ACCIONES.indexOf(rasgo);
    }
    return QL.ACCIONES.indexOf("animar");
  }
  _pistaSegunPolitica(fase, C, objetivos, attr, relacion, segundos, dificultad, fragFn, directa) {
    let { k, m, a, defecto } = this._decidirQ(fase, C, objetivos, attr, relacion, segundos, dificultad);
    let p;
    if (this.politica === "q") {
      p = this._construirPistaQ(QL.ACCIONES[a], fase, C, objetivos, attr, dificultad, fragFn, directa);
      this.h = p.nivel;
    } else {
      p = this._construirPista(C, objetivos, attr, this._atributosFase(fase), dificultad, fragFn, directa);
      a = this._etiquetaBase(fase, p.nivel, this.ultimaPista.A);
      defecto = false;
      this.ultimaPista.tipo = QL.ACCIONES[a];
    }
    this._registrarQ(k, m, a, defecto);
    return p;
  }
  _construirPistaQ(nombre, fase, C, objetivos, attr, dificultad, fragFn, directa) {
    if (nombre === "animar") {
      this.atenuados = new Set();
      this.resaltado = null;
      this.ultimaPista = { nivel: 0, g: null, A: [], vals: [], S: C, ig: 0, tabla: [], tipo: "animar" };
      return { nivel: 0, fila: ["intentar"], frase: "Intenta otra vez." };
    }
    let sel = null;
    let tabla = [];
    if (nombre === "doble") {
      tabla = tablaPistasGen(C, objetivos, attr, this._atributosFase(fase), 2, dificultad);
      sel = this._elegir(tabla);
    } else if (nombre !== "directa") {
      const attrs = this._attrsRasgo(fase, nombre);
      if (attrs.length) {
        tabla = tablaPistasGen(C, objetivos, attr, attrs, 1, dificultad);
        sel = this._elegir(tabla);
      }
    }
    if (!sel) {
      const g = [...objetivos].sort((x, y) => dificultad(x) - dificultad(y))[0];
      this.resaltado = g;
      this.atenuados = new Set(C.filter((x) => x !== g));
      this.ultimaPista = { nivel: 3, g, A: [], vals: [], S: [g], ig: log2(Math.max(1, C.length)), tabla: [], tipo: "directa" };
      return { nivel: 3, ...directa(g) };
    }
    const nivel = QL.NIVEL[nombre];
    this.pistasUsadas.add(sel.clave);
    this.resaltado = null;
    this.atenuados = nivel >= 2 ? new Set(C.filter((x) => !sel.S.includes(x))) : new Set();
    this.ultimaPista = { nivel, g: sel.g, A: sel.A, vals: sel.vals, S: sel.S, ig: sel.ig, tabla: tabla.slice(0, 6), tipo: nombre };
    return { nivel, fila: ["buscar", ...sel.A.map((x, i) => pictoValor(x, sel.vals[i]))], frase: fragFn(sel) };
  }

  _elegir(tabla) {
    if (!tabla.length) return null;
    let libres = tabla.filter((f) => !this.pistasUsadas.has(f.clave));
    if (!libres.length) libres = tabla;
    if (this.politica === "aleatoria") return libres[Math.floor(this.rng() * libres.length)];
    return libres[0];
  }

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
      this.ultimaPista = { nivel: 0, g: null, A: [], vals: [], S: C, ig: 0, tabla: [] };
      return { nivel: 0, fila: ["intentar"], frase: "Intenta otra vez." };
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

  _pista({ error = null, auto = false, relacion = "ayuda", segundos = null } = {}) {
    const filas = [];
    const partes = [];
    if (error) {
      filas.push(["no", error]);
      partes.push(this._frase("error", this._vars(error)));
    } else if (auto) partes.push("¿Te ayudo?");
    partes.push(this._frase("pista", {}));
    const p = this._pistaSegunPolitica(
      "INGREDIENTES", this.disponibles(), this.faltan(), atributo, relacion, segundos,
      (g) => CATALOGO.ingredientes[g].dificultad,
      (sel) => `Busca algo ${sel.A.map((a, i) => fragmento(a, sel.vals[i])).join(" y ")}.`,
      (g) => ({ fila: ["buscar", g], frase: `¡Es ${elIng(g)}! Tócalo.` })
    );
    filas.push(p.fila);
    if (p.fila[0] === "intentar") partes[partes.length - 1] = p.frase;
    else partes.push(p.frase);
    return { tipo: "PISTA", fase: "INGREDIENTES", sprite: "pregunta", nivel: p.nivel, error, ingrediente: this.ultimaPista.g, filas, texto: partes.join(" ") };
  }

  _pistaPaso(errorId = null, auto = false, relacion = "ayuda", segundos = null) {
    const r = this.receta;
    const filas = [];
    const partes = [];
    if (errorId) {
      const d = this.defs[errorId];
      filas.push(["no", `paso_${errorId}`]);
      const que = d.objetos.length ? descPaso(d, r) : CATALOGO.pasos[d.paso].nombre;
      partes.push(d.distractor ? `${cap(paraRec(r))} no hay que ${que}.` : `Todavía no podemos ${descPaso(d, r)}.`);
    } else if (auto) partes.push("¿Te ayudo?");
    partes.push(this._frase("pista", {}));
    const p = this._pistaSegunPolitica(
      "PASOS", this.tarjetasDisponibles(), this.pasosValidos(), (x, a) => this.attrPaso(x, a), relacion, segundos,
      (id) => r.pasos.findIndex((q) => q.paso === id),
      (sel) => `Primero hay que hacer algo ${sel.A.map((a, i) => fragmento(a, sel.vals[i])).join(" y ")}.`,
      (id) => ({ fila: ["primero", `paso_${id}`], frase: `¡Hay que ${descPaso(this.defs[id], r)}! Tócalo.` })
    );
    filas.push(p.fila[0] === "buscar" ? ["primero", ...p.fila.slice(1)] : p.fila);
    if (p.fila[0] === "intentar") partes[partes.length - 1] = p.frase;
    else partes.push(p.frase);
    return { tipo: "PISTA", fase: "PASOS", sprite: "pregunta", nivel: p.nivel, error: errorId, paso: this.ultimaPista.g, filas, texto: partes.join(" ") };
  }

  _victoria() {
    const r = this.receta;
    this.fase = "VICTORIA";
    this.terminada = true;
    this._limpiarAyuda();
    this.pendiente = null;
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
      politica: this.politica,
      retorno: Math.round(this.retorno * 1000) / 1000,
      costo_ayuda: Math.round(this.costoAyuda * 100) / 100,
      uso_directa: this.usoDirecta,
      decisiones: this.decisiones.map((d) => ({ estado: d.estado, accion: d.accion, defecto: d.defecto, resultado: d.resultado })),
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
