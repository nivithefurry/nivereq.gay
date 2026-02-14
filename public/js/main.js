document.getElementById("year").textContent = new Date().getFullYear(); // Update footwer year

const currentLang = document.documentElement.lang;
const langLinks = document.querySelectorAll(".lang-switch a");

langLinks.forEach(link => {
  if (link.dataset.lang === currentLang) {
    link.classList.add("active");
  }
});



console.log(`%c ${currentLang === "pl" ? "Nie ładnie tak grzebać w kodzie" : "No snooping in the code"} :3 ~ nivereq`, "background: #2ea17a; font-weight: bold; color: #e6edf3; padding: 6px 12px; border-radius: 6px;");