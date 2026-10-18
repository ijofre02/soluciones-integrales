/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

// Número de WhatsApp en formato internacional, solo dígitos
// (sin +, espacios ni guiones). Para celulares de Argentina: 54 + 9 + código de área sin 0 + número.
// TODO: completar con el número real de la empresa (solo si ese número tiene WhatsApp).
// Mientras esté vacío, los botones con data-whatsapp llevan a la página de contacto.
const WHATSAPP_NUMBER = "";

// URL de la aplicación web de Google Apps Script que recibe el formulario y manda el mail.
// TODO: pegar acá la URL que termina en /exec (ver apps-script/Code.gs para los pasos).
const APPS_SCRIPT_URL = "";

const PRODUCTS_URL = "data/productos.json";

// Horario de atención (0 = domingo ... 6 = sábado). null = cerrado todo el día.
const TIME_ZONE = "America/Argentina/Buenos_Aires";
const OPENING_HOURS = {
  0: null,
  1: ["09:00", "17:00"],
  2: ["09:00", "17:00"],
  3: ["09:00", "17:00"],
  4: ["09:00", "17:00"],
  5: ["09:00", "17:00"],
  6: ["09:00", "13:00"],
};
const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/* =========================================================
   WHATSAPP
   ========================================================= */

function setWhatsAppLink(link, message) {
  if (!WHATSAPP_NUMBER) return; // sin número, el link conserva su href de respaldo (página de contacto)

  link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
}

function setupWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    setWhatsAppLink(link, link.dataset.whatsapp);
  });
}

/* =========================================================
   MENÚ HAMBURGUESA
   ========================================================= */

const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const navigationList = document.querySelector(".navigation-list");

function setMenu(isOpen) {
  navigationList.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
}

menuToggle.addEventListener("click", () => {
  setMenu(!navigationList.classList.contains("is-open"));
});

// Al elegir una sección, el menú se cierra
navigationList.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});

// Escape cierra el menú y devuelve el foco al botón
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigationList.classList.contains("is-open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

// Un click fuera del header también lo cierra
document.addEventListener("click", (event) => {
  if (!siteHeader.contains(event.target)) setMenu(false);
});

/* =========================================================
   HEADER: se pone sólido al hacer scroll
   (en las páginas internas ya es sólido por CSS)
   ========================================================= */

function updateHeader() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

/* =========================================================
   CATÁLOGO DE EQUIPOS Y REPUESTOS (tienda.html)
   ========================================================= */

const catalogGrid = document.querySelector("#catalog-grid");
const catalogFilters = document.querySelector("#catalog-filters");
const catalogSearch = document.querySelector("#catalog-search");
const catalogStatus = document.querySelector("#catalog-status");

const ALL_CATEGORIES = "Todos";
let allProducts = [];
let activeCategory = ALL_CATEGORIES;

// Saca tildes y mayúsculas para que "helice" encuentre "Hélice"
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matchesSearch(product, query) {
  if (!query) return true;
  const haystack = normalize(
    [product.nombre, product.categoria, product.marca, product.descripcion].join(" ")
  );
  return haystack.includes(normalize(query));
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  if (product.imagen) {
    const image = document.createElement("img");
    image.src = product.imagen;
    image.alt = product.nombre;
    image.loading = "lazy";
    card.append(image);
  }

  const category = document.createElement("p");
  category.className = "product-category";
  category.textContent = product.categoria;

  const name = document.createElement("h3");
  name.textContent = product.nombre;

  card.append(category, name);

  if (product.marca) {
    const brand = document.createElement("p");
    brand.className = "product-brand";
    brand.textContent = product.marca;
    card.append(brand);
  }

  if (product.descripcion) {
    const description = document.createElement("p");
    description.className = "product-desc";
    description.textContent = product.descripcion;
    card.append(description);
  }

  // Sin WhatsApp configurado, lleva al formulario con el mensaje ya escrito
  const message = `Hola, quiero consultar por: ${product.nombre}`;
  const link = document.createElement("a");
  link.className = "btn-secondary";
  link.href = `contacto.html?consulta=${encodeURIComponent(message)}`;
  link.textContent = "Consultar";
  setWhatsAppLink(link, message);
  card.append(link);

  return card;
}

function renderProducts() {
  const query = catalogSearch.value.trim();
  const visible = allProducts.filter(
    (product) =>
      (activeCategory === ALL_CATEGORIES || product.categoria === activeCategory) &&
      matchesSearch(product, query)
  );

  catalogGrid.replaceChildren(...visible.map(createProductCard));

  catalogStatus.textContent = visible.length
    ? `Mostrando ${visible.length} de ${allProducts.length} productos.`
    : "No encontramos productos con ese criterio. Consultanos y lo buscamos.";
}

function renderFilters() {
  const categories = [ALL_CATEGORIES, ...new Set(allProducts.map((p) => p.categoria))];

  const buttons = categories.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === activeCategory));

    button.addEventListener("click", () => {
      activeCategory = category;
      catalogFilters
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      renderProducts();
    });

    return button;
  });

  catalogFilters.replaceChildren(...buttons);
}

async function initCatalog() {
  if (!catalogGrid) return;

  try {
    const response = await fetch(PRODUCTS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allProducts = data.productos;

    // tienda.html?categoria=Repuestos abre el catálogo ya filtrado
    const requested = new URLSearchParams(window.location.search).get("categoria");
    if (requested && allProducts.some((product) => product.categoria === requested)) {
      activeCategory = requested;
    }

    renderFilters();
    renderProducts();
    catalogSearch.addEventListener("input", renderProducts);
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    catalogStatus.textContent =
      "No pudimos cargar el catálogo en este momento. Llamanos o escribinos y te asesoramos.";
  }
}

/* =========================================================
   HORARIO: "Abierto ahora" / "Cerrado ahora" (contacto.html)
   ========================================================= */

// Día de la semana y minutos desde la medianoche, en hora argentina
function getLocalTime(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));

  return { day, minutes };
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getOpenStatus(date = new Date()) {
  const { day, minutes } = getLocalTime(date);
  const today = OPENING_HOURS[day];

  if (today && minutes >= toMinutes(today[0]) && minutes < toMinutes(today[1])) {
    return { isOpen: true, text: `Abierto ahora · cierra a las ${today[1]} h` };
  }

  if (today && minutes < toMinutes(today[0])) {
    return { isOpen: false, text: `Cerrado ahora · abre hoy a las ${today[0]} h` };
  }

  // Ya cerró hoy (o hoy no abre): buscamos el próximo día con horario
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (day + offset) % 7;
    const hours = OPENING_HOURS[nextDay];
    if (hours) {
      const when = offset === 1 ? "mañana" : `el ${DAY_NAMES[nextDay]}`;
      return { isOpen: false, text: `Cerrado ahora · abre ${when} a las ${hours[0]} h` };
    }
  }

  return { isOpen: false, text: "Cerrado ahora" };
}

function setupOpenStatus() {
  const element = document.querySelector("#open-status");
  if (!element) return;

  function update() {
    const status = getOpenStatus();
    element.textContent = status.text;
    element.classList.toggle("is-open", status.isOpen);
    element.classList.toggle("is-closed", !status.isOpen);
  }

  update();
  setInterval(update, 60 * 1000);
}

/* =========================================================
   FORMULARIO DE CONTACTO (contacto.html)
   Envía los datos a Google Apps Script, que manda el mail a Gmail.
   ========================================================= */

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const status = document.querySelector("#form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton.textContent;

  function showStatus(message, type) {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    status.classList.add(type === "success" ? "is-success" : "is-error");
  }

  // Si se llega desde un producto (contacto.html?consulta=...), dejamos el mensaje escrito
  const consulta = new URLSearchParams(window.location.search).get("consulta");
  if (consulta) {
    form.elements.mensaje.value = consulta.slice(0, 300);
    form.elements.servicio.value = "Compra de equipos o repuestos";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // el navegador ya validó los campos obligatorios

    if (!APPS_SCRIPT_URL) {
      showStatus(
        "El formulario todavía no está conectado. Llamanos al 0266 526-9524 y te atendemos.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    status.textContent = "";
    status.classList.remove("is-success", "is-error");

    try {
      // application/x-www-form-urlencoded es una petición "simple": no necesita preflight CORS
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: new URLSearchParams(new FormData(form)),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Respuesta inválida");

      form.reset();
      showStatus("¡Gracias! Recibimos tu consulta y te respondemos a la brevedad.", "success");
    } catch (error) {
      console.error("No se pudo enviar el formulario:", error);
      showStatus(
        "No pudimos enviar tu consulta. Probá de nuevo o llamanos al 0266 526-9524.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });
}

/* =========================================================
   INICIO
   ========================================================= */

setupWhatsAppLinks();
initCatalog();
setupOpenStatus();
setupContactForm();