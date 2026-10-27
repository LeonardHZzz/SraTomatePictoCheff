// Jugadores simulados con perfil (espejo de codigo/simulador.py) para TutorIA.html.
const PERFILES = {
  visual: { p_conoce: 0.45, p_orden: 0.45, p_distrae: 0.2, p_impulso: 0.05, p_ayuda: 0.1, confunde: "color",
    entiende: { color: 0.95, categoria: 0.35, origen: 0.4, sabor: 0.45, herramienta: 0.85, objeto: 0.9 } },
  conceptual: { p_conoce: 0.45, p_orden: 0.5, p_distrae: 0.2, p_impulso: 0.05, p_ayuda: 0.1, confunde: "categoria",
    entiende: { color: 0.55, categoria: 0.9, origen: 0.85, sabor: 0.8, herramienta: 0.9, objeto: 0.75 } },
  daltonico: { p_conoce: 0.5, p_orden: 0.5, p_distrae: 0.2, p_impulso: 0.05, p_ayuda: 0.1, confunde: "categoria", sin_color: true,
    entiende: { color: 0.05, categoria: 0.8, origen: 0.8, sabor: 0.8, herramienta: 0.8, objeto: 0.85 } },
  impulsivo: { p_conoce: 0.4, p_orden: 0.35, p_distrae: 0.15, p_impulso: 0.35, p_ayuda: 0.02, confunde: null,
    entiende: { color: 0.65, categoria: 0.65, origen: 0.65, sabor: 0.65, herramienta: 0.65, objeto: 0.65 } },
  inicial: { p_conoce: 0.2, p_orden: 0.25, p_distrae: 0.25, p_impulso: 0.1, p_ayuda: 0.3, confunde: "color",
    entiende: { color: 0.7, categoria: 0.3, origen: 0.25, sabor: 0.3, herramienta: 0.6, objeto: 0.8 } },
};

class JugadorPerfil {
  constructor(receta, rng, perfil) {
    this.r = receta;
    this.rng = rng;
    this.nombre = perfil;
    this.pf = PERFILES[perfil];
    this.conoce = new Set(receta.ingredientes.filter(() => rng() < this.pf.p_conoce));
    this.conocePasos = new Set(receta.pasos.map((p) => p.paso).filter(() => rng() < this.pf.p_orden));
  }
  _u(a, b) {
    return a + (b - a) * this.rng();
  }
  _azar(xs) {
    return xs[Math.floor(this.rng() * xs.length)];
  }
  _entiende(A) {
    if (!A || !A.length) return false;
    let pNo = 1;
    for (const a of A) pNo *= 1 - (this.pf.entiende[a] ?? 0.5);
    return this.rng() < 1 - pNo;
  }
  _confusion(C, M) {
    const c = this.pf.confunde;
    if (c && this.rng() < 0.75) {
      const cand = C.filter((x) => atributo(x, c) && M.some((g) => atributo(g, c) === atributo(x, c)));
      if (cand.length) return this._azar(cand);
    }
    return this._azar(C);
  }
  reacciona(p) {
    if (p.fase === "ACCION") {
      const paso = p.pasoActivo;
      p.pasoHecho({ segundos: 0 });
      return { pick: `(gesto ${paso})`, seg: 0 };
    }
    const pista = p.accion.tipo === "PISTA" ? p.ultimaPista : null;
    const tipo = pista ? pista.tipo : null;
    let C, M, sabe;
    if (p.fase === "INGREDIENTES") {
      C = p.disponibles().filter((x) => !p.atenuados.has(x));
      M = p.faltan();
      sabe = M.filter((g) => this.conoce.has(g));
    } else {
      C = p.tarjetasDisponibles().filter((x) => !p.atenuados.has(x));
      M = p.pasosValidos();
      sabe = M.filter((x) => this.conocePasos.has(x));
    }
    if (!sabe.length && !tipo && this.rng() < this.pf.p_ayuda) {
      const seg = this._u(8, 15);
      p.ayuda(false, seg);
      return { pick: "AYUDA", seg };
    }
    let pick, seg;
    if (this.rng() < this.pf.p_impulso) {
      pick = this._azar(C);
      seg = this._u(1, 3);
    } else if (tipo === "directa" && C.includes(pista.S[0])) {
      pick = pista.S[0];
      seg = this._u(2, 4);
    } else if (pista && pista.A.length && this._entiende(pista.A)) {
      const S = pista.S.filter((x) => C.includes(x));
      pick = this._azar(S.length ? S : C);
      seg = this._u(3, 6);
    } else {
      const distraido = tipo !== "animar" && this.rng() < this.pf.p_distrae;
      if (sabe.length && !distraido) {
        pick = this._azar(sabe);
        seg = this._u(2, 5);
      } else {
        pick = p.fase === "INGREDIENTES" ? this._confusion(C, M) : this._azar(C);
        seg = distraido ? this._u(1.5, 3.5) : this._u(7, 14);
      }
    }
    if (p.fase === "INGREDIENTES") p.elige(pick, seg);
    else p.eligePaso(pick, seg);
    return { pick, seg };
  }
}

// Juega una receta completa. Devuelve la partida y la traza (una fila por acción del jugador).
function jugarPerfil(receta, perfil, politica = "q", seed = 1, theta = 0.5) {
  const p = new Partida(new Perfil({ theta }), { politica, rng: rngSemilla(seed * 31 + 7), sinColor: !!PERFILES[perfil].sin_color });
  p.eligeTipo(receta.tipo, receta.id);
  const jug = new JugadorPerfil(receta, rngSemilla(seed), perfil);
  const traza = [];
  let guard = 0;
  while (!p.terminada && guard++ < 150) {
    const n = p.decisiones.length;
    const fase = p.fase;
    const { pick, seg } = jug.reacciona(p);
    const fila = { fase, pick, seg, accion: { ...p.accion, filas: p.accion.filas.map((f) => [...f]) } };
    if (p.decisiones.length > n) fila.decision = p.decisiones[p.decisiones.length - 1];
    traza.push(fila);
  }
  return { partida: p, traza };
}

function metricasPartidas(partidas) {
  const n = partidas.length;
  const media = (f) => partidas.reduce((s, p) => s + f(p), 0) / n;
  const dec = partidas.flatMap((p) => p.decisiones);
  const res = dec.filter((d) => d.resultado);
  return {
    retorno: media((p) => p.retorno),
    errores: media((p) => p.errores + p.erroresPasos),
    ayudas: media((p) => p.decisiones.length),
    costo: media((p) => p.costoAyuda),
    directa: (100 * partidas.filter((p) => p.usoDirecta).length) / n,
    exito_pista: (100 * res.filter((d) => d.resultado === "acierto").length) / Math.max(1, res.length),
  };
}
