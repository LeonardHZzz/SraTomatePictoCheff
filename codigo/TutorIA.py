import argparse
import csv
import json
import random
import statistics as st
import time
from pathlib import Path

import qlearning as ql
from catalogo import Catalogo
from simulador import PERFILES, jugar_perfil

RAIZ = Path(__file__).resolve().parent.parent
RES = RAIZ / "datos" / "resultados"
JS = RAIZ / "codigo" / "juego" / "js"
POLITICAS = ("q", "ig", "aleatoria", "sin_pista")


# --- entrenamiento -----------------------------------------------------------------
def epsilon_en(ep, total, inicio=0.3, fin=0.02):
    return inicio + (fin - inicio) * min(1.0, ep / (0.8 * total))


def entrenar(episodios=150000, alfa=None, gamma=0.9, seed=2026, bloque=None, imprimir=print):
    cat, tabla, rng = Catalogo(), ql.TablaQ(), random.Random(seed)
    bloque = bloque or max(100, episodios // 40)
    perfiles = list(PERFILES)
    filas, acum, t0 = [], [], time.time()
    for ep in range(episodios):
        eps = epsilon_en(ep, episodios)
        p = jugar_perfil(cat, rng.choice(cat.recetas), rng.choice(perfiles), "q", seed=rng.randrange(10**9),
                         theta=rng.uniform(0.15, 0.95), tabla_q=tabla, aprender=True, epsilon=eps,
                         alfa=alfa, gamma=gamma)
        acum.append((p.retorno, p.errores + p.errores_pasos, p.uso_directa, len(p.decisiones), p.costo_ayuda))
        if (ep + 1) % bloque == 0:
            fila = dict(episodio=ep + 1, epsilon=round(eps, 4),
                        retorno=round(st.mean(a[0] for a in acum), 4),
                        errores=round(st.mean(a[1] for a in acum), 4),
                        pct_directa=round(100 * sum(a[2] for a in acum) / len(acum), 2),
                        decisiones=round(st.mean(a[3] for a in acum), 3),
                        costo_ayuda=round(st.mean(a[4] for a in acum), 4),
                        estados_visitados=len(tabla.q))
            filas.append(fila)
            acum = []
            imprimir(f"  ep {fila['episodio']:>6}  ε={fila['epsilon']:.3f}  retorno={fila['retorno']:+.3f}  "
                     f"errores={fila['errores']:.2f}  directa={fila['pct_directa']:5.1f}%  estados={fila['estados_visitados']}")
    meta = dict(episodios=episodios, alfa=alfa, gamma=gamma, seed=seed, segundos=round(time.time() - t0, 1),
                perfiles=perfiles, estados_posibles=ql.n_estados(), estados_visitados=len(tabla.q))
    return tabla, filas, meta


def guardar_entrenamiento(tabla, filas, meta):
    RES.mkdir(parents=True, exist_ok=True)
    tabla.guardar(RAIZ / "datos" / "politica_q.json", meta)
    js = ("// ARCHIVO GENERADO por codigo/TutorIA.py. Tabla Q de la Sra. Tomate. No editar a mano.\n"
          f"const POLITICA_Q = {json.dumps(tabla.a_dict(meta), ensure_ascii=False)};\n")
    (JS / "politica_q.js").write_text(js, encoding="utf-8")
    with open(RES / "entrenamiento_q.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    graficar(filas)


def graficar(filas):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("  (matplotlib no instalado: se omite curva_q.png)")
        return
    x = [f["episodio"] for f in filas]
    fig, ax = plt.subplots(1, 3, figsize=(14, 3.8))
    for a, (k, t, c) in zip(ax, [("retorno", "Retorno medio por episodio", "#c44536"),
                                 ("errores", "Errores por receta", "#2b6cb0"),
                                 ("pct_directa", "% recetas con pista directa", "#2e9e4a")]):
        a.plot(x, [f[k] for f in filas], color=c)
        a.set_title(t)
        a.set_xlabel("episodios (miles)")
        a.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v / 1000:.0f}"))
        a.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(RES / "curva_q.png", dpi=120)
    plt.close(fig)


# --- evaluación ----------------------------------------------------------------------
def metricas(partidas):
    n = len(partidas)
    dec = [d for p in partidas for d in p.decisiones]
    resueltas = [d for d in dec if d["resultado"]]
    return dict(
        retorno=st.mean(p.retorno for p in partidas),
        errores=st.mean(p.errores + p.errores_pasos for p in partidas),
        ayudas=st.mean(len(p.decisiones) for p in partidas),
        costo=st.mean(p.costo_ayuda for p in partidas),
        directa=100 * sum(p.uso_directa for p in partidas) / n,
        exito_pista=100 * sum(d["resultado"] == "acierto" for d in resueltas) / max(1, len(resueltas)),
        defecto=100 * sum(d["defecto"] for d in dec) / max(1, len(dec)),
    )


def comparar(cat, tabla, n=1000, seed=777, imprimir=print):
    filas = []
    imprimir(f"\n=== COMPARACIÓN DE POLÍTICAS · {n} partidas por perfil (mismas recetas, θ y semillas) ===")
    imprimir(f"{'perfil':<11}{'política':<11}{'retorno':>8}{'errores':>8}{'ayudas':>7}{'costo':>7}"
             f"{'directa%':>9}{'acierto tras pista%':>21}")
    for perfil in list(PERFILES) + ["TODOS"]:
        perfiles = list(PERFILES) if perfil == "TODOS" else [perfil]
        for pol in POLITICAS:
            rng = random.Random(seed)
            partidas = []
            for k in range(n):
                theta, s = rng.uniform(0.15, 0.95), rng.randrange(10**9)
                partidas.append(jugar_perfil(cat, cat.recetas[k % len(cat.recetas)], perfiles[k % len(perfiles)],
                                             pol, seed=s, theta=theta, tabla_q=tabla))
            m = metricas(partidas)
            filas.append(dict(perfil=perfil, politica=pol, **{k: round(v, 3) for k, v in m.items()}))
            imprimir(f"{perfil:<11}{pol:<11}{m['retorno']:>8.2f}{m['errores']:>8.2f}{m['ayudas']:>7.2f}"
                     f"{m['costo']:>7.2f}{m['directa']:>9.1f}{m['exito_pista']:>21.1f}")
        imprimir("")
    return filas


def politica_aprendida(tabla, imprimir=print):
    """Acción con mayor Q por relación del error (nivel medio, 4-6 tarjetas, respuesta lenta)."""
    nombres = {"INGREDIENTES": {"rasgo1": "comparte color", "rasgo2": "comparte grupo", "rasgo3": "comparte origen/sabor"},
               "PASOS": {"rasgo1": "comparte utensilio", "rasgo2": "comparte objeto"}}
    extra = {"ayuda": "pidió ayuda", "nada": "no comparte nada", "prematuro": "paso fuera de orden"}
    filas = []
    imprimir("=== POLÍTICA APRENDIDA (acción con mayor Q) · nivel medio, 4-6 tarjetas, respuesta lenta ===")
    for fase in ql.FASES:
        rels = ("ayuda", "rasgo1", "rasgo2", "rasgo3", "nada") if fase == "INGREDIENTES" else ("ayuda", "rasgo1", "rasgo2", "nada", "prematuro")
        imprimir(f"  {fase}")
        for rel in rels:
            celdas = []
            for e in (1, 2, 3):
                e2 = e - 1 if rel == "ayuda" else e
                cands = [ql.clave(ql.discretizar(fase, e2, 0.5, 5, 10, None if e2 < 2 else "rasgo1", rel, mj))
                         for mj in ql.DIMENSIONES["mejor"]]
                cands = [c for c in cands if tabla.conocido(c)]
                if cands:
                    s = max(cands, key=lambda c: tabla.visitas[c])
                    v = tabla.valores(s)
                    i = max(range(len(v)), key=lambda j: (v[j], -j))
                    celdas.append(dict(accion=ql.ACCIONES[i], visitas=tabla.visitas[s]))
                else:
                    celdas.append(None)
            etiqueta = nombres[fase].get(rel, extra.get(rel, rel))
            filas.append(dict(fase=fase, relacion=etiqueta, celdas=celdas))
            imprimir(f"    {etiqueta:<24}" + "".join(f"{(c['accion'] + ' (' + str(c['visitas']) + ')') if c else '·':>18}" for c in celdas))
    imprimir("  columnas: errores seguidos 1 · 2 · 3+ (para «pidió ayuda»: 0 · 1 · 2)\n")
    return filas


def exportar_html(filas_cmp, politica):
    """Datos para TutorIA.html (el navegador no puede leer CSV desde file://)."""
    curva = []
    if (RES / "entrenamiento_q.csv").exists():
        with open(RES / "entrenamiento_q.csv", encoding="utf-8") as f:
            curva = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(f)]
    meta = json.loads((RAIZ / "datos" / "politica_q.json").read_text(encoding="utf-8")).get("meta", {})
    d = dict(meta=meta, curva=curva, comparacion=filas_cmp, politica=politica)
    (JS / "tutoria_datos.js").write_text(
        "// ARCHIVO GENERADO por codigo/TutorIA.py (evaluar). No editar a mano.\n"
        f"const TUTORIA_DATOS = {json.dumps(d, ensure_ascii=False)};\n", encoding="utf-8")


def evaluar(n=1000):
    cat = Catalogo()
    tabla = ql.TablaQ.cargar(RAIZ / "datos" / "politica_q.json")
    print(f"Tabla Q: {len(tabla.q)} estados visitados de {ql.n_estados()} posibles")
    filas = comparar(cat, tabla, n)
    RES.mkdir(parents=True, exist_ok=True)
    with open(RES / "comparacion_q.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    politica = politica_aprendida(tabla)
    exportar_html(filas, politica)
    print("  -> datos/resultados/comparacion_q.csv · codigo/juego/js/tutoria_datos.js")


def traza(receta, perfil, seed=5, theta=0.8):
    cat = Catalogo()
    tabla = ql.TablaQ.cargar(RAIZ / "datos" / "politica_q.json")
    jugar_perfil(cat, cat.receta(receta), perfil, "q", seed=seed, theta=theta, tabla_q=tabla, verbose=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="TutorIA · Q-Learning de la Sra. Tomate")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("entrenar")
    e.add_argument("--episodios", type=int, default=150000)
    e.add_argument("--alfa", type=float, default=None, help="fija α; por defecto α=1/(1+n)^0.6 por (estado, acción)")
    e.add_argument("--gamma", type=float, default=0.9)
    e.add_argument("--seed", type=int, default=2026)
    v = sub.add_parser("evaluar")
    v.add_argument("--n", type=int, default=1000)
    t = sub.add_parser("traza")
    t.add_argument("receta", nargs="?", default="pizza")
    t.add_argument("perfil", nargs="?", default="visual", choices=list(PERFILES))
    t.add_argument("--seed", type=int, default=5)
    t.add_argument("--theta", type=float, default=0.8)
    o = sub.add_parser("todo")
    o.add_argument("--episodios", type=int, default=150000)
    o.add_argument("--n", type=int, default=1000)
    a = ap.parse_args()
    if a.cmd in ("entrenar", "todo"):
        alfa, gamma, seed = getattr(a, "alfa", None), getattr(a, "gamma", 0.9), getattr(a, "seed", 2026)
        print(f"Entrenando: {a.episodios} episodios, α={alfa or '1/(1+n)^0.6'}, γ={gamma}, {ql.n_estados()} estados posibles")
        tabla, filas, meta = entrenar(a.episodios, alfa, gamma, seed)
        guardar_entrenamiento(tabla, filas, meta)
        print(f"Listo en {meta['segundos']} s · estados visitados {meta['estados_visitados']} de {meta['estados_posibles']}")
    if a.cmd in ("evaluar", "todo"):
        evaluar(a.n)
    if a.cmd == "traza":
        traza(a.receta, a.perfil, a.seed, a.theta)
