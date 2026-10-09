import random

from agente import Partida, Perfil


class JugadorSimulado:
    def __init__(self, receta, rng, p_conoce=0.5, p_orden=0.5, p_sigue=0.9):
        self.r, self.rng = receta, rng
        self.p_orden, self.p_sigue = p_orden, p_sigue
        self.conoce = {g for g in receta.orden if rng.random() < p_conoce}

    def _sigue_pista(self, p, C):
        if p.accion.tipo == "PISTA" and self.rng.random() < self.p_sigue:
            S = [x for x in p.ultima_pista["S"] if x in C]
            if S:
                return self.rng.choice(S)
        return None

    def reacciona(self, p: Partida):
        """Realiza una acción y devuelve lo que tocó."""
        if p.fase == "INGREDIENTES":
            C = [x for x in p.disponibles() if x not in p.atenuados]
            pick = self._sigue_pista(p, C)
            if pick is None:
                sabe = [g for g in p.faltan() if g in self.conoce]
                pick = self.rng.choice(sabe) if sabe else self.rng.choice(C)
            p.elige(pick)
        elif p.fase == "PASOS":
            C = [x for x in p.tarjetas_disponibles() if x not in p.atenuados]
            pick = self._sigue_pista(p, C)
            if pick is None:
                pick = self.rng.choice(p.pasos_validos()) if self.rng.random() < self.p_orden else self.rng.choice(C)
            p.elige_paso(pick)
        else:  # ACCION: el minijuego se completa
            pick = f"(hace el gesto de {p.paso_activo})"
            p.paso_hecho(segundos=0)
        return pick


def jugar(cat, receta, politica="ig", seed=0, theta=None, verbose=False, imprimir=print,
          p_conoce=0.5, p_orden=0.5, p_sigue=0.9):
    rng = random.Random(seed)
    perfil = Perfil() if theta is None else Perfil(theta)
    p = Partida(cat, perfil, politica, random.Random(seed + 1))
    if verbose:
        _traza(p, imprimir)
    p.elige_tipo(receta.tipo, receta.id)  # el experimento evalúa una receta concreta
    if verbose:
        imprimir(f"  jugador elige el tipo [{receta.tipo}]")
        _traza(p, imprimir)
    jug = JugadorSimulado(receta, rng, p_conoce, p_orden, p_sigue)
    guard = 0
    while not p.terminada and guard < 120:
        guard += 1
        g = jug.reacciona(p)
        if verbose:
            imprimir(f"  jugador toca [{g}]")
            _traza(p, imprimir)
    return p


def _traza(p, imprimir):
    a = p.accion
    extra = ""
    if p.fase == "INGREDIENTES":
        extra = f" | plato={p.X} descartados={sorted(p.W)} |C|={len(p.disponibles())}"
    elif p.fase in ("PASOS", "ACCION", "VICTORIA"):
        extra = f" | pasos hechos={p.Y} válidos={p.pasos_validos()} tarjetas={len(p.tarjetas_disponibles())}"
    imprimir(f"  [t={p.t:>2}] {p.fase:<12} h={p.h}{extra}")
    if a.tipo == "PISTA" and p.ultima_pista and p.ultima_pista.get("g"):
        u = p.ultima_pista
        imprimir(f"        pista -> objetivo={u['g']} atributos={list(u['A'])} |S|={len(u['S'])} IG={u['ig']:.2f} bits")
    imprimir(f"        SRA. TOMATE -> {a.tipo:<19} pictos={a.filas}  voz: \"{a.texto}\"")
