export async function onRequest({ env, request }) {
  const username = env.LASTFM_USER;
  const apiKey = env.LASTFM_KEY;
  const origin = request.headers.get("origin");
  const hasInternalMarker = request.headers.get("x-internal-request") === "yes";
  const isAllowedOrigin = origin === "https://nivereq.com";

  if (!hasInternalMarker || (origin && !isAllowedOrigin)) {
    return Response.json({ error: "Unauthorized: Origin Check Failed" }, { status: 401 });
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
