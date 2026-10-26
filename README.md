<p align="center">
  <img src="favicon.svg" alt="" width="72" height="72">
</p>

<h1 align="center">Tiny Moon Labs</h1>

<p align="center">
  Productos de software abiertos para la era de los modelos de IA.<br>
  <a href="https://tinymoonlabs.com">tinymoonlabs.com</a> · <a href="https://tml.uy">tml.uy</a> · <a href="https://tml.com.uy">tml.com.uy</a>
</p>

---

Tiny Moon Labs es un lab con base en Montevideo, Uruguay, que construye productos de software abiertos para la era de los modelos de IA. Este repositorio es el código del sitio del Lab, publicado con GitHub Pages en [tinymoonlabs.com](https://tinymoonlabs.com).

## Productos

- **[Friday](https://missingus3r.github.io/friday-showcase/)**: un asistente personal que trabaja de día y de noche sobre Claude Code y te habla por Telegram. [Código](https://github.com/missingus3r/friday-showcase)
- **[Capsule](https://missingus3r.github.io/CAPSULE/)**: una red libre y descentralizada para mandar archivos y publicar sitios, sin cuenta y sin pedir permiso. [Código](https://github.com/missingus3r/CAPSULE)
- **[AA Tube](https://github.com/missingus3r/aa-tube)**: YouTube en la pantalla de Android Auto, con tu cuenta, para usar con el auto estacionado.
- **[AA Disney](https://github.com/missingus3r/aa-disney)**: Disney+ en la pantalla de Android Auto, con tu cuenta, para usar con el auto estacionado.

Todos los productos, reunidos en un solo lugar: [tml-the-hub](https://github.com/missingus3r/tml-the-hub).

## En el taller

- **[Archivo en vidrio](https://tinymoonlabs.com/vidrio.html)**: demo y posible proyecto futuro, no un producto. Una simulación 3D de una máquina DIY que graba datos dentro de vidrio con un láser y los lee con una cámara, inspirada en Microsoft Project Silica. [Abrir la demo](https://tinymoonlabs.com/grabador-5d/) · [Código](https://github.com/missingus3r/archivo-en-vidrio)
- **[Mano biónica](https://tinymoonlabs.com/mano.html)**: demo y posible proyecto futuro, no un producto. Una simulación 3D de una mano robótica de 17 grados de libertad que se mueve con las señales de los músculos del antebrazo (EMG), y también con tu propia mano por cámara web o Leap Motion. [Abrir la demo](https://tinymoonlabs.com/mano-bionica/) · [Código](https://github.com/missingus3r/mano-bionica)

## Archivos

- `index.html`: la página completa.
- `vidrio.html`: la página del proyecto "Archivo en vidrio": marco teórico, inspiración en Project Silica y aviso de que es una demo.
- `grabador-5d/`: la demo 3D (Three.js, sin compilar). Es una copia: el original se edita aparte y se vuelve a copiar acá.
- `mano.html`: la página del proyecto "Mano biónica": marco teórico, inspiración y aviso de que es una demo.
- `mano-bionica/`: la demo 3D de la mano. Es una copia del repositorio [mano-bionica](https://github.com/missingus3r/mano-bionica) sin el puente del Leap ni los `.glb`, con los enlaces apuntando a `mano.html`.
- `menciones.json`: las menciones externas que muestra la sección "Otros también hablan del Lab". Para sumar una, se agrega un objeto con `titulo`, `etiqueta`, `resumen`, `url`, `descripcion` y, si se conoce, `fecha`.
- `robots.txt`, `sitemap.xml`, `llms.txt` y `llms-full.txt`: para buscadores, agentes y servicios de IA.

## Nota: tarjetas de Productos

Las tarjetas (`.prod`) usan `subgrid`: cada una ocupa 4 filas de la grilla (encabezado, frase, lista,
botones) y las comparte con su vecina, así la lista y los botones quedan alineados aunque una frase
tenga más líneas. Una tarjeta nueva tiene que mantener esos 4 hijos en ese orden. Además la transición
de `transform` va solo en `:hover`: si está en reposo, la animación de entrada de GSAP termina a mitad
de camino y cada tarjeta queda corrida a una altura distinta (le pasaba a Capsule).

## Nota: la luna y el jarrón

En escritorio, una luna baja por la página siguiendo una línea punteada y termina dentro del jarrón
del formulario (`#jarMoon`). La ruta se mide contra la página (`buildRoad()` en `index.html`), así que
si la página cambia de alto después de trazarla, la luna queda corta, arriba del jarrón. Pasó al sumar
las tarjetas de AA Tube y AA Disney, y pasaba también al abrir una pregunta o el mensaje del formulario.

Desde entonces la ruta se vuelve a trazar sola cada vez que cambia el alto de la página. Al agregar
productos, tarjetas o secciones no hay que tocar nada; solo sumar un punto en `buildRoad()` si la
sección nueva tiene que ser una parada del camino. Para probarlo: bajar hasta el final y ver que la
luna entra al jarrón, también con alguna pregunta abierta.
