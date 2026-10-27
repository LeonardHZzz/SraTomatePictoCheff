import math
import random
import time
from dataclasses import dataclass, field
from datetime import datetime

import qlearning as ql
from catalogo import ATRIBUTOS, Catalogo

H_MAX = 3
ALPHA = 0.3
META = 0.7
THETA0 = 0.35
D_MIN, D_MAX = 2, 5
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
    def __init__(self, cat: Catalogo, perfil: Perfil = None, politica="ig", rng=None, sin_color=False,
                 tabla_q=None, aprender=False, epsilon=0.0, alfa=None, gamma=0.9):
        self.cat = cat
        self.perfil = perfil or Perfil()
        self.politica = politica  # "ig" | "aleatoria" | "sin_pista" | "q"
        self.rng = rng or random.Random()
        self.sin_color = sin_color
        self.tabla_q = tabla_q
        self.aprender = aprender and tabla_q is not None
        self.epsilon, self.alfa, self.gamma = epsilon, alfa, gamma
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
        self.err_seg = 0
        self.ultima_q = None
        self.pendiente = None
        self.uso_directa = False
        self.retorno = 0.0
        self.costo_ayuda = 0.0
        self.decisiones = []
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
    def elige(self, g, segundos=None):
        if self.fase != "INGREDIENTES" or g in self.X or g in self.W:
            return self.accion
        self.t += 1
        acierto = g in self.receta.ingredientes
        self._resultado(acierto)
        if acierto:
            self.X.append(g)
            self._limpiar_ayuda()
            self.err_seg, self.ultima_q = 0, None
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
            relacion = self._relacion_ing(g)
            self.W.add(g)
            self.errores += 1
            self.err_seg += 1
            if self.politica != "q":
                self.h = min(self.h + 1, H_MAX)
            self.accion = self._pista(error=g, relacion=relacion, segundos=segundos)
        self._log()
        return self.accion

    # --- 3. PASOS -----------------------------------------------------------------
    def elige_paso(self, pid, segundos=None):
        if self.fase != "PASOS" or pid in self.Y or pid in self.Wp or pid not in self.defs:
            return self.accion
        self.t += 1
        d = self.defs[pid]
        acierto = pid in self.pasos_validos()
        self._resultado(acierto)
        if acierto:
            self._limpiar_ayuda()
            self.err_seg, self.ultima_q = 0, None
            self.fase = "ACCION"
            self.paso_activo = pid
            self.inicio_paso = time.time()
            p = self.desc_paso(d)
            fila = [f"paso_{pid}"] + list(d.objetos[:3]) + ([d.sobre] if d.sobre else [])
            self.accion = Accion("PASO_OK", f"{self._frase('pasoOk', {'p': p})} {self.cat.pasos[pid].instruccion}.",
                                 [fila], "idle", paso=pid)
        else:
            relacion = self._relacion_paso(pid)
            self.errores_pasos += 1
            self.err_seg += 1
            if d.distractor:
                self.Wp.add(pid)
            if self.politica != "q":
                self.h = min(self.h + 1, H_MAX)
            self.accion = self._pista_paso(pid, relacion=relacion, segundos=segundos)
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
    def ayuda(self, auto=False, segundos=None):
        if self.fase not in ("INGREDIENTES", "PASOS"):
            return self.accion
        self.t += 1
        self.ayudas += 1
        if self.politica != "q":
            self.h = min(self.h + 1, H_MAX)
        if self.fase == "INGREDIENTES":
            self.accion = self._pista(auto=auto, relacion="ayuda", segundos=segundos)
        else:
            self.accion = self._pista_paso(None, auto, relacion="ayuda", segundos=segundos)
        self._log()
        return self.accion

    def _limpiar_ayuda(self):
        self.h = 0
        self.atenuados = set()
        self.resaltado = None

    # --- Q-Learning: estado, máscara, relación del error y recompensas --------------------
    def _atributos_fase(self, fase):
        return self.atributos_ing() if fase == "INGREDIENTES" else ATRIBUTOS_PASO

    def _attrs_rasgo(self, fase, rasgo):
        permitidos = self._atributos_fase(fase)
        return tuple(a for a in ql.RASGOS[fase][rasgo] if a in permitidos)

    def mascara_q(self, fase, objetivos, attr):
        permitidos = self._atributos_fase(fase)
        m = []
        for nombre in ql.ACCIONES:
            if nombre in ("animar", "directa"):
                ok = True
            elif nombre == "doble":
                ok = any(sum(1 for a in permitidos if attr(g, a)) >= 2 for g in objetivos)
            else:
                attrs = self._attrs_rasgo(fase, nombre)
                ok = any(attr(g, a) for g in objetivos for a in attrs)
            m.append(ok)
        return m

    def _relacion_ing(self, x):
        M = self.faltan()
        for rasgo in ("rasgo1", "rasgo2", "rasgo3"):
            for a in ql.RASGOS["INGREDIENTES"][rasgo]:
                v = self.attr(x, a)
                if v and any(self.attr(g, a) == v for g in M):
                    return rasgo
        return "nada"

    def _relacion_paso(self, pid):
        if not self.defs[pid].distractor:
            return "prematuro"
        V = self.pasos_validos()
        for rasgo in ("rasgo1", "rasgo2"):
            a = ql.RASGOS["PASOS"][rasgo][0]
            v = self.attr_paso(pid, a)
            if v and any(self.attr_paso(q, a) == v for q in V):
                return rasgo
        return "nada"

    def _mejor_rasgo(self, fase, C, objetivos, attr, mascara, dificultad):
        """Rasgo (entre las acciones válidas) cuya mejor pista de un atributo tiene mayor ganancia de información."""
        for f in tabla_pistas(C, objetivos, attr, self._atributos_fase(fase), 1, dificultad):
            for rasgo in ("rasgo1", "rasgo2", "rasgo3"):
                if mascara[ql.ACCIONES.index(rasgo)] and f.A[0] in ql.RASGOS[fase][rasgo]:
                    return rasgo
        return "ninguno"

    def estado_q(self, fase, relacion, segundos, n_tarjetas, mejor="ninguno"):
        return ql.discretizar(fase, self.err_seg, self.perfil.theta, n_tarjetas, segundos, self.ultima_q,
                              relacion, mejor)

    def _resultado(self, acierto):
        """Primera elección después de una pista: +1 si acierta, −0,3 si se equivoca."""
        p = self.pendiente
        if p and not p["resuelta"]:
            r = ql.R_ACIERTO if acierto else ql.R_ERROR
            p["r"] += r
            p["resuelta"] = True
            self.retorno += r
            self.decisiones[-1]["resultado"] = "acierto" if acierto else "error"

    def _accion_defecto(self, fase, C, objetivos, attr, mascara, dificultad):
        """Estado nunca visto en el entrenamiento: misma escalera que la política base."""
        if self.err_seg >= 3:
            return ql.ACCIONES.index("directa")
        if self.err_seg == 2 and mascara[ql.ACCIONES.index("doble")]:
            return ql.ACCIONES.index("doble")
        tabla = tabla_pistas(C, objetivos, attr, self._atributos_fase(fase), 1, dificultad)
        for f in tabla:
            for rasgo in ("rasgo1", "rasgo2", "rasgo3"):
                i = ql.ACCIONES.index(rasgo)
                if mascara[i] and f.A[0] in ql.RASGOS[fase][rasgo]:
                    return i
        return ql.ACCIONES.index("directa")

    def _decidir_q(self, fase, C, objetivos, attr, relacion, segundos, dificultad):
        m = self.mascara_q(fase, objetivos, attr)
        s = self.estado_q(fase, relacion, segundos, len(C), self._mejor_rasgo(fase, C, objetivos, attr, m, dificultad))
        k = ql.clave(s)
        if self.aprender:
            return k, m, self.tabla_q.elegir(k, m, self.epsilon, self.rng), False
        if self.tabla_q is not None and self.tabla_q.conocido(k):
            return k, m, self.tabla_q.mejor(k, m), False
        return k, m, self._accion_defecto(fase, C, objetivos, attr, m, dificultad), True

    def _registrar_q(self, k, m, a, defecto=False):
        if self.pendiente and self.aprender:
            p = self.pendiente
            self.tabla_q.actualizar(p["s"], p["a"], p["r"], k, m, self.alfa, self.gamma)
        nombre = ql.ACCIONES[a]
        r0 = -ql.COSTO[nombre] + (ql.R_REPITE if nombre == self.ultima_q else 0.0)
        self.retorno += r0
        self.costo_ayuda += ql.COSTO[nombre]
        self.pendiente = dict(s=k, a=a, r=r0, resuelta=False)
        self.ultima_q = nombre
        if nombre == "directa":
            self.uso_directa = True
        valores = self.tabla_q.valores(k) if self.tabla_q is not None else None
        self.decisiones.append(dict(estado=k, accion=nombre, defecto=defecto, mascara=m,
                                    q=[round(v, 3) for v in valores] if valores else None, resultado=None))

    def _cerrar_q(self):
        """Fin de la receta: la última decisión se actualiza sin valor futuro (estado terminal)."""
        p = self.pendiente
        if not p:
            return
        if self.aprender:
            self.tabla_q.actualizar(p["s"], p["a"], p["r"], None, None, self.alfa, self.gamma)
        self.pendiente = None

    def _etiqueta_base(self, fase, nivel, A):
        if nivel == 0:
            return ql.ACCIONES.index("animar")
        if nivel >= 3:
            return ql.ACCIONES.index("directa")
        if len(A) >= 2:
            return ql.ACCIONES.index("doble")
        for rasgo in ("rasgo1", "rasgo2", "rasgo3"):
            if A and A[0] in ql.RASGOS[fase][rasgo]:
                return ql.ACCIONES.index(rasgo)
        return ql.ACCIONES.index("animar")

    def _pista_segun_politica(self, fase, C, objetivos, attr, relacion, segundos, dificultad, frag_fn, directa):
        k, m, a, defecto = self._decidir_q(fase, C, objetivos, attr, relacion, segundos, dificultad)
        if self.politica == "q":
            nivel, fila, frase = self._construir_pista_q(ql.ACCIONES[a], fase, C, objetivos, attr, dificultad,
                                                         frag_fn, directa)
            self.h = nivel
        else:
            nivel, fila, frase = self._construir_pista(C, objetivos, attr, self._atributos_fase(fase), dificultad,
                                                       frag_fn, directa)
            a, defecto = self._etiqueta_base(fase, nivel, self.ultima_pista["A"]), False
            self.ultima_pista["tipo"] = ql.ACCIONES[a]
        self._registrar_q(k, m, a, defecto)
        return nivel, fila, frase

    def _construir_pista_q(self, nombre, fase, C, objetivos, attr, dificultad, frag_fn, directa):
        if nombre == "animar":
            self.atenuados, self.resaltado = set(), None
            self.ultima_pista = dict(nivel=0, g=None, A=(), S=list(C), ig=0.0, tabla=[], tipo="animar")
            return 0, ["intentar"], "Intenta otra vez."
        sel, tabla = None, []
        if nombre == "doble":
            tabla = tabla_pistas(C, objetivos, attr, self._atributos_fase(fase), 2, dificultad)
            sel = self._elegir(tabla)
        elif nombre != "directa":
            attrs = self._attrs_rasgo(fase, nombre)
            if attrs:
                tabla = tabla_pistas(C, objetivos, attr, attrs, 1, dificultad)
                sel = self._elegir(tabla)
        if sel is None:
            g = min(objetivos, key=dificultad)
            self.resaltado = g
            self.atenuados = {x for x in C if x != g}
            self.ultima_pista = dict(nivel=3, g=g, A=(), S=[g], ig=math.log2(max(1, len(C))), tabla=[], tipo="directa")
            fila, frase = directa(g)
            return 3, fila, frase
        nivel = ql.NIVEL[nombre]
        self.pistas_usadas.add(sel.clave)
        self.resaltado = None
        self.atenuados = {x for x in C if x not in sel.S} if nivel >= 2 else set()
        self.ultima_pista = dict(nivel=nivel, g=sel.g, A=sel.A, S=sel.S, ig=sel.ig, tabla=tabla[:6], tipo=nombre)
        return nivel, ["buscar"] + [self._picto_valor(a, v) for a, v in zip(sel.A, sel.vals)], frag_fn(sel)

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
            self.ultima_pista = dict(nivel=0, g=None, A=(), S=list(C), ig=0.0, tabla=[])
            return 0, ["intentar"], "Intenta otra vez."
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

    def _pista(self, error=None, auto=False, relacion="ayuda", segundos=None):
        filas, partes = [], []
        if error:
            filas.append(["no", error])
            partes.append(self._frase("error", self._vars(error)))
        elif auto:
            partes.append("¿Te ayudo?")
        partes.append(self._frase("pista", {}))
        nivel, fila, frase = self._pista_segun_politica(
            "INGREDIENTES", self.disponibles(), self.faltan(), self.attr, relacion, segundos,
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

    def _pista_paso(self, error_id=None, auto=False, relacion="ayuda", segundos=None):
        r = self.receta
        filas, partes = [], []
        if error_id:
            d = self.defs[error_id]
            filas.append(["no", f"paso_{error_id}"])
            if d.distractor:
                para = f"para el {r.nombre}" if DEF[r.articulo] == "el" else f"para {self._el_rec(r)}"
                que = self.desc_paso(d) if d.objetos else self.cat.pasos[d.paso].nombre
                partes.append(f"{cap(para)} no hay que {que}.")
            else:
                partes.append(f"Todavía no podemos {self.desc_paso(d)}.")
        elif auto:
            partes.append("¿Te ayudo?")
        partes.append(self._frase("pista", {}))
        orden = [p.paso for p in r.pasos]
        nivel, fila, frase = self._pista_segun_politica(
            "PASOS", self.tarjetas_disponibles(), self.pasos_validos(), self.attr_paso, relacion, segundos,
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
        self._cerrar_q()
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
            politica=self.politica, retorno=round(self.retorno, 3), costo_ayuda=round(self.costo_ayuda, 2),
            uso_directa=self.uso_directa,
            decisiones=[{k: d[k] for k in ("estado", "accion", "defecto", "resultado")} for d in self.decisiones],
        )
        self.accion = Accion("VICTORIA", self._frase("victoria", self._vars()),
                             [["bien", f"plato_{r.id}"]], "fiesta", receta=r.id)
        self._log()
        return self.accion
