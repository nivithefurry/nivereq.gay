const patAvatar = document.querySelector(".hero-avatar");
const patButton = document.querySelector(".pat-chip");
const patCount = document.getElementById("pat-count");
const patMessage = document.getElementById("pat-message");
const MAX_BATCH = 10;
let confirmedPats = 0;
let queuedPats = 0;
let syncTimer;
let messageTimer;
let requestInFlight = false;

function formatPatCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function renderPatCount() {
  if (patCount) patCount.textContent = formatPatCount(confirmedPats);
}

function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "pl";
}

function showMessage(message, duration = 6000) {
  if (!patMessage) return;
  window.clearTimeout(messageTimer);
  patMessage.textContent = message;
  if (duration > 0) messageTimer = window.setTimeout(() => { patMessage.textContent = ""; }, duration);
}

function updateConfirmedCount(value) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid counter response.");
  confirmedPats = Math.max(confirmedPats, count);
  renderPatCount();
}

async function loadPatCount() {
  try {
    const response = await fetch("api/pat", { cache: "no-store" });
    if (!response.ok) throw new Error(`Pat count request failed (${response.status}).`);
    const result = await response.json();
    updateConfirmedCount(result.count);
  } catch (error) {
    console.info("Pat counter is unavailable in this environment.", error);
  }
}

async function sendPatBatch(amount) {
  const response = await fetch("api/pat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true || result.accepted !== true) {
    throw new Error(`Pat request failed (${response.status}).`);
  }

  updateConfirmedCount(result.count);
}

async function flushPats() {
  if (requestInFlight || queuedPats === 0) return;
  requestInFlight = true;
  const amount = Math.min(queuedPats, MAX_BATCH);
  queuedPats -= amount;

  let accepted = false;
  let requestFailed = false;
  try {
    await sendPatBatch(amount);
    accepted = true;
  } catch (error) {
    requestFailed = true;
    console.info("Pat counter could not be synced in this environment.", error);
    showMessage(currentLanguage() === "en"
      ? "The pat did not sync. Please try again."
      : "Nie udało się zapisać głaskania. Spróbuj ponownie.");
    loadPatCount();
  } finally {
    requestInFlight = false;
  }

  if (accepted && queuedPats > 0) syncTimer = window.setTimeout(flushPats, 0);
  if (requestFailed && queuedPats > 0) syncTimer = window.setTimeout(flushPats, 2000);
}

function pat() {
  if (!patAvatar || !patCount) return;

  patAvatar.classList.remove("pat-anim");
  void patAvatar.offsetWidth;
  patAvatar.classList.add("pat-anim");

  queuedPats += 1;
  window.clearTimeout(syncTimer);
  if (queuedPats >= MAX_BATCH && !requestInFlight) {
    syncTimer = window.setTimeout(flushPats, 0);
  } else {
    syncTimer = window.setTimeout(flushPats, 450);
  }
}

patAvatar?.addEventListener("click", pat);
patAvatar?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pat();
  }
});
patButton?.addEventListener("click", pat);
if (patAvatar && patCount) {
  renderPatCount();
  loadPatCount();
}
