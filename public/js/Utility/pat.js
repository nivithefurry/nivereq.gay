// ==========================================
// 🐾 Pat Counter
// Handles the interactive avatar clicking and syncing with the server.
// ==========================================

const avatar = document.querySelector(".avatar-wrap img");
const counter = document.getElementById("pat-count");

if (avatar && counter) {
  // 1. Fetch the initial count when the page loads
  fetch("/api/pat")
    .then(r => r.json())
    .then(d => { counter.textContent = formatCount(d.count); })
    .catch(() => console.warn("Failed to load pat count"));

  // 2. Handle the user clicking the avatar
  avatar.addEventListener("click", () => {
    // Retrigger the CSS animation by removing and quickly re-adding the class
    avatar.classList.remove("pat-anim");
    void avatar.offsetWidth; // This forces the browser to redraw the element
    avatar.classList.add("pat-anim");

    // Optimistic Update: Immediately increment the number on the user's screen 
    // before the server responds so the site feels incredibly fast.
    const current = parseCount(counter.textContent);
    counter.textContent = formatCount(current + 1);

    // 3. Send the actual click to the server in the background
    fetch("/api/pat", { method: "POST" })
      .then(r => r.json())
      .then(d => { 
        // Sync the final confirmed count from the server just in case
        counter.textContent = formatCount(d.count); 
      })
      .catch(() => console.warn("Failed to sync pat count"));
  });
}

// Converts large numbers into readable formats (e.g., 1500 -> 1.5k)
function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1)    + "k";
  return String(n);
}

// Converts readable formats back into standard integers for math
function parseCount(str) {
  if (str.endsWith("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.endsWith("k")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str, 10) || 0;
}