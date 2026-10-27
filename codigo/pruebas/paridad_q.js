const fs = require("fs");
const path = require("path");
const JS = path.join(__dirname, "..", "juego", "js");
const codigo = ["catalogo.js", "politica_q.js", "qlearning.js", "agente.js"].map((f) => fs.readFileSync(path.join(JS, f), "utf8")).join("\n");
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, "paridad_q.json"), "utf8"));
const correr = new Function("casos", `${codigo}
  let ok = 0, malos = 0, total = 0, retornos = 0;
  for (const c of casos) {
    const p = new Partida(new Perfil({ theta: c.theta }), { politica: "q", sinColor: c.sin_color, rng: rngSemilla(1) });
    p.eligeTipo(c.tipo, c.receta);
    p.despensa = c.despensa;
    for (const k of Object.keys(p.defs)) if (p.defs[k].distractor) delete p.defs[k];
    for (const [pid, objs] of Object.entries(c.distractores)) p.defs[pid] = { paso: pid, objetos: objs, requiere: [], distractor: true };
    p.tarjetasPaso = c.tarjetas;
    let j = 0;
    c.eventos.forEach(([tipo, x, seg], i) => {
      const n = p.decisiones.length;
      if (tipo === "hecho") p.pasoHecho({ segundos: seg });
      else if (tipo === "ayuda") p.ayuda(false, seg);
      else if (tipo === "ing") p.elige(x, seg);
      else p.eligePaso(x, seg);
      if (p.decisiones.length > n) {
        const d = p.decisiones[p.decisiones.length - 1];
        const e = c.esperado[j++];
        total++;
        const igual = e && e.evento === i && e.estado === d.estado && e.accion === d.accion && e.defecto === d.defecto &&
          JSON.stringify(e.filas) === JSON.stringify(p.accion.filas) &&
          JSON.stringify(e.atenuados) === JSON.stringify([...p.atenuados].sort()) && (e.resaltado ?? null) === (p.resaltado ?? null);
        if (igual) ok++;
        else if (malos++ < 5) console.log("DIFERENCIA", c.receta, i, JSON.stringify(e), JSON.stringify({ estado: d.estado, accion: d.accion, defecto: d.defecto, filas: p.accion.filas, atenuados: [...p.atenuados].sort(), resaltado: p.resaltado }));
      }
    });
    if (j !== c.esperado.length) { malos++; console.log("cantidad de decisiones distinta en", c.receta); }
    if (Math.abs(p.retorno - c.retorno) < 1e-6) retornos++;
  }
  console.log(\`decisiones iguales: \${ok}/\${total} · retornos iguales: \${retornos}/\${casos.length} · diferencias: \${malos}\`);
  return malos;`);
process.exit(correr(casos) ? 1 : 0);
