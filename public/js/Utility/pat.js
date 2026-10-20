const patAvatar = document.querySelector(".hero-avatar");
const patButton = document.querySelector(".pat-chip");
const patCount = document.getElementById("pat-count");
let confirmedPats = 0;
let queuedPats = 0;
let syncTimer;

function formatPatCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function renderPatCount() {
  if (patCount) patCount.textContent = formatPatCount(confirmedPats + queuedPats);
}

async function loadPatCount() {
  try {
    const response = await fetch("api/pat");
    if (!response.ok) throw new Error(`Pat count request failed (${response.status}).`);
    const result = await response.json();
    confirmedPats = Number(result.count) || 0;
    renderPatCount();
  } catch (error) {
    console.info("Pat counter is unavailable in this environment.", error);
  }
}

async function syncPats(amount) {
  if (!amount) return;
  try {
    const response = await fetch("api/pat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!response.ok) throw new Error(`Pat sync failed (${response.status}).`);
    const result = await response.json();
    confirmedPats = Number(result.count) || confirmedPats + amount;
    renderPatCount();
  } catch (error) {
    console.info("Pat counter could not be synced in this environment.", error);
  }
}

function pat() {
  if (!patAvatar || !patCount) return;
  patAvatar.classList.remove("pat-anim");
  void patAvatar.offsetWidth;
  patAvatar.classList.add("pat-anim");
  queuedPats += 1;
  renderPatCount();
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const amount = queuedPats;
    queuedPats = 0;
    syncPats(amount);
  }, 900);
}

patAvatar?.addEventListener("click", pat);
patAvatar?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pat();
  }
});
patButton?.addEventListener("click", pat);
if (patAvatar && patCount) loadPatCount();
