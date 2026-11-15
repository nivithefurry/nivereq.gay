export async function onRequest({ env, request }) {
  const username = env.LASTFM_USER;
  const apiKey = env.LASTFM_KEY;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const hasInternalMarker = request.headers.get("x-internal-request") === "yes";
  let isAllowedOrigin = false;

  if (origin) {
    try {
      isAllowedOrigin = new URL(origin).origin === new URL(request.url).origin;
    } catch {
      isAllowedOrigin = false;
    }
  } else if (fetchSite) {
    isAllowedOrigin = fetchSite === "same-origin";
  } else {
    isAllowedOrigin = hasInternalMarker;
  }

  if (!isAllowedOrigin || !hasInternalMarker) {
    return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  if (!username || !apiKey) {
    return Response.json({ error: "Server configuration missing Last.fm credentials" }, { status: 500 });
  }

  const endpoint = new URL("https://ws.audioscrobbler.com/2.0/");
  endpoint.search = new URLSearchParams({
    method: "user.getrecenttracks",
    user: username,
    api_key: apiKey,
    format: "json",
    limit: "1",
  });

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return Response.json({ error: "Last.fm API returned an error" }, { status: response.status });
    }

    const data = await response.json();
    const track = data.recenttracks?.track?.[0];
    if (!track) return Response.json({ error: "No recent track found" }, { status: 404 });

    return Response.json({
      artist: track.artist?.["#text"] || null,
      name: track.name || null,
      albumArt: track.image?.[3]?.["#text"] || null,
      nowPlaying: track["@attr"]?.nowplaying === "true",
      date: track.date ? { uts: track.date.uts } : null,
      url: track.url || null,
    });
  } catch {
    return Response.json({ error: "Failed to fetch from Last.fm" }, { status: 500 });
  }
}
