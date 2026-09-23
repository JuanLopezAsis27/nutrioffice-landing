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
npm run verificar  # revisa el dist/ compilado (lo mismo que corre el CI)
npm run publicar   # compila, verifica y sube al VPS a mano
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
scripts/
  verificar-sitio.mjs  <- lo que corre el CI sobre dist/
  publicar.sh          <- despliegue a mano, mismo procedimiento que Actions
.github/workflows/
  ci.yml          <- ramas y pull requests: compila y verifica
  desplegar.yml   <- main: compila, verifica y publica
```

**Dónde va cada estilo:** lo que se repite en toda la página —colores,
botones, tarjetas, grillas, tipografía— vive en `global.css`. Lo que es propio
de una sección va en el `<style>` de su componente, que Astro limita a ese
componente solo. Si dudás: ¿lo usa más de una sección? Entonces es global.

**El contenido va adentro del componente que lo muestra**, como una lista al
principio del archivo (mirá `Modulos.astro` o `Preguntas.astro`). Para sumar un
módulo o una pregunta se agrega un objeto a esa lista y listo: no hay que tocar
el HTML ni el CSS.

## Publicarlo: CI/CD desde GitHub

**Cada push a `main` publica el sitio.** No hay que correr nada a mano.

```
push a main
   ↓
GitHub Actions: npm ci → npm run build → npm run verificar
   ↓  (si algo falla acá, no se toca el servidor)
rsync de dist/ → VPS:  apps/nutrioffice-landing/releases/<fecha>-<sha>/
   ↓
mv del enlace `current` → la versión nueva     ← el sitio cambia acá, de golpe
   ↓
curl al dominio para confirmar que responde
```

El sitio es estático, así que **nginx no hace de reverse proxy: sirve los
archivos él mismo**. El proxy inverso es cosa de la app
(`app.nutrioffice.com.ar`), que es un proceso Node en Docker; la landing no
tiene proceso que proxear.

### Por qué una carpeta por versión y un enlace

Subir con `rsync` encima de la carpeta que nginx está sirviendo deja una
ventana —corta, pero real— en la que hay archivos nuevos y viejos mezclados: el
HTML nuevo pidiendo un `_astro/` que todavía no subió, y el visitante mirando
una página rota.

Con una carpeta por versión, la subida no toca nada de lo que se está
sirviendo. Cambiar de versión es mover un enlace simbólico, que en Linux es un
`rename(2)`: **atómico**. Se ve la anterior o la nueva, nunca media subida. Y
volver atrás es mover el enlace de nuevo, sin compilar.

```
/home/deploy/apps/nutrioffice-landing/
├── current -> releases/20260922-141230-a1b2c3d     ← lo que mira nginx
└── releases/
    ├── 20260922-141230-a1b2c3d/
    ├── 20260922-103015-9f8e7d6/
    └── …                                           (se guardan las 5 últimas)
```

### Preparar el VPS (una sola vez)

```bash
# Como el usuario de despliegue, siguiendo la convención del resto de tus apps:
mkdir -p ~/apps/nutrioffice-landing/releases

# nginx corre como www-data y tiene que poder ATRAVESAR el home para llegar al
# sitio. Sin esto da 403 y el error de nginx dice "Permission denied" sobre una
# ruta que existe y se lee perfecto desde tu sesión.
chmod o+x /home/deploy /home/deploy/apps
chmod -R a+rX ~/apps/nutrioffice-landing
```

### La clave de despliegue

Se genera una clave **exclusiva para esto**, sin frase de paso (Actions no
puede escribirla) y sin acceso a nada más:

**En Windows, correlo en Git Bash**, no en PowerShell: PowerShell 5.1 no
expande `~` para los programas externos, se come el `-N ""` y no trae
`ssh-copy-id`. Git Bash trae los tres comandos. SSH del VPS está en el
**2222**.

```bash
# En tu máquina (Git Bash):
ssh-keygen -t ed25519 -C "actions-landing" -f ~/.ssh/nutrioffice-landing -N ""

# La PÚBLICA va al VPS, en el usuario de despliegue:
ssh-copy-id -p 2222 -i ~/.ssh/nutrioffice-landing.pub deploy@TU_VPS

# La línea de known_hosts, para que Actions verifique al servidor.
# Con -p sale como [TU_VPS]:2222, que es como ssh la busca en ese puerto:
ssh-keyscan -p 2222 -H TU_VPS
```

Si igual querés hacerlo desde PowerShell, el `ssh-copy-id` se reemplaza por:

```powershell
Get-Content "$env:USERPROFILE\.ssh\nutrioffice-landing.pub" |
  ssh -p 2222 deploy@TU_VPS "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Los secretos de GitHub

En **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto        | Qué va                                                        |
| -------------- | ------------------------------------------------------------- |
| `VPS_HOST`     | IP o dominio del VPS                                           |
| `VPS_USUARIO`  | `deploy`                                                       |
| `VPS_RUTA`     | `/home/deploy/apps/nutrioffice-landing`                        |
| `VPS_SSH_KEY`  | El contenido de `~/.ssh/nutrioffice-landing` (la **privada**) |
| `VPS_HOST_KEY` | La salida de `ssh-keyscan -p 2222 -H TU_VPS`                   |
| `VPS_PUERTO`   | `2222` (si falta, el workflow usa 2222 igual)                  |

Y en la pestaña **Variables** (no es secreto, y así aparece en el log):

| Variable     | Qué va                        |
| ------------ | ----------------------------- |
| `URL_SITIO`  | `https://nutrioffice.com.ar`  |

> **`VPS_HOST_KEY` y no un `ssh-keyscan` dentro del workflow.** Escanear en cada
> corrida es confiar en quien conteste en ese momento, que es exactamente lo
> que la verificación del host existe para evitar. Con el secreto, si un día el
> servidor que contesta no es el tuyo, el despliegue falla en vez de subirle
> los archivos.

### El `server` de nginx

`/etc/nginx/sites-available/nutrioffice-landing`:

```nginx
# http → https, y www → sin www (una sola URL canónica).
server {
    listen 80;
    listen [::]:80;
    server_name nutrioffice.com.ar www.nutrioffice.com.ar;
    return 301 https://nutrioffice.com.ar$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.nutrioffice.com.ar;
    return 301 https://nutrioffice.com.ar$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name nutrioffice.com.ar;

    # El enlace que mueve el despliegue. nginx lo resuelve en cada pedido, así
    # que la versión nueva entra sin recargar nada.
    root /home/deploy/apps/nutrioffice-landing/current;
    index index.html;

    # certbot completa estas dos líneas al correr `certbot --nginx`:
    # ssl_certificate     /etc/letsencrypt/live/nutrioffice.com.ar/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/nutrioffice.com.ar/privkey.pem;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;
    gzip_min_length 1024;

    # Los archivos de _astro/ llevan el hash del contenido en el nombre: si el
    # contenido cambia, cambia la URL. Se pueden cachear para siempre.
    location /_astro/ {
        include snippets/cabeceras-landing.conf;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /recursos/ {
        include snippets/cabeceras-landing.conf;
        expires 30d;
        add_header Cache-Control "public";
    }

    # El HTML NO se cachea: es lo que trae las referencias nuevas a los assets.
    # Sin esto, alguien que ya visitó el sitio sigue viendo la versión vieja.
    location / {
        include snippets/cabeceras-landing.conf;
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
}
```

`/etc/nginx/snippets/cabeceras-landing.conf`:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Activar y emitir el certificado:

```bash
sudo ln -s /etc/nginx/sites-available/nutrioffice-landing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nutrioffice.com.ar -d www.nutrioffice.com.ar
```

**Tres detalles de nginx que se pasan por alto:**

- **Las cabeceras van en un snippet incluido, no sueltas en el `server`.** nginx
  hereda los `add_header` del nivel de arriba **solo si el bloque de abajo no
  define ninguno**. Como los tres `location` definen su propio `Cache-Control`,
  las cabeceras de seguridad del `server` se perderían justo ahí, en silencio.
- **`try_files … =404` y no `… /404.html`.** Con `=404` más `error_page`, una
  dirección inexistente muestra la página 404 del sitio **con estado 404 de
  verdad**. Apuntando directo al archivo se sirve con 200 y Google la indexa
  como si fuera contenido.
- **El `root` apunta al enlace `current`, no a una carpeta fija.** Si apunta a
  una release concreta, el despliegue sube archivos que nadie sirve.

### Volver a la versión anterior

```bash
ssh -p 2222 deploy@TU_VPS
cd ~/apps/nutrioffice-landing
ls -1dt releases/*/                 # la de arriba es la que está puesta
ln -sfn "$PWD/releases/LA_ANTERIOR" current.nuevo && mv -Tf current.nuevo current
```

Sin compilar nada y sin tocar nginx: el sitio vuelve en el tiempo que tarda un
`mv`.

### Publicar a mano

Para el primer despliegue —cuando todavía no hay secretos cargados— o para un
arreglo urgente con Actions caído:

Las variables van en un `.env.despliegue` en la raíz (ignorado por git):

```bash
VPS_HOST=TU_VPS
VPS_USUARIO=deploy
VPS_PUERTO=2222
VPS_RUTA=/home/deploy/apps/nutrioffice-landing
```

y después, desde PowerShell o Git Bash:

```bash
npm run publicar
```

Hace lo mismo que el workflow: compila, verifica, sube una versión nueva y
mueve el enlace. **Anda en Windows**: el script solo necesita `bash`, `ssh` y
`tar`, que vienen con Git for Windows. Sube con `tar` por ssh en vez de `rsync`
porque Git Bash no trae `rsync` (y como cada versión va a una carpeta nueva,
no hay nada que sincronizar). Entra con tu clave SSH de siempre, no con la de
Actions.

> Si `npm run publicar` falla con algo de WSL, es que el `bash` que encuentra
> primero en el PATH es el de `C:\Windows\System32` y no el de Git. Corré
> `bash scripts/publicar.sh` desde Git Bash, después de `npm run build` y
> `npm run verificar`.

### Qué revisa el CI

`npm run verificar` (`scripts/verificar-sitio.mjs`) corre sobre el `dist/` ya
compilado y **falla el despliegue** si encuentra:

- Etiquetas mal cerradas o cruzadas.
- `id` repetidos en una página.
- Íconos usados con `<use href="#i-…">` que no tienen su `<symbol>`.
- Anclas internas que apuntan a un id que no existe.
- Reglas CSS con alcance de Astro que no le pegan a ningún elemento.

Las cinco son cosas que compilan perfecto y se rompen en silencio. La última ya
pasó una vez: estilar en un componente una clase que en realidad se dibuja
adentro de otro, con lo que Astro le agrega un atributo de alcance que nunca
coincide y la regla no hace nada.

En una **pull request** corre el mismo build y deja el sitio compilado como
artefacto descargable, para poder mirarlo sin compilarlo en la máquina propia.

### Si preferís no tocar un servidor

**Netlify, Vercel o Cloudflare Pages** detectan Astro solos: comando
`npm run build`, carpeta `dist`. Se conecta el repositorio y cada push publica,
sin secretos ni workflows. Es menos trabajo que lo de arriba; la contra es
depender de un tercero para algo que el VPS ya está haciendo.

### Antes del primer despliegue

Revisá que `site` en `astro.config.mjs` sea el dominio real
(`https://nutrioffice.com.ar`): de ahí salen la URL canónica de cada página y
las de las metaetiquetas para redes.

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

El isotipo es **anillo, manzana y pesa**: la nutrición y el deporte, que son las
dos mitades del consultorio.

**Tiene dos tintas.** El coral es fijo —el anillo grueso, la manzana y la hoja—.
La segunda tinta, el anillo fino exterior y la pesa, **se adapta al fondo**:
casi negra sobre claro, blanca sobre oscuro. Por eso la marca va **en línea**
(`src/componentes/Marca.astro`) y no como `<img>`: así hereda `currentColor` de
la página y un solo archivo sirve para los dos temas. Desde un `<img>` habría
que mantener dos versiones y acordarse de cambiar las dos.

| Archivo                                  | Qué es                                        | Dónde se usa                                   |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `src/componentes/Marca.astro`            | El isotipo en línea, segunda tinta adaptable   | Cabecera y pie                                  |
| `public/recursos/marca.svg`              | El isotipo sobre cuadrado oscuro redondeado    | Favicon y metaetiquetas sociales                |
| `marcas/nutrioffice.svg`                 | Suelto, con la tinta en blanco                 | Fondos oscuros; fuente de los íconos de la app  |
| `marcas/nutrioffice-tinta-oscura.svg`    | Suelto, con la tinta en casi negro             | Fondos claros: membrete, PDF del plan           |
| `marcas/nutrioffice-simple.svg`          | Solo anillo y manzana, trazo más grueso        | Por debajo de 32 px, donde la pesa se empasta   |

### De dónde salió

La lámina que entregó el diseño es un SVG de 3,8 MB que trae el símbolo como
**PNG incrustado**, no como vector: es un envoltorio alrededor de un bitmap de
594×469. Lo que hay en el repositorio es un **redibujo**: se midió ese bitmap
pieza por pieza —radios, grosores, alturas de los discos de la pesa, silueta de
la manzana— y se reconstruyó con círculos, rectángulos y curvas. Las medidas
coinciden con la referencia dentro de dos décimas en una caja de 64.

Tres detalles del dibujo que no son evidentes y conviene no "arreglar":

- El **anillo fino son dos arcos**, no un círculo: queda interrumpido donde pasa
  la pesa, y ese corte es parte del dibujo.
- La **pesa va por encima** de los anillos, cruzándolos.
- La **manzana es una silueta propia**. La `apple` de lucide es un contorno y,
  rellena, deja una muesca superior mucho más profunda que la de la marca.

**Los íconos de la aplicación salen de acá.** `nutrioffice.svg` está copiado en
`nutricionista-app/assets/marca/marca.svg`, y
`scripts/generar-iconos-pwa.mjs` genera desde ahí los cuatro PNG de la PWA, el
apple-icon, el icon de la pestaña y el favicon.ico: la marca sobre un cuadrado
**oscuro**, que es la versión oscura de la lámina. Sobre coral no funcionaría,
porque el anillo y la manzana también son corales. Si la marca cambia acá, hay
que copiar los SVG allá y volver a correr ese script.

**`/marca/` es la página de trabajo de la marca**: muestra el isotipo sobre los
dos fondos a 56, 32, 24 y 16 píxeles, al lado del nombre, la tabla de archivos y
las propuestas que se descartaron antes de que llegara esta. No está enlazada
desde ningún lado y lleva `noindex`.

Falta todavía la **versión de una tinta** (todo en negro o todo en blanco, sin
coral) para impresión a un color.

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

- **El logo** → `src/componentes/Marca.astro` (el que se ve en pantalla) y
  `public/recursos/marca.svg` (el favicon). Ver «La marca»: son cinco archivos
  y cada uno tiene su lugar. **El nombre** → los dos `.marca` de
  `Cabecera.astro` y `Pie.astro`.
- **El correo de contacto — PENDIENTE DE DECIDIR.** Hoy conviven dos: la
  política de privacidad declara `nicolasis14@hotmail.com` (es el texto legal
  aprobado) y el resto del sitio usa `hola@nutrioffice.com.ar`, que es un
  marcador. Cuando esté definido cuál va, se unifica en `Cierre.astro`,
  `Pie.astro` y las dos páginas legales.
- **Los colores** → `:root` en `global.css` es el tema oscuro (el de casa) y
  `:root[data-tema="claro"]` es el claro. Los dos bloques tienen los mismos
  nombres de variable.
- **Una función nueva de la app** → un objeto más en la lista de
  `Modulos.astro`. La grilla es `auto-fit`: no hay que tocar el CSS.
- **Una página nueva** → un archivo en `src/pages/`, envuelto en `Base` (o en
  `Texto`, si es texto largo). La cabecera y el pie ya vienen puestos; si va en
  el menú, sumala a la lista de `Cabecera.astro` o de `Pie.astro`.
