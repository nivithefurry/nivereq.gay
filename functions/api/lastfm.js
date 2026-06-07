// ==========================================
// 🎵 Last.fm API (Cloudflare Pages Function)
// Fetches the most recently played track from Last.fm
// ==========================================

export async function onRequest(context) {
  // Destructure env and request from the context for easier reading
  const { env, request } = context;

  // Retrieve credentials from Cloudflare environment variables
  const username = env.LASTFM_USER;
  const apiKey = env.LASTFM_KEY;
  const allowedOrigin = "https://nivereq.gay";

  // --- Security Check (CORS / Origin Verification) ---
  const isInternal = request.headers.get("x-internal-request") === "yes";
  const origin = request.headers.get("origin");
  const isAllowedOrigin = origin === allowedOrigin;

  // Block the request if it doesn't have the correct internal header, 
  // OR if an origin is provided but it doesn't match your website.
  if (!isInternal || (origin && !isAllowedOrigin)) {
    return Response.json(
      { error: "Unauthorized: Origin Check Failed" }, 
      { status: 401 }
    );
  }

  // --- Configuration Check ---
  if (!username || !apiKey) {
    return Response.json(
      { error: "Server configuration missing Last.fm credentials" },
      { status: 500 }
    );
  }

  try {
    // Fetch data from the Last.fm API
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`
    );

    // Handle Last.fm API errors
    if (!response.ok) {
      return Response.json(
        { error: "Last.fm API returned an error" }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    const track = data.recenttracks?.track?.[0]; // Safely extract the first track

    // Handle the edge case where the user's history is empty
    if (!track) {
      return Response.json(
        { error: "No recent track found" }, 
        { status: 404 }
      );
    }

    // Extract album art (Index 3 corresponds to 'extralarge' in Last.fm's API)
    const albumArt = track.image?.[3]?.["#text"] || null;

    // Construct a clean, predictable result object
    const result = {
      artist: track.artist?.["#text"] || null,
      name: track.name || null,
      albumArt,
      nowPlaying: track["@attr"]?.nowplaying === "true", // Convert string to boolean
      date: track.date ? { uts: track.date.uts } : null,
      url: track.url || null,
    };

    // Return the formatted result to the frontend
    return Response.json(result);

  } catch (error) {
    // Catch general network errors or JSON parsing issues
    return Response.json(
      { error: "Failed to fetch from Last.fm" },
      { status: 500 }
    );
  }
}