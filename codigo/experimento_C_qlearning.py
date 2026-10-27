import argparse
import csv
import random
import statistics as st
from pathlib import Path

import qlearning as ql
from catalogo import Catalogo
from simulador import PERFILES, jugar_perfil

RAIZ = Path(__file__).resolve().parent.parent
POLITICAS = ("q", "ig", "aleatoria", "sin_pista")


def metricas(partidas):
    n = len(partidas)
    trasp = [d for p in partidas for d in p.decisiones if d["resultado"]]
    return dict(
        retorno=st.mean(p.retorno for p in partidas),
        errores=st.mean(p.errores + p.errores_pasos for p in partidas),
        ayudas=st.mean(len(p.decisiones) for p in partidas),
        costo=st.mean(p.costo_ayuda for p in partidas),
        directa=100 * sum(p.uso_directa for p in partidas) / n,
        exito_pista=100 * sum(d["resultado"] == "acierto" for d in trasp) / max(1, len(trasp)),
        defecto=100 * sum(d["defecto"] for p in partidas for d in p.decisiones) / max(1, sum(len(p.decisiones) for p in partidas)),
    )


def comparar(cat, tabla, n=400, seed=777, imprimir=print):
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
                pf = perfiles[k % len(perfiles)]
                receta = cat.recetas[k % len(cat.recetas)]
                theta = rng.uniform(0.15, 0.95)
                s = rng.randrange(10**9)
                partidas.append(jugar_perfil(cat, receta, pf, pol, seed=s, theta=theta, tabla_q=tabla))
            m = metricas(partidas)
            filas.append(dict(perfil=perfil, politica=pol, **{k: round(v, 3) for k, v in m.items()}))
            imprimir(f"{perfil:<11}{pol:<11}{m['retorno']:>8.2f}{m['errores']:>8.2f}{m['ayudas']:>7.2f}"
                     f"{m['costo']:>7.2f}{m['directa']:>9.1f}{m['exito_pista']:>21.1f}")
        imprimir("")
    return filas


def politica_aprendida(tabla, imprimir=print):
    imprimir("=== POLÍTICA APRENDIDA (acción con mayor Q) · nivel medio, 4-6 tarjetas, respuesta lenta ===")
    for fase in ql.FASES:
        rels = ("ayuda", "rasgo1", "rasgo2", "rasgo3", "nada") if fase == "INGREDIENTES" else ("ayuda", "rasgo1", "rasgo2", "nada", "prematuro")
        nombres = {"INGREDIENTES": {"rasgo1": "comparte color", "rasgo2": "comparte grupo", "rasgo3": "comparte origen/sabor"},
                   "PASOS": {"rasgo1": "comparte utensilio", "rasgo2": "comparte objeto"}}[fase]
        imprimir(f"  {fase}")
        imprimir(f"    {'relación del error':<26}" + "".join(f"{'err=' + e:>16}" for e in ("1", "2", "3+")))
        for rel in rels:
            celdas = []
            for e in (1, 2, 3):
                if rel == "ayuda":
                    e -= 1
                cands = [ql.clave(ql.discretizar(fase, e, 0.5, 5, 10, None if e < 2 else "rasgo1", rel, mj))
                         for mj in ql.DIMENSIONES["mejor"]]
                cands = [c for c in cands if tabla.conocido(c)]
                s = max(cands, key=lambda c: tabla.visitas[c]) if cands else None
                if s:
                    v = tabla.valores(s)
                    i = max(range(len(v)), key=lambda j: (v[j], -j))
                    celdas.append(f"{ql.ACCIONES[i]} ({tabla.visitas[s]})")
                else:
                    celdas.append("·")
            etiqueta = nombres.get(rel, {"ayuda": "pidió ayuda (err=0,1,2)", "nada": "no comparte nada",
                                         "prematuro": "paso fuera de orden"}.get(rel, rel))
            imprimir(f"    {etiqueta:<26}" + "".join(f"{c:>16}" for c in celdas))
    imprimir("  (entre paréntesis: veces que se actualizó ese estado; '·' = estado no visitado)\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=400)
    ap.add_argument("--traza", nargs=2, metavar=("RECETA", "PERFIL"), default=("pizza", "visual"))
    a = ap.parse_args()
    cat = Catalogo()
    tabla = ql.TablaQ.cargar(RAIZ / "datos" / "politica_q.json")
    print(f"Tabla Q cargada: {len(tabla.q)} estados visitados de {ql.n_estados()} posibles")
    filas = comparar(cat, tabla, a.n)
    (RAIZ / "datos" / "resultados").mkdir(parents=True, exist_ok=True)
    with open(RAIZ / "datos" / "resultados" / "comparacion_q.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    politica_aprendida(tabla)
    print("=== TRAZA DE UNA PARTIDA CON LA POLÍTICA Q ===")
    jugar_perfil(cat, cat.receta(a.traza[0]), a.traza[1], "q", seed=5, theta=0.8, tabla_q=tabla, verbose=True)
