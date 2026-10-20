const query = new URLSearchParams(window.location.search);
const savedLanguage = localStorage.getItem("language");
const storedLanguage = savedLanguage === "en" || savedLanguage === "pl" ? savedLanguage : null;
const routeLanguage = window.location.pathname.split("/").includes("en") ? "en" : "pl";
const currentLang = query.get("lang") === "en"
  ? "en"
  : query.get("lang") === "pl"
    ? "pl"
    : storedLanguage || routeLanguage;

document.querySelectorAll("[data-lang]").forEach((link) => {
  const destination = new URL(window.location.href);
  destination.searchParams.set("lang", link.dataset.lang);
  link.href = destination.href;
});

function readTranslation(dictionary, key) {
  return key.split(".").reduce((value, part) => value?.[part], dictionary);
}

function sitePath(path) {
  const root = window.siteRoot || "/";
  return root === "/" ? path : `${root.slice(0, -1)}${path}`;
}

async function loadTranslations() {
  const response = await fetch(`i18n/${currentLang}.json`);
  if (!response.ok) throw new Error(`Could not load ${currentLang} translations (${response.status}).`);
  const dictionary = await response.json();
  window.siteTranslations = dictionary;
  document.documentElement.lang = currentLang;

  const titleKey = document.body.dataset.i18nTitle;
  if (titleKey) document.title = readTranslation(dictionary, titleKey) || dictionary.meta.title;
  const socialLocale = document.querySelector('meta[property="og:locale"]');
  if (socialLocale) socialLocale.content = currentLang === "en" ? "en_US" : "pl_PL";
  const structuredData = document.getElementById("page-structured-data");
  if (structuredData) {
    try {
      const schema = JSON.parse(structuredData.textContent);
      schema.inLanguage = currentLang;
      schema.description = readTranslation(dictionary, titleKey === "fursona.metaTitle" ? "fursona.metaDescription" : "meta.description");
      if (schema.mainEntity) schema.mainEntity.description = dictionary.fursona.intro2;
      if (schema.hasPart) schema.hasPart.description = dictionary.fursona.metaDescription;
      structuredData.textContent = JSON.stringify(schema);
    } catch (error) {
      console.warn("Structured data could not be localized.", error);
    }
  }

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translated = readTranslation(dictionary, element.dataset.i18n);
    if (translated === undefined) return;

    if (element.hasAttribute("data-i18n-age")) {
      const age = document.getElementById("age")?.textContent || "";
      element.innerHTML = translated.replace("{age}", `<span id="age">${age}</span>`);
    } else {
      element.innerHTML = translated;
    }
  });

  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    const translated = readTranslation(dictionary, element.dataset.i18nContent);
    if (translated !== undefined) element.content = translated;
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    if (element === document.body) return;
    const translated = readTranslation(dictionary, element.dataset.i18nTitle);
    if (translated !== undefined) element.title = translated;
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const translated = readTranslation(dictionary, element.dataset.i18nAlt);
    if (translated !== undefined) element.alt = translated;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const translated = readTranslation(dictionary, element.dataset.i18nAriaLabel);
    if (translated !== undefined) element.setAttribute("aria-label", translated);
  });
  document.querySelectorAll("[data-i18n-href]").forEach((element) => {
    const translated = readTranslation(dictionary, element.dataset.i18nHref);
    if (translated !== undefined) element.href = sitePath(translated);
  });

  document.querySelectorAll("[data-lang]").forEach((link) => {
    link.classList.toggle("active", link.dataset.lang === currentLang);
    if (link.dataset.lang === currentLang) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (query.has("lang")) localStorage.setItem("language", currentLang);
  return dictionary;
}

window.translationsReady = loadTranslations().catch((error) => {
  console.warn(error);
  window.siteTranslations = null;
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

function logConsoleBanner(dictionary) {
  const consoleMessage = readTranslation(dictionary, "console.message");
  const consoleRows = [" /\\_/\\", `( o.o )  ${consoleMessage}`, "stay fluffy · nivereq"];
  const consoleFontSize = window.innerWidth < 480 ? 11 : 13;
  const consoleHeight = 82;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    console.log(`${consoleRows[0]}\n${consoleRows[1]}\n${consoleRows[2]}`);
    return;
  }

  const fontFamily = "ui-monospace, SFMono-Regular, Consolas, monospace";
  context.font = `600 ${consoleFontSize}px ${fontFamily}`;
  const firstRowWidth = context.measureText(consoleRows[0]).width;
  context.font = `700 ${consoleFontSize}px ${fontFamily}`;
  const secondRowWidth = context.measureText(consoleRows[1]).width;
  context.font = `500 ${consoleFontSize - 2}px ${fontFamily}`;
  const footerWidth = context.measureText(consoleRows[2]).width;
  const consoleWidth = Math.ceil(Math.max(firstRowWidth, secondRowWidth, footerWidth) + 36);
  const scale = 2;
  canvas.width = consoleWidth * scale;
  canvas.height = consoleHeight * scale;
  context.scale(scale, scale);

  const surface = context.createLinearGradient(0, 0, consoleWidth, consoleHeight);
  surface.addColorStop(0, "#1f2825");
  surface.addColorStop(1, "#263b35");
  context.beginPath();
  context.roundRect(0.5, 0.5, consoleWidth - 1, consoleHeight - 1, 11);
  context.fillStyle = surface;
  context.fill();
  context.strokeStyle = "rgba(128,198,185,.3)";
  context.stroke();

  context.textBaseline = "alphabetic";
  context.fillStyle = "#9ad7ca";
  context.font = `600 ${consoleFontSize}px ${fontFamily}`;
  context.fillText(consoleRows[0], 18, 25);
  context.fillStyle = "#eef3f0";
  context.font = `700 ${consoleFontSize}px ${fontFamily}`;
  context.fillText(consoleRows[1], 18, 46);
  context.fillStyle = "#a1ada7";
  context.font = `500 ${consoleFontSize - 2}px ${fontFamily}`;
  context.fillText(consoleRows[2], 18, 67);

  const consoleBannerImage = canvas.toDataURL("image/png");
  const horizontalPadding = Math.ceil(consoleWidth / 2);
  const verticalPadding = Math.ceil(consoleHeight / 2);
  console.log("%c.", `color:transparent;font-size:1px;line-height:0;padding:${verticalPadding}px ${horizontalPadding}px;background:url("${consoleBannerImage}") center / 100% 100% no-repeat;`);
}

window.translationsReady.then((dictionary) => {
  if (dictionary) logConsoleBanner(dictionary);
});

requestAnimationFrame(() => document.body.classList.add("page-loaded"));

const siteHeader = document.querySelector(".site-header");
let headerFrame = 0;

function updateHeaderScrollState() {
  const scrollPosition = window.scrollY;
  if (scrollPosition > 24) siteHeader?.classList.add("is-scrolled");
  else if (scrollPosition < 8) siteHeader?.classList.remove("is-scrolled");
}

updateHeaderScrollState();
window.addEventListener("scroll", () => {
  if (headerFrame) return;
  headerFrame = requestAnimationFrame(() => {
    headerFrame = 0;
    updateHeaderScrollState();
  });
}, { passive: true });

const revealElements = document.querySelectorAll(".content-section, .character-feature, .fursona-section");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -28px 0px" });

  revealElements.forEach((element) => {
    element.classList.add("reveal-ready");
    revealObserver.observe(element);
  });
}
