const elList = document.getElementById("list");
const elSearch = document.getElementById("qSearch");
const elYear = document.getElementById("qYear");
const elQuartile = document.getElementById("qQuartile");
const elSort = document.getElementById("qSort");
const elCount = document.getElementById("countText");
const elLastUpdated = document.getElementById("lastUpdated");
const btnClear = document.getElementById("btnClear");

const toast = document.getElementById("toast");

let DATA = [];
let META = {};
let filtered = [];

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1500);
}

function safe(v){ return (v ?? "").toString(); }

function escapeHtml(str) {
  return safe(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(s){
  return safe(s).toLowerCase().trim();
}

function buildBlob(item){
  const tags = Array.isArray(item.tags) ? item.tags.join(" ") : "";
  return normalize([item.title, item.authors, item.journal, item.abstract, item.doi, tags].join(" "));
}

function buildMetaLine(item){
  const parts = [];
  if (item.volume) parts.push(`Cilt ${item.volume}`);
  if (item.issue) parts.push(`Sayı ${item.issue}`);
  if (item.pages) parts.push(`s. ${item.pages}`);
  return parts.join(" • ");
}

/**
 * Basit APA benzeri citation:
 * Authors. (Year). Title. Journal, Volume(Issue), pages. https://doi.org/...
 * Not: İstersen bunu kurum standardına göre güncelleriz.
 */
function buildCitationAPA(item){
  const authors = safe(item.authors);
  const year = item.year ? `(${item.year}).` : "";
  const title = safe(item.title);
  const journal = safe(item.journal);
  const vol = safe(item.volume);
  const issue = safe(item.issue);
  const pages = safe(item.pages);
  const doiUrl = item.doiUrl ? item.doiUrl : (item.doi ? `https://doi.org/${item.doi}` : "");

  let volIssue = "";
  if (vol && issue) volIssue = `${vol}(${issue})`;
  else if (vol) volIssue = `${vol}`;

  const pagesPart = pages ? `, ${pages}` : "";
  const doiPart = doiUrl ? ` ${doiUrl}` : "";

  // Journal, vol(issue), pages.
  const jPart = journal ? `${journal}${journal && volIssue ? ", " : ""}${volIssue}${pagesPart}.` : "";

  return `${authors} ${year} ${title}. ${jPart}${doiPart}`.replace(/\s+/g, " ").trim();
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    showToast("Kaynakça kopyalandı");
  }catch{
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Kaynakça kopyalandı");
  }
}

/* ---------- iframe auto-height (postMessage) ---------- */
function postHeight(){
  const h = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  window.parent?.postMessage?.(
    { type: "mnytm-height", height: h },
    "*"
  );
}
function scheduleHeight(){
  clearTimeout(scheduleHeight._t);
  scheduleHeight._t = setTimeout(postHeight, 120);
}
/* ------------------------------------------------------ */

function populateYearOptions(items){
  const years = [...new Set(items.map(x => Number(x.year)).filter(Boolean))].sort((a,b)=>b-a);
  elYear.innerHTML = `<option value="">Tümü</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function sortItems(items, mode){
  const arr = [...items];
  switch(mode){
    case "year-asc":
      return arr.sort((a,b)=>(Number(a.year)||0)-(Number(b.year)||0));
    case "title-asc":
      return arr.sort((a,b)=> safe(a.title).localeCompare(safe(b.title), "tr"));
    case "journal-asc":
      return arr.sort((a,b)=> safe(a.journal).localeCompare(safe(b.journal), "tr"));
    case "year-desc":
    default:
      return arr.sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  }
}

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
    const year = escapeHtml(item.year);
    const title = escapeHtml(item.title);
    const authors = escapeHtml(item.authors);
    const journal = escapeHtml(item.journal);
    const quartile = safe(item.quartile).toUpperCase();
    const metaLine = buildMetaLine(item);
    const abs = item.abstract ? escapeHtml(item.abstract) : "";

    const qChip = quartile ? `<span class="chip chip--q">${escapeHtml(quartile)}</span>` : "";
    const metaChip = metaLine ? `<span class="chip chip--soft">${escapeHtml(metaLine)}</span>` : "";

    const tags = Array.isArray(item.tags) ? item.tags.map(t => `<span class="chip chip--soft">${escapeHtml(t)}</span>`).join("") : "";

    const doiBtn = item.doiUrl
      ? `<a class="alink" href="${escapeHtml(item.doiUrl)}" target="_blank" rel="noopener noreferrer">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 3h7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M21 3l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 7H7a4 4 0 0 0 0 8h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M14 17h3a4 4 0 0 0 0-8h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          DOI
        </a>`
      : (item.doi ? `<span class="alink alink--secondary">DOI: ${escapeHtml(item.doi)}</span>` : "");

    const pdfBtn = item.pdfUrl
      ? `<a class="alink alink--secondary" href="${escapeHtml(item.pdfUrl)}" target="_blank" rel="noopener noreferrer">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/>
          </svg>
          PDF
        </a>`
      : "";

    const citation = buildCitationAPA(item);
    const citeBtn = `<button class="alink alink--secondary" type="button" data-cite="${escapeHtml(citation)}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 7h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 12h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M6 7h.01M6 12h.01M6 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
        APA Kopyala
      </button>`;

    const absHtml = abs ? `<p class="abstract">${abs}</p>` : "";

    return `
      <article class="pub" data-id="${escapeHtml(item.id || "")}">
        <div class="pub__top">
          <div>
            <h2 class="pub__title">${title}</h2>
            <p class="pub__authors">${authors}</p>
            <p class="pub__journal"><em>${journal}</em></p>
            <div class="accentLine"></div>
          </div>
          <div class="badge-year">${year}</div>
        </div>

        <div class="metaRow">
          ${qChip}
          ${metaChip}
          ${tags}
        </div>

        ${absHtml}

        <div class="actionsRow">
          ${doiBtn}
          ${pdfBtn}
          ${citeBtn}
        </div>
      </article>
    `;
  }).join("");

  elCount.textContent = `${items.length} sonuç`;
  scheduleHeight();
}

function apply(){
  const q = normalize(elSearch.value);
  const y = elYear.value;
  const qu = normalize(elQuartile.value);
  const sortMode = elSort.value;

  filtered = DATA.filter(item => {
    const blob = buildBlob(item);
    const okQ = !q || blob.includes(q);
    const okY = !y || String(item.year) === String(y);
    const okQu = !qu || normalize(item.quartile).toUpperCase() === qu.toUpperCase();
    return okQ && okY && okQu;
  });

  filtered = sortItems(filtered, sortMode);
  render(filtered);
}

function attach(){
  [elSearch, elYear, elQuartile, elSort].forEach(el => {
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });

  btnClear.addEventListener("click", () => {
    elSearch.value = "";
    elYear.value = "";
    elQuartile.value = "";
    elSort.value = "year-desc";
    apply();
  });

  // Delegated click for citation copy
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cite]");
    if (!btn) return;
    const cite = btn.getAttribute("data-cite") || "";
    copyToClipboard(cite);
  });

  // Height hooks
  window.addEventListener("load", postHeight);
  window.addEventListener("resize", scheduleHeight);
  document.addEventListener("click", scheduleHeight);
}

async function init(){
  try{
    const res = await fetch("./publications.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    META = json.meta || {};
    DATA = Array.isArray(json.items) ? json.items : [];

    populateYearOptions(DATA);

    if (META.lastUpdated){
      elLastUpdated.textContent = `Güncelleme: ${META.lastUpdated}`;
    } else {
      elLastUpdated.textContent = "";
    }

    attach();
    apply();
  }catch(err){
    console.error("SCI load error:", err);
    const tpl = document.getElementById("tplError");
    elList.innerHTML = "";
    elList.appendChild(tpl.content.cloneNode(true));
    elCount.textContent = "Hata";
    scheduleHeight();
  }
}

init();
