// ==========================================
// 🎵 Last.fm Now Playing Widget
// Fetches the latest track and handles localization for EN/PL
// ==========================================

let currentTrack = "";
let currentStatus = "";

// Dictionary for localized UI text
const texts = {
  pl: {
    now: "Aktualnie słucha",
    last: "🎶 Ostatnio słuchał",
  },
  en: {
    now: "Currently listening",
    last: "🎶 Last listened",
  },
};

// Main function to fetch and update the track data
async function loadTrack() {
  try {
    const res = await fetch("/api/lastfm", {
      headers: { "x-internal-request": "yes" },
    });
    const data = await res.json();

    if (!data.name || !data.artist) return;

    const newTrack = `${data.artist} - ${data.name}`;
    const isNowPlaying = String(data.nowPlaying) === "true";

    let statusText;

    // Determine the correct status text (Now playing vs. Time ago)
    if (isNowPlaying) {
      statusText = texts[currentLang].now;
    } else if (data.date?.uts) {
      statusText = `${texts[currentLang].last} (${timeAgo(data.date.uts)})`;
    } else {
      statusText = texts[currentLang].last;
    }

    // Only update the DOM if the track or status has actually changed
    if (newTrack !== currentTrack || statusText !== currentStatus) {
      const card = document.querySelector(".lastfm-card");
      const albumArt = document.getElementById("album-art");
      const trackEl = document.getElementById("now-playing");
      const statusEl = document.getElementById("status-label");
      const statusTextEl = document.getElementById("status-text");
      const liveDot = document.getElementById("live-dot");
      const linkEl = document.getElementById("lastfm-link");

      if (data.url) linkEl.href = data.url;
      
      statusTextEl.textContent = statusText;

      // Handle the little pulsing 'live' dot
      if (isNowPlaying) {
        liveDot.classList.add("active");
      } else {
        liveDot.classList.remove("active");
      }

      // Trigger CSS fade-out animation before swapping content
      card.classList.add("fade-out");
      albumArt.classList.add("fade-img");

      // Wait 350ms for the fade-out to finish, swap the data, and fade back in
      setTimeout(() => {
        trackEl.textContent = `${data.artist} — ${data.name}`;
        statusTextEl.textContent = statusText;

        liveDot.classList.toggle("active", isNowPlaying);

        statusEl.classList.remove("active", "recent");
        statusEl.classList.add(isNowPlaying ? "active" : "recent");

        albumArt.src = data.albumArt || "https://via.placeholder.com/300?text=No+Image";

        // Update state variables so we don't trigger the animation again unnecessarily
        currentTrack = newTrack;
        currentStatus = statusText;

        card.classList.remove("fade-out");
        albumArt.classList.remove("fade-img");
      }, 350);
    }
  } catch (err) {
    console.warn("Last.fm fetch failed:", err);
  }
}

// Calculates how much time has passed since a track was played
function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() - timestamp * 1000) / 1000);

  // English formatting
  if (currentLang === "en") {
    if (diff < 60) return `${diff} second${diff !== 1 ? "s" : ""} ago`;

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // Polish formatting (with grammar rules)
  if (diff < 60) return `${diff} sek temu`;

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${pluralPL(minutes, "minuta")} temu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${pluralPL(hours, "godzina")} temu`;

  const days = Math.floor(hours / 24);
  return `${pluralPL(days, "dzień")} temu`;
}

// Helper function to handle complex Polish pluralization rules
function pluralPL(value, unit) {
  const forms = {
    minuta: ["minuta", "minuty", "minut"],
    godzina: ["godzina", "godziny", "godzin"],
    dzień: ["dzień", "dni", "dni"],
  };

  const [one, few, many] = forms[unit];

  if (value === 1) return `${value} ${one}`;

  // Polish rule for values ending in 2, 3, 4 (but not 12, 13, 14)
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14)) {
    return `${value} ${few}`;
  }

  return `${value} ${many}`;
}

// Start the widget once the page is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  loadTrack();
  setInterval(loadTrack, 60000); // Check for new tracks every 60 seconds
});