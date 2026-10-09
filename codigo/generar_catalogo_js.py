import json
from pathlib import Path

from catalogo import Catalogo

SALIDA = Path(__file__).resolve().parent / "juego" / "js" / "catalogo.js"


def main():
    cat = Catalogo()
    data = {
        "tipos": [t.__dict__ for t in cat.tipos],
        "ingredientes": {
            g.id: {
                "id": g.id, "nombre": g.nombre, "articulo": g.articulo, "categoria": g.categoria,
                "dificultad": g.dificultad, "color": g.color or None,
                "origen": g.origen or None, "sabor": g.sabor or None,
            }
            for g in cat.ingredientes.values()
        },
        "recetas": [
            {"id": r.id, "nombre": r.nombre, "articulo": r.articulo, "tipo": r.tipo,
             "ingredientes": list(r.orden),
             "pasos": [{"paso": p.paso, "objetos": list(p.objetos), "requiere": sorted(p.requiere),
                        **({"sobre": p.sobre} if p.sobre else {})} for p in r.pasos]}
            for r in cat.recetas
        ],
        "conceptos": {k: c["nombre"] for k, c in cat.conceptos.items()},
        "pasos": {k: {"id": p.id, "nombre": p.nombre, "gesto": p.gesto, "herramienta": p.herramienta,
                      "instruccion": p.instruccion} for k, p in cat.pasos.items()},
        "arasaac": {k: v[0] for k, v in cat.pictos().items()},
        "archivos": {k: v[1].name for k, v in cat.pictos().items()},
    }
    js = (
        "// ARCHIVO GENERADO por codigo/generar_catalogo_js.py a partir de datos/. No editar a mano.\n"
        "const PIC = \"../../datos/pictogramas\";\n"
        f"const CATALOGO = {json.dumps(data, ensure_ascii=False, indent=1)};\n\n"
        + FUNCIONES
    )
    SALIDA.write_text(js, encoding="utf-8")
    print(f"OK -> {SALIDA} ({len(data['recetas'])} recetas, {len(data['ingredientes'])} ingredientes)")


FUNCIONES = r"""const ATRIBUTOS = ["color", "categoria", "origen", "sabor"];
const PREFIJO = { color: "color", categoria: "grupo", origen: "origen", sabor: "sabor" };

function atributo(g, a) {
  const v = CATALOGO.ingredientes[g][a];
  if (!v || (a === "categoria" && v === "otro")) return null;
  return v;
}
function pictoAtributo(a, v) { return `${PREFIJO[a]}_${v}`; }
function nombreAtributo(a, v) { return CATALOGO.conceptos[pictoAtributo(a, v)] || v; }
function nombreIng(g) { return CATALOGO.ingredientes[g].nombre; }
function recetaPorId(id) { return CATALOGO.recetas.find((r) => r.id === id); }
function recetasDe(tipo) { return CATALOGO.recetas.filter((r) => r.tipo === tipo); }
function tipoPorId(id) { return CATALOGO.tipos.find((t) => t.id === id); }

function dificultadReceta(r) {
  const n = r.ingredientes.length;
  const vis = r.ingredientes.reduce((s, g) => s + CATALOGO.ingredientes[g].dificultad, 0) / n;
  return Math.min(1, Math.max(0, 0.5 * (n - 3) + 0.5 * (vis - 1) / 2));
}

// Pictograma local; si no se descargó aún, se usa el servidor oficial de ARASAAC.
function pictoSrc(id) {
  const f = CATALOGO.archivos[id] || `${id}.png`;
  return `${PIC}/${f}`;
}
function pictoRemoto(id) {
  const a = CATALOGO.arasaac[id];
  return a ? `https://static.arasaac.org/pictograms/${a}/${a}_500.png` : "";
}
function pictoFallback(img) {
  const id = img.dataset.picto;
  if (!img.dataset.remoto && pictoRemoto(id)) {
    img.dataset.remoto = "1";
    img.src = pictoRemoto(id);
  } else {
    // sin internet y sin archivo local: tarjeta con la palabra
    img.onerror = null;
    img.classList.add("sin-picto");
    img.src = pictoPalabra(img.alt || id);
  }
}
function pictoPalabra(txt) {
  const t = String(txt).toUpperCase().replace(/[<&>"]/g, "");
  const fs = t.length > 9 ? 13 : t.length > 6 ? 16 : 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="#fff"/><text x="50" y="55" font-family="Trebuchet MS,Arial" font-weight="700" font-size="${fs}" text-anchor="middle" fill="#1a1208">${t}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function imgPicto(id, alt = "", cls = "") {
  return `<img class="${cls}" src="${pictoSrc(id)}" data-picto="${id}" alt="${alt || id}" onerror="pictoFallback(this)">`;
}
"""

if __name__ == "__main__":
    main()
