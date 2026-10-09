import sys
import urllib.request

from catalogo import Catalogo

URL = "https://static.arasaac.org/pictograms/{id}/{id}_500.png"


def main():
    todos = "--todos" in sys.argv
    cat = Catalogo()
    (cat.datos / "pictogramas").mkdir(exist_ok=True)
    nuevos = fallos = 0
    for picto, (aid, ruta) in sorted(cat.pictos().items()):
        if ruta.exists() and not todos:
            continue
        try:
            with urllib.request.urlopen(URL.format(id=aid), timeout=20) as r:
                ruta.write_bytes(r.read())
            nuevos += 1
            print(f"  + {ruta.name:<26} (ARASAAC {aid})")
        except Exception as e:  # noqa: BLE001
            fallos += 1
            print(f"  ! {ruta.name:<26} no se pudo descargar: {e}")
    print(f"Listo: {nuevos} descargados, {fallos} con error.")


if __name__ == "__main__":
    main()
