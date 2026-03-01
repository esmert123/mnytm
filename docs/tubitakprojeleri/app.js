/* =====================================================
+   MANYETAM TÜBİTAK PROJELERİ — app.js
+   ===================================================== */
+
+const elList       = document.getElementById("projectList");
+const elSearch     = document.getElementById("qSearch");
+const elCategory   = document.getElementById("qCategory");
+const elStatus     = document.getElementById("qStatus");
+const elCountTotal = document.getElementById("countTotal");
+const elCountDone  = document.getElementById("countDone");
+const elCountOn    = document.getElementById("countOngoing");
+const btnFilter    = document.getElementById("btnFilter");
+const btnClear     = document.getElementById("btnClear");
+const toast        = document.getElementById("toast");
+
+const COLOR_BY_CLASS = {
+  codeBlue: "#2563eb",
+  codeGreen: "#16a34a",
+  codeAmber: "#d97706",
+  codePurple: "#7c3aed",
+  codeRed: "#dc2626"
+};
+
+let DATA = [];
+
+function showToast(msg) {
+  toast.textContent = msg;
+  toast.classList.add("show");
+  clearTimeout(showToast._t);
+  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
+}
+
+function safe(v) { return (v ?? "").toString(); }
+function esc(str) {
+  return safe(str)
+    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
+    .replace(/>/g, "&gt;").replace(/\"/g, "&quot;")
+    .replace(/'/g, "&#039;");
+}
+function norm(s) { return safe(s).toLowerCase().trim(); }
+
+function highlight(text, query) {
+  if (!query || query.length < 2) return esc(text);
+  const escaped = esc(text);
+  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
+  return escaped.replace(new RegExp(`(${q})`, "gi"), "<mark>$1</mark>");
+}
+
+function getCategoryColor(cat) {
+  return COLOR_BY_CLASS[cat.colorClass] || "#64748b";
+}
+
+function buildBlob(project, category) {
+  return norm([
+    project.name,
+    category.code,
+    category.title,
+    category.hint
+  ].join(" "));
+}
+
+function populateCategories(cats) {
+  elCategory.innerHTML = `<option value="">Tümü</option>` +
+    cats.map(c => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.title)}</option>`).join("");
+}
+
+function statusChipHTML(status) {
+  if (status === "done") {
+    return `<span class="status-chip status-chip--done">Tamamlandı</span>`;
+  }
+  return `<span class="status-chip status-chip--ongoing">Devam Ediyor</span>`;
+}
+
+function projCardHTML(project, catColor, query, idx, catCode) {
+  return `
+    <div class="proj-card" style="--cat-color:${catColor}" data-id="${esc(catCode)}-${idx}">
+      <div class="proj-header" role="button" tabindex="0" aria-expanded="false" data-proj-toggle="${esc(catCode)}-${idx}">
+        <div class="proj-title-area">
+          <div class="proj-title">${highlight(project.name, query)}</div>
+          <div class="proj-meta">Program: <strong>${esc(catCode)}</strong></div>
+        </div>
+        <div class="proj-right">
+          ${statusChipHTML(project.status)}
+          <svg class="proj-expand-arrow" viewBox="0 0 20 20" fill="none">
+            <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
+          </svg>
+        </div>
+      </div>
+      <div class="proj-body" id="projBody-${esc(catCode)}-${idx}">
+        <div class="proj-body-inner">
+          <div class="detail-grid">
+            <div class="detail-card">
+              <div class="detail-heading">Proje Detayı</div>
+              <div class="detail-text">${esc(project.name)}</div>
+            </div>
+          </div>
+        </div>
+      </div>
+    </div>`;
+}
+
+function render() {
+  const q = norm(elSearch.value);
+  const catVal = elCategory.value;
+  const stVal = elStatus.value;
+
+  let totalShown = 0;
+  let doneCount = 0;
+  let onCount = 0;
+  let html = "";
+
+  DATA.forEach(cat => {
+    if (catVal && cat.code !== catVal) return;
+
+    const filtered = cat.projects.filter(project => {
+      if (stVal && project.status !== stVal) return false;
+      if (q && !buildBlob(project, cat).includes(q)) return false;
+      return true;
+    });
+
+    if (!filtered.length) return;
+
+    filtered.forEach(project => {
+      if (project.status === "done") doneCount++;
+      else onCount++;
+    });
+    totalShown += filtered.length;
+
+    const color = getCategoryColor(cat);
+    const projCards = filtered
+      .map((project, idx) => projCardHTML(project, color, q, idx, cat.code))
+      .join("");
+
+    html += `
+      <div class="cat-section" data-cat="${esc(cat.code)}">
+        <div class="cat-header" role="button" tabindex="0" aria-expanded="false"
+             data-cat-toggle="${esc(cat.code)}" style="--cat-color:${color}">
+          <span class="cat-badge" style="background:${color}">${esc(cat.code)}</span>
+          <span class="cat-title">${esc(cat.title)}</span>
+          <span class="cat-hint">${esc(cat.hint)}</span>
+          <span class="cat-count">${filtered.length}</span>
+          <svg class="cat-arrow" viewBox="0 0 20 20" fill="none">
+            <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
+          </svg>
+        </div>
+        <div class="cat-body" id="catBody-${esc(cat.code)}">
+          <div class="cat-body-inner">
+            ${projCards}
+          </div>
+        </div>
+      </div>`;
+  });
+
+  elCountTotal.textContent = totalShown;
+  elCountDone.textContent = doneCount;
+  elCountOn.textContent = onCount;
+
+  if (!html) {
+    const tpl = document.getElementById("tplEmpty");
+    elList.innerHTML = "";
+    elList.appendChild(tpl.content.cloneNode(true));
+  } else {
+    elList.innerHTML = html;
+  }
+
+  attachToggles();
+  observeReveal();
+  scheduleHeight();
+}
+
+function attachToggles() {
+  document.querySelectorAll("[data-cat-toggle]").forEach(btn => {
+    btn.addEventListener("click", () => toggleCategory(btn));
+    btn.addEventListener("keydown", e => {
+      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCategory(btn); }
+    });
+  });
+
+  document.querySelectorAll("[data-proj-toggle]").forEach(btn => {
+    btn.addEventListener("click", () => toggleProject(btn));
+    btn.addEventListener("keydown", e => {
+      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleProject(btn); }
+    });
+  });
+}
+
+function toggleCategory(btn) {
+  const code = btn.dataset.catToggle;
+  const body = document.getElementById(`catBody-${code}`);
+  const isOpen = btn.classList.contains("open");
+
+  if (isOpen) {
+    btn.classList.remove("open");
+    btn.setAttribute("aria-expanded", "false");
+    body.style.maxHeight = body.scrollHeight + "px";
+    requestAnimationFrame(() => { body.style.maxHeight = "0"; });
+    body.addEventListener("transitionend", () => {
+      body.classList.remove("open");
+    }, { once: true });
+  } else {
+    btn.classList.add("open");
+    btn.setAttribute("aria-expanded", "true");
+    body.classList.add("open");
+    body.style.maxHeight = body.scrollHeight + "px";
+    body.addEventListener("transitionend", () => {
+      body.style.maxHeight = "none";
+    }, { once: true });
+  }
+  scheduleHeight();
+}
+
+function toggleProject(btn) {
+  const id = btn.dataset.projToggle;
+  const body = document.getElementById(`projBody-${id}`);
+  const isOpen = btn.classList.contains("open");
+
+  if (isOpen) {
+    btn.classList.remove("open");
+    btn.setAttribute("aria-expanded", "false");
+    body.style.maxHeight = body.scrollHeight + "px";
+    requestAnimationFrame(() => { body.style.maxHeight = "0"; });
+    body.addEventListener("transitionend", () => {
+      body.classList.remove("open");
+    }, { once: true });
+  } else {
+    btn.classList.add("open");
+    btn.setAttribute("aria-expanded", "true");
+    body.classList.add("open");
+    body.style.maxHeight = body.scrollHeight + "px";
+    body.addEventListener("transitionend", () => {
+      body.style.maxHeight = "none";
+    }, { once: true });
+  }
+  scheduleHeight();
+}
+
+function observeReveal() {
+  const sections = document.querySelectorAll(".cat-section:not(.revealed)");
+  if (!("IntersectionObserver" in window)) {
+    sections.forEach(s => s.classList.add("revealed"));
+    return;
+  }
+  const obs = new IntersectionObserver((entries) => {
+    entries.forEach(entry => {
+      if (entry.isIntersecting) {
+        entry.target.classList.add("revealed");
+        obs.unobserve(entry.target);
+      }
+    });
+  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
+
+  sections.forEach(s => obs.observe(s));
+}
+
+function postHeight() {
+  const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
+  window.parent?.postMessage?.({ type: "mnytm-height", height: h }, "*");
+}
+function scheduleHeight() {
+  clearTimeout(scheduleHeight._t);
+  scheduleHeight._t = setTimeout(postHeight, 150);
+}
+
+function attach() {
+  [elSearch, elCategory, elStatus].forEach(el => {
+    el.addEventListener("input", render);
+    el.addEventListener("change", render);
+  });
+  btnFilter.addEventListener("click", () => {
+    render();
+    showToast("Filtre uygulandı");
+  });
+  btnClear.addEventListener("click", () => {
+    elSearch.value = "";
+    elCategory.value = "";
+    elStatus.value = "";
+    render();
+    showToast("Filtreler temizlendi");
+  });
+  window.addEventListener("load", postHeight);
+  window.addEventListener("resize", scheduleHeight);
+}
+
+async function init() {
+  try {
+    const res = await fetch("./projects.json", { cache: "no-store" });
+    if (!res.ok) throw new Error(`HTTP ${res.status}`);
+    const json = await res.json();
+
+    DATA = Array.isArray(json) ? json : [];
+
+    populateCategories(DATA);
+    attach();
+    render();
+  } catch (err) {
+    console.error("TÜBİTAK projects load error:", err);
+    const tpl = document.getElementById("tplError");
+    elList.innerHTML = "";
+    elList.appendChild(tpl.content.cloneNode(true));
+    elCountTotal.textContent = "0";
+    scheduleHeight();
+  }
+}
+
+init();
