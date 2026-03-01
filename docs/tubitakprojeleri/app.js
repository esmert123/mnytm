const acc = document.getElementById("tubCategories");

function esc(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusPill(status) {
  if (status === "ongoing") {
    return '<span class="projPill pillLive">Devam Ediyor</span>';
  }
  return '<span class="projPill pillDone">Tamamlandı</span>';
}

function categoryHTML(cat, index) {
  const headId = `tub${cat.id}H`;
  const collapseId = `tub${cat.id}C`;
  const projects = (cat.projects || [])
    .map(
      (proj) => `
      <div class="projRow">
        <div class="projName">${esc(proj.name)}</div>
        <div class="projBadges">
          <span class="projPill pillYear">Yıl: ${esc(proj.year || "20XX")}</span>
          ${statusPill(proj.status)}
        </div>
      </div>`
    )
    .join("");

  return `
    <div class="accordion-item bapItem">
      <h2 class="accordion-header" id="${headId}">
        <button class="accordion-button bapBtn ${index === 0 ? "" : "collapsed"}" type="button"
                data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                aria-expanded="${index === 0 ? "true" : "false"}" aria-controls="${collapseId}">
          <span class="bapCode ${esc(cat.colorClass)}">${esc(cat.code)}</span>
          <span class="bapCat">${esc(cat.title)}</span>
          <span class="bapHint d-none d-lg-inline">${esc(cat.hint || "")}</span>
        </button>
      </h2>
      <div id="${collapseId}" class="accordion-collapse collapse ${index === 0 ? "show" : ""}"
           aria-labelledby="${headId}" data-bs-parent="#tubCategories">
        <div class="accordion-body bapBody">
          <div class="projList">${projects}</div>
        </div>
      </div>
    </div>`;
}

async function init() {
  try {
    const res = await fetch("./tubitak-projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    acc.innerHTML = data.map((cat, i) => categoryHTML(cat, i)).join("");
  } catch (err) {
    acc.innerHTML = `
      <div class="alert alert-danger" role="alert">
        TÜBİTAK proje verileri yüklenemedi. Lütfen <code>tubitak-projects.json</code> dosyasını kontrol edin.
      </div>`;
    console.error(err);
  }
}

init();
