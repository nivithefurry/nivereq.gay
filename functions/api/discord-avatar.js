const DISCORD_USER_ID = "1305678814046588949";

function unavailable(status = 503, error = "DISCORD_AVATAR_UNAVAILABLE") {
  return Response.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function onRequestGet() {
  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return response.status === 404
        ? unavailable(404, "LANYARD_USER_NOT_TRACKED")
        : unavailable(502, "LANYARD_API_UNAVAILABLE");
    }

    const result = await response.json();
    const user = result?.success ? result.data?.discord_user : null;
    if (!user || user.id !== DISCORD_USER_ID) return unavailable(404, "LANYARD_USER_NOT_TRACKED");

    let url;
    if (typeof user.avatar === "string" && /^[a-zA-Z0-9_]+$/.test(user.avatar)) {
      const format = user.avatar.startsWith("a_") ? "gif" : "webp";
      url = `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/${user.avatar}.${format}?size=512`;
    } else {
      const defaultAvatar = Number((BigInt(DISCORD_USER_ID) >> 22n) % 6n);
      url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
    }

    return Response.json(
      { success: true, url },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  } catch {
    return unavailable(503, "LANYARD_API_UNAVAILABLE");
  }
}
