/* =====================================================
   MANYETAM TR Dizin — trdizin.js
   ===================================================== */

const elList    = document.getElementById("list");
const elSearch  = document.getElementById("qSearch");
const elYear    = document.getElementById("qYear");
const elLang    = document.getElementById("qLang");
const elSort    = document.getElementById("qSort");
const elCount   = document.getElementById("countText");
const elLastUpd = document.getElementById("lastUpdated");
const btnFilter = document.getElementById("btnFilter");
const btnClear  = document.getElementById("btnClear");
const elPage    = document.getElementById("pagination");
const toast     = document.getElementById("toast");

let DATA        = [];
let META        = {};
let filtered    = [];
let currentPage = 1;
const PER_PAGE  = 10;

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
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
function norm(s) { return safe(s).toLowerCase().trim(); }
function buildBlob(item) {
  return norm([item.title, item.authors, item.journal, item.abstract, item.doi].join(" "));
}

/* ── Keyword highlight ── */
function highlight(text, query) {
  if (!query || query.length < 2) return esc(text);
  const escaped = esc(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${q})`, "gi"), "<mark>$1</mark>");
}

/* ── Language chip ── */
function langChip(lang) {
  const u = safe(lang).toUpperCase();
  if (u === "TR") return `<span class="lang-chip lang-chip--tr">TR</span>`;
  if (u === "EN") return `<span class="lang-chip lang-chip--en">EN</span>`;
  return u ? `<span class="lang-chip">${esc(u)}</span>` : "";
}

/* ── Pagination ── */
function renderPagination(total, page) {
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) { elPage.innerHTML = ""; return; }

  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) range.push(i);
    else if (range[range.length - 1] !== "…") range.push("…");
  }

  let html = `<button class="pg-btn" id="pgPrev" ${page===1?"disabled":""}>‹ Önceki</button>`;
  range.forEach(r => {
    if (r === "…") html += `<span class="pg-dots">…</span>`;
    else html += `<button class="pg-btn ${r===page?"pg-btn--active":""}" data-pg="${r}">${r}</button>`;
  });
  html += `<button class="pg-btn" id="pgNext" ${page===pages?"disabled":""}>Sonraki ›</button>`;
  elPage.innerHTML = html;

  elPage.querySelectorAll("[data-pg]").forEach(btn =>
    btn.addEventListener("click", () => { currentPage = Number(btn.dataset.pg); renderPage(); })
  );
  document.getElementById("pgPrev")?.addEventListener("click", () => { currentPage--; renderPage(); });
  document.getElementById("pgNext")?.addEventListener("click", () => { currentPage++; renderPage(); });
}

/* ── Render page ── */
function renderPage() {
  const q     = norm(elSearch.value);
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  if (!slice.length) {
    const tpl = document.getElementById("tplEmpty");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elPage.innerHTML = "";
    return;
  }

  elList.innerHTML = slice.map((item, idx) => {
    const num     = String(start + idx + 1).padStart(2, "0");
    const absHTML = item.abstract
      ? `<p class="pub-abstract">${highlight(safe(item.abstract), q)}</p>` : "";

    const metaParts = [];
    if (item.volume) metaParts.push(`Cilt ${item.volume}`);
    if (item.issue)  metaParts.push(`Sayı ${item.issue}`);
    if (item.pages)  metaParts.push(`s. ${item.pages}`);
    const metaStr = metaParts.join(" · ");

    const doiURL = item.doiUrl || (item.doi ? `https://doi.org/${item.doi}` : "");
    const goHTML = doiURL
      ? `<a class="act-btn act-btn--go" href="${esc(doiURL)}" target="_blank" rel="noopener">
           <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
             <path d="M3 8h9M8 4l4 4-4 4" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
           Yayına Git
         </a>`
      : "";

    return `
    <article class="pub-card" data-id="${esc(item.id||"")}">
      <div class="pub-strip-num">${esc(num)}</div>
      <div class="pub-body">
        <div class="pub-meta-row">
          ${langChip(item.lang)}
          ${metaStr ? `<span class="meta-chip">${esc(metaStr)}</span>` : ""}
        </div>
        <h2 class="pub-title">${highlight(safe(item.title), q)}</h2>
        <p class="pub-authors">${esc(item.authors)}</p>
        <div class="pub-journal-row">
          <span class="pub-journal">${esc(item.journal)}</span>
        </div>
        ${absHTML}
      </div>
      <div class="pub-actions">
        <span class="year-badge year-badge--def">${esc(String(item.year))}</span>
        ${doiURL ? `<a class="doi-link" href="${esc(doiURL)}" target="_blank" rel="noopener">
           <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M7 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 2h4v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 2L8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
           ${esc(doiURL)}
         </a>` : ""}
        <div class="action-btns">${goHTML}</div>
        <button class="card-expand" type="button" aria-label="Detaylar" title="Detaylar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </article>`;
  }).join("");

  renderPagination(filtered.length, currentPage);
  scheduleHeight();
}

/* ── Sort ── */
function sortItems(items, mode) {
  const arr = [...items];
  switch(mode) {
    case "year-asc":    return arr.sort((a,b)=>(Number(a.year)||0)-(Number(b.year)||0));
    case "title-asc":   return arr.sort((a,b)=>safe(a.title).localeCompare(safe(b.title),"tr"));
    case "journal-asc": return arr.sort((a,b)=>safe(a.journal).localeCompare(safe(b.journal),"tr"));
    default:            return arr.sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  }
}

/* ── Apply filters ── */
function apply() {
  const q  = norm(elSearch.value);
  const y  = elYear.value;
  const lg = norm(elLang.value);

  filtered = DATA.filter(item => {
    const blob = buildBlob(item);
    return (!q  || blob.includes(q))
        && (!y  || String(item.year) === String(y))
        && (!lg || norm(item.lang) === lg);
  });

  filtered = sortItems(filtered, elSort.value);
  elCount.textContent = filtered.length;
  currentPage = 1;
  renderPage();
}

/* ── Year dropdown ── */
function populateYears(items) {
  const years = [...new Set(items.map(x=>Number(x.year)).filter(Boolean))].sort((a,b)=>b-a);
  elYear.innerHTML = `<option value="">Tümü</option>` +
    years.map(y=>`<option value="${y}">${y}</option>`).join("");
}

/* ── iframe height ── */
function postHeight() {
  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.parent?.postMessage?.({ type:"mnytm-height", height:h }, "*");
}
function scheduleHeight() {
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 120);
}

/* ── Events ── */
function attach() {
  [elSearch, elYear, elLang, elSort].forEach(el => {
    el.addEventListener("input",  apply);
    el.addEventListener("change", apply);
  });
  btnFilter.addEventListener("click", apply);
  btnClear.addEventListener("click", () => {
    elSearch.value = "";
    elYear.value   = "";
    elLang.value   = "";
    elSort.value   = "year-desc";
    apply();
  });
  window.addEventListener("load",   postHeight);
  window.addEventListener("resize", scheduleHeight);
}

/* ── Init ── */
async function init() {
  try {
    const res = await fetch("./publications.json", { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    META = json.meta || {};
    DATA = Array.isArray(json.items) ? json.items : [];

    populateYears(DATA);

    if (META.lastUpdated) {
      try {
        const d = new Date(META.lastUpdated);
        const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
        elLastUpd.textContent = `Güncelleme: ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } catch { elLastUpd.textContent = `Güncelleme: ${META.lastUpdated}`; }
    }

    attach();
    apply();
  } catch(err) {
    console.error("TR Dizin load error:", err);
    const tpl = document.getElementById("tplError");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCount.textContent = "0";
    scheduleHeight();
  }
}

init();

