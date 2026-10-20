const referenceButton = document.getElementById("fursona-image-button");
const referenceModal = document.getElementById("image-modal");
const referenceImage = document.getElementById("modal-img");
const referenceCloseButton = document.getElementById("modal-close");
let modalReturnFocus = null;

function openReference() {
  if (!referenceModal || !referenceImage) return;
  modalReturnFocus = document.activeElement;
  referenceImage.src = document.getElementById("fursona-img").src;
  referenceModal.classList.add("active");
  referenceModal.setAttribute("aria-hidden", "false");
  referenceCloseButton?.focus();
}

function closeReference() {
  if (!referenceModal?.classList.contains("active")) return;
  referenceModal.classList.remove("active");
  referenceModal.setAttribute("aria-hidden", "true");
  modalReturnFocus?.focus?.();
}

referenceButton?.addEventListener("click", openReference);
referenceCloseButton?.addEventListener("click", closeReference);
referenceModal?.addEventListener("click", (event) => {
  if (event.target === referenceModal) closeReference();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeReference();
});

window.translationsReady.then(() => {
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    const color = swatch.dataset.color;
    const label = swatch.querySelector("span");
    const copyLabel = window.siteTranslations?.fursona?.copyColor || "Copy color";
    swatch.setAttribute("aria-label", `${copyLabel} ${color}`);
    swatch.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(color);
        label.textContent = window.siteTranslations?.fursona?.copied || "Copied!";
        swatch.classList.add("copied");
        window.setTimeout(() => {
          label.textContent = color;
          swatch.classList.remove("copied");
        }, 900);
      } catch (error) {
        console.info("Clipboard access is unavailable.", error);
      }
    });
  });
});
