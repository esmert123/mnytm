const DEFAULT_CONTACT_CFG = {
  orgName: "MANYETAM",
  email: "manyetam@ktu.edu.tr",
  emailSecondary: "ktumanyetam@gmail.com",
  phone: "+90 532 137 55 19",
  addressLines: [
    "Karadeniz Teknik Universitesi, Kanuni Kampusu",
    "Bilimsel Arastirma Merkezi, Ortahisar / Trabzon"
  ],
  workingHours: "Hafta ici 08:00 - 17:00",
  map: {
    lat: 40.9929,
    lng: 39.7773,
    zoom: 16,
    apiKey: "",
    mapId: ""
  },
  form: {
    provider: "formspree",
    endpoint: "https://formspree.io/f/XXXXXXXX"
  },
  quickLinks: {
    mapsUrl: "https://maps.app.goo.gl/pYBkfwi7VwQZvv2G7"
  }
};

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#e9f2ff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#2f4a6a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7fbff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#b7cce8" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#d7e7ff" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d6e9ff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#c7daf3" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#d9e8fb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#9ec5ff" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#315f95" }] }
];

let CONTACT_CFG = deepMerge({}, DEFAULT_CONTACT_CFG);

document.addEventListener("DOMContentLoaded", async () => {
  CONTACT_CFG = await loadConfig();
  setYear();
  hydrateContactInfo(CONTACT_CFG);
  setupCopyButtons();
  setupForm(CONTACT_CFG);
  setupMap(CONTACT_CFG);
  injectSchema(CONTACT_CFG);
});

async function loadConfig() {
  try {
    const response = await fetch("./contact.config.json", { cache: "no-store" });
    if (!response.ok) {
      return deepMerge({}, DEFAULT_CONTACT_CFG);
    }

    const fileConfig = await response.json();
    return deepMerge(DEFAULT_CONTACT_CFG, fileConfig);
  } catch {
    return deepMerge({}, DEFAULT_CONTACT_CFG);
  }
}

function deepMerge(base, patch) {
  if (!isObject(base) && !isObject(patch)) {
    return patch ?? base;
  }

  const result = Array.isArray(base) ? [...base] : { ...(base || {}) };

  if (!isObject(patch) && !Array.isArray(patch)) {
    return result;
  }

  Object.keys(patch || {}).forEach((key) => {
    const patchValue = patch[key];
    const baseValue = result[key];

    if (Array.isArray(patchValue)) {
      result[key] = [...patchValue];
    } else if (isObject(patchValue)) {
      result[key] = deepMerge(isObject(baseValue) ? baseValue : {}, patchValue);
    } else if (patchValue !== undefined) {
      result[key] = patchValue;
    }
  });

  return result;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function setYear() {
  const yearNode = document.getElementById("yearNow");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}

function hydrateContactInfo(cfg) {
  const orgNodes = document.querySelectorAll("[data-org-name]");
  orgNodes.forEach((node) => {
    node.textContent = cfg.orgName;
  });

  const primaryEmail = document.getElementById("contactEmailPrimary");
  const secondaryEmail = document.getElementById("contactEmailSecondary");
  const emailQuick = document.getElementById("emailQuickLink");
  const phoneNode = document.getElementById("contactPhone");
  const phoneQuick = document.getElementById("phoneQuickLink");
  const addressNode = document.getElementById("addressLines");
  const workingHoursNode = document.getElementById("workingHours");
  const mapQuick = document.getElementById("mapQuickLink");

  setLinkText(primaryEmail, `mailto:${cfg.email}`, cfg.email);

  if (cfg.emailSecondary) {
    setLinkText(secondaryEmail, `mailto:${cfg.emailSecondary}`, cfg.emailSecondary);
    secondaryEmail.classList.remove("d-none");
  } else if (secondaryEmail) {
    secondaryEmail.classList.add("d-none");
  }

  setLinkText(emailQuick, `mailto:${cfg.email}`, "Hemen Mail At");
  setLinkText(phoneNode, `tel:${sanitizePhone(cfg.phone)}`, cfg.phone);
  setLinkText(phoneQuick, `tel:${sanitizePhone(cfg.phone)}`, "Hemen Ara");

  if (addressNode) {
    addressNode.innerHTML = "";
    cfg.addressLines.forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.textContent = line;
      addressNode.appendChild(lineNode);
    });
  }

  if (workingHoursNode) {
    workingHoursNode.textContent = cfg.workingHours;
  }

  if (mapQuick) {
    mapQuick.href = cfg.quickLinks?.mapsUrl || "https://maps.google.com";
  }
}

function setLinkText(node, href, text) {
  if (!node) {
    return;
  }

  node.href = href;
  node.textContent = text;
}

function sanitizePhone(value) {
  return String(value || "").replace(/\s+/g, "");
}

function setupCopyButtons() {
  const buttons = document.querySelectorAll("[data-copy]");

  buttons.forEach((button) => {
    const defaultText = button.textContent;

    button.addEventListener("click", async () => {
      const selector = button.getAttribute("data-copy");
      const source = selector ? document.querySelector(selector) : null;
      const value = source ? source.textContent.trim().replace(/\s*\n\s*/g, " ") : "";

      if (!value) {
        return;
      }

      try {
        await copyText(value);
        button.textContent = "Kopyalandi";
        button.disabled = true;
        setTimeout(() => {
          button.textContent = defaultText;
          button.disabled = false;
        }, 1400);
      } catch {
        button.textContent = "Kopyalama Hatasi";
        setTimeout(() => {
          button.textContent = defaultText;
        }, 1400);
      }
    });
  });
}

async function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function setupForm(cfg) {
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitSpinner = document.getElementById("submitSpinner");
  const submitLabel = document.getElementById("submitLabel");

  if (!form || !submitBtn || !submitSpinner || !submitLabel) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const endpoint = (cfg.form?.endpoint || "").trim();
    if (!endpoint || endpoint.includes("XXXXXXXX")) {
      updateFormStatus("Lutfen contact.config.json icinde Formspree endpoint degerini guncelleyin.", "warning");
      return;
    }

    setSubmitting(true, submitBtn, submitSpinner, submitLabel);
    updateFormStatus("Mesajiniz gonderiliyor...", "warning");

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.source = "contact-page";
      payload.pageUrl = window.location.href;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errPayload = await safeJson(response);
        const message = errPayload?.errors?.[0]?.message || "Mesaj gonderilemedi. Lutfen tekrar deneyin.";
        throw new Error(message);
      }

      updateFormStatus("Mesajiniz basariyla gonderildi. Tesekkur ederiz.", "success");
      form.reset();
    } catch (error) {
      updateFormStatus(error.message || "Baglanti hatasi olustu. Daha sonra tekrar deneyin.", "error");
    } finally {
      setSubmitting(false, submitBtn, submitSpinner, submitLabel);
    }
  });
}

function setSubmitting(isSubmitting, submitBtn, submitSpinner, submitLabel) {
  submitBtn.disabled = isSubmitting;
  submitSpinner.classList.toggle("d-none", !isSubmitting);
  submitLabel.textContent = isSubmitting ? "Gonderiliyor..." : "Mesaji Gonder";
}

function updateFormStatus(message, type) {
  const statusNode = document.getElementById("formStatus");
  if (!statusNode) {
    return;
  }

  statusNode.textContent = message;
  statusNode.className = "mny-form-status";
  statusNode.classList.add(`is-${type}`);
  statusNode.classList.remove("d-none");
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function setupMap(cfg) {
  const mapStatus = document.getElementById("mapStatus");
  const mapNode = document.getElementById("mnyMap");

  if (!mapNode) {
    return;
  }

  const hasApiKey = Boolean(cfg.map?.apiKey && cfg.map.apiKey.trim());

  if (hasApiKey) {
    try {
      await loadGoogleMapsScript(cfg.map.apiKey, cfg.map.mapId);
      renderGoogleMap(cfg);
      setMapStatus(mapStatus, "Google Maps mavi tema aktif.");
      return;
    } catch {
      setMapStatus(mapStatus, "Google Maps API yuklenemedi, iframe fallback gosteriliyor.");
    }
  } else {
    setMapStatus(mapStatus, "API key tanimli degil, iframe fallback gosteriliyor.");
  }

  renderMapFallback(cfg);
}

function setMapStatus(node, text) {
  if (node) {
    node.textContent = text;
  }
}

function loadGoogleMapsScript(apiKey, mapId) {
  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const mapIdQuery = mapId ? `&map_ids=${encodeURIComponent(mapId)}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${mapIdQuery}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve();
      } else {
        reject(new Error("Google Maps yuklenemedi."));
      }
    };

    script.onerror = () => reject(new Error("Google Maps script hatasi."));
    document.head.appendChild(script);
  });
}

function renderGoogleMap(cfg) {
  const mapNode = document.getElementById("mnyMap");
  const fallbackWrap = document.getElementById("mnyMapFallbackWrap");
  if (!mapNode) {
    return;
  }

  const center = {
    lat: Number(cfg.map?.lat || DEFAULT_CONTACT_CFG.map.lat),
    lng: Number(cfg.map?.lng || DEFAULT_CONTACT_CFG.map.lng)
  };

  const mapOptions = {
    center,
    zoom: Number(cfg.map?.zoom || DEFAULT_CONTACT_CFG.map.zoom),
    fullscreenControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    styles: cfg.map?.mapId ? undefined : MAP_STYLE,
    mapId: cfg.map?.mapId || undefined,
    gestureHandling: "cooperative"
  };

  const map = new window.google.maps.Map(mapNode, mapOptions);
  const markerTitle = cfg.orgName || "MANYETAM";

  if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement && cfg.map?.mapId) {
    new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: center,
      title: markerTitle
    });
  } else {
    new window.google.maps.Marker({
      map,
      position: center,
      title: markerTitle
    });
  }

  if (fallbackWrap) {
    fallbackWrap.classList.add("d-none");
  }
}

function renderMapFallback(cfg) {
  const mapNode = document.getElementById("mnyMap");
  const fallbackWrap = document.getElementById("mnyMapFallbackWrap");
  const fallbackIframe = document.getElementById("mnyMapFallback");

  if (!fallbackWrap || !fallbackIframe) {
    return;
  }

  const lat = Number(cfg.map?.lat || DEFAULT_CONTACT_CFG.map.lat);
  const lng = Number(cfg.map?.lng || DEFAULT_CONTACT_CFG.map.lng);
  const zoom = Number(cfg.map?.zoom || DEFAULT_CONTACT_CFG.map.zoom);

  const query = `${lat},${lng} (${cfg.orgName || "MANYETAM"})`;
  fallbackIframe.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;

  fallbackWrap.classList.remove("d-none");
  if (mapNode) {
    mapNode.classList.add("d-none");
  }
}

function injectSchema(cfg) {
  const schemaNode = document.getElementById("orgSchema");
  if (!schemaNode) {
    return;
  }

  const baseUrl = `${window.location.origin}/contact/`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        name: cfg.orgName,
        email: cfg.email,
        telephone: cfg.phone,
        url: baseUrl,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: cfg.email,
            telephone: cfg.phone,
            areaServed: "TR",
            availableLanguage: ["Turkish", "English"]
          }
        ]
      },
      {
        "@type": "LocalBusiness",
        "@id": `${baseUrl}#localbusiness`,
        name: cfg.orgName,
        parentOrganization: { "@id": `${baseUrl}#organization` },
        email: cfg.email,
        telephone: cfg.phone,
        openingHours: cfg.workingHours,
        address: {
          "@type": "PostalAddress",
          streetAddress: cfg.addressLines.join(", "),
          addressLocality: "Trabzon",
          addressCountry: "TR"
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: Number(cfg.map?.lat || DEFAULT_CONTACT_CFG.map.lat),
          longitude: Number(cfg.map?.lng || DEFAULT_CONTACT_CFG.map.lng)
        },
        url: baseUrl
      }
    ]
  };

  schemaNode.textContent = JSON.stringify(schema, null, 2);
}

