// carousel

const track = document.querySelector(".carousel-track");
const next = document.querySelector(".next");
const prev = document.querySelector(".prev");

let scrollPosition = 0;
const step = 280;

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


// viewer

const images = document.querySelectorAll(".carousel-track img");
const viewer = document.getElementById("art-viewer");
const viewerImg = document.getElementById("viewer-img");
const viewerAuthor = document.getElementById("viewer-author");

images.forEach(img => {

  img.addEventListener("click", () => {

    viewer.classList.add("active");

    viewerImg.src = img.src;

    const author = img.dataset.author || "Unknown artist";
    viewerAuthor.textContent = "Art by " + author;

  });

});


// close viewer by clicking background

viewer.addEventListener("click", (e) => {

  if (e.target === viewer) {
    viewer.classList.remove("active");
  }

});


// ESC closes viewer

document.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {
    viewer.classList.remove("active");
  }

});