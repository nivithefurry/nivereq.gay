const galleryTrack = document.querySelector(".carousel-track");
const galleryViewport = document.querySelector(".carousel-viewport");
const previousArtwork = document.querySelector(".carousel-btn.prev");
const nextArtwork = document.querySelector(".carousel-btn.next");
const artViewer = document.getElementById("art-viewer");
let galleryOffset = 0;
let artworkReturnFocus = null;

function updateGalleryControls() {
  if (!galleryTrack || !galleryViewport) return;
  const maxOffset = Math.max(0, galleryTrack.scrollWidth - galleryViewport.clientWidth);
  galleryOffset = Math.min(galleryOffset, maxOffset);
  galleryTrack.style.transform = `translateX(-${galleryOffset}px)`;
  if (previousArtwork) previousArtwork.disabled = galleryOffset <= 0;
  if (nextArtwork) nextArtwork.disabled = galleryOffset >= maxOffset;
}

function openArtwork(image) {
  artworkReturnFocus = image;
  const viewerImage = document.getElementById("viewer-img");
  const authorLabel = document.getElementById("viewer-author");
  const translations = window.siteTranslations?.fursona;
  viewerImage.src = image.src;
  viewerImage.alt = image.alt;
  authorLabel.textContent = `${translations?.artBy || "Art"}: ${image.dataset.author || translations?.unknownArtist || "Unknown artist"}`;
  artViewer.classList.add("active");
  artViewer.setAttribute("aria-hidden", "false");
  document.getElementById("art-viewer-close")?.focus();
}

async function loadGallery() {
  if (!galleryTrack) return;

  try {
    await window.translationsReady;
    const response = await fetch("data/arts.json");
    if (!response.ok) throw new Error(`Gallery data request failed (${response.status}).`);
    const artworks = await response.json();
    artworks.sort((first, second) => second.timestamp_added - first.timestamp_added);

    const rootPath = window.siteRoot || "/";
    const translations = window.siteTranslations.fursona;
    const artworkElements = artworks.map((artwork) => {
      const image = document.createElement("img");
      image.src = artwork.src.startsWith("/") && rootPath !== "/"
        ? `${rootPath.slice(0, -1)}${artwork.src}`
        : artwork.src;
      image.dataset.author = artwork.author || translations.unknownArtist;
      image.alt = `${translations.artBy}: ${image.dataset.author}`;
      image.loading = "lazy";
      image.addEventListener("click", () => openArtwork(image));
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openArtwork(image);
        }
      });
      return image;
    });

    galleryTrack.replaceChildren(...artworkElements);
    updateGalleryControls();
  } catch (error) {
    console.warn("Art gallery could not be loaded.", error);
    const translations = window.siteTranslations?.fursona;
    const useEnglish = currentLang === "en";
    const message = translations?.galleryError || (useEnglish ? "Could not load the art gallery." : "Nie udało się załadować galerii sztuki.");
    const errorMessage = document.createElement("p");
    errorMessage.className = "gallery-error";
    errorMessage.textContent = message;
    galleryTrack.replaceChildren(errorMessage);
  }
}

previousArtwork?.addEventListener("click", () => {
  galleryOffset = Math.max(0, galleryOffset - galleryViewport.clientWidth * 0.8);
  updateGalleryControls();
});
nextArtwork?.addEventListener("click", () => {
  galleryOffset += galleryViewport.clientWidth * 0.8;
  updateGalleryControls();
});
window.addEventListener("resize", updateGalleryControls);

function closeArtViewer() {
  if (!artViewer?.classList.contains("active")) return;
  artViewer.classList.remove("active");
  artViewer.setAttribute("aria-hidden", "true");
  artworkReturnFocus?.focus();
}

artViewer?.addEventListener("click", (event) => {
  if (event.target === artViewer || event.target.closest("#art-viewer-close")) closeArtViewer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeArtViewer();
});

loadGallery();
