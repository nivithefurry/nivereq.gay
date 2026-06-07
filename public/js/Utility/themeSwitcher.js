// ==========================================
// 🌗 Theme Switcher
// Toggles between light and dark modes, syncing with local storage and system preferences.
// ==========================================

const toggle = document.getElementById("theme-toggle");
const emoji = document.getElementById("theme-emoji");
const html = document.documentElement;

// Helper function to update the button icon based on the active theme
function updateEmoji(theme) {
  emoji.textContent = theme === "dark" ? "🌙" : "☀️";
}

// 1. Handle user clicks on the theme toggle button
toggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";

  // Apply the theme to the HTML tag and save it so it remembers for next time
  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  updateEmoji(newTheme);
});

// 2. Listen for changes to the user's operating system theme (e.g., if their Mac switches to dark mode at night)
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

mediaQuery.addEventListener("change", (e) => {
  // Only override if the user hasn't manually set a preference yet
  if (!localStorage.getItem("theme")) {
    const newTheme = e.matches ? "dark" : "light";
    html.setAttribute("data-theme", newTheme);
    updateEmoji(newTheme);
  }
});

// 3. Apply the correct theme on initial page load
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  // Use the user's saved preference if it exists
  html.setAttribute("data-theme", savedTheme);
  updateEmoji(savedTheme);
} else {
  // Otherwise, default to whatever their operating system uses
  const systemTheme = mediaQuery.matches ? "dark" : "light";
  html.setAttribute("data-theme", systemTheme);
  updateEmoji(systemTheme);
}