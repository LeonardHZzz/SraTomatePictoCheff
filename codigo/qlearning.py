import json
import random

ACCIONES = ("animar", "rasgo1", "rasgo2", "rasgo3", "doble", "directa")
NIVEL = {"animar": 0, "rasgo1": 1, "rasgo2": 1, "rasgo3": 1, "doble": 2, "directa": 3}
COSTO = {"animar": 0.0, "rasgo1": 0.1, "rasgo2": 0.1, "rasgo3": 0.1, "doble": 0.4, "directa": 1.0}

R_ACIERTO = 1.0
R_ERROR = -0.5
R_REPITE = -0.4

RASGOS = {
    "INGREDIENTES": {"rasgo1": ("color",), "rasgo2": ("categoria",), "rasgo3": ("origen", "sabor")},
    "PASOS": {"rasgo1": ("herramienta",), "rasgo2": ("objeto",), "rasgo3": ()},
}

FASES = ("INGREDIENTES", "PASOS")
RELACIONES = ("ayuda", "rasgo1", "rasgo2", "rasgo3", "nada", "prematuro")
ULTIMAS = ("ninguna",) + ACCIONES
SEG_LENTO = 8.0

DIMENSIONES = {
    "fase": FASES,
    "errores": ("0", "1", "2", "3+"),
    "nivel": ("bajo", "medio", "alto"),
    "tarjetas": ("1-3", "4-6", "7+"),
    "velocidad": ("rapido", "lento"),
    "ultima": ULTIMAS,
    "relacion": RELACIONES,
    "mejor": ("rasgo1", "rasgo2", "rasgo3", "ninguno"),
}


def n_estados():
    n = 1
    for v in DIMENSIONES.values():
        n *= len(v)
    return n


def discretizar(fase, errores, theta, n_tarjetas, segundos, ultima, relacion, mejor="ninguno"):
    return (
        FASES.index(fase),
        min(errores, 3),
        0 if theta < 0.4 else 1 if theta < 0.7 else 2,
        0 if n_tarjetas <= 3 else 1 if n_tarjetas <= 6 else 2,
        1 if (segundos or 0) > SEG_LENTO else 0,
        ULTIMAS.index(ultima or "ninguna"),
        RELACIONES.index(relacion),
        DIMENSIONES["mejor"].index(mejor),
    )


def clave(estado):
    return "-".join(str(x) for x in estado)


def describir(estado):
    if isinstance(estado, str):
        estado = tuple(int(x) for x in estado.split("-"))
    return {k: v[i] for (k, v), i in zip(DIMENSIONES.items(), estado)}


class TablaQ:
    def __init__(self, q=None, visitas=None, n_sa=None):
        self.q = {k: list(v) for k, v in (q or {}).items()}
        self.visitas = dict(visitas or {})
        self.n_sa = {k: list(v) for k, v in (n_sa or {}).items()}

    def valores(self, s):
        return self.q.get(s, [0.0] * len(ACCIONES))

    def conocido(self, s):
        return self.visitas.get(s, 0) > 0

    def mejor(self, s, mascara):
        v = self.valores(s)
        validas = [i for i, ok in enumerate(mascara) if ok]
        return max(validas, key=lambda i: (v[i], -i))

    def max_valido(self, s, mascara):
        v = self.valores(s)
        return max(v[i] for i, ok in enumerate(mascara) if ok)

    def elegir(self, s, mascara, epsilon=0.0, rng=random):
        if epsilon > 0 and rng.random() < epsilon:
            return rng.choice([i for i, ok in enumerate(mascara) if ok])
        return self.mejor(s, mascara)

    def actualizar(self, s, a, r, s2=None, mascara2=None, alfa=None, gamma=0.9):
        """Q(s,a) ← Q(s,a) + α [r + γ·max_a' Q(s',a') − Q(s,a)]  (sin futuro si s' es terminal).
        Si alfa es None se usa α = 1/(1+n)^0.6, con n = veces que se actualizó (s,a)."""
        fila = self.q.setdefault(s, [0.0] * len(ACCIONES))
        cuenta = self.n_sa.setdefault(s, [0] * len(ACCIONES))
        cuenta[a] += 1
        if alfa is None:
            alfa = 1.0 / (1 + cuenta[a]) ** 0.6
        objetivo = r if s2 is None else r + gamma * self.max_valido(s2, mascara2)
        td = objetivo - fila[a]
        fila[a] += alfa * td
        self.visitas[s] = self.visitas.get(s, 0) + 1
        return td

    def a_dict(self, meta=None):
        return {
            "version": 1,
            "acciones": list(ACCIONES),
            "dimensiones": {k: list(v) for k, v in DIMENSIONES.items()},
            "recompensas": {"acierto": R_ACIERTO, "error": R_ERROR, "repite": R_REPITE, "costo": COSTO},
            "meta": meta or {},
            "q": {k: [round(x, 4) for x in v] for k, v in sorted(self.q.items())},
            "visitas": dict(sorted(self.visitas.items())),
            "n_sa": dict(sorted(self.n_sa.items())),
        }

    def guardar(self, ruta, meta=None):
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(self.a_dict(meta), f, ensure_ascii=False, indent=0)

    @classmethod
    def cargar(cls, ruta):
        with open(ruta, encoding="utf-8") as f:
            d = json.load(f)
        assert list(d["acciones"]) == list(ACCIONES), "La tabla fue entrenada con otras acciones"
        return cls(d["q"], d.get("visitas"), d.get("n_sa"))
