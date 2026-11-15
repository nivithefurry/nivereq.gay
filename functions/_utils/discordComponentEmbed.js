function responseUnavailable() {
  return new Response("Page unavailable", { status: 503 });
}

function makePayload(locale, origin, photo) {
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
            media: { url: new URL(photo.src, origin).href },
            description: "Latest fursuit photo",
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

async function readLatestFursuitPhoto(assets, requestUrl) {
  const response = await assets.fetch(new URL("/data/fursuit.json", requestUrl));
  if (!response.ok) throw new Error("Fursuit gallery data unavailable.");
  const gallery = await response.json();
  const latest = (Array.isArray(gallery?.photos) ? gallery.photos : [])
    .filter((photo) => typeof photo?.src === "string" && photo.src.startsWith("/assets/fursuit/") && Number.isFinite(Number(photo.timestamp_added)))
    .sort((first, second) => Number(second.timestamp_added) - Number(first.timestamp_added))[0];
  if (latest) return latest;

  if (typeof gallery?.profileImage === "string" && gallery.profileImage.startsWith("/assets/fursuit/")) {
    return { src: gallery.profileImage };
  }
  throw new Error("No fursuit photo is available.");
}

export async function renderHomePage(context, locale) {
  const { request, env } = context;
  const url = new URL(request.url);
  const assets = env.ASSETS;
  if (!assets) return responseUnavailable();

  let latestPhoto;
  try {
    latestPhoto = await readLatestFursuitPhoto(assets, request.url);
  } catch {
    latestPhoto = { src: "/assets/img/avatar.gif" };
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
  const imageUrl = new URL(latestPhoto.src, url.origin).href;
  const payload = makePayload(locale, url.origin, latestPhoto);
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
