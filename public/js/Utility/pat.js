// ==========================================
// 🐾 Pat Counter
// Handles interactive avatar clicking and optimized syncing with Supabase.
// ==========================================

const avatar = document.querySelector(".avatar-wrap img");
const counter = document.getElementById("pat-count");

// Keep track of the exact, accurate count in JavaScript memory
let accurateCount = 0;
let pendingPats = 0; // Tracks how many clicks happened during a rapid spam session
let debounceTimer = null;

if (avatar && counter) {
  // 1. Fetch initial count from Supabase database when page loads
  fetch("/api/pat")
    .then(r => r.json())
    .then(d => { 
      accurateCount = d.count; 
      counter.textContent = formatCount(accurateCount); 
    })
    .catch(() => console.warn("Failed to load pat count"));

  // 2. Handle the user clicking the avatar
  avatar.addEventListener("click", () => {
    // Retrigger the CSS jump/pat animation
    avatar.classList.remove("pat-anim");
    void avatar.offsetWidth; // Force a browser repaint
    avatar.classList.add("pat-anim");

    // Optimistic Update: Immediately bump numbers locally so it feels fast
    accurateCount += 1; 
    pendingPats += 1; 
    counter.textContent = formatCount(accurateCount);

    // Rate-limit/Debounce protection: Clear the countdown timer on every click
    clearTimeout(debounceTimer);

    // Only fire the network request when the user STOPS clicking for 1 entire second
    debounceTimer = setTimeout(() => {
      syncPatsToServer(pendingPats);
      pendingPats = 0; // Reset our local bundle queue
    }, 1000);
  });
}

// 3. Send bundled clicks together to the backend API
function syncPatsToServer(amountToSend) {
  if (amountToSend <= 0) return;

  fetch("/api/pat", { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountToSend }) 
  })
    .then(r => r.json())
    .then(d => { 
      // Sync the final confirmed count from the database just in case
      accurateCount = d.count;
      counter.textContent = formatCount(accurateCount); 
    })
    .catch(() => console.warn("Failed to sync pat count"));
}

// Converts large numbers into readable shortened string formats (e.g., 2080 -> 2.1k)
function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1)    + "k";
  return String(n);
}