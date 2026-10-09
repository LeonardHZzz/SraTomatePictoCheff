"""PictoChef · Motor de decisión de la Sra. Tomate (Modalidad 1)
Espejo exacto de codigo/juego/js/agente.js.
"""
import math
import random
import time
from dataclasses import dataclass, field
from datetime import datetime

from catalogo import ATRIBUTOS, Catalogo

H_MAX = 3
ALPHA = 0.3
META = 0.7
THETA0 = 0.35
D_MIN, D_MAX = 2, 6
ATRIBUTOS_PASO = ("herramienta", "objeto")

DEF = {"un": "el", "una": "la", "unos": "los", "unas": "las"}

FRASES = {
    "acierto": ["¡Sí! {G} va {enR}.", "¡Muy bien! {G}.", "¡Eso es! Necesitamos {g}.",
                "¡Correcto! {G} va aquí.", "¡Bien hecho! {G}."],
    "error": ["Mmm… {g} no va {enR}.", "{G} no va aquí.", "Ese no es. {G} no va {enR}.",
              "Casi. {G} no va {enR}."],
    "pista": ["Te doy una pista.", "Mira esta pista.", "Escucha la pista.", "Yo te ayudo."],
    "pasoOk": ["¡Sí! Ahora vamos a {p}.", "¡Muy bien! Es momento de {p}.", "¡Eso es! Vamos a {p}."],
    "siguiente": ["¡Muy bien! ¿Qué hacemos después?", "¡Excelente! ¿Y ahora qué hacemos?",
                  "¡Qué bien lo haces! ¿Cuál es el siguiente paso?"],
    "victoria": ["¡Felicidades! Preparaste {unR}. ¡Qué rico!",
                 "¡Lo lograste! Terminaste {unR}. ¡Ñam, ñam!",
                 "¡Excelente! Cocinaste {unR}. ¡Delicioso!"],
}

FRAG = {
    "categoria": {"fruta": "que sea una fruta", "verdura": "que sea una verdura", "carne": "que sea carne",
                  "lacteo": "que sea un lácteo", "cereal": "que sea un cereal", "bebida": "que sea para tomar"},
    "origen": {"vaca": "que viene de la vaca", "gallina": "que viene de la gallina", "cerdo": "que viene del cerdo",
               "arbol": "que crece en un árbol", "huerto": "que crece en el huerto"},
    "sabor": {"dulce": "que sea dulce", "acido": "que sea ácido"},
    "herramienta": {"agua": "con agua", "cuchillo": "con el cuchillo", "bol": "en el bol", "olla": "en la olla",
                    "fuego": "en el fuego", "horno": "en el horno", "batidora": "con la licuadora",
                    "mano": "con las manos", "rodillo": "con el rodillo", "plato": "en el plato"},
}


def cap(s):
    return s[:1].upper() + s[1:]


def lista(xs):
    return "".join(xs) if len(xs) <= 1 else ", ".join(xs[:-1]) + " y " + xs[-1]


@dataclass
class Accion:
    tipo: str
    texto: str = ""
    filas: list = field(default_factory=list)
    sprite: str = "idle"
    nivel: int = 0
    ingrediente: str = None
    paso: str = None
    receta: str = None
    error: str = None


@dataclass
class Pista:
    g: str
    A: tuple
    vals: tuple
    S: list
    ig: float
    prec: float

    @property
    def clave(self):
        return f"{self.g}|{'+'.join(self.A)}"


@dataclass
class DefPaso:
    paso: str
    objetos: tuple
    requiere: frozenset
    sobre: str = None
    distractor: bool = False


def tabla_pistas(C, objetivos, attr, atributos, n_attrs=1, dificultad=lambda g: 0):
    """Motor genérico de pistas (ingredientes y pasos).
    IG(g, A) = log2|C| − log2|S|, S = {x ∈ C : x comparte con g los atributos A}."""
    filas = []
    for g in objetivos:
        attrs = [a for a in atributos if attr(g, a)]
        combos = [(a,) for a in attrs] if n_attrs == 1 else \
            [(a, b) for i, a in enumerate(attrs) for b in attrs[i + 1:]]
        for A in combos:
            S = [x for x in C if all(attr(x, a) == attr(g, a) for a in A)]
            if not S:
                continue
            corr = sum(1 for x in S if x in objetivos)
            filas.append(Pista(g, A, tuple(attr(g, a) for a in A), S,
                               math.log2(len(C)) - math.log2(len(S)), corr / len(S)))
    filas.sort(key=lambda f: (-f.ig, -f.prec, min(atributos.index(a) for a in f.A), dificultad(f.g)))
    return filas


class Perfil:
    """Modelo del jugador entre partidas: habilidad θ ∈ [0, 1]."""

    def __init__(self, theta=THETA0, jugadas=None):
        self.theta = theta
        self.jugadas = dict(jugadas or {})
        self.partidas = []

    def actualizar(self, r, faltas, ayudas):
        n = len(r.ingredientes) + len(r.pasos)
        perf = n / (n + faltas + 0.5 * ayudas)
        antes = self.theta
        self.theta = min(1.0, max(0.0, self.theta + ALPHA * (perf - META)))
        self.jugadas[r.id] = self.jugadas.get(r.id, 0) + 1
        self.partidas.append(dict(receta=r.id, faltas=faltas, ayudas=ayudas, perf=perf,
                                  theta_antes=antes, theta=self.theta))
        return perf, antes


class Partida:
    def __init__(self, cat: Catalogo, perfil: Perfil = None, politica="ig", rng=None, sin_color=False):
        self.cat = cat
        self.perfil = perfil or Perfil()
        self.politica = politica  # "ig" | "aleatoria" | "sin_pista"
        self.rng = rng or random.Random()
        self.sin_color = sin_color
        self.usadas = {}
        self.historial = []
        self.iniciar()

    # ------------------------------------------------------------------
    def iniciar(self):
        self.fase = "TIPO"
        self.tipo = self.receta = None
        self.despensa = []
        self.X, self.W = [], set()
        self.Y, self.Wp = [], set()
        self.tarjetas_paso, self.defs = [], {}
        self.paso_activo = None
        self.h = self.errores = self.errores_pasos = self.ayudas = self.ayudas_motoras = self.t = 0
        self.motricidad = []
        self.pistas_usadas = set()
        self.atenuados = set()
        self.resaltado = None
        self.ultima_pista = None
        self.estrellas = 0
        self.terminada = False
        self.inicio = None
        self.resumen = None
        self.accion = Accion(
            "PREGUNTA_TIPO",
            "¿Qué tipo de platillo quieres preparar? Elige: desayuno, almuerzo, postre, bebida o lonche.",
            [["pregunta", "elegir", "plato"]], "pregunta",
        )
        self._log()
        return self.accion

    # --- lenguaje -------------------------------------------------------
    def _el(self, g):
        i = self.cat.ingredientes[g]
        return f"{i.articulo} {i.nombre}"

    def _el_rec(self, r):
        return f"{DEF[r.articulo]} {r.nombre}"

    def _vars(self, g=None):
        v = {}
        r = self.receta
        if r:
            el_r, un_r = self._el_rec(r), f"{r.articulo} {r.nombre}"
            v.update(r=el_r, enR=f"en el {r.nombre}" if DEF[r.articulo] == "el" else f"en {el_r}",
                     unR=un_r, UnR=cap(un_r))
        if g:
            v.update(g=self._el(g), G=cap(self._el(g)))
        return v

    def desc_paso(self, d):
        verbo = self.cat.pasos[d.paso].nombre
        if not d.objetos:
            obj = self._el_rec(self.receta)
        elif len(d.objetos) >= 3:
            obj = "todo"
        else:
            obj = lista([self._el(g) for g in d.objetos])
        sobre = f" en {self._el(d.sobre)}" if d.sobre else ""
        return f"{verbo} {obj}{sobre}".strip()

    def _frase(self, clave, vars_):
        pool = FRASES[clave]
        usadas = self.usadas.setdefault(clave, [])
        libres = [i for i in range(len(pool)) if i not in usadas]
        if not libres:
            usadas.clear()
            libres = list(range(len(pool)))
        i = libres[int(self.rng.random() * len(libres))]
        usadas.append(i)
        txt = pool[i]
        for k, val in vars_.items():
            txt = txt.replace("{" + k + "}", val)
        return txt

    def _fragmento(self, a, v):
        if a == "color":
            return f"de color {self.cat.nombre_atributo(a, v)}"
        if a == "objeto":
            return f"con {self._el(v)}"
        return FRAG[a].get(v, v)

    def _picto_valor(self, a, v):
        if a == "herramienta":
            return f"herr_{v}"
        if a == "objeto":
            return v
        return self.cat.picto_atributo(a, v)

    def _log(self):
        self.historial.append((self.t, self.fase, self.accion))

    # --- consultas --------------------------------------------------------
    def attr(self, g, a):
        return self.cat.ingredientes[g].atributo(a)

    def attr_paso(self, pid, a):
        d = self.defs.get(pid)
        if not d:
            return None
        if a == "herramienta":
            return self.cat.pasos[d.paso].herramienta
        if a == "objeto":
            return d.objetos[0] if d.objetos else None
        return None

    def atributos_ing(self):
        return tuple(a for a in ATRIBUTOS if not (self.sin_color and a == "color"))

    def faltan(self):
        return [g for g in self.receta.orden if g not in self.X] if self.receta else []

    def disponibles(self):
        return [x for x in self.despensa if x not in self.X and x not in self.W]

    def pasos_validos(self):
        if not self.receta:
            return []
        return [p.paso for p in self.receta.pasos if p.paso not in self.Y and p.requiere <= set(self.Y)]

    def tarjetas_disponibles(self):
        return [x for x in self.tarjetas_paso if x not in self.Y and x not in self.Wp]

    # --- 1. tipo → receta + despensa + pasos ------------------------------------
    def elige_tipo(self, tipo, receta_id=None):
        """receta_id solo se usa en experimentos para fijar la receta a evaluar."""
        if self.fase != "TIPO":
            return self.accion
        self.tipo = tipo
        self.receta = self.cat.receta(receta_id) if receta_id else self._elegir_receta(tipo)
        self.despensa = self._armar_despensa(self.receta)
        self._armar_pasos(self.receta)
        self.fase = "INGREDIENTES"
        self.inicio = time.time()
        self.t += 1
        r = self.receta
        v = self._vars()
        self.accion = Accion(
            "PRESENTA_RECETA",
            f"¡Vamos a preparar {v['unR']}! Para {v['r']} necesitas {len(r.ingredientes)} ingredientes. "
            "Búscalos en la despensa.",
            [["preparar", f"plato_{r.id}"], ["necesitar", "ingredientes", "buscar"]], "pregunta", receta=r.id,
        )
        self._log()
        return self.accion

    def _elegir_receta(self, tipo):
        th = self.perfil.theta
        return min(
            self.cat.recetas_de(tipo),
            key=lambda r: abs(self.cat.dificultad_receta(r) - th)
            + 0.6 * self.perfil.jugadas.get(r.id, 0) + 0.15 * self.rng.random(),
        )

    def _similitud(self, x, r):
        return max(sum(1 for a in ATRIBUTOS if self.attr(x, a) and self.attr(x, a) == self.attr(g, a))
                   for g in r.ingredientes)

    def _armar_despensa(self, r):
        th = self.perfil.theta
        nd = round(D_MIN + th * (D_MAX - D_MIN))
        cand = [(x, self._similitud(x, r) + 0.9 * self.rng.random())
                for x in self.cat.ingredientes if x not in r.ingredientes]
        cand.sort(key=lambda c: c[1], reverse=th >= 0.5)
        todo = list(r.orden) + [x for x, _ in cand[:nd]]
        self.rng.shuffle(todo)
        return todo

    def _armar_pasos(self, r):
        """Pasos de la receta + distractores (θ ≥ 0.4: 1, θ ≥ 0.75: 2)."""
        self.defs = {p.paso: DefPaso(p.paso, p.objetos, p.requiere, p.sobre) for p in r.pasos}
        th = self.perfil.theta
        nd = 2 if th >= 0.75 else 1 if th >= 0.4 else 0
        cand = [k for k in self.cat.pasos if k not in self.defs]
        self.rng.shuffle(cand)
        for k in cand[:nd]:
            g = r.orden[int(self.rng.random() * len(r.orden))]
            sin_obj = self.cat.pasos[k].gesto == "servir" or k in ("hornear", "freir")
            self.defs[k] = DefPaso(k, () if sin_obj else (g,), frozenset(), None, True)
        self.tarjetas_paso = list(self.defs)
        self.rng.shuffle(self.tarjetas_paso)

    # --- 2. INGREDIENTES ---------------------------------------------------------
    def elige(self, g):
        if self.fase != "INGREDIENTES" or g in self.X or g in self.W:
            return self.accion
        self.t += 1
        if g in self.receta.ingredientes:
            self.X.append(g)
            self._limpiar_ayuda()
            if not self.faltan():
                self.fase = "PASOS"
                self.accion = Accion(
                    "INGREDIENTES_LISTOS",
                    f"¡Tenemos todos los ingredientes! Ahora vamos a preparar {self._el_rec(self.receta)}. "
                    "¿Qué hacemos primero?",
                    [["si", "ingredientes"], ["primero", "pregunta"]], "come", ingrediente=g)
            else:
                f = len(self.faltan())
                resto = "Falta 1 ingrediente." if f == 1 else f"Faltan {f} ingredientes."
                self.accion = Accion("ACIERTO", f"{self._frase('acierto', self._vars(g))} {resto}",
                                     [["si", g]], "come", ingrediente=g)
        else:
            self.W.add(g)
            self.errores += 1
            self.h = min(self.h + 1, H_MAX)
            self.accion = self._pista(error=g)
        self._log()
        return self.accion

    # --- 3. PASOS -----------------------------------------------------------------
    def elige_paso(self, pid):
        if self.fase != "PASOS" or pid in self.Y or pid in self.Wp or pid not in self.defs:
            return self.accion
        self.t += 1
        d = self.defs[pid]
        if pid in self.pasos_validos():
            self._limpiar_ayuda()
            self.fase = "ACCION"
            self.paso_activo = pid
            self.inicio_paso = time.time()
            p = self.desc_paso(d)
            fila = [f"paso_{pid}"] + list(d.objetos[:3]) + ([d.sobre] if d.sobre else [])
            self.accion = Accion("PASO_OK", f"{self._frase('pasoOk', {'p': p})} {self.cat.pasos[pid].instruccion}.",
                                 [fila], "idle", paso=pid)
        else:
            self.errores_pasos += 1
            if d.distractor:
                self.Wp.add(pid)
            self.h = min(self.h + 1, H_MAX)
            self.accion = self._pista_paso(pid)
        self._log()
        return self.accion

    def paso_hecho(self, segundos=None, ayuda=False, precision=None):
        """La interfaz avisa que el minijuego del paso activo terminó."""
        if self.fase != "ACCION":
            return self.accion
        pid = self.paso_activo
        self.Y.append(pid)
        self.paso_activo = None
        if ayuda:
            self.ayudas_motoras += 1
        seg = segundos if segundos is not None else time.time() - self.inicio_paso
        self.motricidad.append(dict(paso=pid, segundos=seg, ayuda=ayuda, precision=precision))
        if len(self.Y) == len(self.receta.pasos):
            return self._victoria()
        self.fase = "PASOS"
        self.t += 1
        self.accion = Accion("SIGUIENTE_PASO", self._frase("siguiente", {}),
                             [["bien", f"paso_{pid}"], ["despues", "pregunta"]], "pregunta", paso=pid)
        self._log()
        return self.accion

    # --- AYUDA ----------------------------------------------------------------------
    def ayuda(self, auto=False):
        if self.fase not in ("INGREDIENTES", "PASOS"):
            return self.accion
        self.t += 1
        self.ayudas += 1
        self.h = min(self.h + 1, H_MAX)
        self.accion = self._pista(auto=auto) if self.fase == "INGREDIENTES" else self._pista_paso(None, auto)
        self._log()
        return self.accion

    def _limpiar_ayuda(self):
        self.h = 0
        self.atenuados = set()
        self.resaltado = None

    # --- motor de pistas -------------------------------------------------------------
    def _elegir(self, tabla):
        if not tabla:
            return None
        libres = [f for f in tabla if f.clave not in self.pistas_usadas] or tabla
        if self.politica == "aleatoria":
            return libres[int(self.rng.random() * len(libres))]
        return libres[0]

    def _construir_pista(self, C, objetivos, attr, atributos, dificultad, frag_fn, directa):
        nivel, tabla, sel = self.h, [], None
        if nivel in (1, 2):
            if nivel == 2:
                tabla = tabla_pistas(C, objetivos, attr, atributos, 2, dificultad)
                sel = self._elegir(tabla)
            if sel is None:
                tabla = tabla_pistas(C, objetivos, attr, atributos, 1, dificultad)
                sel = self._elegir(tabla)
        if self.politica == "sin_pista" and nivel < 3:
            self.atenuados, self.resaltado = set(), None
            self.ultima_pista = dict(nivel=nivel, g=None, A=(), S=list(C), ig=0.0, tabla=[])
            return nivel, ["intentar"], "Intenta otra vez."
        if nivel < 3 and sel is None:
            nivel = 3
        if nivel == 3:
            g = min(objetivos, key=dificultad)
            self.resaltado = g
            self.atenuados = {x for x in C if x != g}
            self.ultima_pista = dict(nivel=3, g=g, A=(), S=[g], ig=math.log2(max(1, len(C))), tabla=[])
            fila, frase = directa(g)
            return nivel, fila, frase
        self.pistas_usadas.add(sel.clave)
        self.resaltado = None
        self.atenuados = {x for x in C if x not in sel.S} if nivel >= 2 else set()
        self.ultima_pista = dict(nivel=nivel, g=sel.g, A=sel.A, S=sel.S, ig=sel.ig, tabla=tabla[:6])
        return nivel, ["buscar"] + [self._picto_valor(a, v) for a, v in zip(sel.A, sel.vals)], frag_fn(sel)

    def _pista(self, error=None, auto=False):
        filas, partes = [], []
        if error:
            filas.append(["no", error])
            partes.append(self._frase("error", self._vars(error)))
        elif auto:
            partes.append("¿Te ayudo?")
        partes.append(self._frase("pista", {}))
        nivel, fila, frase = self._construir_pista(
            self.disponibles(), self.faltan(), self.attr, self.atributos_ing(),
            lambda g: self.cat.ingredientes[g].dificultad,
            lambda s: "Busca algo " + " y ".join(self._fragmento(a, v) for a, v in zip(s.A, s.vals)) + ".",
            lambda g: (["buscar", g], f"¡Es {self._el(g)}! Tócalo."),
        )
        filas.append(fila)
        if fila[0] == "intentar":
            partes[-1] = frase
        else:
            partes.append(frase)
        return Accion("PISTA", " ".join(partes), filas, "pregunta", nivel=nivel,
                      ingrediente=self.ultima_pista["g"], error=error)

    def _pista_paso(self, error_id=None, auto=False):
        r = self.receta
        filas, partes = [], []
        if error_id:
            d = self.defs[error_id]
            filas.append(["no", f"paso_{error_id}"])
            if d.distractor:
                para = f"para el {r.nombre}" if DEF[r.articulo] == "el" else f"para {self._el_rec(r)}"
                partes.append(f"{cap(para)} no hay que {self.desc_paso(d)}.")
            else:
                partes.append(f"Todavía no podemos {self.desc_paso(d)}.")
        elif auto:
            partes.append("¿Te ayudo?")
        partes.append(self._frase("pista", {}))
        orden = [p.paso for p in r.pasos]
        nivel, fila, frase = self._construir_pista(
            self.tarjetas_disponibles(), self.pasos_validos(), self.attr_paso, ATRIBUTOS_PASO,
            lambda pid: orden.index(pid) if pid in orden else 99,
            lambda s: "Primero hay que hacer algo " + " y ".join(self._fragmento(a, v) for a, v in zip(s.A, s.vals)) + ".",
            lambda pid: (["primero", f"paso_{pid}"], f"¡Hay que {self.desc_paso(self.defs[pid])}! Tócalo."),
        )
        filas.append(["primero"] + fila[1:] if fila[0] == "buscar" else fila)
        if fila[0] == "intentar":
            partes[-1] = frase
        else:
            partes.append(frase)
        return Accion("PISTA", " ".join(partes), filas, "pregunta", nivel=nivel,
                      paso=self.ultima_pista["g"], error=error_id)

    # --- 4. victoria ---------------------------------------------------------------
    def _victoria(self):
        r = self.receta
        self.fase = "VICTORIA"
        self.terminada = True
        self._limpiar_ayuda()
        faltas = self.errores + self.errores_pasos
        total = faltas + self.ayudas
        self.estrellas = 3 if total == 0 else 2 if total <= 2 else 1
        perf, antes = self.perfil.actualizar(r, faltas, self.ayudas)
        self.resumen = dict(
            fecha=datetime.now().isoformat(timespec="seconds"), receta=r.id, tipo=r.tipo,
            estrellas=self.estrellas, errores_ingredientes=self.errores, errores_pasos=self.errores_pasos,
            ayudas=self.ayudas, ayudas_motoras=self.ayudas_motoras,
            segundos=round(time.time() - self.inicio) if self.inicio else 0,
            desempeno=round(perf, 2), theta_antes=round(antes, 2), theta=round(self.perfil.theta, 2),
            motricidad=self.motricidad,
        )
        self.accion = Accion("VICTORIA", self._frase("victoria", self._vars()),
                             [["bien", f"plato_{r.id}"]], "fiesta", receta=r.id)
        self._log()
        return self.accion
