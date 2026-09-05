/* MENU HAMBURGUEZA */
const menuToggle = document.querySelector(".menu-toggle");
const navigationList = document.querySelector(".navigation-list");

menuToggle.addEventListener("click", () => {
  const isOpen = navigationList.classList.toggle("is-open");

  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );
});