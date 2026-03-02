/* =====================================================
   MANYETAM TÜBİTAK PROJELERİ — app.js
   ===================================================== */

const elList       = document.getElementById("projectList");
const elSearch     = document.getElementById("qSearch");
const elCategory   = document.getElementById("qCategory");
const elStatus     = document.getElementById("qStatus");
const elCountTotal = document.getElementById("countTotal");
const elCountDone  = document.getElementById("countDone");
const elCountOn    = document.getElementById("countOngoing");
const btnFilter    = document.getElementById("btnFilter");
const btnClear     = document.getElementById("btnClear");
const toast        = document.getElementById("toast");

let DATA = [];  // raw categories array
let META = {};

/* ── Toast ── */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

/* ── Helpers ── */
function safe(v) { return (v ?? "").toString(); }
function esc(str) {
  return safe(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function norm(s) { return safe(s).toLowerCase().trim(); }

/* ── Keyword highlight ── */
function highlight(text, query) {
  if (!query || query.length < 2) return esc(text);
  const escaped = esc(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${q})`, "gi"), "<mark>$1</mark>");
}

/* ── Build search blob for a project ── */
function buildBlob(proj) {
  const parts = [
    proj.title,
    proj.investigators?.leader,
    ...(proj.investigators?.researchers || []),
  ];
  proj.cards?.forEach(c => {
    if (typeof c.content === "string") parts.push(c.content);
    else if (Array.isArray(c.content)) parts.push(...c.content);
  });
  return norm(parts.join(" "));
}

/* ── Populate category dropdown ── */
function populateCategories(cats) {
  elCategory.innerHTML = `<option value="">Tümü</option>` +
    cats.map(c => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.label)}</option>`).join("");
}

/* ── Status chip HTML ── */
function statusChipHTML(status) {
  if (status === "done") {
    return `<span class="status-chip status-chip--done">Tamamlandı</span>`;
  }
  return `<span class="status-chip status-chip--ongoing">Devam Ediyor</span>`;
}

/* ── Detail card HTML ── */
function detailCardHTML(card) {
  let body;
  if (card.type === "list" && Array.isArray(card.content)) {
    body = `<ul>${card.content.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  } else {
    body = esc(safe(card.content));
  }
  return `
    <div class="detail-card">
      <div class="detail-heading">${esc(card.heading)}</div>
      <div class="detail-text">${body}</div>
    </div>`;
}

/* ── Render single project card ── */
function projCardHTML(proj, catColor, q) {
  const leader = proj.investigators?.leader || "";
  const researchers = proj.investigators?.researchers || [];
  const metaParts = [];
  if (proj.meta) metaParts.push(proj.meta);
  if (leader) metaParts.push(`Yürütücü: ${leader}`);
  if (researchers.length) metaParts.push(`Araştırmacılar: ${researchers.join(", ")}`);

  const cards = (proj.cards || []).map(c => detailCardHTML(c)).join("");
  const hasDetail = cards.length > 0 || metaParts.length > 0;

  const arrowSVG = hasDetail
    ? `<svg class="proj-expand-arrow" viewBox="0 0 20 20" fill="none">
         <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : "";

  const bodyHTML = hasDetail
    ? `<div class="proj-body" id="projBody-${esc(proj.id)}">
         <div class="proj-body-inner">
           <div class="detail-grid">
             ${cards}
           </div>
         </div>
       </div>`
    : "";

  const toggleAttr = hasDetail
    ? `role="button" tabindex="0" aria-expanded="false" data-proj-toggle="${esc(proj.id)}" style="cursor:pointer"`
    : `style="cursor:default"`;

  const metaHTML = metaParts.length
    ? `<div class="proj-meta">${highlight(metaParts.join(" · "), q)}</div>`
    : "";

  return `
    <div class="proj-card" style="--cat-color:${catColor}" data-id="${esc(proj.id)}">
      <div class="proj-header" ${toggleAttr}>
        <div class="proj-title-area">
          <div class="proj-title">${highlight(safe(proj.title), q)}</div>
          ${metaHTML}
        </div>
        <div class="proj-right">
          ${statusChipHTML(proj.status)}
          ${arrowSVG}
        </div>
      </div>
      ${bodyHTML}
    </div>`;
}

/* ── Render everything ── */
function render() {
  const q      = norm(elSearch.value);
  const catVal = elCategory.value;
  const stVal  = elStatus.value;

  let totalShown = 0;
  let doneCount  = 0;
  let onCount    = 0;
  let html       = "";

  DATA.forEach(cat => {
    if (catVal && cat.code !== catVal) return;

    const filtered = cat.projects.filter(proj => {
      if (stVal && proj.status !== stVal) return false;
      if (q && !buildBlob(proj).includes(q)) return false;
      return true;
    });

    if (!filtered.length) return;

    filtered.forEach(p => {
      if (p.status === "done") doneCount++;
      else onCount++;
    });
    totalShown += filtered.length;

    const projCards = filtered.map(p => projCardHTML(p, cat.color, q)).join("");

    html += `
      <div class="cat-section" data-cat="${esc(cat.code)}">
        <div class="cat-header" role="button" tabindex="0" aria-expanded="false"
             data-cat-toggle="${esc(cat.code)}" style="--cat-color:${cat.color}">
          <span class="cat-badge" style="background:${cat.color}">${esc(cat.code)}</span>
          <span class="cat-title">${esc(cat.label)}</span>
          <span class="cat-hint">${esc(cat.hint)}</span>
          <span class="cat-count">${filtered.length}</span>
          <svg class="cat-arrow" viewBox="0 0 20 20" fill="none">
            <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="cat-body" id="catBody-${esc(cat.code)}">
          <div class="cat-body-inner">
            ${projCards}
          </div>
        </div>
      </div>`;
  });

  elCountTotal.textContent = totalShown;
  elCountDone.textContent  = doneCount;
  elCountOn.textContent    = onCount;

  if (!html) {
    const tpl = document.getElementById("tplEmpty");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
  } else {
    elList.innerHTML = html;
  }

  attachToggles();
  observeReveal();
  scheduleHeight();
}

/* ── Accordion toggles ── */
function attachToggles() {
  // Category toggles
  document.querySelectorAll("[data-cat-toggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleCategory(btn));
    btn.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCategory(btn); }
    });
  });

  // Project toggles
  document.querySelectorAll("[data-proj-toggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleProject(btn));
    btn.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleProject(btn); }
    });
  });
}

function toggleCategory(btn) {
  const code = btn.dataset.catToggle;
  const body = document.getElementById(`catBody-${code}`);
  const isOpen = btn.classList.contains("open");

  if (isOpen) {
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => { body.style.maxHeight = "0"; });
    body.addEventListener("transitionend", () => {
      body.classList.remove("open");
    }, { once: true });
  } else {
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    body.classList.add("open");
    body.style.maxHeight = body.scrollHeight + "px";
    body.addEventListener("transitionend", () => {
      body.style.maxHeight = "none";
    }, { once: true });
  }
  scheduleHeight();
}

function toggleProject(btn) {
  const id = btn.dataset.projToggle;
  const body = document.getElementById(`projBody-${id}`);
  const isOpen = btn.classList.contains("open");

  if (isOpen) {
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => { body.style.maxHeight = "0"; });
    body.addEventListener("transitionend", () => {
      body.classList.remove("open");
    }, { once: true });
  } else {
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    body.classList.add("open");
    body.style.maxHeight = body.scrollHeight + "px";
    body.addEventListener("transitionend", () => {
      body.style.maxHeight = "none";
    }, { once: true });
  }
  scheduleHeight();
}

/* ── Scroll reveal (IntersectionObserver) ── */
function observeReveal() {
  const sections = document.querySelectorAll(".cat-section:not(.revealed)");
  if (!("IntersectionObserver" in window)) {
    sections.forEach(s => s.classList.add("revealed"));
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

  sections.forEach(s => obs.observe(s));
}

/* ── iframe height ── */
function postHeight() {
  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.parent?.postMessage?.({ type: "mnytm-height", height: h }, "*");
}
function scheduleHeight() {
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 150);
}

/* ── Events ── */
function attach() {
  [elSearch, elCategory, elStatus].forEach(el => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });
  btnFilter.addEventListener("click", () => {
    render();
    showToast("Filtre uygulandı");
  });
  btnClear.addEventListener("click", () => {
    elSearch.value   = "";
    elCategory.value = "";
    elStatus.value   = "";
    render();
    showToast("Filtreler temizlendi");
  });
  window.addEventListener("load",   postHeight);
  window.addEventListener("resize", scheduleHeight);
}

/* ── Init ── */
async function init() {
  try {
    const res = await fetch("./projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    META = json.meta || {};
    DATA = Array.isArray(json.categories) ? json.categories : [];

    populateCategories(DATA);
    attach();
    render();
  } catch (err) {
    console.error("TÜBİTAK projects load error:", err);
    const tpl = document.getElementById("tplError");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCountTotal.textContent = "0";
    scheduleHeight();
  }
}

init();
