export async function onRequest(context) {
  const { env } = context;

  const username = env.LASTFM_USER;
  const apiKey = env.LASTFM_KEY;
  let allowedOrigin = "https://nivereq.gay";
  if (context.request.headers.get("x-internal-request") !== "yes" || (context.request.headers.get("origin") && context.request.headers.get("origin") !== allowedOrigin)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!username || !apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing LASTFM_USER or LASTFM_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`,
    );

    const data = await response.json();
    const track = data.recenttracks?.track?.[0];

    if (!track) {
      return new Response(JSON.stringify({ error: "No recent track found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const albumArt = track.image?.[3]?.["#text"] || null;

    const result = {
      artist: track.artist?.["#text"] || null,
      name: track.name || null,
      albumArt,
      nowPlaying: track["@attr"]?.nowplaying === "true",
      date: track.date
        ? {
            uts: track.date.uts,
          }
        : null,
      url: track.url || null,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch from Last.fm" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
