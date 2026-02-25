const listEl = document.getElementById("list");
const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const quartileFilter = document.getElementById("quartileFilter");
const sortSelect = document.getElementById("sortSelect");
const resultCount = document.getElementById("resultCount");
const clearBtn = document.getElementById("clearBtn");

let publications = [];
let filtered = [];

function safe(value) {
  return (value ?? "").toString();
}

function escapeHtml(str) {
  return safe(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildSearchBlob(item) {
  return [
    item.title,
    item.authors,
    item.journal,
    item.abstract,
    ...(Array.isArray(item.tags) ? item.tags : [])
  ].join(" ").toLowerCase();
}

function populateYearOptions(data) {
  const years = [...new Set(data.map(x => Number(x.year)).filter(Boolean))]
    .sort((a, b) => b - a);

  yearFilter.innerHTML = `<option value="">Tümü</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function sortPublications(arr, mode) {
  const cloned = [...arr];

  switch (mode) {
    case "year-asc":
      return cloned.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));

    case "title-asc":
      return cloned.sort((a, b) => safe(a.title).localeCompare(safe(b.title), "tr"));

    case "journal-asc":
      return cloned.sort((a, b) => safe(a.journal).localeCompare(safe(b.journal), "tr"));

    case "year-desc":
    default:
      return cloned.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
  }
}

function renderCards(data) {
  if (!data.length) {
    const tpl = document.getElementById("emptyState");
    listEl.innerHTML = "";
    listEl.appendChild(tpl.content.cloneNode(true));
    resultCount.textContent = "0 sonuç";
    return;
  }

  listEl.innerHTML = data.map(item => {
    const year = escapeHtml(item.year);
    const title = escapeHtml(item.title);
    const authors = escapeHtml(item.authors);
    const journal = escapeHtml(item.journal);

    const volIssuePages = [
      item.volume ? `Cilt ${escapeHtml(item.volume)}` : "",
      item.issue ? `Sayı ${escapeHtml(item.issue)}` : "",
      item.pages ? `s. ${escapeHtml(item.pages)}` : ""
    ].filter(Boolean);

    const quartileChip = item.quartile
      ? `<span class="chip q">${escapeHtml(item.quartile)}</span>`
      : "";

    const metaChip = volIssuePages.length
      ? `<span class="chip">${volIssuePages.join(" • ")}</span>`
      : "";

    const tagChips = Array.isArray(item.tags)
      ? item.tags.map(tag => `<span class="chip tag">${escapeHtml(tag)}</span>`).join("")
      : "";

    const abstract = item.abstract
      ? `<p class="abstract">${escapeHtml(item.abstract)}</p>`
      : "";

    const doiBtn = item.doiUrl
      ? `<a class="action-link" href="${escapeHtml(item.doiUrl)}" target="_blank" rel="noopener noreferrer">DOI</a>`
      : (item.doi
        ? `<span class="action-link secondary">DOI: ${escapeHtml(item.doi)}</span>`
        : "");

    const pdfBtn = item.pdfUrl
      ? `<a class="action-link secondary" href="${escapeHtml(item.pdfUrl)}" target="_blank" rel="noopener noreferrer">PDF</a>`
      : "";

    return `
      <article class="pub-card">
        <div class="pub-top">
          <div>
            <h2 class="pub-title">${title}</h2>
            <p class="pub-authors">${authors}</p>
            <p class="pub-journal"><em>${journal}</em></p>
          </div>
          <div class="pub-year">${year}</div>
        </div>

        <div class="meta-row">
          ${quartileChip}
          ${metaChip}
          ${tagChips}
        </div>

        ${abstract}

        <div class="actions">
          ${doiBtn}
          ${pdfBtn}
        </div>
      </article>
    `;
  }).join("");

  resultCount.textContent = `${data.length} sonuç`;
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const year = yearFilter.value;
  const quartile = quartileFilter.value;
  const sortMode = sortSelect.value;

  filtered = publications.filter(item => {
    const blob = buildSearchBlob(item);
    const matchSearch = !q || blob.includes(q);
    const matchYear = !year || String(item.year) === String(year);
    const matchQuartile = !quartile || safe(item.quartile).toUpperCase() === quartile.toUpperCase();

    return matchSearch && matchYear && matchQuartile;
  });

  filtered = sortPublications(filtered, sortMode);
  renderCards(filtered);
}

function attachEvents() {
  [searchInput, yearFilter, quartileFilter, sortSelect].forEach(el => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    yearFilter.value = "";
    quartileFilter.value = "";
    sortSelect.value = "year-desc";
    applyFilters();
  });
}

async function init() {
  try {
    const res = await fetch("./publications.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    publications = await res.json();

    if (!Array.isArray(publications)) {
      throw new Error("JSON array değil");
    }

    populateYearOptions(publications);
    attachEvents();
    applyFilters();
  } catch (err) {
    console.error("SCI publications load error:", err);
    const tpl = document.getElementById("errorState");
    listEl.innerHTML = "";
    listEl.appendChild(tpl.content.cloneNode(true));
    resultCount.textContent = "Hata";
  }
}

init();
