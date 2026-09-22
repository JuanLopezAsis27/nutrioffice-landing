# NutriOffice — sitio de presentación

La landing de la aplicación y sus páginas de texto. Vive **fuera** de
`nutricionista-app` a propósito: no comparte código, ni dependencias, ni
despliegue con el producto.

## La tecnología

**Astro**, que compila a HTML estático. En el navegador no hay framework: lo que
se sirve son cuatro archivos HTML, una hoja de estilos y 4,6 KB de JavaScript
propio. Ni React, ni hidratación, ni runtime.

El paso de compilación está para lo único que hacía falta: **no repetir la
cabecera y el pie en cada página**. Con archivos sueltos, cambiar un enlace del
pie eran cuatro ediciones y la cuarta se olvidaba.

```bash
npm install     # una vez
npm run dev     # http://localhost:4321, con recarga en caliente
npm run build   # genera dist/
npm run preview # sirve dist/ como lo haría un servidor real
```

## Las páginas

| Ruta           | Archivo                    | Qué es                               |
| -------------- | -------------------------- | ------------------------------------ |
| `/`            | `src/pages/index.astro`    | La landing: once secciones           |
| `/privacidad/` | `src/pages/privacidad.astro` | Política de privacidad             |
| `/terminos/`   | `src/pages/terminos.astro` | Términos del servicio                |
| (cualquiera)   | `src/pages/404.astro`      | Página no encontrada                 |
| `/marca/`      | `src/pages/marca.astro`    | Propuestas de logo (interna, `noindex`) |

> **Las dos páginas legales son un modelo y traen un recuadro ámbar que lo
> dice.** Los tramos entre corchetes (`[razón social]`, `[jurisdicción]`,
> `[plazo]`…) están resaltados en amarillo para que se vean de lejos. Completalos,
> hacé revisar el texto por un profesional del derecho y recién ahí borrá el
> recuadro de aviso de cada archivo.

## Cómo está organizado

```
src/
  pages/          <- una página por archivo (el nombre lo exige Astro)
  plantillas/
    Base.astro    <- cabeza, cabecera, pie y guiones: todas las páginas
    Texto.astro   <- las páginas legales: índice lateral y tipografía del cuerpo
  componentes/    <- cada sección de la landing + las piezas compartidas
  estilos/
    global.css    <- tokens, botones, tarjetas, grillas: el sistema
  guiones/
    interacciones.js
public/
  recursos/       <- se copia tal cual a la raíz del sitio publicado
```

**Dónde va cada estilo:** lo que se repite en toda la página —colores,
botones, tarjetas, grillas, tipografía— vive en `global.css`. Lo que es propio
de una sección va en el `<style>` de su componente, que Astro limita a ese
componente solo. Si dudás: ¿lo usa más de una sección? Entonces es global.

**El contenido va adentro del componente que lo muestra**, como una lista al
principio del archivo (mirá `Modulos.astro` o `Preguntas.astro`). Para sumar un
módulo o una pregunta se agrega un objeto a esa lista y listo: no hay que tocar
el HTML ni el CSS.

## Publicarlo

`npm run build` deja todo en `dist/`. Son archivos estáticos: se copian y listo.

- **nginx en el VPS** (el mismo host donde corre la app, ver
  `nutricionista-app/docs/DESPLIEGUE.md`): un `server` aparte con `root`
  apuntando a `dist/`.
- **Netlify, Vercel, Cloudflare Pages**: detectan Astro solos. Comando
  `npm run build`, carpeta `dist`.

```nginx
server {
    server_name nutrioffice.com.ar;
    root /var/www/pagina-presentacion/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /404.html;
    }
}
```

Antes de publicar, cambiá `site` en `astro.config.mjs`: de ahí salen la URL
canónica y las de las metaetiquetas para redes.

## Por qué se ve como la app

Los colores **son los mismos**, copiados de
`nutricionista-app/src/app/globals.css` como variables CSS en HSL: coral
`356 88% 64%`, fondo `240 8% 96%`, radio `0.75rem`, y el modo oscuro con los
mismos valores que el `.dark` del producto. La tipografía es Figtree, la que usa
el layout raíz. El patrón de puntos es la misma utilidad `patron-puntos`.

Si en la app se mueve un token, hay que moverlo acá también: son dos copias a
mano, y esa es la contra de no compartir build.

Los **íconos** son lucide, los mismos de la app, pero embebidos como `<symbol>`
en `componentes/HojaIconos.astro` en lugar de instalados. Cada uso es un
`<Icono nombre="users" />` de 40 bytes. Para sumar uno, copiá su contenido de
[lucide.dev](https://lucide.dev/icons) dentro de un nuevo `<symbol>`.

Las **maquetas de la app** (`MaquetaPanel`, `MaquetaTurnos`,
`MaquetaPlanSemanal`, `MaquetaAntropometria`, `MaquetaMensajes`) están dibujadas
en HTML y CSS, no son capturas de pantalla. Pesan unos 2 KB cada una, se ven
nítidas en cualquier densidad, siguen el tema claro u oscuro del visitante y no
envejecen con el próximo rediseño de una pantalla. A cambio, hay que acordarse
de actualizarlas cuando la app cambie de verdad.

Los nombres de los pacientes en esas maquetas son **barras grises, no nombres
inventados**: es una ilustración, no una captura.

## La marca

El logo vigente es **un solo archivo**: `public/recursos/marca.svg`, que usan
la cabecera, el pie y el favicon. Hoy está puesta la propuesta **«el plato»**.

En `public/recursos/marcas/` hay seis propuestas, todas con el mismo coral, el
mismo grosor de trazo y construidas con geometría (arcos y rectas) para que
sean simétricas y aguanten el tamaño chico:

| Archivo          | Qué es                                                |
| ---------------- | ----------------------------------------------------- |
| `plato.svg`      | El método del plato: mitad, cuarto y cuarto           |
| `hoja.svg`       | Hoja geométrica con nervadura                         |
| `pulso.svg`      | El latido en un círculo (evolución del ícono anterior) |
| `anillo.svg`     | Anillo de progreso con punto al centro                |
| `monograma.svg`  | Una N con punto, como logotipo                        |
| `tazon.svg`      | Un bol con un brote                                   |

Para cambiar de marca se copia una encima de la vigente:

```bash
cp public/recursos/marcas/hoja.svg public/recursos/marca.svg
```

**`/marca/` es la página para elegir**: muestra cada propuesta grande, a 48, 32
y 16 píxeles, como ícono de app (blanca sobre coral), sobre fondo claro y al
lado del nombre, con lo que cada una tiene a favor y en contra. No está
enlazada desde ningún lado y lleva `noindex`; cuando haya una elegida, se borra
el archivo y listo.

Falta, cuando la marca esté definida: la versión de una tinta para el membrete
y el PDF del plan, y los PNG de 192 y 512 píxeles para reemplazar los íconos de
la PWA de la app (`nutricionista-app/public/iconos/`), que hoy llevan el logo
del consultorio y no el del producto.

## Lo que se mueve

Todo lo interactivo está en `guiones/interacciones.js`, escrito a mano y sin
dependencias:

- Pestañas de pantallas, con teclado (flechas, Inicio, Fin) y roles ARIA.
- Contadores que suben al entrar en pantalla.
- Brillo que sigue al cursor dentro de las tarjetas.
- La maqueta de la portada se inclina siguiendo el mouse.
- Barra de progreso de lectura en la cabecera y resaltado de la sección vigente.
- Aparición de las secciones al scrollear y barras que se llenan.
- Cinta de integraciones (es CSS puro; se pausa al pasar el mouse).
- Tema claro/oscuro con memoria, y menú del teléfono.

**Nada de eso es contenido.** Sin JavaScript la página se lee entera: las cuatro
pantallas quedan una abajo de la otra, las preguntas se despliegan igual (son
`<details>`) y no falta ni un párrafo. Eso lo sostiene la clase `con-js`, que
pone un guion en el `<head>` antes de pintar: los estilos que esconden algo para
animarlo cuelgan de esa clase, así que si el JavaScript no carga, no esconden
nada.

## Accesibilidad y rendimiento

- Respeta `prefers-reduced-motion`: sin animaciones de entrada, sin cinta en
  movimiento, sin inclinación y sin contadores.
- **Abre en oscuro siempre**, y el botón de la cabecera lo pasa a claro y lo
  recuerda. No se mira `prefers-color-scheme`: el tema es una decisión de la
  marca. En `global.css` está anotado cómo devolvérsela al sistema operativo
  si algún día se prefiere eso.
- Navegable con teclado, con enlace de salto al contenido y foco visible.
- Una sola petición a un tercero: la tipografía de Google Fonts. Si hiciera
  falta cortar hasta eso, se descarga Figtree a `public/recursos/` y se
  reemplaza el `<link>` de `Base.astro` por un `@font-face`.

## Qué tocar cuando cambie algo

- **El logo** → `public/recursos/marca.svg` (ver «La marca»). **El nombre** →
  los dos `.marca` de `Cabecera.astro` y `Pie.astro`.
- **El correo de contacto** → `Cierre.astro`, `Pie.astro` y las dos páginas
  legales. Hoy es `hola@nutrioffice.com.ar`, que es un marcador: la política
  de privacidad declara como contacto `nicolasis14@hotmail.com`.
- **Los colores** → `:root` en `global.css` es el tema oscuro (el de casa) y
  `:root[data-tema="claro"]` es el claro. Los dos bloques tienen los mismos
  nombres de variable.
- **Una función nueva de la app** → un objeto más en la lista de
  `Modulos.astro`. La grilla es `auto-fit`: no hay que tocar el CSS.
- **Una página nueva** → un archivo en `src/pages/`, envuelto en `Base` (o en
  `Texto`, si es texto largo). La cabecera y el pie ya vienen puestos; si va en
  el menú, sumala a la lista de `Cabecera.astro` o de `Pie.astro`.
