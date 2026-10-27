import random

import qlearning as ql
from agente import Partida, Perfil


# Jugadores simulados con perfil (entrenamiento y evaluación de TutorIA)
PERFILES = {
    "visual": dict(p_conoce=0.45, p_orden=0.45, p_distrae=0.2, p_impulso=0.05, p_ayuda=0.1, confunde="color",
                   entiende=dict(color=0.95, categoria=0.35, origen=0.4, sabor=0.45, herramienta=0.85, objeto=0.9)),
    "conceptual": dict(p_conoce=0.45, p_orden=0.5, p_distrae=0.2, p_impulso=0.05, p_ayuda=0.1, confunde="categoria",
                       entiende=dict(color=0.55, categoria=0.9, origen=0.85, sabor=0.8, herramienta=0.9, objeto=0.75)),
    "daltonico": dict(p_conoce=0.5, p_orden=0.5, p_distrae=0.2, p_impulso=0.05, p_ayuda=0.1, confunde="categoria", sin_color=True,
                      entiende=dict(color=0.05, categoria=0.8, origen=0.8, sabor=0.8, herramienta=0.8, objeto=0.85)),
    "impulsivo": dict(p_conoce=0.4, p_orden=0.35, p_distrae=0.15, p_impulso=0.35, p_ayuda=0.02, confunde=None,
                      entiende=dict(color=0.65, categoria=0.65, origen=0.65, sabor=0.65, herramienta=0.65, objeto=0.65)),
    "inicial": dict(p_conoce=0.2, p_orden=0.25, p_distrae=0.25, p_impulso=0.1, p_ayuda=0.3, confunde="color",
                    entiende=dict(color=0.7, categoria=0.3, origen=0.25, sabor=0.3, herramienta=0.6, objeto=0.8)),
}


class JugadorPerfil:
    """Jugador simulado con un perfil de PERFILES. reacciona() devuelve (lo que tocó, segundos)."""

    def __init__(self, receta, rng, perfil):
        self.r, self.rng, self.nombre = receta, rng, perfil
        self.pf = PERFILES[perfil]
        self.conoce = {g for g in receta.orden if rng.random() < self.pf["p_conoce"]}
        self.conoce_pasos = {p.paso for p in receta.pasos if rng.random() < self.pf["p_orden"]}

    def _entiende(self, A):
        if not A:
            return False
        p_no = 1.0
        for a in A:
            p_no *= 1 - self.pf["entiende"].get(a, 0.5)
        return self.rng.random() < 1 - p_no

    def _confusion(self, p, C, M):
        c = self.pf["confunde"]
        if c and self.rng.random() < 0.75:
            cand = [x for x in C if p.attr(x, c) and any(p.attr(x, c) == p.attr(g, c) for g in M)]
            if cand:
                return self.rng.choice(cand)
        return self.rng.choice(C)

    def reacciona(self, p: Partida):
        u = self.rng.uniform
        if p.fase == "ACCION":
            p.paso_hecho(segundos=0)
            return f"(gesto {p.Y[-1]})", 0.0
        pista = p.ultima_pista if p.accion.tipo == "PISTA" else None
        tipo = pista.get("tipo") if pista else None
        if p.fase == "INGREDIENTES":
            C = [x for x in p.disponibles() if x not in p.atenuados]
            M = p.faltan()
            sabe = [g for g in M if g in self.conoce]
        else:
            C = [x for x in p.tarjetas_disponibles() if x not in p.atenuados]
            M = p.pasos_validos()
            sabe = [x for x in M if x in self.conoce_pasos]
        if not sabe and tipo is None and self.rng.random() < self.pf["p_ayuda"]:
            seg = u(8, 15)
            p.ayuda(segundos=seg)
            return "AYUDA", seg
        if self.rng.random() < self.pf["p_impulso"]:
            pick, seg = self.rng.choice(C), u(1, 3)
        elif tipo == "directa" and pista["S"][0] in C:
            pick, seg = pista["S"][0], u(2, 4)
        elif pista and pista["A"] and self._entiende(pista["A"]):
            S = [x for x in pista["S"] if x in C] or C
            pick, seg = self.rng.choice(S), u(3, 6)
        else:
            distraido = tipo != "animar" and self.rng.random() < self.pf["p_distrae"]
            if sabe and not distraido:
                pick, seg = self.rng.choice(sabe), u(2, 5)
            elif p.fase == "INGREDIENTES":
                pick, seg = self._confusion(p, C, M), (u(1.5, 3.5) if distraido else u(7, 14))
            else:
                pick, seg = self.rng.choice(C), (u(1.5, 3.5) if distraido else u(7, 14))
        if p.fase == "INGREDIENTES":
            p.elige(pick, segundos=seg)
        else:
            p.elige_paso(pick, segundos=seg)
        return pick, seg


def jugar_perfil(cat, receta, perfil, politica="ig", seed=0, theta=0.5, tabla_q=None, aprender=False,
                 epsilon=0.0, alfa=None, gamma=0.9, verbose=False, imprimir=print):
    rng = random.Random(seed)
    sin_color = PERFILES[perfil].get("sin_color", False)
    p = Partida(cat, Perfil(theta), politica, random.Random(seed + 1), sin_color=sin_color,
                tabla_q=tabla_q, aprender=aprender, epsilon=epsilon, alfa=alfa, gamma=gamma)
    p.elige_tipo(receta.tipo, receta.id)
    jug = JugadorPerfil(receta, rng, perfil)
    if verbose:
        imprimir(f"=== {receta.nombre} · perfil {perfil} · θ={theta:.2f} · política {politica} ===")
        imprimir(f"    despensa: {p.despensa}")
    guard = 0
    while not p.terminada and guard < 150:
        guard += 1
        n = len(p.decisiones)
        g, seg = jug.reacciona(p)
        if verbose:
            imprimir(f"  jugador -> {g} ({seg:.1f}s)")
            if len(p.decisiones) > n:
                d = p.decisiones[-1]
                imprimir(f"     estado {d['estado']} {ql.describir(d['estado'])}")
                imprimir(f"     Q={d['q']}  -> acción {d['accion']}{' (defecto)' if d['defecto'] else ''}")
                imprimir(f"     Sra. Tomate: {p.accion.texto}")
    if verbose:
        imprimir(f"  retorno={p.retorno:.2f} errores={p.errores}+{p.errores_pasos} directa={p.uso_directa}")
    return p
