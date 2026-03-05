const DEFAULT_CONFIG = {
  orgName: "MANYETAM",
  emails: ["manyetam@ktu.edu.tr", "ktumanyetam@gmail.com"],
  phone: "+90 532 137 55 19",
  addressLines: [
    "Karadeniz Teknik Üniversitesi, Kanuni Kampüsü",
    "Bilimsel Araştırma Merkezi, 61080 Ortahisar / Trabzon"
  ],
  workingHours: "Hafta içi 08:00 - 17:00",
  formspreeEndpoint: "https://formspree.io/f/xwvrepgn",
  mapEmbedUrl: "https://www.google.com/maps?q=Karadeniz%20Teknik%20%C3%9Cniversitesi%20Kanuni%20Kamp%C3%BCs%C3%BC%20Bilimsel%20Ara%C5%9Ft%C4%B1rma%20Merkezi%20Ortahisar%20Trabzon&output=embed"
};

const ENDPOINT_WARNING = "Formu aktif etmek için contact.config.json içindeki Formspree endpoint değerini güncelleyin.";
const SUCCESS_MESSAGE = "Mesajınız alındı. En kısa sürede dönüş yapacağız.";
const ERROR_MESSAGE = "Gönderim sırasında hata oluştu. Lütfen tekrar deneyin.";
const KVKK_MESSAGE = "KVKK onay kutusunu işaretleyin.";

let appConfig = { ...DEFAULT_CONFIG };
let copyToastTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  appConfig = await loadConfig();
  applyContent(appConfig);
  setupCopyActions();
  setupForm(appConfig);
  setupMap(appConfig);
  injectSchema(appConfig);
  setYear();
});

async function loadConfig() {
  try {
    const response = await fetch("./contact.config.json", { cache: "no-store" });
    if (!response.ok) {
      return { ...DEFAULT_CONFIG };
    }

    const fileConfig = await response.json();
    return normalizeConfig(fileConfig);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function normalizeConfig(raw) {
  const cfg = { ...DEFAULT_CONFIG, ...(raw || {}) };

  if (!Array.isArray(cfg.emails) || !cfg.emails.length) {
    cfg.emails = [...DEFAULT_CONFIG.emails];
  }

  if (!Array.isArray(cfg.addressLines) || !cfg.addressLines.length) {
    cfg.addressLines = [...DEFAULT_CONFIG.addressLines];
  }

  cfg.formspreeEndpoint = String(cfg.formspreeEndpoint || "").trim();
  cfg.mapEmbedUrl = String(cfg.mapEmbedUrl || "").trim();
  return cfg;
}

function applyContent(cfg) {
  setText("infoOrgName", cfg.orgName);
  setText("infoWorkingHours", cfg.workingHours);

  const emailsContainer = document.getElementById("infoEmails");
  if (emailsContainer) {
    emailsContainer.innerHTML = "";
    cfg.emails.forEach((email) => {
      const anchor = document.createElement("a");
      anchor.href = `mailto:${email}`;
      anchor.className = "mny-info-value-link";
      anchor.textContent = email;
      emailsContainer.appendChild(anchor);
    });
  }

  const primaryEmail = cfg.emails[0] || "";
  const emailAction = document.getElementById("emailAction");
  if (emailAction) {
    emailAction.href = primaryEmail ? `mailto:${primaryEmail}` : "#";
    emailAction.target = "_blank";
    emailAction.rel = "noopener";
  }

  const phoneHref = `tel:${sanitizePhone(cfg.phone)}`;
  setLink("infoPhone", phoneHref, cfg.phone);
  setLink("phoneAction", phoneHref, "Ara");

  const addressNode = document.getElementById("infoAddress");
  if (addressNode) {
    addressNode.innerHTML = "";
    cfg.addressLines.forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.textContent = line;
      addressNode.appendChild(lineNode);
    });
  }

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cfg.addressLines.join(", "))}`;
  const directionsAction = document.getElementById("directionsAction");
  if (directionsAction) {
    directionsAction.href = directions;
  }
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value || "";
  }
}

function setLink(id, href, text) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.href = href;
  node.textContent = text;
}

function sanitizePhone(value) {
  return String(value || "").replace(/\s+/g, "");
}

function setupCopyActions() {
  const buttons = document.querySelectorAll("[data-copy-source]");

  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = button.getAttribute("data-copy-source");
      const text = getCopyText(key);
      if (!text) {
        return;
      }

      try {
        await copyToClipboard(text);
        showCopyToast("Kopyalandı");
      } catch {
        showCopyToast("Kopyalama başarısız");
      }
    });
  });
}

function getCopyText(key) {
  if (key === "emails") {
    return (appConfig.emails || []).join("\n");
  }
  if (key === "phone") {
    return appConfig.phone || "";
  }
  if (key === "address") {
    return (appConfig.addressLines || []).join(", ");
  }
  return "";
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // clipboard API failed, use fallback
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

function showCopyToast(message) {
  const toast = document.getElementById("copyToast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  if (copyToastTimer) {
    window.clearTimeout(copyToastTimer);
  }

  copyToastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1400);
}

function setupForm(cfg) {
  const form = document.getElementById("contactForm");
  const submitButton = document.getElementById("submitButton");
  const submitSpinner = document.getElementById("submitSpinner");
  const submitText = document.getElementById("submitText");
  const endpointHint = document.getElementById("endpointHint");

  if (!form || !submitButton || !submitSpinner || !submitText) {
    return;
  }

  const endpoint = cfg.formspreeEndpoint;
  const endpointReady = isValidEndpoint(endpoint);

  if (!endpointReady) {
    submitButton.disabled = true;
    if (endpointHint) {
      endpointHint.textContent = ENDPOINT_WARNING;
      endpointHint.classList.remove("d-none");
    }
  } else if (endpointHint) {
    endpointHint.classList.add("d-none");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!endpointReady) {
      updateFormStatus(ENDPOINT_WARNING, "warning");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const consent = document.getElementById("consent");
    if (!consent || !consent.checked) {
      updateFormStatus(KVKK_MESSAGE, "warning");
      return;
    }

    setSubmitting(true, submitButton, submitSpinner, submitText);
    updateFormStatus("Gönderiliyor…", "warning");

    try {
      const result = await postToFormspree(endpoint, form);
      if (!result.ok) {
        throw new Error(ERROR_MESSAGE);
      }

      form.reset();
      updateFormStatus(SUCCESS_MESSAGE, "success");
    } catch {
      updateFormStatus(ERROR_MESSAGE, "error");
    } finally {
      setSubmitting(false, submitButton, submitSpinner, submitText);
    }
  });
}

function isValidEndpoint(endpoint) {
  if (!endpoint || endpoint.includes("XXXXXXXX") || endpoint.includes("PLACEHOLDER")) {
    return false;
  }

  return /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint);
}

async function postToFormspree(endpoint, form) {
  const jsonPayload = Object.fromEntries(new FormData(form).entries());

  const jsonResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(jsonPayload)
  });

  if (jsonResponse.ok) {
    return jsonResponse;
  }

  const formData = new FormData(form);
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json"
    },
    body: formData
  });
}

function setSubmitting(isSubmitting, submitButton, submitSpinner, submitText) {
  submitButton.disabled = isSubmitting;
  submitSpinner.classList.toggle("d-none", !isSubmitting);
  submitText.textContent = isSubmitting ? "Gönderiliyor…" : "Gönder";
}

function updateFormStatus(message, type) {
  const status = document.getElementById("formStatus");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = "mny-form-status";
  status.classList.add(`is-${type}`);
  status.classList.remove("d-none");
}

function setupMap(cfg) {
  const iframe = document.getElementById("mapEmbed");
  if (!iframe) {
    return;
  }

  const source = cfg.mapEmbedUrl || buildFallbackMapUrl(cfg.addressLines);
  iframe.src = source;
}

function buildFallbackMapUrl(addressLines) {
  const query = encodeURIComponent((addressLines || []).join(" ").trim());
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

function injectSchema(cfg) {
  const schemaNode = document.getElementById("contactSchema");
  if (!schemaNode) {
    return;
  }

  const baseUrl = window.location.href;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": cfg.orgName,
        "url": baseUrl,
        "email": cfg.emails[0] || "",
        "telephone": cfg.phone
      },
      {
        "@type": "LocalBusiness",
        "@id": `${baseUrl}#localbusiness`,
        "name": cfg.orgName,
        "url": baseUrl,
        "telephone": cfg.phone,
        "email": cfg.emails[0] || "",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": cfg.addressLines.join(", "),
          "addressLocality": "Trabzon",
          "addressCountry": "TR"
        }
      }
    ]
  };

  schemaNode.textContent = JSON.stringify(schema, null, 2);
}

function setYear() {
  const year = document.getElementById("yearNow");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}
