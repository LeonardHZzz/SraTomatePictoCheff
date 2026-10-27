"""Prueba de paridad Python ↔ JavaScript del agente con Q-Learning.

    python pruebas/paridad_q.py          # genera pruebas/paridad_q.json
    node pruebas/paridad_q.js            # repite las partidas en JS y compara

Cada partida guarda la configuración (receta, θ, despensa, tarjetas de pasos) y la secuencia de
elecciones de un jugador aleatorio. Se espera que ambos motores produzcan las mismas decisiones
(estado, acción) y las mismas filas de pictogramas.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import qlearning as ql  # noqa: E402
from agente import Partida, Perfil  # noqa: E402
from catalogo import Catalogo  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent.parent


def generar(n=300, seed=11):
    cat = Catalogo()
    tabla = ql.TablaQ.cargar(RAIZ / "datos" / "politica_q.json")
    rng = random.Random(seed)
    casos = []
    for k in range(n):
        receta = rng.choice(cat.recetas)
        theta = round(rng.uniform(0.1, 0.95), 3)
        sin_color = rng.random() < 0.2
        p = Partida(cat, Perfil(theta), "q", random.Random(k), sin_color=sin_color, tabla_q=tabla)
        p.elige_tipo(receta.tipo, receta.id)
        caso = dict(receta=receta.id, tipo=receta.tipo, theta=theta, sin_color=sin_color,
                    despensa=list(p.despensa), tarjetas=list(p.tarjetas_paso),
                    distractores={pid: list(d.objetos) for pid, d in p.defs.items() if d.distractor},
                    eventos=[], esperado=[])
        guard = 0
        while not p.terminada and guard < 120:
            guard += 1
            seg = round(rng.uniform(1, 15), 2)
            n_dec = len(p.decisiones)
            if p.fase == "ACCION":
                p.paso_hecho(segundos=1)
                caso["eventos"].append(["hecho", None, 1])
                continue
            if rng.random() < 0.12:
                p.ayuda(segundos=seg)
                caso["eventos"].append(["ayuda", None, seg])
            elif p.fase == "INGREDIENTES":
                C = [x for x in p.disponibles() if x not in p.atenuados]
                g = rng.choice(C)
                p.elige(g, segundos=seg)
                caso["eventos"].append(["ing", g, seg])
            else:
                C = [x for x in p.tarjetas_disponibles() if x not in p.atenuados]
                g = rng.choice(C)
                p.elige_paso(g, segundos=seg)
                caso["eventos"].append(["paso", g, seg])
            if len(p.decisiones) > n_dec:
                d = p.decisiones[-1]
                caso["esperado"].append(dict(evento=len(caso["eventos"]) - 1, estado=d["estado"], accion=d["accion"],
                                             defecto=d["defecto"], filas=p.accion.filas,
                                             atenuados=sorted(p.atenuados), resaltado=p.resaltado))
        caso["retorno"] = round(p.retorno, 6)
        casos.append(caso)
    return casos


if __name__ == "__main__":
    casos = generar()
    out = Path(__file__).resolve().parent / "paridad_q.json"
    out.write_text(json.dumps(casos, ensure_ascii=False), encoding="utf-8")
    print(f"{len(casos)} partidas, {sum(len(c['esperado']) for c in casos)} decisiones -> {out.name}")
