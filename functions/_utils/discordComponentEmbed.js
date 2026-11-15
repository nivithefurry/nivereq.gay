function responseUnavailable() {
  return new Response("Page unavailable", { status: 503 });
}

function makePayload(locale, origin, artwork) {
  const aboutPath = locale === "pl" ? "/pl#about" : "/en#about";
  const fursonaPath = `/fursona/?lang=${locale}`;
  const fursuitPath = `/fursuit/?lang=${locale}`;
  const buttons = locale === "pl"
    ? [{ label: "O mnie", url: aboutPath }, { label: "Fursona", url: fursonaPath }, { label: "Fursuit", url: fursuitPath }]
    : [{ label: "About me", url: aboutPath }, { label: "Fursona", url: fursonaPath }, { label: "Fursuit", url: fursuitPath }];

  return {
    component: {
      type: 17,
      accent_color: 8895669,
      components: [
        { type: 10, content: "# nivereq" },
        { type: 12, items: [{ media: { url: new URL(artwork.src, origin).href } }] },
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

async function readLatestArtwork(assets, requestUrl) {
  const response = await assets.fetch(new URL("/data/arts.json", requestUrl));
  if (!response.ok) throw new Error("Artwork list unavailable.");
  const artworks = await response.json();
  if (!Array.isArray(artworks)) throw new Error("Artwork list is invalid.");

  const latest = artworks
    .filter((artwork) => typeof artwork?.src === "string" && Number.isFinite(Number(artwork.timestamp_added)))
    .sort((first, second) => Number(second.timestamp_added) - Number(first.timestamp_added))[0];

  if (!latest) throw new Error("No artwork is available.");
  return latest;
}

export async function renderHomePage(context, locale) {
  const { request, env } = context;
  const url = new URL(request.url);
  const assets = env.ASSETS;
  if (!assets) return responseUnavailable();

  let latestArtwork;
  try {
    latestArtwork = await readLatestArtwork(assets, request.url);
  } catch {
    latestArtwork = { src: "/assets/img/avatar.gif" };
  }

  const html = await assets.fetch(new URL("/", request.url));
  if (!html.ok) return html;

  const pageTitle = locale === "pl"
    ? "nivereq — streamer, twórca i futrzak"
    : "nivereq — streamer, creator and furry";
  const pageDescription = locale === "pl"
    ? "nivereq — streamer, twórca, fotograf i futrzak z Krakowa."
    : "nivereq — streamer, creator, photographer and furry from Krakow.";
  const canonical = locale === "pl" ? `${url.origin}/pl` : `${url.origin}/`;
  const pageUrl = `${url.origin}${url.pathname}`;
  const imageUrl = new URL(latestArtwork.src, url.origin).href;
  const payload = makePayload(locale, url.origin, latestArtwork);
  const payloadText = JSON.stringify(payload).replace(/</g, "\\u003c");

  return new HTMLRewriter()
    .on("html", { element: (element) => element.setAttribute("lang", locale) })
    .on("title", { element: (element) => element.setInnerContent(pageTitle) })
    .on('meta[name="description"]', { element: (element) => element.setAttribute("content", pageDescription) })
    .on('meta[property="og:title"]', { element: (element) => element.setAttribute("content", pageTitle) })
    .on('meta[property="og:description"]', { element: (element) => element.setAttribute("content", pageDescription) })
    .on('meta[property="og:image"]', { element: (element) => element.setAttribute("content", imageUrl) })
    .on('meta[property="og:url"]', { element: (element) => element.setAttribute("content", pageUrl) })
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
