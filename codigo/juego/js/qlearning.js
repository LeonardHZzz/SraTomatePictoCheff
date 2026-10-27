// Q-Learning de la Sra. Tomate (espejo de codigo/qlearning.py). Ver docs/Q_LEARNING_SRA_TOMATE.md
const QL = {
  ACCIONES: ["animar", "rasgo1", "rasgo2", "rasgo3", "doble", "directa"],
  NIVEL: { animar: 0, rasgo1: 1, rasgo2: 1, rasgo3: 1, doble: 2, directa: 3 },
  COSTO: { animar: 0.0, rasgo1: 0.1, rasgo2: 0.1, rasgo3: 0.1, doble: 0.4, directa: 1.0 },
  R_ACIERTO: 1.0,
  R_ERROR: -0.5,
  R_REPITE: -0.4,
  RASGOS: {
    INGREDIENTES: { rasgo1: ["color"], rasgo2: ["categoria"], rasgo3: ["origen", "sabor"] },
    PASOS: { rasgo1: ["herramienta"], rasgo2: ["objeto"], rasgo3: [] },
  },
  FASES: ["INGREDIENTES", "PASOS"],
  RELACIONES: ["ayuda", "rasgo1", "rasgo2", "rasgo3", "nada", "prematuro"],
  SEG_LENTO: 8.0,
};
QL.ULTIMAS = ["ninguna", ...QL.ACCIONES];
QL.DIMENSIONES = {
  fase: QL.FASES,
  errores: ["0", "1", "2", "3+"],
  nivel: ["bajo", "medio", "alto"],
  tarjetas: ["1-3", "4-6", "7+"],
  velocidad: ["rapido", "lento"],
  ultima: QL.ULTIMAS,
  relacion: QL.RELACIONES,
  mejor: ["rasgo1", "rasgo2", "rasgo3", "ninguno"],
};

QL.discretizar = (fase, errores, theta, nTarjetas, segundos, ultima, relacion, mejor = "ninguno") => [
  QL.FASES.indexOf(fase),
  Math.min(errores, 3),
  theta < 0.4 ? 0 : theta < 0.7 ? 1 : 2,
  nTarjetas <= 3 ? 0 : nTarjetas <= 6 ? 1 : 2,
  (segundos || 0) > QL.SEG_LENTO ? 1 : 0,
  QL.ULTIMAS.indexOf(ultima || "ninguna"),
  QL.RELACIONES.indexOf(relacion),
  QL.DIMENSIONES.mejor.indexOf(mejor),
];
QL.clave = (estado) => estado.join("-");
QL.describir = (clave) => {
  const v = clave.split("-").map(Number);
  return Object.fromEntries(Object.entries(QL.DIMENSIONES).map(([k, vals], i) => [k, vals[v[i]]]));
};

class TablaQ {
  constructor(datos = null) {
    this.q = {};
    this.visitas = {};
    if (datos) {
      if (JSON.stringify(datos.acciones) !== JSON.stringify(QL.ACCIONES)) throw new Error("Tabla Q con otras acciones");
      for (const [k, v] of Object.entries(datos.q)) this.q[k] = [...v];
      Object.assign(this.visitas, datos.visitas || {});
    }
  }
  valores(s) {
    return this.q[s] || QL.ACCIONES.map(() => 0);
  }
  conocido(s) {
    return (this.visitas[s] || 0) > 0;
  }
  mejor(s, mascara) {
    const v = this.valores(s);
    let best = -1;
    for (let i = 0; i < v.length; i++) if (mascara[i] && (best < 0 || v[i] > v[best])) best = i;
    return best;
  }
}

const TABLA_Q = typeof POLITICA_Q !== "undefined" ? new TablaQ(POLITICA_Q) : null;
