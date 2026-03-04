/* ═══════════════════════════════════════════════
   MANYETAM Ekibimiz — Inline Detail Cards
   ═══════════════════════════════════════════════ */

const titleEl = document.getElementById("teamTitle");
const descEl = document.getElementById("teamDescription");
const groupsEl = document.getElementById("teamGroups");
const categoryFilter = document.getElementById("categoryFilter");
const copyToast = document.getElementById("copyToast");

const groupTpl = document.getElementById("groupTemplate");
const memberTpl = document.getElementById("memberTemplate");

let members = [];
let kategoriSirasi = [];
let toastTimer = null;

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
  return prefer2x ? (url2 || url1) : url1;
}

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

function linkIcon(type) {
  const icons = {
    scholar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>',
    orcid: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="7" r="0.5" fill="currentColor"/><line x1="9" y1="9" x2="9" y2="17"/><path d="M12 9h2a3 3 0 0 1 0 6h-2V9z"/></svg>',
    rg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l3 6-3 6H9l-3-6z"/><line x1="12" y1="9" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
    web: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    avesis: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
  };
  return icons[type] || icons.web;
}

function createSection(title, bodyEl) {
  const section = document.createElement("div");
  section.className = "detailSection";

  const h3 = document.createElement("h3");
  h3.textContent = title;
  section.appendChild(h3);
  section.appendChild(bodyEl);

  return section;
}

function createDetail(person) {
  const wrap = document.createElement("div");
  wrap.className = "cardDetail";

  if (person.bioKisa) {
    const bio = document.createElement("p");
    bio.className = "detailBio";
    bio.textContent = person.bioKisa;
    wrap.appendChild(createSection("Hakkında", bio));
  }

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
    linksWrap.className = "detailLinks";
    linkEntries.forEach(({ key, label, href }) => {
      const a = document.createElement("a");
      a.className = "ghostBtn";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `${linkIcon(key)} ${label}`;
      linksWrap.appendChild(a);
    });
    wrap.appendChild(createSection("Bağlantılar", linksWrap));
  }

  const contactItems = [];
  if (person.iletisim?.email) {
    contactItems.push({ label: "E-posta", value: person.iletisim.email, copyable: true });
  }
  if (person.iletisim?.phone) {
    contactItems.push({ label: "Telefon", value: person.iletisim.phone, copyable: false });
  }

  if (contactItems.length) {
    const contactWrap = document.createElement("div");
    contactWrap.className = "detailContact";
    contactItems.forEach(({ label, value, copyable }) => {
      const row = document.createElement("div");
      row.className = "contactRow";
      row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;

      if (copyable) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copyBtn";
        btn.innerHTML = `${COPY_ICON} Kopyala`;
        btn.addEventListener("click", () => copyEmail(value, btn));
        row.appendChild(btn);
      }

      contactWrap.appendChild(row);
    });

    wrap.appendChild(createSection("İletişim", contactWrap));
  }

  const accent = document.createElement("div");
  accent.className = "detailAccent";
  wrap.appendChild(accent);

  return wrap;
}

function toggleCardDetails(card, person, expandBtn) {
  const currentOpen = card.classList.contains("expanded");
  document.querySelectorAll(".teamCard.expanded").forEach((openCard) => {
    openCard.classList.remove("expanded");
    const detail = openCard.querySelector(".cardDetail");
    const button = openCard.querySelector(".expandBtn");
    if (detail) {
      detail.hidden = true;
      detail.innerHTML = "";
    }
    if (button) button.setAttribute("aria-expanded", "false");
  });

  if (currentOpen) return;

  const detailContainer = card.querySelector(".cardDetail");
  detailContainer.hidden = false;
  detailContainer.replaceWith(createDetail(person));

  card.classList.add("expanded");
  expandBtn.setAttribute("aria-expanded", "true");
}

function createCard(person) {
  const fragment = memberTpl.content.cloneNode(true);
  const card = fragment.querySelector(".teamCard");
  const expandBtn = card.querySelector(".expandBtn");

  card.querySelector(".photoPH").replaceWith(createPhotoBox(person));
  card.querySelector(".teamName").textContent = person.adSoyad;
  card.querySelector(".teamRole").textContent = person.unvan || person.gorev || "";

  const chipRow = card.querySelector(".chipRow");
  chipRow.appendChild(makeChip(person.kategori));
  (person.etiketler || []).slice(0, 2).forEach((t) => chipRow.appendChild(makeChip(t)));

  expandBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCardDetails(card, person, expandBtn);
  });

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCardDetails(card, person, expandBtn);
    }
  });

  return fragment;
}

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

categoryFilter.addEventListener("change", () => render(categoryFilter.value));

init().catch((err) => {
  groupsEl.innerHTML = `<p>Veri yüklenirken bir hata oluştu: ${err.message}</p>`;
});
