// ==========================================
// 🖼️ Art Gallery
// Handles the horizontal carousel and the fullscreen image viewer (lightbox).
// ==========================================

// --- Carousel Logic ---
const track = document.querySelector(".carousel-track");
const next = document.querySelector(".next");
const prev = document.querySelector(".prev");

let scrollPosition = 0;
const step = 280; // How many pixels to slide per click

// Calculate the maximum allowed scroll distance based on content width
function getMaxScroll() {
  return track.scrollWidth - track.parentElement.clientWidth;
}

function updateCarousel() {
  track.style.transform = `translateX(-${scrollPosition}px)`;
}

// Slide Right
next.addEventListener("click", () => {
  const maxScroll = getMaxScroll();
  scrollPosition += step;

  // Prevent scrolling past the last image
  if (scrollPosition > maxScroll) {
    scrollPosition = maxScroll;
  }
  updateCarousel();
});

// Slide Left
prev.addEventListener("click", () => {
  scrollPosition -= step;

  // Prevent scrolling past the first image
  if (scrollPosition < 0) {
    scrollPosition = 0;
  }
  updateCarousel();
});


// --- Fullscreen Viewer Logic ---
const images = document.querySelectorAll(".carousel-track img");
const viewer = document.getElementById("art-viewer");
const viewerImg = document.getElementById("viewer-img");
const viewerAuthor = document.getElementById("viewer-author");

// Attach click events to all images in the gallery
images.forEach(img => {
  img.addEventListener("click", () => {
    viewer.classList.add("active"); // Show the modal
    viewerImg.src = img.src; // Copy the clicked image source into the modal

    // Display the author's name (or a default if missing)
    const author = img.dataset.author || "Unknown artist";
    viewerAuthor.textContent = "Art by " + author;
  });
});

// Close the viewer if the user clicks anywhere on the dark background
viewer.addEventListener("click", (e) => {
  if (e.target === viewer) {
    viewer.classList.remove("active");
  }
});

// Close the viewer if the user presses the 'Escape' key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    viewer.classList.remove("active");
  }
});