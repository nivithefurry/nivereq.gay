// ==========================================
// 🛠️ Main Utilities
// Handles global UI elements like the footer year and language switcher.
// ==========================================

// Dynamically update the footer year so you never have to change it manually
document.getElementById("year").textContent = new Date().getFullYear();

// Get the current language of the page from the HTML tag
const currentLang = document.documentElement.lang;
const langLinks = document.querySelectorAll(".lang-switch a");

// Highlight the currently active language in the navigation
langLinks.forEach(link => {
  if (link.dataset.lang === currentLang) {
    link.classList.add("active");
  }
});

// A fun little easter egg for developers inspecting the browser console!
const consoleMsg = currentLang === "pl" ? "Nie ładnie tak grzebać w kodzie" : "No snooping in the code";
console.log(
  `%c ${consoleMsg} :3 ~ nivereq`, 
  "background: #2ea17a; font-weight: bold; color: #e6edf3; padding: 6px 12px; border-radius: 6px;"
);