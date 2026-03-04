/* ═══════════════════════════════════════════════
   MANYETAM Ekibimiz — Premium Drawer App
   ═══════════════════════════════════════════════ */

/* ─── DOM refs ─── */
const titleEl        = document.getElementById("teamTitle");
const descEl         = document.getElementById("teamDescription");
const groupsEl       = document.getElementById("teamGroups");
const categoryFilter = document.getElementById("categoryFilter");

const drawer        = document.getElementById("teamDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerCloseEl = document.getElementById("drawerClose");
const drawerName    = document.getElementById("drawerName");
const drawerRole    = document.getElementById("drawerRole");
const drawerBody    = document.getElementById("drawerBody");
const copyToast     = document.getElementById("copyToast");

const groupTpl  = document.getElementById("groupTemplate");
const memberTpl = document.getElementById("memberTemplate");

let members = [];
let kategoriSirasi = [];
let toastTimer = null;

/* ─── Iframe-aware Drawer Positioning ─── */
const isInIframe = window.self !== window.top;

function getVisibleArea() {
  if (isInIframe) {
    try {
      const frameRect = window.frameElement.getBoundingClientRect();
      const parentVH = window.parent.innerHeight;
      const visibleStart = Math.max(0, -frameRect.top);
      const visibleEnd = Math.min(
        document.documentElement.scrollHeight,
        -frameRect.top + parentVH
      );
      return { top: visibleStart, height: Math.max(400, visibleEnd - visibleStart) };
    } catch (e) {
      /* Cross-origin fallback */
      return { top: window.scrollY || 0, height: Math.min(window.innerHeight, 900) };
    }
  }
  return { top: window.scrollY || 0, height: window.innerHeight };
}

function positionDrawerElements() {
  const area = getVisibleArea();
  const pad = 12;
  const isMobile = window.matchMedia("(max-width: 520px)").matches;

  /* Overlay: covers the full document */
  drawerOverlay.style.top = "0px";
  drawerOverlay.style.height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  ) + "px";

  /* Drawer: inside the visible area */
  if (isMobile) {
    const drawerH = Math.min(area.height * 0.88, area.height - pad);
    drawer.style.top = (area.top + area.height - drawerH) + "px";
    drawer.style.height = drawerH + "px";
    drawer.style.bottom = "auto";
  } else {
    drawer.style.top = (area.top + pad) + "px";
    drawer.style.height = (area.height - pad * 2) + "px";
  }

  /* Toast: near the bottom of the visible area */
  copyToast.style.top = (area.top + area.height - 70) + "px";
  copyToast.style.bottom = "auto";
}

let _scrollRAF = null;
function onParentScroll() {
  if (_scrollRAF) return;
  _scrollRAF = requestAnimationFrame(() => {
    _scrollRAF = null;
    if (drawer.classList.contains("open")) {
      positionDrawerElements();
    }
  });
}

/* Scroll/resize listeners */
if (isInIframe) {
  try {
    window.parent.addEventListener("scroll", onParentScroll, { passive: true });
    window.parent.addEventListener("resize", onParentScroll, { passive: true });
  } catch (e) {
    window.addEventListener("scroll", onParentScroll, { passive: true });
    window.addEventListener("resize", onParentScroll, { passive: true });
  }
} else {
  window.addEventListener("scroll", onParentScroll, { passive: true });
  window.addEventListener("resize", onParentScroll, { passive: true });
}

/* ─── Helpers ─── */
function initialsFromName(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function makeChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function resolvePhoto(person, prefer2x) {
  const url1 = person.photo_800 || person.fotografUrl || person.photo || person.image || person.img || "";
  const url2 = person.photo_1600 || person.photo2x || person.image2x || person.img2x || "";
  if (prefer2x) return url2 || url1;
  return url1;
}

/* ─── Card Photo Box ─── */
function createPhotoBox(person) {
  const holder = document.createElement("div");
  holder.className = "photoPH";

  const url1 = resolvePhoto(person, false);
  const url2 = resolvePhoto(person, true);

  if (url1) {
    const img = document.createElement("img");
    img.decoding = "async";
    img.loading = "lazy";
    img.src = url1;
    img.alt = person.adSoyad;
    if (url2 && url2 !== url1) {
      img.srcset = `${url1} 800w, ${url2} 1600w`;
      img.sizes = "(min-width:1100px) 25vw, (min-width:760px) 50vw, 100vw";
    }
    holder.appendChild(img);
  } else {
    const avatar = document.createElement("div");
    avatar.className = "avatarPH";
    avatar.textContent = initialsFromName(person.adSoyad) || "?";
    holder.appendChild(avatar);
    const hint = document.createElement("small");
    hint.className = "photoSoon";
    hint.textContent = "Fotoğraf yakında";
    holder.appendChild(hint);
  }

  return holder;
}

/* ─── Drawer Hero Image ─── */
function createHero(person) {
  const hero = document.createElement("div");
  hero.className = "drawerHero";

  const url = resolvePhoto(person, true) || resolvePhoto(person, false);
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = person.adSoyad;
    img.decoding = "async";
    hero.appendChild(img);
  } else {
    const avatar = document.createElement("div");
    avatar.className = "avatarPH";
    avatar.textContent = initialsFromName(person.adSoyad) || "?";
    hero.appendChild(avatar);
  }

  return hero;
}

/* ─── Section Builder ─── */
function buildSection(title, contentEl) {
  const section = document.createElement("div");
  section.className = "drawerSection";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  section.appendChild(h3);
  section.appendChild(contentEl);
  return section;
}

/* ─── Copy Email ─── */
function showToast() {
  clearTimeout(toastTimer);
  copyToast.classList.add("show");
  toastTimer = setTimeout(() => copyToast.classList.remove("show"), 1200);
}

const COPY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function copyEmail(email, btn) {
  navigator.clipboard.writeText(email).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `${CHECK_ICON} Kopyalandı`;
    showToast();
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `${COPY_ICON} Kopyala`;
    }, 1200);
  });
}

/* ─── Link Icons ─── */
function linkIcon(type) {
  const icons = {
    scholar:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>',
    orcid:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="7" r="0.5" fill="currentColor"/><line x1="9" y1="9" x2="9" y2="17"/><path d="M12 9h2a3 3 0 0 1 0 6h-2V9z"/></svg>',
    rg:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l3 6-3 6H9l-3-6z"/><line x1="12" y1="9" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
    web:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    avesis:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
  };
  return icons[type] || icons.web;
}

/* ═══════════════════════════════════════════════
   OPEN DRAWER
   ═══════════════════════════════════════════════ */
function openDrawer(person) {
  /* Header */
  drawerName.textContent = person.adSoyad;
  drawerRole.textContent = person.unvan || person.gorev || "";

  /* Clear body */
  drawerBody.innerHTML = "";

  /* Hero image */
  drawerBody.appendChild(createHero(person));

  /* Scrollable content wrapper */
  const content = document.createElement("div");
  content.className = "drawerContent";

  /* Bio / Hakkında */
  if (person.bioKisa) {
    const bioP = document.createElement("p");
    bioP.className = "drawerBio";
    bioP.textContent = person.bioKisa;
    content.appendChild(buildSection("Hakkında", bioP));
  }

  /* Bağlantılar — ghost buttons */
  const linkMap = {
    scholar: "Google Scholar",
    orcid: "ORCID",
    rg: "ResearchGate",
    avesis: "Avesis",
    linkedin: "LinkedIn",
    web: "Kişisel Sayfa"
  };
  const linkEntries = [];
  Object.entries(linkMap).forEach(([key, label]) => {
    const href = person.linkler?.[key];
    if (href) linkEntries.push({ key, label, href });
  });
  if (linkEntries.length) {
    const linksWrap = document.createElement("div");
    linksWrap.className = "drawerLinks";
    linkEntries.forEach(({ key, label, href }) => {
      const a = document.createElement("a");
      a.className = "ghostBtn";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `${linkIcon(key)} ${label}`;
      linksWrap.appendChild(a);
    });
    content.appendChild(buildSection("Bağlantılar", linksWrap));
  }

  /* İletişim — e-posta copy */
  const contactItems = [];
  if (person.iletisim?.email)
    contactItems.push({ label: "E-posta", value: person.iletisim.email, copyable: true });
  if (person.iletisim?.phone)
    contactItems.push({ label: "Telefon", value: person.iletisim.phone, copyable: false });

  if (contactItems.length) {
    const contactWrap = document.createElement("div");
    contactWrap.className = "drawerContact";
    contactItems.forEach(({ label, value, copyable }) => {
      const row = document.createElement("div");
      row.className = "contactRow";
      row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
      if (copyable) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copyBtn";
        btn.innerHTML = `${COPY_ICON} Kopyala`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          copyEmail(value, btn);
        });
        row.appendChild(btn);
      }
      contactWrap.appendChild(row);
    });
    content.appendChild(buildSection("İletişim", contactWrap));
  }

  /* Accent line */
  const accent = document.createElement("div");
  accent.className = "drawerAccent";
  content.appendChild(accent);

  drawerBody.appendChild(content);

  /* Settle micro-animation */
  requestAnimationFrame(() => content.classList.add("settle"));

  /* Position drawer in visible area (iframe-safe) */
  positionDrawerElements();

  /* Show */
  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawerLocked");
  drawerBody.scrollTop = 0;
}

/* ═══════════════════════════════════════════════
   CLOSE DRAWER
   ═══════════════════════════════════════════════ */
function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawerLocked");

  /* Clear dynamic positioning */
  drawer.style.top = "";
  drawer.style.height = "";
  drawer.style.bottom = "";
  copyToast.style.top = "";
  copyToast.style.bottom = "";
}

/* ═══════════════════════════════════════════════
   CARD BUILDER
   ═══════════════════════════════════════════════ */
function createCard(person) {
  const fragment = memberTpl.content.cloneNode(true);
  const card = fragment.querySelector(".teamCard");

  card.querySelector(".photoPH").replaceWith(createPhotoBox(person));
  card.querySelector(".teamName").textContent = person.adSoyad;
  card.querySelector(".teamRole").textContent = person.unvan || person.gorev || "";

  const chipRow = card.querySelector(".chipRow");
  chipRow.appendChild(makeChip(person.kategori));
  (person.etiketler || []).slice(0, 2).forEach((t) => chipRow.appendChild(makeChip(t)));

  card.addEventListener("click", () => openDrawer(person));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDrawer(person);
    }
  });

  return fragment;
}

/* ═══════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════ */
function render(filter = "") {
  groupsEl.innerHTML = "";

  const grouped = new Map();
  members
    .filter((m) => !filter || m.kategori === filter)
    .sort((a, b) => (a.oncelik ?? 999) - (b.oncelik ?? 999))
    .forEach((m) => {
      if (!grouped.has(m.kategori)) grouped.set(m.kategori, []);
      grouped.get(m.kategori).push(m);
    });

  const list = kategoriSirasi.length ? kategoriSirasi : Array.from(grouped.keys());

  list.forEach((kat) => {
    const grp = grouped.get(kat);
    if (!grp?.length) return;

    const frag = groupTpl.content.cloneNode(true);
    const sec = frag.querySelector(".groupSection");
    sec.querySelector(".groupTitle").textContent = kat;
    sec.querySelector(".groupBadge").textContent = `${grp.length} kişi`;

    const grid = sec.querySelector(".memberGrid");
    grp.forEach((p) => grid.appendChild(createCard(p)));
    groupsEl.appendChild(frag);
  });
}

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */
async function init() {
  const res = await fetch("./team.json");
  if (!res.ok) throw new Error("team.json yüklenemedi");

  const data = await res.json();
  members = data.uyeler || [];
  kategoriSirasi = data.meta?.kategoriSirasi || [];

  titleEl.textContent = data.meta?.title || "Ekibimiz";
  descEl.textContent = data.meta?.description || "";

  const cats = new Set(members.map((m) => m.kategori));
  (kategoriSirasi.length ? kategoriSirasi : Array.from(cats)).forEach((kat) => {
    if (!cats.has(kat)) return;
    const opt = document.createElement("option");
    opt.value = kat;
    opt.textContent = kat;
    categoryFilter.appendChild(opt);
  });

  render();
}

/* ─── Events ─── */
categoryFilter.addEventListener("change", () => render(categoryFilter.value));
drawerCloseEl.addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

init().catch((err) => {
  groupsEl.innerHTML = `<p>Veri yüklenirken bir hata oluştu: ${err.message}</p>`;
});
