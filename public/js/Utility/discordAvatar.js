const discordAvatar = document.querySelector(".hero-avatar");

if (discordAvatar) {
  const root = window.siteRoot || "/";
  const endpoint = `${root}api/discord-avatar`;
  let cachedUrl = null;
  try { cachedUrl = localStorage.getItem("discordAvatarUrl"); } catch {}
  if (cachedUrl && /^https:\/\/cdn\.discordapp\.com\//.test(cachedUrl)) discordAvatar.src = cachedUrl;

  async function syncDiscordAvatar() {
    try {
      const response = await fetch(endpoint, { cache: "no-store", headers: { Accept: "application/json" } });
      const result = await response.json();
      if (!response.ok) {
        if (result?.error === "LANYARD_USER_NOT_TRACKED") {
          throw new Error("Join the Lanyard Discord server before its API can provide your profile avatar.");
        }
        throw new Error(`Avatar API returned ${response.status}.`);
      }
      if (!result?.success || typeof result.url !== "string" || !/^https:\/\/cdn\.discordapp\.com\//.test(result.url)) {
        throw new Error("Discord did not return an avatar URL.");
      }
      if (discordAvatar.src !== result.url) discordAvatar.src = result.url;
      try { localStorage.setItem("discordAvatarUrl", result.url); } catch {}
    } catch (error) {
      console.info("Discord avatar is temporarily unavailable; keeping the last available image.", error);
    }
  }

  syncDiscordAvatar();
  let lastSync = Date.now();
  window.addEventListener("focus", () => {
    if (Date.now() - lastSync < 60_000) return;
    lastSync = Date.now();
    syncDiscordAvatar();
  });
}
