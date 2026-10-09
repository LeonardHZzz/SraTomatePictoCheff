import csv
import json
from dataclasses import dataclass
from pathlib import Path

DATOS = Path(__file__).resolve().parent.parent / "datos"
ATRIBUTOS = ("color", "categoria", "origen", "sabor")
PREFIJO = {"color": "color", "categoria": "grupo", "origen": "origen", "sabor": "sabor"}


@dataclass(frozen=True)
class Ingrediente:
    id: str
    nombre: str
    articulo: str
    categoria: str
    dificultad: int
    color: str
    origen: str
    sabor: str
    archivo: Path
    arasaac_id: int

    def atributo(self, a):
        v = getattr(self, a)
        if not v or (a == "categoria" and v == "otro"):
            return None
        return v


@dataclass(frozen=True)
class Receta:
    id: str
    nombre: str
    articulo: str
    tipo: str
    ingredientes: frozenset
    orden: tuple
    arasaac_id: int
    pasos: tuple = ()


@dataclass(frozen=True)
class TipoPaso:
    """Acción de cocina (lavar, cortar…) con el gesto de su minijuego y su herramienta."""
    id: str
    nombre: str
    gesto: str
    herramienta: str
    instruccion: str
    archivo: Path
    arasaac_id: int


@dataclass(frozen=True)
class PasoReceta:
    """Paso concreto de una receta. 'requiere' define el orden parcial."""
    paso: str
    objetos: tuple
    requiere: frozenset
    sobre: str = None


@dataclass(frozen=True)
class Tipo:
    id: str
    nombre: str
    picto: str
    arasaac_id: int


class Catalogo:
    def __init__(self, datos: Path = DATOS):
        self.datos = datos
        with open(datos / "ingredientes.csv", encoding="utf-8") as f:
            self.ingredientes = {
                r["id"]: Ingrediente(
                    r["id"], r["nombre"], r["articulo"], r["categoria"], int(r["dificultad_visual"]),
                    r["color"], r["origen"], r["sabor"],
                    datos / r["archivo"], int(r["arasaac_id"]),
                )
                for r in csv.DictReader(f)
            }
        with open(datos / "conceptos.csv", encoding="utf-8") as f:
            self.conceptos = {
                r["id"]: {"nombre": r["nombre"], "tipo": r["tipo"],
                          "archivo": datos / r["archivo"], "arasaac_id": int(r["arasaac_id"])}
                for r in csv.DictReader(f)
            }
        with open(datos / "pasos.csv", encoding="utf-8") as f:
            self.pasos = {
                r["id"]: TipoPaso(r["id"], r["nombre"], r["gesto"], r["herramienta"], r["instruccion"],
                                  datos / r["archivo"], int(r["arasaac_id"]))
                for r in csv.DictReader(f)
            }
        with open(datos / "recetas.json", encoding="utf-8") as f:
            raw = json.load(f)
        self.tipos = [Tipo(t["id"], t["nombre"], t["picto"], t["arasaac_id"]) for t in raw["tipos"]]
        self.recetas = [
            Receta(r["id"], r["nombre"], r["articulo"], r["tipo"],
                   frozenset(r["ingredientes"]), tuple(r["ingredientes"]), r["arasaac_id"],
                   tuple(PasoReceta(p["paso"], tuple(p["objetos"]), frozenset(p["requiere"]), p.get("sobre"))
                         for p in r.get("pasos", [])))
            for r in raw["recetas"]
        ]
        ids_tipo = {t.id for t in self.tipos}
        for rec in self.recetas:
            assert rec.ingredientes <= set(self.ingredientes), f"Ingrediente desconocido en {rec.id}"
            assert rec.tipo in ids_tipo, f"Tipo desconocido en {rec.id}"
        assert len({r.ingredientes for r in self.recetas}) == len(self.recetas), "Recetas duplicadas"
        for rec in self.recetas:
            ids = [p.paso for p in rec.pasos]
            assert len(ids) == len(set(ids)), f"Paso repetido en {rec.id}"
            for p in rec.pasos:
                assert p.paso in self.pasos, f"Paso desconocido {p.paso} en {rec.id}"
                assert p.requiere <= set(ids), f"Requisito desconocido en {rec.id}/{p.paso}"
                assert set(p.objetos) <= set(self.ingredientes), f"Objeto desconocido en {rec.id}/{p.paso}"

    # --- consultas -------------------------------------------------------
    def receta(self, id_):
        return next(r for r in self.recetas if r.id == id_)

    def recetas_de(self, tipo):
        return [r for r in self.recetas if r.tipo == tipo]

    def picto_atributo(self, a, v):
        return f"{PREFIJO[a]}_{v}"

    def nombre_atributo(self, a, v):
        c = self.conceptos.get(self.picto_atributo(a, v))
        return c["nombre"] if c else v

    def dificultad_receta(self, r):
        """0..1: más ingredientes y pictogramas más difíciles => receta más difícil."""
        n = len(r.ingredientes)
        vis = sum(self.ingredientes[g].dificultad for g in r.ingredientes) / n
        return min(1.0, max(0.0, 0.5 * (n - 3) + 0.5 * (vis - 1) / 2))

    # --- pictogramas -------------------------------------------------------
    def pictos(self):
        """id de pictograma -> (arasaac_id, ruta local)."""
        m = {g.id: (g.arasaac_id, g.archivo) for g in self.ingredientes.values()}
        m.update({k: (c["arasaac_id"], c["archivo"]) for k, c in self.conceptos.items()})
        m.update({f"paso_{k}": (p.arasaac_id, p.archivo) for k, p in self.pasos.items()})
        for r in self.recetas:
            m[f"plato_{r.id}"] = (r.arasaac_id, self.datos / "pictogramas" / f"plato_{r.id}.png")
        return m

    def ruta_picto(self, id_):
        p = self.pictos().get(id_)
        return p[1] if p else self.datos / "pictogramas" / f"{id_}.png"
