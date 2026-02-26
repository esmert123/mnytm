/* ========================================================
   MANYETAM SCI — app.js
   Features: filter, sort, pagination, keyword highlight,
             Excel/BibTeX/RIS export, APA clipboard, toast
   ======================================================== */

const elList      = document.getElementById("list");
const elSearch    = document.getElementById("qSearch");
const elYear      = document.getElementById("qYear");
const elQuartile  = document.getElementById("qQuartile");
const elSort      = document.getElementById("qSort");
const elCount     = document.getElementById("countText");
const elLastUpd   = document.getElementById("lastUpdated");
const btnFilter   = document.getElementById("btnFilter");
const btnClear    = document.getElementById("btnClear");
const btnExcel    = document.getElementById("btnExcel");
const btnBibtex   = document.getElementById("btnBibtex");
const btnRis      = document.getElementById("btnRis");
const elPage      = document.getElementById("pagination");
const toast       = document.getElementById("toast");

let DATA     = [];
let META     = {};
let filtered = [];
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
  const tags = Array.isArray(item.tags) ? item.tags.join(" ") : "";
  return norm([item.title, item.authors, item.journal, item.abstract, item.doi, tags].join(" "));
}

/* ── Keyword highlighting ── */
function highlight(text, query) {
  if (!query || query.length < 2) return esc(text);
  const escaped = esc(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${q})`, "gi"), "<mark>$1</mark>");
}

/* ── APA citation ── */
function buildAPA(item) {
  const authors = safe(item.authors);
  const year    = item.year ? `(${item.year}).` : "";
  const title   = safe(item.title);
  const journal = safe(item.journal);
  const vol     = safe(item.volume);
  const issue   = safe(item.issue);
  const pages   = safe(item.pages);
  const doi     = item.doiUrl || (item.doi ? `https://doi.org/${item.doi}` : "");
  const vi      = vol && issue ? `${vol}(${issue})` : vol;
  const pPart   = pages   ? `, ${pages}` : "";
  const jPart   = journal ? `${journal}${vi ? ", " : ""}${vi}${pPart}.` : "";
  const dPart   = doi     ? ` ${doi}` : "";
  return `${authors} ${year} ${title}. ${jPart}${dPart}`.replace(/\s+/g," ").trim();
}

/* ── Clipboard ── */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Kaynakça kopyalandı ✓");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Kaynakça kopyalandı ✓");
  }
}

/* ── Download helper ── */
function download(filename, content, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Excel (CSV) export ── */
function exportExcel() {
  if (!filtered.length) { showToast("Dışa aktarılacak yayın yok"); return; }
  const header = ["ID","Başlık","Yazarlar","Dergi","Yıl","Q","Cilt","Sayı","Sayfalar","DOI","Etiketler"];
  const rows = filtered.map(i => [
    i.id, i.title, i.authors, i.journal, i.year, i.quartile,
    i.volume, i.issue, i.pages, i.doi,
    Array.isArray(i.tags) ? i.tags.join("; ") : ""
  ].map(v => `"${safe(v).replace(/"/g,'""')}"`));
  const csv = [header.map(h=>`"${h}"`).join(","), ...rows.map(r=>r.join(","))].join("\r\n");
  download("manyetam_sci.csv", "\uFEFF" + csv, "text/csv;charset=utf-8;");
  showToast("Excel (CSV) indirildi ✓");
}

/* ── BibTeX export ── */
function exportBibtex() {
  if (!filtered.length) { showToast("Dışa aktarılacak yayın yok"); return; }
  const bib = filtered.map(i => {
    const key = `${(i.authors||"").split(",")[0].trim().replace(/\s+/g,"")}_${i.year||""}`;
    const doi = i.doi || "";
    const vol = i.volume ? `  volume   = {${i.volume}},\n` : "";
    const num = i.issue  ? `  number   = {${i.issue}},\n`  : "";
    const pgs = i.pages  ? `  pages    = {${i.pages}},\n`  : "";
    const do2 = doi      ? `  doi      = {${doi}},\n`       : "";
    return `@article{${key},\n  author   = {${i.authors}},\n  title    = {${i.title}},\n  journal  = {${i.journal}},\n  year     = {${i.year}},\n${vol}${num}${pgs}${do2}}`;
  }).join("\n\n");
  download("manyetam_sci.bib", bib, "text/plain;charset=utf-8;");
  showToast("BibTeX indirildi ✓");
}

/* ── RIS export ── */
function exportRis() {
  if (!filtered.length) { showToast("Dışa aktarılacak yayın yok"); return; }
  const ris = filtered.map(i => {
    const lines = ["TY  - JOUR"];
    (i.authors||"").split(",").forEach(a => lines.push(`AU  - ${a.trim()}`));
    lines.push(`TI  - ${i.title}`);
    lines.push(`JO  - ${i.journal}`);
    if (i.year)    lines.push(`PY  - ${i.year}`);
    if (i.volume)  lines.push(`VL  - ${i.volume}`);
    if (i.issue)   lines.push(`IS  - ${i.issue}`);
    if (i.pages)   lines.push(`SP  - ${i.pages}`);
    if (i.doi)     lines.push(`DO  - ${i.doi}`);
    if (i.abstract) lines.push(`AB  - ${i.abstract}`);
    lines.push("ER  - ");
    return lines.join("\n");
  }).join("\n\n");
  download("manyetam_sci.ris", ris, "text/plain;charset=utf-8;");
  showToast("RIS indirildi ✓");
}

/* ── Q helpers ── */
function qChipHTML(q) {
  const u = safe(q).toUpperCase();
  const cls = ["Q1","Q2","Q3","Q4"].includes(u) ? `q-chip q-chip--${u}` : "q-chip q-chip--def";
  return u ? `<span class="${cls}">${esc(u)}</span>` : "";
}

function yearBadgeClass(q) {
  const u = safe(q).toUpperCase();
  return ["Q1","Q2","Q3","Q4"].includes(u) ? `year-badge year-badge--${u}` : "year-badge year-badge--def";
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

  elPage.querySelectorAll("[data-pg]").forEach(btn => {
    btn.addEventListener("click", () => { currentPage = Number(btn.dataset.pg); renderPage(); });
  });
  document.getElementById("pgPrev")?.addEventListener("click", () => { currentPage--; renderPage(); });
  document.getElementById("pgNext")?.addEventListener("click", () => { currentPage++; renderPage(); });
}

/* ── Render current page ── */
function renderPage() {
  const q = norm(elSearch.value);
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  if (!slice.length && filtered.length === 0) {
    const tpl = document.getElementById("tplEmpty");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elPage.innerHTML = "";
    return;
  }

  elList.innerHTML = slice.map(item => {
    const q_val   = safe(item.quartile).toUpperCase();
    const metaParts = [];
    if (item.volume) metaParts.push(`Cilt ${item.volume}`);
    if (item.issue)  metaParts.push(`Sayı ${item.issue}`);
    if (item.pages)  metaParts.push(`s. ${item.pages}`);
    const metaStr = metaParts.join(" &bull; ");

    const tags = Array.isArray(item.tags)
      ? item.tags.map(t => `<span class="tag-chip">${esc(t)}</span>`).join("") : "";

    const doiDisplay = item.doiUrl || (item.doi ? `https://doi.org/${item.doi}` : "");
    const doiShort   = doiDisplay.replace("https://doi.org/","").substring(0,28)
                       + (doiDisplay.length > 28 ? "…" : "");

    const doiHTML = doiDisplay
      ? `<a class="doi-link" href="${esc(doiDisplay)}" target="_blank" rel="noopener">
           <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M7 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 2h4v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 2L8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
           ${esc(doiDisplay)}
         </a>`
      : "";

    const goURL = item.doiUrl || (item.doi ? `https://doi.org/${item.doi}` : "") || item.pdfUrl || "";
    const goHTML = goURL
      ? `<a class="act-btn act-btn--go" href="${esc(goURL)}" target="_blank" rel="noopener">
           <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M7 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="white" stroke-width="1.6" stroke-linecap="round"/><path d="M10 2h4v4" stroke="white" stroke-width="1.6" stroke-linecap="round"/><path d="M14 2L8 8" stroke="white" stroke-width="1.6" stroke-linecap="round"/></svg>
           Yayına Git
         </a>`
      : `<span class="act-btn act-btn--go act-btn--disabled">DOI yok</span>`;

    const absHTML = item.abstract
      ? `<p class="pub-abstract">${highlight(item.abstract, q)}</p>` : "";

    return `
    <article class="pub-card" data-id="${esc(item.id||"")}" data-q="${esc(q_val)}">
      <div class="pub-body">
        <div class="pub-meta-row">
          ${qChipHTML(item.quartile)}
          ${metaStr ? `<span class="meta-chip">${metaStr}</span>` : ""}
          ${tags}
        </div>
        <h2 class="pub-title">${highlight(safe(item.title), q)}</h2>
        <p class="pub-authors">${esc(item.authors)}</p>
        <div class="pub-journal-row">
          <span class="pub-journal">${esc(item.journal)}</span>
          ${item.doiUrl ? `<span class="pub-journal-arrow">›</span>` : ""}
        </div>
        ${absHTML}
      </div>
      <div class="pub-actions">
        <span class="${yearBadgeClass(item.quartile)}">${esc(String(item.year))}</span>
        ${doiHTML}
        <div class="action-btns">
          ${goHTML}
        </div>
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
  const qu = norm(elQuartile.value);

  filtered = DATA.filter(item => {
    const blob = buildBlob(item);
    return (!q  || blob.includes(q))
        && (!y  || String(item.year) === String(y))
        && (!qu || norm(item.quartile).toUpperCase() === qu.toUpperCase());
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

/* ── iframe height sync ── */
function postHeight() {
  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.parent?.postMessage?.({ type:"mnytm-height", height:h }, "*");
}
function scheduleHeight() {
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 120);
}

/* ── Event bindings ── */
function attach() {
  [elSearch, elYear, elQuartile, elSort].forEach(el => {
    el.addEventListener("input",  apply);
    el.addEventListener("change", apply);
  });

  btnFilter.addEventListener("click", apply);

  btnClear.addEventListener("click", () => {
    elSearch.value   = "";
    elYear.value     = "";
    elQuartile.value = "";
    elSort.value     = "year-desc";
    apply();
  });

  btnExcel.addEventListener("click",  exportExcel);
  btnBibtex.addEventListener("click", exportBibtex);
  btnRis.addEventListener("click",    exportRis);

  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-cite]");
    if (btn) copyToClipboard(btn.getAttribute("data-cite") || "");
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
      // Format date nicely in Turkish
      try {
        const d = new Date(META.lastUpdated);
        const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
        elLastUpd.textContent = `Güncelleme: ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } catch {
        elLastUpd.textContent = `Güncelleme: ${META.lastUpdated}`;
      }
    }

    attach();
    apply();

  } catch(err) {
    console.error("SCI load error:", err);
    const tpl = document.getElementById("tplError");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCount.textContent = "0";
    scheduleHeight();
  }
}

init();
