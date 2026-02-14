document.getElementById("year").textContent = new Date().getFullYear(); // Update footwer year

const currentLang = document.documentElement.lang;
const langLinks = document.querySelectorAll(".lang-switch a");

langLinks.forEach(link => {
  if (link.dataset.lang === currentLang) {
    link.classList.add("active");
  }
});