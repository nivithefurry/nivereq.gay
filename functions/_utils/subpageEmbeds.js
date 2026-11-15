const copy = {
  en: {
    fursona: {
      title: "nivereq — fursona",
      description: "Meet nivereq’s arctic fox fursona, with reference art, colors, and character details.",
      heading: "nivereq’s fursona",
    },
    fursuit: {
      title: "Fursuit gallery — nivereq",
      description: "Photos of nivi in fursuit, from convention days to silly moments.",
      heading: "nivi in fursuit",
    },
    buttons: ["Home", "Fursona", "Fursuit"],
  },
  pl: {
    fursona: {
      title: "nivereq — fursona",
      description: "Poznaj arctic fox fursonę nivereq: refkę, kolory i informacje o postaci.",
      heading: "Fursona nivereq",
    },
    fursuit: {
      title: "Galeria fursuit — nivereq",
      description: "Zdjęcia nivi w fursuicie — z konwentów i codziennych futrzastych chwil.",
      heading: "nivi w fursuicie",
    },
    buttons: ["Strona główna", "Fursona", "Fursuit"],
  },
};

function componentEmbed(locale, page, origin, imageUrl) {
  const strings = copy[locale];
  const pageInfo = strings[page];
  const paths = locale === "pl"
    ? ["/pl", `/fursona/?lang=${locale}`, `/fursuit/?lang=${locale}`]
    : ["/", `/fursona/?lang=${locale}`, `/fursuit/?lang=${locale}`];
  return {
    component: {
      type: 17,
      accent_color: 8895669,
      components: [
        {
          type: 9,
          components: [
            { type: 10, content: `# ${pageInfo.heading}` },
            { type: 10, content: pageInfo.description },
          ],
          accessory: { type: 11, media: { url: imageUrl }, description: pageInfo.heading },
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1,
          components: paths.map((path, index) => ({
            type: 2,
            style: 5,
            url: new URL(path, origin).href,
            label: strings.buttons[index],
          })),
        },
      ],
    },
  };
}

export async function renderSocialSubpage(context, page) {
  const { request, env } = context;
  const url = new URL(request.url);
  const assets = env.ASSETS;
  if (!assets) return new Response("Page unavailable", { status: 503 });

  const locale = url.searchParams.get("lang") === "pl" ? "pl" : "en";
  const pageInfo = copy[locale][page];
  let imagePath = page === "fursona" ? "/assets/img/nivereq_current_ref.jpg" : "/assets/img/avatar.gif";
  const validImage = (value, directory) => typeof value === "string" && value.startsWith(directory);

  if (page === "fursona") {
    try {
      const response = await assets.fetch(new URL("/data/arts.json", url));
      if (response.ok) {
        const artworks = await response.json();
        const latest = (Array.isArray(artworks) ? artworks : [])
          .filter((art) => validImage(art?.src, "/assets/arts/") && Number.isFinite(Number(art.timestamp_added)))
          .sort((a, b) => Number(b.timestamp_added) - Number(a.timestamp_added))[0];
        if (latest) imagePath = latest.src;
      }
    } catch { /* Keep the reference art fallback if art data is unavailable. */ }
  } else {
    try {
      const response = await assets.fetch(new URL("/data/fursuit.json", url));
      if (response.ok) {
        const gallery = await response.json();
        const latest = (Array.isArray(gallery?.photos) ? gallery.photos : [])
          .filter((photo) => validImage(photo?.src, "/assets/fursuit/") && Number.isFinite(Number(photo.timestamp_added)))
          .sort((a, b) => Number(b.timestamp_added) - Number(a.timestamp_added))[0];
        if (latest) imagePath = latest.src;
      }
    } catch { /* Keep the static fallback image if gallery data is unavailable. */ }
  }

  const imageUrl = new URL(imagePath, url.origin).href;
  const pageUrl = new URL(page === "fursona" ? "/fursona/" : "/fursuit/", url.origin).href;
  const payload = JSON.stringify(componentEmbed(locale, page, url.origin, imageUrl)).replace(/</g, "\\u003c");
  const html = await assets.fetch(request);
  if (!html.ok) return html;

  return new HTMLRewriter()
    .on("html", { element: (element) => element.setAttribute("lang", locale) })
    .on("title", { element: (element) => element.setInnerContent(pageInfo.title) })
    .on('meta[name="description"]', { element: (element) => element.setAttribute("content", pageInfo.description) })
    .on('meta[property="og:title"]', { element: (element) => element.setAttribute("content", pageInfo.title) })
    .on('meta[property="og:description"]', { element: (element) => element.setAttribute("content", pageInfo.description) })
    .on('meta[property="og:image"]', { element: (element) => element.setAttribute("content", imageUrl) })
    .on('meta[property="og:image:alt"]', { element: (element) => element.setAttribute("content", pageInfo.heading) })
    .on('meta[property="og:url"]', { element: (element) => element.setAttribute("content", pageUrl) })
    .on('meta[property="og:locale"]', { element: (element) => element.setAttribute("content", locale === "pl" ? "pl_PL" : "en_US") })
    .on('meta[name="twitter:title"]', { element: (element) => element.setAttribute("content", pageInfo.title) })
    .on('meta[name="twitter:description"]', { element: (element) => element.setAttribute("content", pageInfo.description) })
    .on('meta[name="twitter:image"]', { element: (element) => element.setAttribute("content", imageUrl) })
    .on('meta[name="twitter:image:alt"]', { element: (element) => element.setAttribute("content", pageInfo.heading) })
    .on("head", { element: (element) => element.append(
      `<script id="discord:component-embed" type="application/json">${payload}</script>`,
      { html: true },
    ) })
    .transform(html);
}
