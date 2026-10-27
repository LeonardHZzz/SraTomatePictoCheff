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


def epsilon_en(ep, total, inicio=0.3, fin=0.02):
    k = min(1.0, ep / (0.8 * total))
    return inicio + (fin - inicio) * k


def entrenar(episodios=40000, alfa=None, gamma=0.9, seed=2026, bloque=1000, imprimir=print):
    cat = Catalogo()
    tabla = ql.TablaQ()
    rng = random.Random(seed)
    perfiles = list(PERFILES)
    filas, acum = [], []
    t0 = time.time()
    for ep in range(episodios):
        receta = rng.choice(cat.recetas)
        perfil = rng.choice(perfiles)
        theta = rng.uniform(0.15, 0.95)
        eps = epsilon_en(ep, episodios)
        p = jugar_perfil(cat, receta, perfil, "q", seed=rng.randrange(10**9), theta=theta,
                         tabla_q=tabla, aprender=True, epsilon=eps, alfa=alfa, gamma=gamma)
        acum.append((p.retorno, p.errores + p.errores_pasos, p.uso_directa, len(p.decisiones), p.costo_ayuda))
        if (ep + 1) % bloque == 0:
            fila = dict(
                episodio=ep + 1, epsilon=round(eps, 4),
                retorno=round(st.mean(a[0] for a in acum), 4),
                errores=round(st.mean(a[1] for a in acum), 4),
                pct_directa=round(100 * sum(a[2] for a in acum) / len(acum), 2),
                decisiones=round(st.mean(a[3] for a in acum), 3),
                costo_ayuda=round(st.mean(a[4] for a in acum), 4),
                estados_visitados=len(tabla.q),
            )
            filas.append(fila)
            acum = []
            imprimir(f"  ep {fila['episodio']:>6}  ε={fila['epsilon']:.3f}  retorno={fila['retorno']:+.3f}  "
                     f"errores={fila['errores']:.2f}  directa={fila['pct_directa']:5.1f}%  estados={fila['estados_visitados']}")
    meta = dict(episodios=episodios, alfa=alfa, gamma=gamma, seed=seed, segundos=round(time.time() - t0, 1),
                perfiles=perfiles, estados_posibles=ql.n_estados(), estados_visitados=len(tabla.q))
    return tabla, filas, meta


def guardar(tabla, filas, meta):
    RES.mkdir(parents=True, exist_ok=True)
    tabla.guardar(RAIZ / "datos" / "politica_q.json", meta)
    d = tabla.a_dict(meta)
    js = ("// ARCHIVO GENERADO por codigo/entrenar_q.py. Tabla Q de la Sra. Tomate. No editar a mano.\n"
          f"const POLITICA_Q = {json.dumps(d, ensure_ascii=False)};\n")
    (RAIZ / "codigo" / "juego" / "js" / "politica_q.js").write_text(js, encoding="utf-8")
    with open(RES / "entrenamiento_q.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        x = [f["episodio"] for f in filas]
        fig, ax = plt.subplots(1, 3, figsize=(14, 3.8))
        ax[0].plot(x, [f["retorno"] for f in filas], color="#c44536")
        ax[0].set_title("Retorno medio por episodio")
        ax[1].plot(x, [f["errores"] for f in filas], color="#2b6cb0")
        ax[1].set_title("Errores por receta")
        ax[2].plot(x, [f["pct_directa"] for f in filas], color="#2e9e4a")
        ax[2].set_title("% recetas con pista directa")
        for a in ax:
            a.set_xlabel("episodios (miles)")
            a.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v / 1000:.0f}"))
            a.grid(alpha=0.3)
        fig.tight_layout()
        fig.savefig(RES / "curva_q.png", dpi=120)
        plt.close(fig)
    except ImportError:
        print("  (matplotlib no instalado: se omite curva_q.png)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--episodios", type=int, default=40000)
    ap.add_argument("--alfa", type=float, default=None, help="fija α; por defecto α=1/(1+n)^0.6 por (estado, acción)")
    ap.add_argument("--gamma", type=float, default=0.9)
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args()
    print(f"Entrenando Q-Learning: {a.episodios} episodios, α={a.alfa or '1/(1+n)^0.6'}, γ={a.gamma}, {ql.n_estados()} estados posibles")
    tabla, filas, meta = entrenar(a.episodios, a.alfa, a.gamma, a.seed, bloque=max(100, a.episodios // 40))
    guardar(tabla, filas, meta)
    print(f"Listo en {meta['segundos']} s · estados visitados {meta['estados_visitados']} de {meta['estados_posibles']}")
    print("  -> datos/politica_q.json · codigo/juego/js/politica_q.js · datos/resultados/")
