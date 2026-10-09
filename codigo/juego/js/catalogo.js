const PIC = "../../datos/pictogramas";
const CATALOGO = {
 "tipos": [
  {
   "id": "desayuno",
   "nombre": "desayuno",
   "picto": "tipo_desayuno",
   "arasaac_id": 4626
  },
  {
   "id": "almuerzo",
   "nombre": "almuerzo y estofados",
   "picto": "tipo_almuerzo",
   "arasaac_id": 28207
  },
  {
   "id": "postre",
   "nombre": "postre",
   "picto": "tipo_postre",
   "arasaac_id": 7216
  },
  {
   "id": "bebida",
   "nombre": "bebida",
   "picto": "tipo_bebida",
   "arasaac_id": 4575
  },
  {
   "id": "lonche",
   "nombre": "lonche",
   "picto": "tipo_lonche",
   "arasaac_id": 4695
  }
 ],
 "ingredientes": {
  "masa": {
   "id": "masa",
   "nombre": "masa",
   "articulo": "la",
   "categoria": "cereal",
   "dificultad": 3,
   "color": "blanco",
   "origen": null,
   "sabor": null
  },
  "tomate": {
   "id": "tomate",
   "nombre": "tomate",
   "articulo": "el",
   "categoria": "verdura",
   "dificultad": 1,
   "color": "rojo",
   "origen": "huerto",
   "sabor": null
  },
  "queso": {
   "id": "queso",
   "nombre": "queso",
   "articulo": "el",
   "categoria": "lacteo",
   "dificultad": 1,
   "color": "amarillo",
   "origen": "vaca",
   "sabor": null
  },
  "jamon": {
   "id": "jamon",
   "nombre": "jamón",
   "articulo": "el",
   "categoria": "carne",
   "dificultad": 2,
   "color": "rosa",
   "origen": "cerdo",
   "sabor": null
  },
  "pan": {
   "id": "pan",
   "nombre": "pan",
   "articulo": "el",
   "categoria": "cereal",
   "dificultad": 1,
   "color": "marron",
   "origen": null,
   "sabor": null
  },
  "lechuga": {
   "id": "lechuga",
   "nombre": "lechuga",
   "articulo": "la",
   "categoria": "verdura",
   "dificultad": 2,
   "color": "verde",
   "origen": "huerto",
   "sabor": null
  },
  "palta": {
   "id": "palta",
   "nombre": "palta",
   "articulo": "la",
   "categoria": "fruta",
   "dificultad": 2,
   "color": "verde",
   "origen": "arbol",
   "sabor": null
  },
  "pollo": {
   "id": "pollo",
   "nombre": "pollo",
   "articulo": "el",
   "categoria": "carne",
   "dificultad": 2,
   "color": "marron",
   "origen": "gallina",
   "sabor": null
  },
  "arroz": {
   "id": "arroz",
   "nombre": "arroz",
   "articulo": "el",
   "categoria": "cereal",
   "dificultad": 2,
   "color": "blanco",
   "origen": null,
   "sabor": null
  },
  "huevo": {
   "id": "huevo",
   "nombre": "huevo",
   "articulo": "el",
   "categoria": "otro",
   "dificultad": 1,
   "color": "blanco",
   "origen": "gallina",
   "sabor": null
  },
  "cereal": {
   "id": "cereal",
   "nombre": "cereal",
   "articulo": "el",
   "categoria": "cereal",
   "dificultad": 2,
   "color": "amarillo",
   "origen": null,
   "sabor": null
  },
  "leche": {
   "id": "leche",
   "nombre": "leche",
   "articulo": "la",
   "categoria": "lacteo",
   "dificultad": 1,
   "color": "blanco",
   "origen": "vaca",
   "sabor": null
  },
  "platano": {
   "id": "platano",
   "nombre": "plátano",
   "articulo": "el",
   "categoria": "fruta",
   "dificultad": 1,
   "color": "amarillo",
   "origen": "arbol",
   "sabor": "dulce"
  },
  "fresa": {
   "id": "fresa",
   "nombre": "fresa",
   "articulo": "la",
   "categoria": "fruta",
   "dificultad": 1,
   "color": "rojo",
   "origen": "huerto",
   "sabor": "dulce"
  },
  "papa": {
   "id": "papa",
   "nombre": "papa",
   "articulo": "la",
   "categoria": "verdura",
   "dificultad": 2,
   "color": "marron",
   "origen": "huerto",
   "sabor": null
  },
  "zanahoria": {
   "id": "zanahoria",
   "nombre": "zanahoria",
   "articulo": "la",
   "categoria": "verdura",
   "dificultad": 1,
   "color": "naranja",
   "origen": "huerto",
   "sabor": null
  },
  "cebolla": {
   "id": "cebolla",
   "nombre": "cebolla",
   "articulo": "la",
   "categoria": "verdura",
   "dificultad": 2,
   "color": "blanco",
   "origen": "huerto",
   "sabor": null
  },
  "carne": {
   "id": "carne",
   "nombre": "carne",
   "articulo": "la",
   "categoria": "carne",
   "dificultad": 2,
   "color": "rojo",
   "origen": "vaca",
   "sabor": null
  },
  "harina": {
   "id": "harina",
   "nombre": "harina",
   "articulo": "la",
   "categoria": "cereal",
   "dificultad": 3,
   "color": "blanco",
   "origen": null,
   "sabor": null
  },
  "azucar": {
   "id": "azucar",
   "nombre": "azúcar",
   "articulo": "el",
   "categoria": "otro",
   "dificultad": 2,
   "color": "blanco",
   "origen": null,
   "sabor": "dulce"
  },
  "manzana": {
   "id": "manzana",
   "nombre": "manzana",
   "articulo": "la",
   "categoria": "fruta",
   "dificultad": 1,
   "color": "rojo",
   "origen": "arbol",
   "sabor": "dulce"
  },
  "naranja": {
   "id": "naranja",
   "nombre": "naranja",
   "articulo": "la",
   "categoria": "fruta",
   "dificultad": 1,
   "color": "naranja",
   "origen": "arbol",
   "sabor": "dulce"
  },
  "limon": {
   "id": "limon",
   "nombre": "limón",
   "articulo": "el",
   "categoria": "fruta",
   "dificultad": 1,
   "color": "verde",
   "origen": "arbol",
   "sabor": "acido"
  },
  "agua": {
   "id": "agua",
   "nombre": "agua",
   "articulo": "el",
   "categoria": "bebida",
   "dificultad": 1,
   "color": null,
   "origen": null,
   "sabor": null
  }
 },
 "recetas": [
  {
   "id": "cereal_leche",
   "nombre": "cereal con leche",
   "articulo": "un",
   "tipo": "desayuno",
   "ingredientes": [
    "cereal",
    "leche",
    "platano"
   ],
   "pasos": [
    {
     "paso": "pelar",
     "objetos": [
      "platano"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "platano"
     ],
     "requiere": [
      "pelar"
     ]
    },
    {
     "paso": "mezclar",
     "objetos": [
      "cereal",
      "leche",
      "platano"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    }
   ]
  },
  {
   "id": "pan_palta",
   "nombre": "pan con palta",
   "articulo": "un",
   "tipo": "desayuno",
   "ingredientes": [
    "pan",
    "palta",
    "huevo"
   ],
   "pasos": [
    {
     "paso": "cortar",
     "objetos": [
      "palta"
     ],
     "requiere": []
    },
    {
     "paso": "freir",
     "objetos": [
      "huevo"
     ],
     "requiere": []
    },
    {
     "paso": "untar",
     "objetos": [
      "palta"
     ],
     "requiere": [
      "cortar"
     ],
     "sobre": "pan"
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "freir",
      "untar"
     ]
    }
   ]
  },
  {
   "id": "tortilla",
   "nombre": "tortilla",
   "articulo": "una",
   "tipo": "desayuno",
   "ingredientes": [
    "huevo",
    "queso",
    "jamon"
   ],
   "pasos": [
    {
     "paso": "batir",
     "objetos": [
      "huevo"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "jamon"
     ],
     "requiere": []
    },
    {
     "paso": "mezclar",
     "objetos": [
      "huevo",
      "queso",
      "jamon"
     ],
     "requiere": [
      "batir",
      "cortar"
     ]
    },
    {
     "paso": "freir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    }
   ]
  },
  {
   "id": "estofado",
   "nombre": "estofado de pollo",
   "articulo": "un",
   "tipo": "almuerzo",
   "ingredientes": [
    "pollo",
    "papa",
    "zanahoria",
    "cebolla"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "papa",
      "zanahoria"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "papa",
      "zanahoria",
      "cebolla"
     ],
     "requiere": [
      "lavar"
     ]
    },
    {
     "paso": "cocinar",
     "objetos": [
      "pollo",
      "papa",
      "zanahoria",
      "cebolla"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "cocinar"
     ]
    }
   ]
  },
  {
   "id": "arroz_pollo",
   "nombre": "arroz con pollo",
   "articulo": "un",
   "tipo": "almuerzo",
   "ingredientes": [
    "arroz",
    "pollo",
    "tomate"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "tomate"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "pollo",
      "tomate"
     ],
     "requiere": [
      "lavar"
     ]
    },
    {
     "paso": "cocinar",
     "objetos": [
      "arroz",
      "pollo",
      "tomate"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "cocinar"
     ]
    }
   ]
  },
  {
   "id": "sopa",
   "nombre": "sopa de verduras",
   "articulo": "una",
   "tipo": "almuerzo",
   "ingredientes": [
    "papa",
    "zanahoria",
    "cebolla",
    "agua"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "papa",
      "zanahoria"
     ],
     "requiere": []
    },
    {
     "paso": "pelar",
     "objetos": [
      "papa"
     ],
     "requiere": [
      "lavar"
     ]
    },
    {
     "paso": "cortar",
     "objetos": [
      "papa",
      "zanahoria",
      "cebolla"
     ],
     "requiere": [
      "pelar"
     ]
    },
    {
     "paso": "hervir",
     "objetos": [
      "agua",
      "papa",
      "zanahoria",
      "cebolla"
     ],
     "requiere": [
      "cortar"
     ]
    }
   ]
  },
  {
   "id": "ensalada",
   "nombre": "ensalada",
   "articulo": "una",
   "tipo": "almuerzo",
   "ingredientes": [
    "lechuga",
    "tomate",
    "palta",
    "pollo"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "lechuga",
      "tomate"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "lechuga",
      "tomate",
      "palta"
     ],
     "requiere": [
      "lavar"
     ]
    },
    {
     "paso": "mezclar",
     "objetos": [
      "lechuga",
      "tomate",
      "palta",
      "pollo"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    }
   ]
  },
  {
   "id": "macedonia",
   "nombre": "ensalada de frutas",
   "articulo": "una",
   "tipo": "postre",
   "ingredientes": [
    "platano",
    "fresa",
    "manzana",
    "naranja"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "fresa",
      "manzana"
     ],
     "requiere": []
    },
    {
     "paso": "pelar",
     "objetos": [
      "platano",
      "naranja"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "fresa",
      "manzana",
      "platano",
      "naranja"
     ],
     "requiere": [
      "lavar",
      "pelar"
     ]
    },
    {
     "paso": "mezclar",
     "objetos": [
      "fresa",
      "manzana",
      "platano",
      "naranja"
     ],
     "requiere": [
      "cortar"
     ]
    }
   ]
  },
  {
   "id": "torta",
   "nombre": "torta",
   "articulo": "una",
   "tipo": "postre",
   "ingredientes": [
    "harina",
    "huevo",
    "leche",
    "azucar"
   ],
   "pasos": [
    {
     "paso": "batir",
     "objetos": [
      "huevo",
      "azucar"
     ],
     "requiere": []
    },
    {
     "paso": "mezclar",
     "objetos": [
      "harina",
      "leche"
     ],
     "requiere": [
      "batir"
     ]
    },
    {
     "paso": "hornear",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "hornear"
     ]
    }
   ]
  },
  {
   "id": "panqueques",
   "nombre": "panqueques de plátano",
   "articulo": "unos",
   "tipo": "postre",
   "ingredientes": [
    "harina",
    "huevo",
    "leche",
    "platano"
   ],
   "pasos": [
    {
     "paso": "pelar",
     "objetos": [
      "platano"
     ],
     "requiere": []
    },
    {
     "paso": "mezclar",
     "objetos": [
      "harina",
      "huevo",
      "leche",
      "platano"
     ],
     "requiere": [
      "pelar"
     ]
    },
    {
     "paso": "freir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "freir"
     ]
    }
   ]
  },
  {
   "id": "batido",
   "nombre": "batido de fruta",
   "articulo": "un",
   "tipo": "bebida",
   "ingredientes": [
    "leche",
    "platano",
    "fresa"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "fresa"
     ],
     "requiere": []
    },
    {
     "paso": "pelar",
     "objetos": [
      "platano"
     ],
     "requiere": []
    },
    {
     "paso": "licuar",
     "objetos": [
      "leche",
      "platano",
      "fresa"
     ],
     "requiere": [
      "lavar",
      "pelar"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "licuar"
     ]
    }
   ]
  },
  {
   "id": "jugo_naranja",
   "nombre": "jugo de naranja",
   "articulo": "un",
   "tipo": "bebida",
   "ingredientes": [
    "naranja",
    "agua",
    "azucar"
   ],
   "pasos": [
    {
     "paso": "cortar",
     "objetos": [
      "naranja"
     ],
     "requiere": []
    },
    {
     "paso": "exprimir",
     "objetos": [
      "naranja"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "mezclar",
     "objetos": [
      "agua",
      "azucar"
     ],
     "requiere": [
      "exprimir"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    }
   ]
  },
  {
   "id": "limonada",
   "nombre": "limonada",
   "articulo": "una",
   "tipo": "bebida",
   "ingredientes": [
    "limon",
    "agua",
    "azucar"
   ],
   "pasos": [
    {
     "paso": "cortar",
     "objetos": [
      "limon"
     ],
     "requiere": []
    },
    {
     "paso": "exprimir",
     "objetos": [
      "limon"
     ],
     "requiere": [
      "cortar"
     ]
    },
    {
     "paso": "mezclar",
     "objetos": [
      "agua",
      "azucar"
     ],
     "requiere": [
      "exprimir"
     ]
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "mezclar"
     ]
    }
   ]
  },
  {
   "id": "sandwich",
   "nombre": "sándwich",
   "articulo": "un",
   "tipo": "lonche",
   "ingredientes": [
    "pan",
    "jamon",
    "queso",
    "lechuga"
   ],
   "pasos": [
    {
     "paso": "lavar",
     "objetos": [
      "lechuga"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "pan"
     ],
     "requiere": []
    },
    {
     "paso": "poner",
     "objetos": [
      "jamon",
      "queso",
      "lechuga"
     ],
     "requiere": [
      "cortar",
      "lavar"
     ],
     "sobre": "pan"
    },
    {
     "paso": "servir",
     "objetos": [],
     "requiere": [
      "poner"
     ]
    }
   ]
  },
  {
   "id": "pizza",
   "nombre": "pizza",
   "articulo": "una",
   "tipo": "lonche",
   "ingredientes": [
    "masa",
    "tomate",
    "queso",
    "jamon"
   ],
   "pasos": [
    {
     "paso": "amasar",
     "objetos": [
      "masa"
     ],
     "requiere": []
    },
    {
     "paso": "untar",
     "objetos": [
      "tomate"
     ],
     "requiere": [
      "amasar"
     ],
     "sobre": "masa"
    },
    {
     "paso": "poner",
     "objetos": [
      "queso",
      "jamon"
     ],
     "requiere": [
      "untar"
     ],
     "sobre": "masa"
    },
    {
     "paso": "hornear",
     "objetos": [],
     "requiere": [
      "poner"
     ]
    }
   ]
  },
  {
   "id": "hamburguesa",
   "nombre": "hamburguesa",
   "articulo": "una",
   "tipo": "lonche",
   "ingredientes": [
    "pan",
    "carne",
    "lechuga",
    "tomate"
   ],
   "pasos": [
    {
     "paso": "cocinar",
     "objetos": [
      "carne"
     ],
     "requiere": []
    },
    {
     "paso": "lavar",
     "objetos": [
      "lechuga",
      "tomate"
     ],
     "requiere": []
    },
    {
     "paso": "cortar",
     "objetos": [
      "tomate"
     ],
     "requiere": [
      "lavar"
     ]
    },
    {
     "paso": "poner",
     "objetos": [
      "carne",
      "lechuga",
      "tomate"
     ],
     "requiere": [
      "cocinar",
      "cortar"
     ],
     "sobre": "pan"
    }
   ]
  }
 ],
 "conceptos": {
  "poner": "poner",
  "quitar": "quitar",
  "falta": "falta",
  "si": "sí",
  "no": "no",
  "listo": "listo",
  "bien": "muy bien",
  "pregunta": "¿?",
  "elegir": "elegir",
  "ayuda": "ayuda",
  "preparar": "preparar",
  "cocinar": "cocinar",
  "plato": "plato",
  "buscar": "buscar",
  "necesitar": "necesitar",
  "ingredientes": "ingredientes",
  "intentar": "intentar otra vez",
  "oir": "escuchar",
  "color_rojo": "rojo",
  "color_verde": "verde",
  "color_amarillo": "amarillo",
  "color_blanco": "blanco",
  "color_marron": "marrón",
  "color_naranja": "naranja",
  "color_rosa": "rosado",
  "grupo_fruta": "fruta",
  "grupo_verdura": "verdura",
  "grupo_carne": "carne",
  "grupo_lacteo": "lácteo",
  "grupo_cereal": "cereal",
  "grupo_bebida": "bebida",
  "origen_vaca": "vaca",
  "origen_gallina": "gallina",
  "origen_cerdo": "cerdo",
  "origen_arbol": "árbol",
  "origen_huerto": "huerto",
  "sabor_dulce": "dulce",
  "sabor_acido": "ácido",
  "tipo_desayuno": "desayuno",
  "tipo_almuerzo": "almuerzo",
  "tipo_postre": "postre",
  "tipo_bebida": "bebida",
  "tipo_lonche": "lonche",
  "primero": "primero",
  "despues": "después",
  "trofeo": "logros",
  "quien": "¿quién?",
  "herr_agua": "agua",
  "herr_cuchillo": "cuchillo",
  "herr_bol": "bol",
  "herr_olla": "olla",
  "herr_fuego": "fuego",
  "herr_horno": "horno",
  "herr_batidora": "licuadora",
  "herr_mano": "manos",
  "herr_rodillo": "rodillo",
  "herr_plato": "plato"
 },
 "pasos": {
  "lavar": {
   "id": "lavar",
   "nombre": "lavar",
   "gesto": "frotar",
   "herramienta": "agua",
   "instruccion": "Frota para lavar"
  },
  "pelar": {
   "id": "pelar",
   "nombre": "pelar",
   "gesto": "trazos",
   "herramienta": "mano",
   "instruccion": "Desliza el dedo sobre la cáscara para pelar"
  },
  "cortar": {
   "id": "cortar",
   "nombre": "cortar",
   "gesto": "cortar",
   "herramienta": "cuchillo",
   "instruccion": "Traza líneas de arriba hacia abajo para cortar"
  },
  "amasar": {
   "id": "amasar",
   "nombre": "estirar",
   "gesto": "frotar",
   "herramienta": "rodillo",
   "instruccion": "Mueve el rodillo de un lado a otro para estirar"
  },
  "untar": {
   "id": "untar",
   "nombre": "untar",
   "gesto": "cubrir",
   "herramienta": "cuchillo",
   "instruccion": "Pinta toda la superficie para untar"
  },
  "mezclar": {
   "id": "mezclar",
   "nombre": "mezclar",
   "gesto": "girar",
   "herramienta": "bol",
   "instruccion": "Haz círculos dentro del bol para mezclar"
  },
  "batir": {
   "id": "batir",
   "nombre": "batir",
   "gesto": "girar",
   "herramienta": "bol",
   "instruccion": "Haz círculos rápidos para batir"
  },
  "exprimir": {
   "id": "exprimir",
   "nombre": "exprimir",
   "gesto": "presionar",
   "herramienta": "mano",
   "instruccion": "Toca muchas veces para exprimir"
  },
  "licuar": {
   "id": "licuar",
   "nombre": "licuar",
   "gesto": "mantener",
   "herramienta": "batidora",
   "instruccion": "Mantén presionado el botón para licuar"
  },
  "poner": {
   "id": "poner",
   "nombre": "poner",
   "gesto": "arrastrar",
   "herramienta": "mano",
   "instruccion": "Arrastra cada ingrediente a su lugar"
  },
  "cocinar": {
   "id": "cocinar",
   "nombre": "cocinar",
   "gesto": "fuego",
   "herramienta": "olla",
   "instruccion": "Arrastra la olla al fuego"
  },
  "hervir": {
   "id": "hervir",
   "nombre": "hervir",
   "gesto": "fuego",
   "herramienta": "olla",
   "instruccion": "Arrastra la olla al fuego para hervir"
  },
  "freir": {
   "id": "freir",
   "nombre": "freír",
   "gesto": "fuego",
   "herramienta": "fuego",
   "instruccion": "Arrastra la sartén al fuego para freír"
  },
  "hornear": {
   "id": "hornear",
   "nombre": "hornear",
   "gesto": "horno",
   "herramienta": "horno",
   "instruccion": "Arrastra la bandeja al horno"
  },
  "servir": {
   "id": "servir",
   "nombre": "servir",
   "gesto": "servir",
   "herramienta": "plato",
   "instruccion": "Arrastra la comida al plato para servir"
  }
 },
 "arasaac": {
  "masa": 32476,
  "tomate": 2594,
  "queso": 2541,
  "jamon": 2433,
  "pan": 2494,
  "lechuga": 2446,
  "palta": 8009,
  "pollo": 4952,
  "arroz": 6911,
  "huevo": 2427,
  "cereal": 2328,
  "leche": 2445,
  "platano": 2530,
  "fresa": 2400,
  "papa": 2503,
  "zanahoria": 2619,
  "cebolla": 2323,
  "carne": 2316,
  "harina": 8600,
  "azucar": 25560,
  "manzana": 2462,
  "naranja": 2483,
  "limon": 3022,
  "agua": 32464,
  "poner": 32757,
  "quitar": 11751,
  "falta": 29064,
  "si": 5584,
  "no": 5526,
  "listo": 28429,
  "bien": 5397,
  "pregunta": 3415,
  "elegir": 30510,
  "ayuda": 12252,
  "preparar": 6190,
  "cocinar": 2342,
  "plato": 16857,
  "buscar": 6947,
  "necesitar": 37160,
  "ingredientes": 24119,
  "intentar": 26144,
  "oir": 6572,
  "color_rojo": 2808,
  "color_verde": 4887,
  "color_amarillo": 2648,
  "color_blanco": 8043,
  "color_marron": 2923,
  "color_naranja": 2888,
  "color_rosa": 2807,
  "grupo_fruta": 28339,
  "grupo_verdura": 29131,
  "grupo_carne": 2316,
  "grupo_lacteo": 31815,
  "grupo_cereal": 2328,
  "grupo_bebida": 4575,
  "origen_vaca": 2609,
  "origen_gallina": 2403,
  "origen_cerdo": 2327,
  "origen_arbol": 3057,
  "origen_huerto": 2974,
  "sabor_dulce": 32440,
  "sabor_acido": 4552,
  "tipo_desayuno": 4626,
  "tipo_almuerzo": 28207,
  "tipo_postre": 7216,
  "tipo_bebida": 4575,
  "tipo_lonche": 4695,
  "primero": 37753,
  "despues": 32749,
  "trofeo": 3162,
  "quien": 9853,
  "herr_agua": 32464,
  "herr_cuchillo": 4931,
  "herr_bol": 3257,
  "herr_olla": 9086,
  "herr_fuego": 4654,
  "herr_horno": 2426,
  "herr_batidora": 17175,
  "herr_mano": 2928,
  "herr_rodillo": 2809,
  "herr_plato": 16857,
  "paso_lavar": 34826,
  "paso_pelar": 5537,
  "paso_cortar": 5975,
  "paso_amasar": 8015,
  "paso_untar": 7292,
  "paso_mezclar": 5515,
  "paso_batir": 5924,
  "paso_exprimir": 5994,
  "paso_licuar": 17175,
  "paso_poner": 32757,
  "paso_cocinar": 2342,
  "paso_hervir": 5485,
  "paso_freir": 39476,
  "paso_hornear": 5487,
  "paso_servir": 7247,
  "plato_cereal_leche": 4626,
  "plato_pan_palta": 2787,
  "plato_tortilla": 4967,
  "plato_estofado": 5467,
  "plato_arroz_pollo": 36692,
  "plato_sopa": 2573,
  "plato_ensalada": 2377,
  "plato_macedonia": 8620,
  "plato_torta": 2502,
  "plato_panqueques": 37849,
  "plato_batido": 8503,
  "plato_jugo_naranja": 2624,
  "plato_limonada": 6551,
  "plato_sandwich": 3383,
  "plato_pizza": 2527,
  "plato_hamburguesa": 2419
 },
 "archivos": {
  "masa": "masa.png",
  "tomate": "tomate.png",
  "queso": "queso.png",
  "jamon": "jamon.png",
  "pan": "pan.png",
  "lechuga": "lechuga.png",
  "palta": "palta.png",
  "pollo": "pollo.png",
  "arroz": "arroz.png",
  "huevo": "huevo.png",
  "cereal": "cereal.png",
  "leche": "leche.png",
  "platano": "platano.png",
  "fresa": "fresa.png",
  "papa": "papa.png",
  "zanahoria": "zanahoria.png",
  "cebolla": "cebolla.png",
  "carne": "carne.png",
  "harina": "harina.png",
  "azucar": "azucar.png",
  "manzana": "manzana.png",
  "naranja": "naranja.png",
  "limon": "limon.png",
  "agua": "agua.png",
  "poner": "poner.png",
  "quitar": "quitar.png",
  "falta": "falta.png",
  "si": "si.png",
  "no": "no.png",
  "listo": "listo.png",
  "bien": "bien.png",
  "pregunta": "pregunta.png",
  "elegir": "elegir.png",
  "ayuda": "ayuda.png",
  "preparar": "preparar.png",
  "cocinar": "cocinar.png",
  "plato": "plato.png",
  "buscar": "buscar.png",
  "necesitar": "necesitar.png",
  "ingredientes": "ingredientes.png",
  "intentar": "intentar.png",
  "oir": "oir.png",
  "color_rojo": "color_rojo.png",
  "color_verde": "color_verde.png",
  "color_amarillo": "color_amarillo.png",
  "color_blanco": "color_blanco.png",
  "color_marron": "color_marron.png",
  "color_naranja": "color_naranja.png",
  "color_rosa": "color_rosa.png",
  "grupo_fruta": "grupo_fruta.png",
  "grupo_verdura": "grupo_verdura.png",
  "grupo_carne": "carne.png",
  "grupo_lacteo": "grupo_lacteo.png",
  "grupo_cereal": "cereal.png",
  "grupo_bebida": "tipo_bebida.png",
  "origen_vaca": "origen_vaca.png",
  "origen_gallina": "origen_gallina.png",
  "origen_cerdo": "origen_cerdo.png",
  "origen_arbol": "origen_arbol.png",
  "origen_huerto": "origen_huerto.png",
  "sabor_dulce": "sabor_dulce.png",
  "sabor_acido": "sabor_acido.png",
  "tipo_desayuno": "tipo_desayuno.png",
  "tipo_almuerzo": "tipo_almuerzo.png",
  "tipo_postre": "tipo_postre.png",
  "tipo_bebida": "tipo_bebida.png",
  "tipo_lonche": "tipo_lonche.png",
  "primero": "primero.png",
  "despues": "despues.png",
  "trofeo": "trofeo.png",
  "quien": "quien.png",
  "herr_agua": "agua.png",
  "herr_cuchillo": "herr_cuchillo.png",
  "herr_bol": "herr_bol.png",
  "herr_olla": "herr_olla.png",
  "herr_fuego": "herr_fuego.png",
  "herr_horno": "herr_horno.png",
  "herr_batidora": "paso_licuar.png",
  "herr_mano": "herr_mano.png",
  "herr_rodillo": "herr_rodillo.png",
  "herr_plato": "plato.png",
  "paso_lavar": "paso_lavar.png",
  "paso_pelar": "paso_pelar.png",
  "paso_cortar": "paso_cortar.png",
  "paso_amasar": "paso_amasar.png",
  "paso_untar": "paso_untar.png",
  "paso_mezclar": "paso_mezclar.png",
  "paso_batir": "paso_batir.png",
  "paso_exprimir": "paso_exprimir.png",
  "paso_licuar": "paso_licuar.png",
  "paso_poner": "poner.png",
  "paso_cocinar": "cocinar.png",
  "paso_hervir": "paso_hervir.png",
  "paso_freir": "paso_freir.png",
  "paso_hornear": "paso_hornear.png",
  "paso_servir": "paso_servir.png",
  "plato_cereal_leche": "plato_cereal_leche.png",
  "plato_pan_palta": "plato_pan_palta.png",
  "plato_tortilla": "plato_tortilla.png",
  "plato_estofado": "plato_estofado.png",
  "plato_arroz_pollo": "plato_arroz_pollo.png",
  "plato_sopa": "plato_sopa.png",
  "plato_ensalada": "plato_ensalada.png",
  "plato_macedonia": "plato_macedonia.png",
  "plato_torta": "plato_torta.png",
  "plato_panqueques": "plato_panqueques.png",
  "plato_batido": "plato_batido.png",
  "plato_jugo_naranja": "plato_jugo_naranja.png",
  "plato_limonada": "plato_limonada.png",
  "plato_sandwich": "plato_sandwich.png",
  "plato_pizza": "plato_pizza.png",
  "plato_hamburguesa": "plato_hamburguesa.png"
 }
};

const ATRIBUTOS = ["color", "categoria", "origen", "sabor"];
const PREFIJO = { color: "color", categoria: "grupo", origen: "origen", sabor: "sabor" };

function atributo(g, a) {
  const v = CATALOGO.ingredientes[g][a];
  if (!v || (a === "categoria" && v === "otro")) return null;
  return v;
}
function pictoAtributo(a, v) { return `${PREFIJO[a]}_${v}`; }
function nombreAtributo(a, v) { return CATALOGO.conceptos[pictoAtributo(a, v)] || v; }
function nombreIng(g) { return CATALOGO.ingredientes[g].nombre; }
function recetaPorId(id) { return CATALOGO.recetas.find((r) => r.id === id); }
function recetasDe(tipo) { return CATALOGO.recetas.filter((r) => r.tipo === tipo); }
function tipoPorId(id) { return CATALOGO.tipos.find((t) => t.id === id); }

function dificultadReceta(r) {
  const n = r.ingredientes.length;
  const vis = r.ingredientes.reduce((s, g) => s + CATALOGO.ingredientes[g].dificultad, 0) / n;
  return Math.min(1, Math.max(0, 0.5 * (n - 3) + 0.5 * (vis - 1) / 2));
}

// Pictograma local; si no se descargó aún, se usa el servidor oficial de ARASAAC.
function pictoSrc(id) {
  const f = CATALOGO.archivos[id] || `${id}.png`;
  return `${PIC}/${f}`;
}
function pictoRemoto(id) {
  const a = CATALOGO.arasaac[id];
  return a ? `https://static.arasaac.org/pictograms/${a}/${a}_500.png` : "";
}
function pictoFallback(img) {
  const id = img.dataset.picto;
  if (!img.dataset.remoto && pictoRemoto(id)) {
    img.dataset.remoto = "1";
    img.src = pictoRemoto(id);
  } else {
    img.onerror = null;
    img.classList.add("sin-picto");
    img.src = pictoPalabra(img.alt || id);
  }
}
function pictoPalabra(txt) {
  const t = String(txt).toUpperCase().replace(/[<&>"]/g, "");
  const fs = t.length > 9 ? 13 : t.length > 6 ? 16 : 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="#fff"/><text x="50" y="55" font-family="Trebuchet MS,Arial" font-weight="700" font-size="${fs}" text-anchor="middle" fill="#1a1208">${t}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function imgPicto(id, alt = "", cls = "") {
  return `<img class="${cls}" src="${pictoSrc(id)}" data-picto="${id}" alt="${alt || id}" onerror="pictoFallback(this)">`;
}
