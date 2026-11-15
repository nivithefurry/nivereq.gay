const gallery = document.getElementById("fursuit-gallery");
const root = window.siteRoot || "/";
const localAsset = (path) => path.startsWith("/") && root !== "/" ? `${root.slice(0, -1)}${path}` : path;
const icons = { tiktok:"bi-tiktok", instagram:"bi-instagram", youtube:"bi-youtube", twitch:"bi-twitch", bluesky:"bi-cloud", x:"bi-twitter-x" };
const viewer = document.getElementById("fursuit-viewer");
let returnFocus = null;

function showPhoto(photo, image) {
  returnFocus = image;
  const viewerImage = document.getElementById("fursuit-viewer-image");
  viewerImage.src = image.src;
  viewerImage.alt = image.alt;
  document.getElementById("fursuit-viewer-title").textContent = photo.title || "";
  document.getElementById("fursuit-viewer-description").textContent = photo.description || "";
  const source = document.getElementById("fursuit-viewer-source");
  if (photo.post_url) {
    try {
      const url = new URL(photo.post_url);
      if (url.protocol === "https:") { source.href = url.href; source.hidden = false; }
      else source.hidden = true;
    } catch { source.hidden = true; }
  } else source.hidden = true;
  viewer.classList.add("active");
  viewer.setAttribute("aria-hidden", "false");
  document.getElementById("fursuit-viewer-close").focus();
}

function appendSocialLinks(links) {
  const container = document.getElementById("fursuit-social-links");
  const labels = window.siteTranslations?.fursuit;
  container.replaceChildren();
  for (const item of links || []) {
    try {
      const url = new URL(item.url);
      if (url.protocol !== "https:") continue;
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const icon = document.createElement("i");
      const iconName = Object.entries(icons).find(([name]) => item.label?.toLowerCase().includes(name))?.[1];
      icon.className = `bi ${iconName || "bi-arrow-up-right"}`;
      icon.setAttribute("aria-hidden", "true");
      link.append(icon, document.createTextNode(item.label));
      container.append(link);
    } catch { /* Ignore malformed public profile URLs. */ }
  }
}

async function loadFursuitGallery() {
  try {
    await window.translationsReady;
    const translations = window.siteTranslations?.fursuit;
    const response = await fetch(localAsset("/data/fursuit.json"));
    if (!response.ok) throw new Error(`Gallery request failed (${response.status}).`);
    const data = await response.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    photos.sort((a, b) => Number(b.timestamp_added) - Number(a.timestamp_added));
    appendSocialLinks(data.socialLinks);

    const profileImage = document.getElementById("fursuit-profile-image");
    const chosenImage = data.profileImage || photos[0]?.src;
    if (chosenImage) profileImage.src = localAsset(chosenImage);
    profileImage.onerror = () => { profileImage.src = localAsset("/assets/img/avatar.gif"); };

    if (!photos.length) {
      const empty = document.createElement("p");
      empty.className = "fursuit-empty";
      empty.textContent = translations.empty;
      gallery.replaceChildren(empty);
      return;
    }

    const cards = photos.map((photo) => {
      const card = document.createElement("article");
      card.className = "fursuit-photo-card";
      const imageButton = document.createElement("button");
      imageButton.className = "fursuit-photo-image";
      imageButton.type = "button";
      imageButton.setAttribute("aria-label", photo.title || translations.photoAlt);
      const image = document.createElement("img");
      image.src = localAsset(photo.src);
      image.alt = photo.title || translations.photoAlt;
      image.loading = "lazy";
      imageButton.append(image);
      imageButton.addEventListener("click", () => showPhoto(photo, image));

      const body = document.createElement("div");
      body.className = "fursuit-photo-copy";
      if (photo.title) {
        const heading = document.createElement("h3");
        heading.textContent = photo.title;
        body.append(heading);
      }
      if (photo.description) {
        const description = document.createElement("p");
        description.textContent = photo.description;
        body.append(description);
      }
      const details = [photo.author && `${translations.by} ${photo.author}`];
      if (photo.post_url) {
        try {
          const sourceUrl = new URL(photo.post_url);
          if (sourceUrl.protocol === "https:") {
            const source = document.createElement("a");
            source.className = "fursuit-photo-source";
            source.href = sourceUrl.href;
            source.target = "_blank";
            source.rel = "noopener noreferrer";
            source.textContent = translations.openPost;
            body.append(source);
          }
        } catch { /* Ignore malformed source links. */ }
      }
      const date = document.createElement("small");
      if (photo.timestamp_added) date.textContent = new Date(photo.timestamp_added).toLocaleDateString(document.documentElement.lang === "pl" ? "pl-PL" : "en-GB");
      if (details.some(Boolean)) {
        const author = document.createElement("small");
        author.textContent = details.filter(Boolean).join(" · ");
        body.append(author);
      }
      if (date.textContent) body.append(date);
      card.append(imageButton, body);
      return card;
    });
    gallery.replaceChildren(...cards);
    const firstPhoto = photos[0];
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && firstPhoto) ogImage.content = new URL(localAsset(firstPhoto.src), window.location.origin).href;
  } catch (error) {
    console.warn("Fursuit gallery could not be loaded.", error);
    const message = document.createElement("p");
    message.className = "fursuit-empty";
    message.textContent = translations?.error || "Could not load fursuit photos.";
    gallery.replaceChildren(message);
  }
}

function closeViewer() {
  if (!viewer?.classList.contains("active")) return;
  viewer.classList.remove("active");
  viewer.setAttribute("aria-hidden", "true");
  returnFocus?.focus();
}

viewer?.addEventListener("click", (event) => {
  if (event.target === viewer || event.target.closest("#fursuit-viewer-close")) closeViewer();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeViewer(); });
loadFursuitGallery();
