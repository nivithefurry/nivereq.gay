function responseUnavailable() {
  return new Response("Page unavailable", { status: 503 });
}

function makePayload(locale, origin, avatarUrl) {
  const aboutPath = locale === "pl" ? "/pl#about" : "/en#about";
  const fursonaPath = `/fursona/?lang=${locale}`;
  const fursuitPath = `/fursuit/?lang=${locale}`;
  const description = locale === "pl"
    ? "Streamer, twórca i futrzak. Zajrzyj do mojej fursony i galerii zdjęć z fursuitem."
    : "Streamer, creator and furry. Explore my fursona and fursuit photo gallery.";
  const buttons = locale === "pl"
    ? [{ label: "O mnie", url: aboutPath }, { label: "Fursona", url: fursonaPath }, { label: "Fursuit", url: fursuitPath }]
    : [{ label: "About me", url: aboutPath }, { label: "Fursona", url: fursonaPath }, { label: "Fursuit", url: fursuitPath }];

  return {
    component: {
      type: 17,
      accent_color: 8895669,
      components: [
        {
          type: 9,
          components: [
            { type: 10, content: "# nivereq" },
            { type: 10, content: description },
          ],
          accessory: {
            type: 11,
            media: { url: avatarUrl },
            description: "nivereq Discord avatar",
          },
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1,
          components: buttons.map(({ label, url }) => ({
            type: 2,
            style: 5,
            url: new URL(url, origin).href,
            label,
          })),
        },
      ],
    },
  };
}

async function readDiscordAvatar() {
  const userId = "1305678814046588949";
  const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Discord avatar unavailable.");
  const result = await response.json();
  const user = result?.success ? result.data?.discord_user : null;
  if (!user || user.id !== userId) throw new Error("Discord profile unavailable.");
  if (typeof user.avatar === "string" && /^[a-zA-Z0-9_]+$/.test(user.avatar)) {
    const format = user.avatar.startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${format}?size=512`;
  }
  const defaultAvatar = Number((BigInt(userId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
}

export async function renderHomePage(context, locale) {
  const { request, env } = context;
  const url = new URL(request.url);
  const assets = env.ASSETS;
  if (!assets) return responseUnavailable();

  let avatarUrl;
  try {
    avatarUrl = await readDiscordAvatar();
  } catch {
    avatarUrl = new URL("/assets/img/avatar.gif", url.origin).href;
  }

  const html = await assets.fetch(new URL("/", request.url));
  if (!html.ok) return html;

  const pageTitle = locale === "pl"
    ? "nivereq — streamer, twórca i futrzak"
    : "nivereq — streamer, creator and furry";
  const pageDescription = locale === "pl"
    ? "Streamer, twórca i futrzak. Zajrzyj do mojej fursony i galerii zdjęć z fursuitem."
    : "Streamer, creator and furry. Explore my fursona and fursuit photo gallery.";
  const canonical = locale === "pl" ? `${url.origin}/pl` : `${url.origin}/`;
  const pageUrl = `${url.origin}${url.pathname}`;
  const imageUrl = avatarUrl;
  const payload = makePayload(locale, url.origin, avatarUrl);
  const payloadText = JSON.stringify(payload).replace(/</g, "\\u003c");

  return new HTMLRewriter()
    .on("html", { element: (element) => element.setAttribute("lang", locale) })
    .on("title", { element: (element) => element.setInnerContent(pageTitle) })
    .on('meta[name="description"]', { element: (element) => element.setAttribute("content", pageDescription) })
    .on('meta[property="og:title"]', { element: (element) => element.setAttribute("content", pageTitle) })
    .on('meta[property="og:description"]', { element: (element) => element.setAttribute("content", pageDescription) })
    .on('meta[property="og:image"]', { element: (element) => element.setAttribute("content", imageUrl) })
    .on('meta[property="og:image:alt"]', { element: (element) => element.setAttribute("content", "nivereq Discord avatar") })
    .on('meta[property="og:url"]', { element: (element) => element.setAttribute("content", pageUrl) })
    .on('meta[name="twitter:title"]', { element: (element) => element.setAttribute("content", pageTitle) })
    .on('meta[name="twitter:description"]', { element: (element) => element.setAttribute("content", pageDescription) })
    .on('meta[name="twitter:image"]', { element: (element) => element.setAttribute("content", imageUrl) })
    .on('meta[name="twitter:image:alt"]', { element: (element) => element.setAttribute("content", "nivereq Discord avatar") })
    .on('link[rel="canonical"]', { element: (element) => element.setAttribute("href", canonical) })
    .on('link[rel="alternate"][hreflang="pl"]', { element: (element) => element.setAttribute("href", `${url.origin}/pl`) })
    .on('link[rel="alternate"][hreflang="en"]', { element: (element) => element.setAttribute("href", `${url.origin}/en`) })
    .on('link[rel="alternate"][hreflang="x-default"]', { element: (element) => element.setAttribute("href", `${url.origin}/`) })
    .on("head", { element: (element) => element.append(
      `<script id="discord:component-embed" type="application/json">${payloadText}</script>`,
      { html: true },
    ) })
    .transform(html);
}
