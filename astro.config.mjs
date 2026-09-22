// @ts-check
import { defineConfig } from "astro/config";

/**
 * Sitio estático: Astro compila a HTML y lo deja en `dist/`, que es lo que se
 * publica. No hay servidor ni adaptador porque no hace falta ninguno.
 *
 * Las carpetas `src/pages` y `public` llevan nombre en inglés porque las exige
 * el framework; el resto del proyecto sigue en castellano.
 */
export default defineConfig({
  // De acá salen la URL canónica de cada página y las de las metaetiquetas
  // sociales. La app vive aparte, en app.nutrioffice.com.ar.
  site: "https://nutrioffice.com.ar",
  // Sin `build.format`: cada página queda como `privacidad/index.html`, que es
  // lo que cualquier servidor estático resuelve sin reescrituras ni reglas.
  devToolbar: { enabled: false },
});
