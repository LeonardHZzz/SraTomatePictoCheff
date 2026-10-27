const AVATARES = ["fresa", "platano", "manzana", "naranja", "palta", "zanahoria", "queso", "huevo"];
const MODOS_MOTOR = {
  normal: { nombre: "normal", desc: "Gestos completos" },
  facil: { nombre: "fácil", desc: "Menos repeticiones y más tolerancia" },
  tocar: { nombre: "solo tocar", desc: "Cada toque avanza (sin arrastrar)" },
};

const Jugadores = {
  CLAVE: "pictochef.jugadores.v1",
  datos: { jugadores: [], actual: null },
  enMemoria: false,

  cargar() {
    try {
      const s = localStorage.getItem(this.CLAVE);
      if (s) {
        const d = JSON.parse(s);
        if (d && Array.isArray(d.jugadores)) this.datos = d;
      }
    } catch (e) {
      this.enMemoria = true;
    }
    this.datos.actual = null; 
    return this;
  },

  guardar() {
    try {
      localStorage.setItem(this.CLAVE, JSON.stringify(this.datos));
    } catch (e) {
      this.enMemoria = true;
    }
  },

  lista() {
    return this.datos.jugadores;
  },
  porId(id) {
    return this.datos.jugadores.find((j) => j.id === id) || null;
  },
  actual() {
    return this.porId(this.datos.actual);
  },

  crear({ nombre, avatar, motor = "normal", sinColor = false }) {
    const j = {
      id: `j${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      nombre: String(nombre || "").trim().slice(0, 24) || "Jugador",
      avatar: AVATARES.includes(avatar) ? avatar : AVATARES[0],
      creado: new Date().toISOString(),
      ajustes: { motor, sinColor },
      perfil: { theta: CFG.THETA0, jugadas: {} },
      logros: {}, // receta -> mejores estrellas
      sesiones: [],
      partidas: [],
    };
    this.datos.jugadores.push(j);
    this.guardar();
    return j;
  },

  entrar(id) {
    const j = this.porId(id);
    if (!j) return null;
    this.datos.actual = id;
    j.sesiones.push({ inicio: new Date().toISOString(), fin: null, partidas: 0 });
    this.guardar();
    return j;
  },

  salir() {
    const j = this.actual();
    if (j && j.sesiones.length) j.sesiones[j.sesiones.length - 1].fin = new Date().toISOString();
    this.datos.actual = null;
    this.guardar();
  },

  registrarPartida(resumen, perfil) {
    const j = this.actual();
    if (!j || !resumen) return;
    j.partidas.push(resumen);
    j.perfil = perfil.exportar();
    j.logros[resumen.receta] = Math.max(j.logros[resumen.receta] || 0, resumen.estrellas);
    const s = j.sesiones[j.sesiones.length - 1];
    if (s) {
      s.partidas += 1;
      s.fin = new Date().toISOString();
    }
    this.guardar();
  },

  ajustar(id, cambios) {
    const j = this.porId(id);
    if (!j) return;
    if (cambios.nombre != null) j.nombre = String(cambios.nombre).trim().slice(0, 24) || j.nombre;
    if (cambios.avatar) j.avatar = cambios.avatar;
    Object.assign(j.ajustes, cambios.ajustes || {});
    this.guardar();
  },

  borrar(id) {
    this.datos.jugadores = this.datos.jugadores.filter((j) => j.id !== id);
    if (this.datos.actual === id) this.datos.actual = null;
    this.guardar();
  },

  estadisticas(j) {
    const dias = [...new Set(j.partidas.map((p) => p.fecha.slice(0, 10)))].sort();
    let racha = 0;
    if (dias.length) {
      const d = new Date();
      const fmt = (x) => x.toISOString().slice(0, 10);
      if (!dias.includes(fmt(d))) d.setDate(d.getDate() - 1);
      while (dias.includes(fmt(d))) {
        racha += 1;
        d.setDate(d.getDate() - 1);
      }
    }
    return {
      partidas: j.partidas.length,
      dias: dias.length,
      racha,
      recetas: Object.keys(j.logros).length,
      estrellas: Object.values(j.logros).reduce((a, b) => a + b, 0),
      theta: j.perfil.theta,
    };
  },

  csv(ids = null) {
    const cols = ["jugador", "fecha", "receta", "tipo", "estrellas", "errores_ingredientes", "errores_pasos",
      "ayudas", "ayudas_motoras", "segundos", "desempeno", "theta_antes", "theta", "motricidad",
      "politica", "retorno_q", "costo_ayuda", "uso_directa", "decisiones_q"];
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filas = [cols.join(",")];
    for (const j of this.datos.jugadores) {
      if (ids && !ids.includes(j.id)) continue;
      for (const p of j.partidas) {
        const motr = (p.motricidad || []).map((m) => `${m.paso}:${m.segundos}s${m.ayuda ? "+ayuda" : ""}`).join(" | ");
        filas.push([j.nombre, p.fecha, p.receta, p.tipo, p.estrellas, p.errores_ingredientes, p.errores_pasos,
          p.ayudas, p.ayudas_motoras, p.segundos, p.desempeno, p.theta_antes, p.theta, motr,
          p.politica ?? "", p.retorno ?? "", p.costo_ayuda ?? "", p.uso_directa ?? "",
          (p.decisiones || []).map((d) => `${d.estado}>${d.accion}:${d.resultado || "-"}`).join(" | ")].map(esc).join(","));
      }
    }
    return "﻿" + filas.join("\n");
  },

  json() {
    return JSON.stringify({ app: "PictoChef", version: 1, exportado: new Date().toISOString(), jugadores: this.datos.jugadores }, null, 1);
  },

  importar(texto) {
    const d = JSON.parse(texto);
    const lista = Array.isArray(d) ? d : d.jugadores;
    if (!Array.isArray(lista)) throw new Error("Archivo no válido");
    let nuevos = 0;
    for (const j of lista) {
      if (!j || !j.id || !j.nombre) continue;
      const k = this.datos.jugadores.findIndex((x) => x.id === j.id);
      if (k >= 0) {
        // fusiona partidas sin duplicar
        const fechas = new Set(this.datos.jugadores[k].partidas.map((p) => p.fecha));
        for (const p of j.partidas || []) if (!fechas.has(p.fecha)) this.datos.jugadores[k].partidas.push(p);
      } else {
        this.datos.jugadores.push({ ajustes: { motor: "normal", sinColor: false }, perfil: { theta: CFG.THETA0, jugadas: {} }, logros: {}, sesiones: [], partidas: [], ...j });
        nuevos += 1;
      }
    }
    this.guardar();
    return nuevos;
  },
};

function descargar(nombre, texto, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
