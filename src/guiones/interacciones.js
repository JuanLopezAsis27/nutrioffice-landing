/*
 * NutriOffice — interacciones de la página de presentación.
 *
 * Todo lo de acá es opcional. Sin JavaScript la página se lee entera, en su
 * tema oscuro, con las cuatro pantallas una abajo de la otra y las preguntas
 * desplegables (que son <details> y no necesitan guiones). Lo que este archivo
 * agrega es movimiento, no contenido.
 *
 * Por eso la clase `con-js`: los estilos que esconden algo —la aparición al
 * scrollear, las barras que crecen— solo se aplican si este archivo corre.
 */

const raiz = document.documentElement;
const sinMovimiento = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* =========================== TEMA CLARO / OSCURO =========================== */

const CLAVE_TEMA = "nutrioffice-tema";

/**
 * El tema vigente. Sin elección previa es el OSCURO: es el tema de casa, no el
 * del sistema operativo del visitante (ver el comentario de global.css).
 */
function temaVigente() {
  return raiz.getAttribute("data-tema") || "oscuro";
}

/** La barra de estado del teléfono, del color del fondo que esté puesto. */
function tenirBarraDelTelefono(tema) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "claro" ? "#F1F1F3" : "#161618");
}

// El almacenamiento puede fallar (ventana privada, cookies bloqueadas): que no
// se pueda recordar la elección no puede romper la página.
try {
  const guardado = window.localStorage.getItem(CLAVE_TEMA);
  if (guardado === "claro" || guardado === "oscuro") {
    raiz.setAttribute("data-tema", guardado);
    tenirBarraDelTelefono(guardado);
  }
} catch {
  /* sin almacenamiento: queda el tema oscuro de casa */
}

document.getElementById("alternar-tema")?.addEventListener("click", () => {
  const nuevo = temaVigente() === "oscuro" ? "claro" : "oscuro";
  raiz.setAttribute("data-tema", nuevo);
  tenirBarraDelTelefono(nuevo);
  try {
    window.localStorage.setItem(CLAVE_TEMA, nuevo);
  } catch {
    /* ídem: la elección vale para esta visita */
  }
});

/* =============================== MENÚ MÓVIL =============================== */

const botonMenu = document.getElementById("alternar-menu");
const nav = document.getElementById("nav");

function cerrarMenu() {
  if (!nav || !botonMenu) return;
  nav.classList.remove("abierto");
  botonMenu.setAttribute("aria-expanded", "false");
  botonMenu.setAttribute("aria-label", "Abrir el menú");
}

if (botonMenu && nav) {
  botonMenu.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    botonMenu.setAttribute("aria-expanded", String(abierto));
    botonMenu.setAttribute(
      "aria-label",
      abierto ? "Cerrar el menú" : "Abrir el menú",
    );
  });

  // Tocar un enlace navega a la sección: dejar el panel abierto la taparía.
  nav.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) cerrarMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrarMenu();
  });

  // Al pasar a escritorio el panel deja de existir como tal: si quedara la
  // clase puesta, el menú aparecería como una columna suelta bajo la barra.
  window
    .matchMedia("(min-width: 881px)")
    .addEventListener("change", cerrarMenu);
}

/* ================== CABECERA: SOMBRA Y BARRA DE PROGRESO ================== */

const cabecera = document.getElementById("cabecera");
const progreso = document.getElementById("progreso");

if (cabecera || progreso) {
  let pendiente = false;

  const alScrollear = () => {
    if (pendiente) return;
    pendiente = true;
    // Un solo cálculo por cuadro: el evento de scroll llega muchas más veces.
    window.requestAnimationFrame(() => {
      pendiente = false;
      cabecera?.classList.toggle("desplazada", window.scrollY > 8);

      if (progreso) {
        const recorrible = document.body.scrollHeight - window.innerHeight;
        const leido = recorrible > 0 ? (window.scrollY / recorrible) * 100 : 0;
        progreso.style.setProperty("--leido", `${Math.min(100, leido)}%`);
      }
    });
  };

  alScrollear();
  window.addEventListener("scroll", alScrollear, { passive: true });
  window.addEventListener("resize", alScrollear);
}

/* ================================ CONTADORES ================================ */

/** Sube de 0 al valor escrito en el HTML. Si algo falla, el número ya está. */
function contar(elemento) {
  const destino = Number(elemento.dataset.contar);
  if (!Number.isFinite(destino) || sinMovimiento) return;

  const duracion = 900;
  const arranque = performance.now();

  const paso = (ahora) => {
    const avance = Math.min(1, (ahora - arranque) / duracion);
    // Desaceleración cúbica: arranca rápido y frena al final.
    const suavizado = 1 - Math.pow(1 - avance, 3);
    elemento.textContent = String(Math.round(destino * suavizado));
    if (avance < 1) window.requestAnimationFrame(paso);
  };

  elemento.textContent = "0";
  window.requestAnimationFrame(paso);
}

/* ===================== APARICIÓN AL ENTRAR EN PANTALLA ===================== */

// El largo real de la línea del gráfico, para que se dibuje sola. Se mide acá
// porque depende del tamaño renderizado, no de un atributo.
document.querySelectorAll(".linea-animada").forEach((linea) => {
  try {
    linea.style.setProperty("--largo", String(linea.getTotalLength()));
  } catch {
    /* si el navegador no puede medirla, se ve dibujada de entrada */
  }
});

const revelables = document.querySelectorAll(".revelar");

function revelar(elemento) {
  elemento.classList.add("visible");
  elemento.querySelectorAll("[data-contar]").forEach(contar);
}

if (sinMovimiento || !("IntersectionObserver" in window)) {
  revelables.forEach(revelar);
} else {
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        revelar(entrada.target);
        observador.unobserve(entrada.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
  );

  revelables.forEach((elemento, indice) => {
    // Escalón corto dentro de cada grilla: las tarjetas entran en cascada sin
    // que la última se haga esperar.
    elemento.style.transitionDelay = `${(indice % 4) * 70}ms`;
    observador.observe(elemento);
  });
}

/* ====================== SECCIÓN VIGENTE EN EL MENÚ ====================== */

const enlacesSeccion = document.querySelectorAll(".nav a[data-seccion]");

if (enlacesSeccion.length && "IntersectionObserver" in window) {
  const porSeccion = new Map();
  enlacesSeccion.forEach((enlace) => {
    const seccion = document.getElementById(enlace.dataset.seccion);
    if (seccion) porSeccion.set(seccion, enlace);
  });

  const vigilante = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        const enlace = porSeccion.get(entrada.target);
        if (!enlace || !entrada.isIntersecting) return;
        enlacesSeccion.forEach((otro) => otro.classList.remove("activa"));
        enlace.classList.add("activa");
      });
    },
    // La franja del medio de la pantalla: la sección vigente es la que se está
    // mirando, no la que asoma por abajo.
    { rootMargin: "-45% 0px -50% 0px" },
  );

  porSeccion.forEach((_, seccion) => vigilante.observe(seccion));
}

/* ================================= PESTAÑAS ================================= */

document.querySelectorAll("[data-pestanas]").forEach((grupo) => {
  const pestanas = [...grupo.querySelectorAll('[role="tab"]')];
  const vistas = [...grupo.querySelectorAll('[role="tabpanel"]')];
  if (!pestanas.length || pestanas.length !== vistas.length) return;

  const activar = (indice, mover = true) => {
    pestanas.forEach((pestana, i) => {
      const activa = i === indice;
      pestana.setAttribute("aria-selected", String(activa));
      pestana.classList.toggle("activa", activa);
      // Solo la pestaña activa queda en el recorrido del tabulador: dentro del
      // grupo se navega con las flechas, que es lo que se espera de un tablist.
      pestana.tabIndex = activa ? 0 : -1;
    });

    vistas.forEach((vista, i) => {
      const activa = i === indice;
      vista.hidden = !activa;
      if (activa) vista.setAttribute("data-activa", "");
      else vista.removeAttribute("data-activa");
    });

    if (mover) pestanas[indice].focus();
  };

  pestanas.forEach((pestana, indice) => {
    pestana.addEventListener("click", () => activar(indice, false));

    pestana.addEventListener("keydown", (evento) => {
      const saltos = { ArrowRight: 1, ArrowLeft: -1 };

      if (evento.key in saltos) {
        evento.preventDefault();
        activar(
          (indice + saltos[evento.key] + pestanas.length) % pestanas.length,
        );
      } else if (evento.key === "Home") {
        evento.preventDefault();
        activar(0);
      } else if (evento.key === "End") {
        evento.preventDefault();
        activar(pestanas.length - 1);
      }
    });
  });

  // Hasta acá las vistas estaban apiladas, que es como se ven sin JavaScript.
  // Recién ahora se esconden las que no están activas.
  const inicial = vistas.findIndex((vista) =>
    vista.hasAttribute("data-activa"),
  );
  activar(inicial === -1 ? 0 : inicial, false);
});

/* ===================== BRILLO QUE SIGUE AL CURSOR ===================== */

if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll("[data-brillo]").forEach((grilla) => {
    let cuadro = 0;

    grilla.addEventListener(
      "pointermove",
      (evento) => {
        const tarjeta = evento.target.closest(".tarjeta");
        if (!tarjeta || cuadro) return;

        // Un solo recálculo por cuadro: pointermove dispara decenas por segundo.
        cuadro = window.requestAnimationFrame(() => {
          cuadro = 0;
          const caja = tarjeta.getBoundingClientRect();
          tarjeta.style.setProperty("--x", `${evento.clientX - caja.left}px`);
          tarjeta.style.setProperty("--y", `${evento.clientY - caja.top}px`);
        });
      },
      { passive: true },
    );
  });
}

/* =================== LA MAQUETA SE INCLINA CON EL MOUSE =================== */

const puedeInclinar =
  !sinMovimiento &&
  window.matchMedia("(hover: hover) and (min-width: 1041px)").matches;

if (puedeInclinar) {
  document.querySelectorAll("[data-inclinable]").forEach((marco) => {
    const pieza = marco.querySelector(".maqueta");
    if (!pieza) return;

    let cuadro = 0;

    marco.addEventListener(
      "pointermove",
      (evento) => {
        if (cuadro) return;
        cuadro = window.requestAnimationFrame(() => {
          cuadro = 0;
          const caja = marco.getBoundingClientRect();
          // De -0,5 a 0,5 tomando el centro del marco como origen.
          const x = (evento.clientX - caja.left) / caja.width - 0.5;
          const y = (evento.clientY - caja.top) / caja.height - 0.5;
          pieza.style.transform = `rotateY(${-4 + x * 9}deg) rotateX(${2 - y * 7}deg)`;
        });
      },
      { passive: true },
    );

    marco.addEventListener("pointerleave", () => {
      // Vuelve a la inclinación de reposo, que la define el CSS.
      pieza.style.transform = "";
    });
  });
}

/* ================================ AÑO DEL PIE ================================ */

const anio = document.getElementById("anio");
if (anio) anio.textContent = String(new Date().getFullYear());
