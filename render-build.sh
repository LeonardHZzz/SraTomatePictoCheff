#!/usr/bin/env bash
# Copia solo lo que necesita el juego en el navegador (Render publica la carpeta public/)
set -e
rm -rf public
mkdir -p public/codigo public/datos
cp index.html public/
cp -r codigo/juego public/codigo/
cp -r datos/pictogramas datos/sprites public/datos/
echo "PictoChef listo en public/"
