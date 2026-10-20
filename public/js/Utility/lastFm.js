let lastTrack = "";
let lastStatus = "";

function relativePlayTime(timestamp) {
  const secondsSince = Math.max(0, Math.floor(Date.now() / 1000 - Number(timestamp)));
  const formatter = new Intl.RelativeTimeFormat(currentLang, { numeric: "auto" });
  if (secondsSince < 60) return formatter.format(-secondsSince, "second");
  const minutes = Math.floor(secondsSince / 60);
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.floor(hours / 24), "day");
}

async function updateLastFm() {
  try {
    await window.translationsReady;
    const response = await fetch("api/lastfm", { headers: { "x-internal-request": "yes" } });
    if (!response.ok) throw new Error(`Last.fm request failed (${response.status}).`);
    const track = await response.json();
    if (!track.name || !track.artist) return;

    const isPlaying = String(track.nowPlaying) === "true";
    const status = isPlaying
      ? window.siteTranslations.widgets.lastfm.now
      : `${window.siteTranslations.widgets.lastfm.last}${track.date?.uts ? ` (${relativePlayTime(track.date.uts)})` : ""}`;
    const title = `${track.artist} — ${track.name}`;
    if (title === lastTrack && status === lastStatus) return;

    const card = document.getElementById("lastfm-link");
    const artwork = document.getElementById("album-art");
    const statusLabel = document.getElementById("status-label");
    card.href = track.url || "https://www.last.fm/";
    card.classList.add("fade-out");
    artwork.classList.add("fade-img");

    window.setTimeout(() => {
      document.getElementById("now-playing").textContent = title;
      document.getElementById("status-text").textContent = status;
      if (track.albumArt) artwork.src = track.albumArt;
      else artwork.removeAttribute("src");
      artwork.alt = `${track.name} album artwork`;
      document.getElementById("live-dot").classList.toggle("active", isPlaying);
      statusLabel.classList.toggle("active", isPlaying);
      lastTrack = title;
      lastStatus = status;
      card.classList.remove("fade-out");
      artwork.classList.remove("fade-img");
    }, 220);
  } catch (error) {
    console.info("Last.fm live status is unavailable.", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  updateLastFm();
  window.setInterval(updateLastFm, 60_000);
});
