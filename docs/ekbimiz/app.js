const titleEl = document.getElementById("teamTitle");
const descEl = document.getElementById("teamDescription");
const groupsEl = document.getElementById("teamGroups");
const categoryFilter = document.getElementById("categoryFilter");

const panel = document.getElementById("memberPanel");
const panelContent = document.getElementById("panelContent");
const panelClose = document.getElementById("panelClose");
const panelBackdrop = document.getElementById("panelBackdrop");

const groupTpl = document.getElementById("groupTemplate");
const memberTpl = document.getElementById("memberTemplate");

let members = [];
let kategoriSirasi = [];

function initialsFromName(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createPhotoBox(person, panelMode = false) {
  const holder = document.createElement("div");
  holder.className = panelMode ? "panelPhoto" : "photoPH";

  if (person.fotografUrl) {
    const img = document.createElement("img");
    img.src = person.fotografUrl;
    img.alt = person.adSoyad;
    holder.appendChild(img);
  } else {
    const avatar = document.createElement("div");
    avatar.className = "avatarPH";
    avatar.textContent = initialsFromName(person.adSoyad) || "?";
    holder.appendChild(avatar);

    if (!panelMode) {
      const hint = document.createElement("small");
      hint.className = "photoSoon";
      hint.textContent = "Fotoğraf yakında";
      holder.appendChild(hint);
    }
  }

  return holder;
}

function makeChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function openPanel(person) {
  panelContent.innerHTML = "";

  const photo = createPhotoBox(person, true);
  const name = `<h2 id="panelName" class="panelName">${person.adSoyad}</h2>`;
  const title = `<p class="panelTitle">${person.unvan || person.gorev || ""}</p>`;

  const chips = document.createElement("div");
  chips.className = "panelChipRow";
  chips.appendChild(makeChip(person.kategori));
  (person.etiketler || []).forEach((etiket) => chips.appendChild(makeChip(etiket)));

  panelContent.appendChild(photo);
  panelContent.insertAdjacentHTML("beforeend", name + title);
  panelContent.appendChild(chips);

  if (person.bioKisa) {
    panelContent.insertAdjacentHTML("beforeend", `<p class="panelBio">${person.bioKisa}</p>`);
  }

  const iletiItems = [];
  if (person.iletisim?.email) iletiItems.push(`<div>E-posta: ${person.iletisim.email}</div>`);
  if (person.iletisim?.phone) iletiItems.push(`<div>Telefon: ${person.iletisim.phone}</div>`);
  if (iletiItems.length) {
    panelContent.insertAdjacentHTML("beforeend", `<section class="panelSection"><h3>İletişim</h3><div class="panelList">${iletiItems.join("")}</div></section>`);
  }

  const links = [];
  const linkMap = {
    scholar: "Google Scholar",
    orcid: "ORCID",
    rg: "ResearchGate",
    web: "Kişisel Sayfa"
  };
  Object.entries(linkMap).forEach(([key, label]) => {
    const href = person.linkler?.[key];
    if (href) links.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  });
  if (links.length) {
    panelContent.insertAdjacentHTML("beforeend", `<section class="panelSection"><h3>Bağlantılar</h3><div class="panelLinks">${links.join("")}</div></section>`);
  }

  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
}

function createCard(person) {
  const fragment = memberTpl.content.cloneNode(true);
  const card = fragment.querySelector(".teamCard");

  card.querySelector(".photoPH").replaceWith(createPhotoBox(person));
  card.querySelector(".teamName").textContent = person.adSoyad;
  card.querySelector(".teamRole").textContent = person.unvan || person.gorev || "";

  const chipRow = card.querySelector(".chipRow");
  chipRow.appendChild(makeChip(person.kategori));
  (person.etiketler || []).slice(0, 2).forEach((etiket) => chipRow.appendChild(makeChip(etiket)));

  card.addEventListener("click", () => openPanel(person));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPanel(person);
    }
  });

  return fragment;
}

function render(filter = "") {
  groupsEl.innerHTML = "";

  const grouped = new Map();
  members
    .filter((item) => !filter || item.kategori === filter)
    .sort((a, b) => (a.oncelik ?? 999) - (b.oncelik ?? 999))
    .forEach((item) => {
      if (!grouped.has(item.kategori)) grouped.set(item.kategori, []);
      grouped.get(item.kategori).push(item);
    });

  const kategoriList = kategoriSirasi.length ? kategoriSirasi : Array.from(grouped.keys());

  kategoriList.forEach((kategori) => {
    const groupMembers = grouped.get(kategori);
    if (!groupMembers?.length) return;

    const fragment = groupTpl.content.cloneNode(true);
    const section = fragment.querySelector(".groupSection");
    section.querySelector(".groupTitle").textContent = kategori;
    section.querySelector(".groupBadge").textContent = `${groupMembers.length} kişi`;

    const grid = section.querySelector(".memberGrid");
    groupMembers.forEach((person) => grid.appendChild(createCard(person)));
    groupsEl.appendChild(fragment);
  });
}

async function init() {
  const response = await fetch("./team.json");
  if (!response.ok) throw new Error("team.json yüklenemedi");

  const data = await response.json();
  members = data.uyeler || [];
  kategoriSirasi = data.meta?.kategoriSirasi || [];

  titleEl.textContent = data.meta?.title || "Ekibimiz";
  descEl.textContent = data.meta?.description || "";

  const categories = new Set(members.map((item) => item.kategori));
  const ordered = kategoriSirasi.length ? kategoriSirasi : Array.from(categories);
  ordered.forEach((kategori) => {
    if (!categories.has(kategori)) return;
    const option = document.createElement("option");
    option.value = kategori;
    option.textContent = kategori;
    categoryFilter.appendChild(option);
  });

  render();
}

categoryFilter.addEventListener("change", () => render(categoryFilter.value));
panelClose.addEventListener("click", closePanel);
panelBackdrop.addEventListener("click", closePanel);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanel();
});

init().catch((error) => {
  groupsEl.innerHTML = `<p>Veri yüklenirken bir hata oluştu: ${error.message}</p>`;
});

