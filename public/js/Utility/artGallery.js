// ==========================================
// 🖼️ Dynamic Art Gallery
// Fetches arts from JSON, renders them, and handles carousel/lightbox.
// ==========================================

const track = document.querySelector(".carousel-track");
const next = document.querySelector(".next");
const prev = document.querySelector(".prev");

let scrollPosition = 0;
const step = 280; // Pixels to slide per click

// 1. Fetch Data and Render HTML
async function loadGallery() {
  try {
    // Ścieżka relatywna do lokalizacji arts.json w Twojej strukturze projektowej
    const response = await fetch("/data/arts.json");
    if (!response.ok) throw new Error("Problem z ładowaniem pliku JSON");
    
    const arts = await response.json();

    // Sortowanie (opcjonalne): najnowsze arty jako pierwsze (od najwyższego timestampu)
    arts.sort((a, b) => b.timestamp_added - a.timestamp_added);

    // Generowanie tagów HTML dla obrazków
    track.innerHTML = arts.map(art => `
      <img src="${art.src}" data-author="${art.author}" alt="Art by ${art.author}">
    `).join("");

    // Gdy elementy są już w DOM, odpalamy obsługę karuzeli i powiększenia
    initGallery();

  } catch (error) {
    console.error("Błąd galerii:", error);
    track.innerHTML = `<p class="text-xs text-[var(--muted)] p-4">Nie udało się załadować galerii sztuki.</p>`;
  }
}

// 2. Initialize Carousel & Lightbox Logic (runs AFTER HTML rendering)
function initGallery() {
  const images = document.querySelectorAll(".carousel-track img");
  const viewer = document.getElementById("art-viewer");
  const viewerImg = document.getElementById("viewer-img");
  const viewerAuthor = document.getElementById("viewer-author");

  // --- Carousel Logic ---
  function getMaxScroll() {
    return track.scrollWidth - track.parentElement.clientWidth;
  }

  function updateCarousel() {
    track.style.transform = `translateX(-${scrollPosition}px)`;
  }

  next.addEventListener("click", () => {
    const maxScroll = getMaxScroll();
    scrollPosition += step;

    if (scrollPosition > maxScroll) {
      scrollPosition = maxScroll;
    }
    updateCarousel();
  });

  prev.addEventListener("click", () => {
    scrollPosition -= step;

    if (scrollPosition < 0) {
      scrollPosition = 0;
    }
    updateCarousel();
  });

  // Reset scroll position on window resize (just in case)
  window.addEventListener("resize", () => {
    if (scrollPosition > getMaxScroll()) {
      scrollPosition = Math.max(0, getMaxScroll());
      updateCarousel();
    }
  });


  // --- Fullscreen Viewer Logic ---
  images.forEach(img => {
    img.addEventListener("click", () => {
      viewer.classList.add("active");
      viewerImg.src = img.src;

      const author = img.dataset.author || "Unknown artist";
      viewerAuthor.textContent = "Art by " + author;
    });
  });

  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) {
      viewer.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      viewer.classList.remove("active");
    }
  });
}

// Load the gallery when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
});