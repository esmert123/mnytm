const elList      = document.getElementById("list");
const elSearch    = document.getElementById("qSearch");
const elYear      = document.getElementById("qYear");
const elQuartile  = document.getElementById("qQuartile");
const elSort      = document.getElementById("qSort");
const elCount     = document.getElementById("countText");
const elLastUpdated = document.getElementById("lastUpdated");
const btnClear    = document.getElementById("btnClear");
const toast       = document.getElementById("toast");

let DATA = [];
let META = {};
let filtered = [];

/* ── Toast ── */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

/* ── Helpers ── */
function safe(v){ return (v ?? "").toString(); }

function escapeHtml(str) {
  return safe(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function normalize(s){ return safe(s).toLowerCase().trim(); }

function buildBlob(item){
  const tags = Array.isArray(item.tags) ? item.tags.join(" ") : "";
  return normalize([item.title, item.authors, item.journal, item.abstract, item.doi, tags].join(" "));
}

function buildMetaLine(item){
  const parts = [];
  if (item.volume) parts.push(`Cilt ${item.volume}`);
  if (item.issue)  parts.push(`Sayı ${item.issue}`);
  if (item.pages)  parts.push(`s. ${item.pages}`);
  return parts.join(" · ");
}

/* ── APA Citation ── */
function buildCitationAPA(item){
  const authors  = safe(item.authors);
  const year     = item.year ? `(${item.year}).` : "";
  const title    = safe(item.title);
  const journal  = safe(item.journal);
  const vol      = safe(item.volume);
  const issue    = safe(item.issue);
  const pages    = safe(item.pages);
  const doiUrl   = item.doiUrl ? item.doiUrl : (item.doi ? `https://doi.org/${item.doi}` : "");

  let volIssue = "";
  if (vol && issue) volIssue = `${vol}(${issue})`;
  else if (vol)     volIssue = `${vol}`;

  const pagesPart = pages   ? `, ${pages}` : "";
  const doiPart   = doiUrl  ? ` ${doiUrl}` : "";
  const jPart     = journal ? `${journal}${volIssue ? ", " : ""}${volIssue}${pagesPart}.` : "";

  return `${authors} ${year} ${title}. ${jPart}${doiPart}`.replace(/\s+/g," ").trim();
}

/* ── Clipboard ── */
async function copyToClipboard(text){
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

/* ── Q-color strip ── */
function stripClass(q){
  const u = safe(q).toUpperCase();
  if (u === "Q1") return "pub__strip pub__strip--q1";
  if (u === "Q2") return "pub__strip pub__strip--q2";
  if (u === "Q3") return "pub__strip pub__strip--q3";
  if (u === "Q4") return "pub__strip pub__strip--q4";
  return "pub__strip";
}

/* ── Quartile chip class ── */
function qChipClass(q){
  const u = safe(q).toUpperCase();
  if (u === "Q1") return "chip chip--q chip--q1";
  if (u === "Q2") return "chip chip--q chip--q2";
  if (u === "Q3") return "chip chip--q chip--q3";
  if (u === "Q4") return "chip chip--q chip--q4";
  return "chip chip--q";
}

/* ── iframe auto-height ── */
function postHeight(){
  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.parent?.postMessage?.({ type:"mnytm-height", height: h }, "*");
}
function scheduleHeight(){
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 120);
}

/* ── Populate year dropdown ── */
function populateYearOptions(items){
  const years = [...new Set(items.map(x => Number(x.year)).filter(Boolean))].sort((a,b)=>b-a);
  elYear.innerHTML = `<option value="">Tümü</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("");
}

/* ── Sort ── */
function sortItems(items, mode){
  const arr = [...items];
  switch(mode){
    case "year-asc":    return arr.sort((a,b) => (Number(a.year)||0) - (Number(b.year)||0));
    case "title-asc":   return arr.sort((a,b) => safe(a.title).localeCompare(safe(b.title),"tr"));
    case "journal-asc": return arr.sort((a,b) => safe(a.journal).localeCompare(safe(b.journal),"tr"));
    case "year-desc": default:
      return arr.sort((a,b) => (Number(b.year)||0) - (Number(a.year)||0));
  }
}

/* ── Render ── */
function render(items){
  if (!items.length){
    const tpl = document.getElementById("tplEmpty");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCount.textContent = "0 sonuç";
    scheduleHeight();
    return;
  }

  elList.innerHTML = items.map(item => {
    const quartile  = safe(item.quartile).toUpperCase();
    const metaLine  = buildMetaLine(item);
    const abs       = item.abstract ? escapeHtml(item.abstract) : "";
    const tags      = Array.isArray(item.tags)
      ? item.tags.map(t => `<span class="chip chip--tag">${escapeHtml(t)}</span>`).join("")
      : "";

    const qChip     = quartile ? `<span class="${qChipClass(item.quartile)}">${escapeHtml(quartile)}</span>` : "";
    const metaChip  = metaLine ? `<span class="chip chip--soft">${escapeHtml(metaLine)}</span>` : "";

    const doiBtn = item.doiUrl
      ? `<a class="alink alink--doi" href="${escapeHtml(item.doiUrl)}" target="_blank" rel="noopener noreferrer">
          <svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M14 3h7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 3l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 7H7a4 4 0 0 0 0 8h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 17h3a4 4 0 0 0 0-8h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          DOI
        </a>`
      : (item.doi ? `<span class="alink alink--cite" style="cursor:default">DOI: ${escapeHtml(item.doi)}</span>` : "");

    const pdfBtn = item.pdfUrl
      ? `<a class="alink alink--pdf" href="${escapeHtml(item.pdfUrl)}" target="_blank" rel="noopener noreferrer">
          <svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/></svg>
          PDF
        </a>`
      : "";

    const citation = buildCitationAPA(item);
    const citeBtn = `<button class="alink alink--cite" type="button" data-cite="${escapeHtml(citation)}">
      <svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M8 7h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 12h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 7h.01M6 12h.01M6 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
      APA Kopyala
    </button>`;

    const absHtml = abs ? `<p class="abstract">${abs}</p>` : "";

    return `
      <article class="pub" data-id="${escapeHtml(item.id || "")}">
        <div class="${stripClass(item.quartile)}"></div>
        <div class="pub__body">
          <div class="pub__top">
            <div class="pub__meta-col">
              <h2 class="pub__title">${escapeHtml(item.title)}</h2>
              <p class="pub__authors">${escapeHtml(item.authors)}</p>
              <p class="pub__journal">${escapeHtml(item.journal)}</p>
            </div>
            <span class="badge-year">${escapeHtml(String(item.year))}</span>
          </div>

          <div class="pub__divider"></div>

          <div class="metaRow">
            ${qChip}${metaChip}${tags}
          </div>

          ${absHtml}

          <div class="actionsRow">
            ${doiBtn}${pdfBtn}${citeBtn}
          </div>
        </div>
      </article>
    `;
  }).join("");

  elCount.textContent = `${items.length} sonuç`;
  scheduleHeight();
}

/* ── Filter & apply ── */
function apply(){
  const q  = normalize(elSearch.value);
  const y  = elYear.value;
  const qu = normalize(elQuartile.value);
  const sm = elSort.value;

  filtered = DATA.filter(item => {
    const blob = buildBlob(item);
    return (!q  || blob.includes(q))
        && (!y  || String(item.year) === String(y))
        && (!qu || normalize(item.quartile).toUpperCase() === qu.toUpperCase());
  });

  filtered = sortItems(filtered, sm);
  render(filtered);
}

/* ── Event bindings ── */
function attach(){
  [elSearch, elYear, elQuartile, elSort].forEach(el => {
    el.addEventListener("input",  apply);
    el.addEventListener("change", apply);
  });

  btnClear.addEventListener("click", () => {
    elSearch.value = "";
    elYear.value   = "";
    elQuartile.value = "";
    elSort.value   = "year-desc";
    apply();
  });

  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-cite]");
    if (btn) copyToClipboard(btn.getAttribute("data-cite") || "");
  });

  window.addEventListener("load",   postHeight);
  window.addEventListener("resize", scheduleHeight);
  document.addEventListener("click", scheduleHeight);
}

/* ── Init ── */
async function init(){
  try {
    const res = await fetch("./publications.json", { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    META = json.meta || {};
    DATA = Array.isArray(json.items) ? json.items : [];

    populateYearOptions(DATA);

    elLastUpdated.textContent = META.lastUpdated ? `Güncelleme: ${META.lastUpdated}` : "";

    attach();
    apply();

  } catch(err) {
    console.error("SCI load error:", err);
    const tpl = document.getElementById("tplError");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCount.textContent = "Hata";
    scheduleHeight();
  }
}

init();
