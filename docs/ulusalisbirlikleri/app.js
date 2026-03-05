/* =====================================================
   MANYETAM ULUSAL IS BIRLIKLERI — app.js
   ===================================================== */

const elGrid       = document.getElementById("companyGrid");
const elCountTotal = document.getElementById("countTotal");
const toast        = document.getElementById("toast");

let DATA = [];
let META = {};

/* -- Toast -- */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

/* -- Helpers -- */
function safe(v) { return (v ?? "").toString(); }
function esc(str) {
  return safe(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -- External link SVG icon -- */
const linkSVG = `<svg class="company-link-ico" viewBox="0 0 16 16" fill="none">
  <path d="M7 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M10 2h4v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M14 2L8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

/* -- Placeholder SVG for missing logos -- */
const placeholderSVG = `<svg class="company-logo-placeholder" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" rx="8" stroke="currentColor" stroke-width="2"/>
  <circle cx="32" cy="28" r="8" stroke="currentColor" stroke-width="2"/>
  <path d="M18 52c0-8 6-14 14-14s14 6 14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/* -- Render single company card -- */
function companyCardHTML(company) {
  const hasWebsite = company.website && company.website.trim() !== "";
  const tag = hasWebsite ? "a" : "div";
  const linkAttrs = hasWebsite
    ? `href="${esc(company.website)}" target="_blank" rel="noopener"`
    : "";

  const hasLogo = company.logo && company.logo.trim() !== "";
  const logoContent = hasLogo
    ? `<img class="company-logo" src="${esc(company.logo)}" alt="${esc(company.name)} Logo"
           loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
       <div style="display:none">${placeholderSVG}</div>`
    : placeholderSVG;

  const contactHTML = company.contact
    ? `<span class="company-contact">${esc(company.contact)}</span>`
    : "";

  return `
    <${tag} class="company-card" ${linkAttrs}
       title="${esc(company.name)}" data-id="${esc(company.id)}">
      <div class="company-logo-wrap">
        ${logoContent}
      </div>
      <div class="company-info">
        <span class="company-name">${esc(company.name)}</span>
        ${contactHTML}
        ${hasWebsite ? linkSVG : ""}
      </div>
    </${tag}>`;
}

/* -- Render all -- */
function render() {
  elCountTotal.textContent = DATA.length;

  if (!DATA.length) {
    const tpl = document.getElementById("tplEmpty");
    elGrid.innerHTML = "";
    elGrid.appendChild(tpl.content.cloneNode(true));
    scheduleHeight();
    return;
  }

  elGrid.innerHTML = DATA.map(c => companyCardHTML(c)).join("");
  observeReveal();
  scheduleHeight();
}

/* -- Scroll reveal (IntersectionObserver) -- */
function observeReveal() {
  const cards = document.querySelectorAll(".company-card:not(.revealed)");
  if (!("IntersectionObserver" in window)) {
    cards.forEach(c => c.classList.add("revealed"));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  cards.forEach(c => obs.observe(c));
}

/* -- iframe height -- */
function postHeight() {
  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.parent?.postMessage?.({ type: "mnytm-height", height: h }, "*");
}
function scheduleHeight() {
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 150);
}

/* -- Init -- */
async function init() {
  try {
    const res = await fetch("./companies.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    META = json.meta || {};
    DATA = Array.isArray(json.companies) ? json.companies : [];

    window.addEventListener("load",   postHeight);
    window.addEventListener("resize", scheduleHeight);

    render();
  } catch (err) {
    console.error("Ulusal is birlikleri load error:", err);
    const tpl = document.getElementById("tplError");
    elGrid.innerHTML = "";
    elGrid.appendChild(tpl.content.cloneNode(true));
    elCountTotal.textContent = "0";
    scheduleHeight();
  }
}

init();
