import argparse
import random
import statistics as st

from agente import Partida, Perfil
from catalogo import Catalogo
from simulador import JugadorSimulado, jugar


def demo(cat, receta_id, seed, theta=0.8):
    r = cat.receta(receta_id)
    pasos = " → ".join(f"{p.paso}{'(' + ','.join(sorted(p.requiere)) + ')' if p.requiere else ''}" for p in r.pasos)
    print(f"\n=== PARTIDA GUIADA | receta: {r.nombre} {list(r.orden)} | θ inicial = {theta} ===")
    print(f"    pasos (requisitos): {pasos}")
    p = jugar(cat, r, "ig", seed, theta=theta, verbose=True, p_conoce=0.3, p_orden=0.3)
    print(f"\nResultado: errores ingredientes = {p.errores} | errores pasos = {p.errores_pasos} | "
          f"ayudas = {p.ayudas} | turnos = {p.t} | estrellas = {p.estrellas} | θ: {theta:.2f} -> {p.perfil.theta:.2f}")
    return p


def evaluar(cat, n, seed0=42, thetas=(0.35, 0.8)):
    print(f"\n=== EVALUACIÓN: {n} partidas por política y nivel θ "
          "(jugador conoce 40% de los ingredientes y del orden, sigue la pista 85%) ===")
    print(f"{'θ':<6}{'política':<11}{'err.ingr':>9}{'err.pasos':>10}{'turnos':>8}{'pista directa':>15}{'3 estrellas':>13}")
    filas = []
    for th in thetas:
        for pol in ("ig", "aleatoria", "sin_pista"):
            res = [jugar(cat, cat.recetas[k % len(cat.recetas)], pol, seed0 + k, theta=th,
                         p_conoce=0.4, p_orden=0.4, p_sigue=0.85) for k in range(n)]
            assert all(p.terminada for p in res)
            ei = st.mean(p.errores for p in res)
            ep = st.mean(p.errores_pasos for p in res)
            tur = st.mean(p.t for p in res)
            directa = sum(any(h[2].tipo == "PISTA" and h[2].nivel == 3 for h in p.historial) for p in res) / n
            tres = sum(p.estrellas == 3 for p in res) / n
            filas.append((th, pol, ei, ep, tur, directa, tres))
            print(f"{th:<6}{pol:<11}{ei:>9.2f}{ep:>10.2f}{tur:>8.2f}{directa:>15.1%}{tres:>13.1%}")
    return filas


def adaptacion(cat, partidas=12, seed=5):
    """Cómo θ, la despensa y los pasos distractores se adaptan a lo largo de una sesión."""
    print("\n=== ADAPTACIÓN EN UNA SESIÓN (jugador que mejora: conoce 30% → 90%) ===")
    perfil = Perfil()
    tipos = [t.id for t in cat.tipos]
    for k in range(partidas):
        p = Partida(cat, perfil, "ig", random.Random(seed + k))
        p.elige_tipo(tipos[k % len(tipos)])
        nd = len(p.despensa) - len(p.receta.ingredientes)
        npd = len(p.tarjetas_paso) - len(p.receta.pasos)
        q = 0.3 + 0.6 * k / (partidas - 1)
        jug = JugadorSimulado(p.receta, random.Random(100 + k), p_conoce=q, p_orden=q)
        while not p.terminada:
            jug.reacciona(p)
        print(f"  partida {k + 1:>2}: {p.receta.nombre:<22} distractores ingr={nd} pasos={npd}  "
              f"errores={p.errores}+{p.errores_pasos}  θ -> {perfil.theta:.2f}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--receta", default="pizza")
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--evaluar", type=int, default=0)
    a = ap.parse_args()
    cat = Catalogo()
    if a.evaluar:
        evaluar(cat, a.evaluar)
        adaptacion(cat)
    else:
        demo(cat, a.receta, a.seed)
