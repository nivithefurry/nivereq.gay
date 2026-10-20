const themeButton = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const rootElement = document.documentElement;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let themeTransitionTimeout;

function applyTheme(theme, animate = false) {
  if (animate) {
    rootElement.classList.add("theme-transitioning");
    window.clearTimeout(themeTransitionTimeout);
    themeTransitionTimeout = window.setTimeout(() => {
      rootElement.classList.remove("theme-transitioning");
    }, 450);
  }

  rootElement.dataset.theme = theme;
  themeIcon?.classList.toggle("bi-moon-stars-fill", theme === "dark");
  themeIcon?.classList.toggle("bi-sun-fill", theme !== "dark");
}

applyTheme(localStorage.getItem("theme") || (systemTheme.matches ? "dark" : "light"));

themeButton?.addEventListener("click", () => {
  const nextTheme = rootElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme, true);
});

systemTheme.addEventListener("change", (event) => {
  if (!localStorage.getItem("theme")) applyTheme(event.matches ? "dark" : "light", true);
});
