# PictoChef – 1ASI0404 Inteligencia Artificial · 2026-20

Juego de cocina con pictogramas (CAA) para la **Asociación Educativa Kallpa**.

- **Tema:** PictoChef — preparar recetas cotidianas eligiendo sus ingredientes en pictogramas.
- **Modalidad 1:** la Sra. Tomate inicia: pregunta qué **tipo de platillo** preparar
  (desayuno, almuerzo y estofados, postre, bebida, lonche), muestra un plato y pide sus
  ingredientes. Si la elección es incorrecta da una **pista en pictogramas**
  (color, grupo, origen, sabor). Con los ingredientes listos pide los **pasos de preparación** en orden
  (lavar → cortar → mezclar → servir…) y cada paso se **realiza con un gesto** tipo minijuego de cocina
  (frotar para lavar, trazar líneas para cortar, hacer círculos para mezclar, presionar para exprimir,
  arrastrar al fuego o al plato…). Al terminar felicita y guarda el progreso del jugador.
- **Agente:** pistas elegidas por **ganancia de información** (ID3 / entropía) sobre las tarjetas visibles
  (ingredientes y pasos), con 3 niveles de ayuda sin repetir pistas. Los pasos forman un **orden parcial**
  (cada paso tiene requisitos). Dificultad adaptativa con la habilidad θ: receta, distractores de la despensa
  y pasos distractores.
- **Motricidad:** 11 gestos en `juego/js/minijuegos.js` con ratón, dedo o lápiz. Tres modos por jugador:
  *normal*, *fácil* (menos repeticiones) y *solo tocar* (cada toque avanza). Botón «TE AYUDO» si el gesto cuesta.
  Los ingredientes y los pasos también se pueden **arrastrar** al plato / a la cocina.
- **Jugadores:** inicio de sesión con pictogramas (nombre + dibujo), «Mis logros» (recetario con estrellas,
  días seguidos) y **Registro del terapeuta** (historial por partida, errores, ayudas, tiempo por gesto,
  evolución de θ, exportar CSV, respaldo/importación JSON). Los datos se guardan en el navegador.
- **Accesibilidad:** sprites de la Sra. Tomate (normal / pregunta / come), voz sintetizada en español
  que narra cada acción y lo que se toca, palabra bajo cada pictograma, botones grandes, botón ESCUCHAR y AYUDA.
- **Pictogramas:** [ARASAAC](https://arasaac.org) (Sergio Palao · CC BY-NC-SA).

## Ejecutar

Abrir `index.html` 

```bash
python -m http.server 8080
# http://localhost:8080/codigo/juego/index.html
```
```bash
cd codigo
python descargar_pictogramas.py
```

## Experimento A (consola)

```bash
cd codigo
python experimento_A_agente.py --receta pizza --seed 3        
python experimento_A_agente.py --evaluar 800         
```

```bash
python generar_catalogo_js.py
```

## Estructura

```
├── index.html                  # portada
├── codigo/
│   ├── catalogo.py             # carga datos
│   ├── agente.py               # motor de decisión de la Sra. Tomate (Python)
│   ├── simulador.py            # jugador simulado
│   ├── experimento_A_agente.py # Experimento A (consola) · experimento_A.ipynb · experimento_A.html
│   ├── generar_catalogo_js.py  # datos/ -> juego/js/catalogo.js
│   ├── descargar_pictogramas.py
│   └── juego/                  # Experimento B: interfaz HTML/CSS/JS
│       └── js/ catalogo.js · agente.js · minijuegos.js · jugadores.js · voz.js · sonido.js · ui.js
└── datos/
    ├── ingredientes.csv · conceptos.csv · pasos.csv · recetas.json 
    ├── pictogramas/            # ARASAAC
    └── sprites/                # Sra. Tomate: Iddle · Question · Eat
```
