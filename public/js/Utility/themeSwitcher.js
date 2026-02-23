const toggle = document.getElementById("theme-toggle");
const emoji = document.getElementById("theme-emoji");
const html = document.documentElement;

// update emoji based on theme
function updateEmoji(theme) {
  emoji.textContent = theme === "dark" ? "🌙" : "☀️";
}

// On theme toggle click
toggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  updateEmoji(newTheme);
});

// System change
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

mediaQuery.addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const newTheme = e.matches ? "dark" : "light";
    html.setAttribute("data-theme", newTheme);
    updateEmoji(newTheme);
  }
});

// Set theme on initial load
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  html.setAttribute("data-theme", savedTheme);
  updateEmoji(savedTheme);
} else {
  const systemTheme = mediaQuery.matches ? "dark" : "light";
  html.setAttribute("data-theme", systemTheme);
  updateEmoji(systemTheme);
}

let ___themeSwitcherClicks = 0;
let ___easterEggVisible = false;

toggle.addEventListener("click", () => {
  ___themeSwitcherClicks++;
  if (___themeSwitcherClicks === 10 && !___easterEggVisible) {
    ___easterEggVisible = true;
    let video = document.createElement("video");
    video.src = "/assets/boykisser.mp4";
    video.autoplay = "true";
    video.volume = "0.8";
    document.body.appendChild(video);
    setTimeout(() => {
      video.remove();
      ___easterEggVisible = false;
      ___themeSwitcherClicks = 0;
    }, 4800);
  }
});
