#!/usr/bin/env node
/**
 * Revisa el sitio ya compilado (`dist/`) y falla si encuentra algo roto.
 *
 * Corre en CI después de `npm run build` y antes de subir nada. Busca las
 * cuatro cosas que en un sitio estático se rompen en silencio —el build no se
 * entera y el navegador tampoco avisa—:
 *
 *   1. Etiquetas mal cerradas o cruzadas.
 *   2. `id` repetidos en una misma página (rompen los anclas y el aria).
 *   3. Íconos usados con `<use href="#i-…">` que no tienen su `<symbol>`.
 *   4. Anclas internas que apuntan a un id que no existe.
 *   5. Reglas CSS con alcance de Astro que no le pegan a ningún elemento.
 *
 * La 5 es la más traicionera y ya pasó: estilar en un componente una clase que
 * en realidad se dibuja adentro de otro. Astro le agrega el atributo de alcance
 * al selector, ese atributo nunca coincide, y la regla no hace nada. Compila
 * perfecto y el estilo simplemente no aparece.
 *
 *   node scripts/verificar-sitio.mjs
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(RAIZ, "dist");

/** Etiquetas que no llevan cierre, para no contarlas en el balance. */
const VACIAS = new Set([
  "meta",
  "link",
  "img",
  "br",
  "hr",
  "input",
  "source",
  "use",
  "stop",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
]);

async function archivosCon(extension, directorio = DIST) {
  const salida = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory())
      salida.push(...(await archivosCon(extension, ruta)));
    else if (entrada.name.endsWith(extension)) salida.push(ruta);
  }
  return salida;
}

/** Los fallos de una página. Devuelve una lista de textos. */
function revisarPagina(html) {
  const fallas = [];

  // Sin comentarios, scripts ni estilos: adentro hay `<` y `>` que no son
  // etiquetas y ensuciarían el balance.
  const limpio = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");

  const pila = [];
  const etiquetas =
    /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let etiqueta;
  while ((etiqueta = etiquetas.exec(limpio))) {
    const nombre = etiqueta[2].toLowerCase();
    const autocerrada = etiqueta[3].trimEnd().endsWith("/");
    if (nombre === "!doctype" || VACIAS.has(nombre) || autocerrada) continue;
    if (etiqueta[1] !== "/") pila.push(nombre);
    else if (pila.pop() !== nombre)
      fallas.push(`cierre cruzado en </${nombre}>`);
  }
  if (pila.length) fallas.push(`etiquetas sin cerrar: ${pila.join(", ")}`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const repetidos = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  if (repetidos.length) fallas.push(`ids repetidos: ${repetidos.join(", ")}`);

  const usos = [
    ...new Set([...html.matchAll(/href="#(i-[a-z0-9-]+)"/g)].map((m) => m[1])),
  ];
  const simbolos = new Set(
    [...html.matchAll(/<symbol id="(i-[a-z0-9-]+)"/g)].map((m) => m[1]),
  );
  const huerfanos = usos.filter((u) => !simbolos.has(u));
  if (huerfanos.length)
    fallas.push(`íconos sin <symbol>: ${huerfanos.join(", ")}`);

  const anclas = [
    ...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])),
  ].filter((a) => !a.startsWith("i-"));
  const rotas = anclas.filter((a) => !ids.includes(a));
  if (rotas.length)
    fallas.push(`anclas a un id inexistente: ${rotas.join(", ")}`);

  return fallas;
}

/** Selectores con alcance de Astro que no matchean ningún elemento del sitio. */
async function revisarSelectores(paginas) {
  const presentes = new Set();
  for (const html of paginas) {
    for (const etiqueta of html.match(/<[a-zA-Z][^>]*>/g) || []) {
      const alcance = etiqueta.match(/data-astro-cid-([a-z0-9-]+)/);
      const clases = etiqueta.match(/class="([^"]*)"/);
      if (!alcance || !clases) continue;
      for (const clase of clases[1].split(/\s+/).filter(Boolean)) {
        presentes.add(`${clase}|${alcance[1]}`);
      }
    }
  }

  const muertos = new Set();
  for (const ruta of await archivosCon(".css")) {
    const css = await readFile(ruta, "utf8");
    // Astro minifica quitando las comillas del atributo.
    for (const par of css.matchAll(
      /\.([a-zA-Z][\w-]*)\[data-astro-cid-([a-z0-9-]+)\]/g,
    )) {
      if (!presentes.has(`${par[1]}|${par[2]}`)) muertos.add("." + par[1]);
    }
  }
  return [...muertos];
}

async function principal() {
  try {
    await stat(DIST);
  } catch {
    console.error("No existe dist/. Corré `npm run build` antes.");
    process.exit(1);
  }

  let problemas = 0;
  const paginas = [];

  for (const ruta of await archivosCon(".html")) {
    const html = await readFile(ruta, "utf8");
    paginas.push(html);

    const nombre = ruta.slice(DIST.length).split(path.sep).join("/");
    const peso = String(Math.round(Buffer.byteLength(html) / 1024)).padStart(4);
    const fallas = revisarPagina(html);

    problemas += fallas.length;
    console.log(
      `${nombre.padEnd(26)} ${peso} KB  ` +
        (fallas.length ? "FALLA: " + fallas.join(" | ") : "ok"),
    );
  }

  const muertos = await revisarSelectores(paginas);
  if (muertos.length) {
    problemas += muertos.length;
    console.log(
      `\nFALLA: selectores con alcance que no matchean nada: ${muertos.join(", ")}`,
    );
  }

  if (problemas) {
    console.error(`\n${problemas} problema(s). No se despliega.`);
    process.exit(1);
  }
  console.log("\nSin problemas.");
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
