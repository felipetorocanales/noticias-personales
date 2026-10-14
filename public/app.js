// Pulso Independiente — Motor de Agregación, Clasificación de Relevancia y Escudo Anti-Farándula

const DEFAULT_BLOCKED_TERMS = [
  "farándula", "celebridades", "famosos",
  "reality", "gran hermano", "tierra brava", "ganar o servir", "mundos opuestos",
  "alfombra roja", "horóscopo", "zodiaco", "tarot",
  "chisme", "quiebre amoroso", "nueva pareja",
  "infidelidad", "kardashian",
  "showbiz", "gossip", "miss universo", "reina de viña",
  "red carpet", "polémica entre famosos"
];


const HIGH_IMPACT_WORDS = [
  "investigación", "corrupción", "fiscalía", "corte suprema", "congreso",
  "senado", "diputados", "gobierno", "presidente", "constitución",
  "derechos humanos", "ddhh", "economía", "inflación", "presupuesto",
  "banco central", "litio", "cobre", "codelco", "conflicto", "guerra",
  "tratado", "onu", "crisis", "cambio climático", "sequía", "contaminación",
  "licitación", "contraloría", "impuestos", "reforma", "pensiones", "afp",
  "isapre", "salud pública", "seguridad", "crimen organizado", "transparencia",
  "filtración", "exclusivo", "investigation", "government", "supreme court"
];

const LOW_RADAR_WORDS = [
  "local", "regional", "comuna", "barrio", "vecinos", "comunidad", "rural",
  "hallazgo", "especie", "biodiversidad", "flora", "fauna", "arqueología",
  "historia", "archivo", "memoria", "patrimonio", "universidad", "estudio",
  "astronomía", "ciencia", "cooperativa", "oficio", "crónica", "libro",
  "documental", "valdivia", "antofagasta", "biobío", "concepción", "chiloé",
  "patagonia", "atacama", "campesino", "indígena", "mapuche", "humedal",
  "glaciar", "conservación"
];

const GENERIC_IMG_PATTERNS = [
  "el-ciudadano-img", "icono-twitter", "twitter-icon", "logo", "favicon",
  "placeholder", "avatar", "banner", "1x1", "pixel", "default-share", ".svg"
];

function isGenericImageUrl(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  return GENERIC_IMG_PATTERNS.some((p) => u.includes(p));
}


const STORIES_CHANNELS = [
  { id: "story-high", label: "Alto Impacto", icon: "🔥", category: "Investigación y Poder", matcher: (a) => a.relevanceTier === "alta", sort: (a, b) => b.relevanceScore - a.relevanceScore },
  { id: "story-chile", label: "Chile al Día", icon: "🇨🇱", category: "Prensa Chilena", matcher: (a) => a.region === "chile", sort: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt) },
  { id: "story-mundo", label: "Mundo", icon: "🌍", category: "Geopolítica y Global", matcher: (a) => a.region === "mundo", sort: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt) },
  { id: "story-low", label: "Bajo el Radar", icon: "📡", category: "Regiones y Ciencia", matcher: (a) => a.relevanceTier === "bajo_radar", sort: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt) },
  { id: "story-ciper", label: "CIPER", icon: "🕵️", category: "Centro de Investigación", matcher: (a) => a.sourceId === "ciper" },
  { id: "story-interf", label: "Interferencia", icon: "⚡", category: "Prensa Independiente", matcher: (a) => a.sourceId === "interferencia" },
  { id: "story-fastcheck", label: "Fast Check", icon: "🔎", category: "Fact Checking", matcher: (a) => a.sourceId === "fastcheck" },
  { id: "story-ladera", label: "Ladera Sur", icon: "🌿", category: "Medioambiente y Conservación", matcher: (a) => a.sourceId === "laderasur" },
  { id: "story-uchile", label: "Radio UChile", icon: "📻", category: "Radio Pública Universitaria", matcher: (a) => a.sourceId === "radiouchile" },
  { id: "story-bellingcat", label: "Bellingcat", icon: "🌐", category: "Investigación OSINT", matcher: (a) => a.sourceId === "bellingcat" },
  { id: "story-propub", label: "ProPublica", icon: "📜", category: "Periodismo Sin Fines de Lucro", matcher: (a) => a.sourceId === "propublica" },
  { id: "story-eldiario", label: "elDiario.es", icon: "🗞️", category: "Prensa Española", matcher: (a) => a.sourceId === "eldiarioes" }
];

function getStoryGroups() {
  const groups = [];

  for (const ch of STORIES_CHANNELS) {
    let matches = state.articles.filter((a) => ch.matcher(a));
    if (ch.sort) {
      matches = [...matches].sort(ch.sort);
    }
    const articles = matches.slice(0, 6);
    if (articles.length > 0) {
      groups.push({
        id: ch.id,
        label: ch.label,
        title: ch.label,
        icon: ch.icon,
        category: ch.category,
        articles
      });
    }
  }

  // Si hay notas guardadas por el usuario, incluir historia destacada de guardadas
  if (state.savedIds.size > 0) {
    const savedArticles = state.articles.filter((a) => state.savedIds.has(a.id)).slice(0, 6);
    if (savedArticles.length > 0) {
      groups.unshift({
        id: "story-saved",
        label: "Guardadas",
        title: "Tus Guardadas",
        icon: "🔖",
        category: "Notas favoritas para leer",
        articles: savedArticles
      });
    }
  }

  return groups;
}

function getSourceBadge(sourceId, region) {
  const flags = {
    ciper: { icon: "🕵️", abbr: "CP" },
    interferencia: { icon: "⚡", abbr: "IT" },
    fastcheck: { icon: "🔎", abbr: "FC" },
    radiouchile: { icon: "📻", abbr: "RU" },
    resumen: { icon: "🗞️", abbr: "RS" },
    laderasur: { icon: "🌿", abbr: "LS" },
    timeline: { icon: "⚓", abbr: "TL" },
    diariouach: { icon: "🌲", abbr: "UA" },
    elmostrador: { icon: "📰", abbr: "EM" },
    eldesconcierto: { icon: "✍️", abbr: "ED" },
    elciudadano: { icon: "📢", abbr: "EC" },
    cooperativa: { icon: "🎙️", abbr: "CP" },
    bellingcat: { icon: "🌐", abbr: "BC" },
    propublica: { icon: "📜", abbr: "PP" },
    theintercept: { icon: "👁️", abbr: "TI" },
    globalvoices: { icon: "🌍", abbr: "GV" },
    elsalto: { icon: "✊", abbr: "ES" },
    eldiarioes: { icon: "🗞️", abbr: "ED" },
    jacobinlat: { icon: "🚩", abbr: "JB" },
    sinpermiso: { icon: "📑", abbr: "SP" },
    brecha: { icon: "🇺🇾", abbr: "BR" },
    dw: { icon: "🇩🇪", abbr: "DW" },
    france24: { icon: "🇫🇷", abbr: "F24" }
  };
  return flags[sourceId] || { icon: region === "chile" ? "🇨🇱" : "🌍", abbr: "NEWS" };
}

function showToast(msg) {
  const el = document.getElementById("toastMessage");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.classList.add("hidden"), 200);
  }, 2200);
}

const state = {
  articles: [],
  sources: [],
  blockedExamples: [],
  totalBlockedCount: 0,
  region: "all",
  tier: "all",
  category: "all",
  sourceId: "all",
  onlyIndependent: false,
  searchQuery: "",
  viewMode: "split", // 'split' | 'grid'
  sortBy: localStorage.getItem("pulso_sort_by") || "date_desc", // 'date_desc' | 'relevance_desc' | 'relevance_asc' | 'date_asc'
  savedIds: new Set(JSON.parse(localStorage.getItem("pulso_saved_ids") || "[]")),
  viewedStoryIds: new Set(JSON.parse(localStorage.getItem("pulso_viewed_stories") || "[]")),
  customBlockedWords: JSON.parse(localStorage.getItem("pulso_custom_blocked") || "[]"),
  customSources: JSON.parse(localStorage.getItem("pulso_custom_sources") || "[]"),
  activeReaderArticle: null
};

function sortArticles(list, criterion) {
  const sorted = [...list];
  switch (criterion) {
    case "date_desc":
      return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    case "date_asc":
      return sorted.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    case "relevance_desc":
      return sorted.sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    case "relevance_asc":
      return sorted.sort(
        (a, b) =>
          a.relevanceScore - b.relevanceScore ||
          new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    default:
      return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
}

// Utility functions
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(raw) {
  if (!raw) return "";
  const doc = new DOMParser().parseFromString(raw, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function parseHonestDate(rawDate) {
  if (!rawDate) return new Date();
  if (typeof rawDate === "string") {
    let s = rawDate.trim();
    // Si viene en formato "YYYY-MM-DD HH:mm:ss" (común en rss2json en UTC)
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(s)) {
      s = s.replace(" ", "T") + "Z";
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      // Si por desfase de servidor remoto la fecha está en el futuro, acotar a tiempo actual
      if (d.getTime() > Date.now()) {
        return new Date();
      }
      return d;
    }
  }
  return new Date();
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Publicación reciente";
  const date = parseHonestDate(isoDate);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  // Hora exacta en formato chileno/local: ej. "15:21"
  const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    if (diffMin < 4) return `Hoy ${timeStr} (hace instantes)`;
    if (diffMin < 60) return `Hoy ${timeStr} (hace ${diffMin} min)`;
    return `Hoy ${timeStr} (hace ${diffHours} h)`;
  }

  if (isYesterday) {
    return `Ayer ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  return `${dateStr} · ${timeStr}`;
}


function checkFarandula(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const allTerms = [...DEFAULT_BLOCKED_TERMS, ...state.customBlockedWords];
  for (const term of allTerms) {
    if (!term) continue;
    const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      return { blocked: true, reason: term };
    }
  }
  return { blocked: false, reason: null };
}

function classifyLiveArticle(src, title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const highHits = HIGH_IMPACT_WORDS.filter((w) => text.includes(w));
  const lowHits = LOW_RADAR_WORDS.filter((w) => text.includes(w));

  let score = src.baseWeight || 76;
  score += Math.min(highHits.length * 5, 18);
  score -= Math.min(lowHits.length * 4, 15);

  const lowRadarSources = ["timeline", "diariouach", "laderasur", "resumen", "globalvoices", "sinpermiso", "brecha", "jacobinlat"];
  let tier = "bajo_radar";
  let reason = "Bajo el radar: hallazgo específico, crónica local o análisis periférico";

  if (lowRadarSources.includes(src.id) && highHits.length <= 1) {
    tier = "bajo_radar";
    reason = "Historia regional, comunitaria o de nicho fuera de la agenda mediática tradicional";
  } else if (score >= 83 || highHits.length >= 2) {
    tier = "alta";
    reason = "Alto impacto público, investigativo o estructural";
  }

  let category = "Política y Actualidad";
  if (["investigación", "corrupción", "contraloría", "fiscalía", "exclusivo", "filtración", "osint", "ciper", "bellingcat"].some(w => text.includes(w))) {
    category = "Investigación y Poder";
  } else if (["medioambiente", "clima", "humedal", "agua", "sequía", "glaciar", "especie", "bosque", "contaminación", "biodiversidad", "litio"].some(w => text.includes(w))) {
    category = "Medioambiente y Territorio";
  } else if (["ciencia", "universidad", "estudio", "tecnología", "inteligencia artificial", "salud", "medicina", "astronomía"].some(w => text.includes(w))) {
    category = "Ciencia, Salud y Futuro";
  } else if (["economía", "inflación", "trabajo", "sindicato", "laboral", "pensiones", "impuestos", "presupuesto", "vivienda"].some(w => text.includes(w))) {
    category = "Economía y Sociedad";
  } else if (["derechos humanos", "ddhh", "memoria", "justicia", "comunidad", "indígena", "mapuche", "migración"].some(w => text.includes(w))) {
    category = "Derechos Humanos y Ciudadanía";
  } else if (["guerra", "geopolítica", "onu", "tratado", "elecciones", "internacional", "latinoamérica", "europa", "medio oriente"].some(w => text.includes(w))) {
    category = "Geopolítica y Mundo";
  } else if (["cultura", "cine", "película", "festival", "concierto", "música", "teatro", "literatura", "libro", "arte", "homenaje", "museo"].some(w => text.includes(w))) {
    category = "Cultura y Sociedad";
  }

  return {
    tier,
    score: Math.max(40, Math.min(99, score)),
    reason,
    category
  };
}

// Initialize App
async function initApp() {
  setupDateHeader();
  setupTheme();
  bindEvents();

  // Set initial sort selects
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = state.sortBy;
  const quickSortSelect = document.getElementById("quickSortSelect");
  if (quickSortSelect) quickSortSelect.value = state.sortBy;

  // Default "onlyIndependentCheck" to false so all 23 sources show, or let user toggle
  const indepCheckbox = document.getElementById("onlyIndependentCheck");
  if (indepCheckbox) {
    indepCheckbox.checked = false;
    state.onlyIndependent = false;
  }

  await loadInitialSnapshot();
  renderAll();

  // Actualización honesta automática cada 2 minutos en segundo plano
  setInterval(async () => {
    await loadInitialSnapshot();
    renderAll();
  }, 2 * 60 * 1000);
}



function setupDateHeader() {
  const el = document.getElementById("currentDateDisplay");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function updateThemeIcon() {
  const btn = document.getElementById("themeToggleBtn");
  if (!btn) return;
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  btn.textContent = current === "dark" ? "☀️" : "🌙";
  btn.title = current === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
}

function setupTheme() {
  const savedTheme = localStorage.getItem("pulso_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon();
}


async function loadInitialSnapshot() {
  try {
    const res = await fetch(`/data/initial-feeds.json?_cb=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });
    if (!res.ok) throw new Error("No se pudo cargar initial-feeds.json");
    const data = await res.json();

    state.sources = [...(data.sources || []), ...state.customSources];
    state.blockedExamples = data.blockedExamples || [];
    state.totalBlockedCount = data.totalBlockedFarandula || 0;

    // Filter snapshot articles against any custom user blocked words
    const validArticles = [];
    for (const art of data.articles || []) {
      const check = checkFarandula(art.title, art.summary);
      if (check.blocked) {
        state.totalBlockedCount++;
        state.blockedExamples.unshift({
          title: art.title,
          source: art.sourceName,
          reason: check.reason
        });
      } else {
        validArticles.push(art);
      }
    }

    state.articles = validArticles;
    populateSourceDropdown();

    const syncText = document.getElementById("syncStatusText");
    if (syncText) {
      syncText.textContent = `Red activa · ${state.sources.length} medios conectados`;
    }
  } catch (err) {
    console.error("Error cargando snapshot inicial:", err);
  }
}

function populateSourceDropdown() {
  const select = document.getElementById("sourceSelect");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="all">Todos los medios (${state.sources.length})</option>`;

  const chileGroup = document.createElement("optgroup");
  chileGroup.label = "🇨🇱 Chile (Independientes y Regionales)";
  const mundoGroup = document.createElement("optgroup");
  mundoGroup.label = "🌍 Mundo (Independientes e Investigación)";

  state.sources.forEach((src) => {
    const opt = document.createElement("option");
    opt.value = src.id;
    opt.textContent = `${src.name} — ${src.type}`;
    if (src.region === "chile") {
      chileGroup.appendChild(opt);
    } else {
      mundoGroup.appendChild(opt);
    }
  });

  select.appendChild(chileGroup);
  select.appendChild(mundoGroup);
  select.value = currentVal || "all";

  const activeSourcesCount = document.getElementById("activeSourcesCount");
  if (activeSourcesCount) activeSourcesCount.textContent = state.sources.length;
}

// Live RSS Fetching via Multi-CORS Proxy (Aggressive Anti-Cache Engine)
async function fetchFeedViaProxy(feedUrl) {
  const timestamp = Date.now();
  const sep = feedUrl.includes("?") ? "&" : "?";
  const targetWithBust = `${feedUrl}${sep}_nocache=${timestamp}&_r=${Math.random().toString(36).slice(2, 7)}`;

  const proxies = [
    // 1. AllOrigins con cache-buster en el proxy y en la URL de destino
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetWithBust)}&_cb=${timestamp}`,
    // 2. CodeTabs proxy
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetWithBust)}`,
    // 3. CorsProxy.io
    `https://corsproxy.io/?url=${encodeURIComponent(targetWithBust)}`,
    // 4. ThingProxy
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetWithBust)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4200); // 4.2s timeout agresivo
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes("<item") || text.includes("<entry"))) {
          return text;
        }
      }
    } catch (_) {
      // Siguiente proxy de inmediato
    }
  }

  // Intento de fallback directo por si el servidor soporta CORS nativo
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(targetWithBust, {
      signal: controller.signal,
      cache: "no-store",
      mode: "cors"
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes("<item") || text.includes("<entry"))) {
        return text;
      }
    }
  } catch (_) {}

  return null;
}

function extractImageFromXmlItem(item) {
  // 1. media:content
  const mediaContent = item.querySelector("content[url], media\\:content[url]");
  if (mediaContent && mediaContent.getAttribute("url")) {
    return mediaContent.getAttribute("url");
  }
  // 2. enclosure
  const enclosure = item.querySelector("enclosure[url]");
  if (enclosure) {
    const url = enclosure.getAttribute("url") || "";
    const type = enclosure.getAttribute("type") || "";
    if (type.startsWith("image") || /\.(jpg|jpeg|png|webp|avif)/i.test(url)) {
      return url;
    }
  }
  // 3. media:thumbnail
  const thumb = item.querySelector("thumbnail[url], media\\:thumbnail[url]");
  if (thumb && thumb.getAttribute("url")) {
    return thumb.getAttribute("url");
  }
  // 4. Buscar etiqueta <img> en description o encoded
  const descRaw = item.querySelector("description")?.textContent || "";
  const encRaw = item.querySelector("encoded")?.textContent || "";
  const match = (descRaw + " " + encRaw).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function parseRssXmlInBrowser(xmlText, src) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  let items = Array.from(xmlDoc.querySelectorAll("item"));
  if (!items.length) {
    items = Array.from(xmlDoc.querySelectorAll("entry"));
  }

  const results = [];
  for (const item of items.slice(0, 12)) {
    let title = cleanText(item.querySelector("title")?.textContent || "");
    if (!title) continue;

    if (title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts[parts.length - 1].length < 28) {
        parts.pop();
        title = parts.join(" - ").trim();
      }
    }

    let link = item.querySelector("link")?.textContent?.trim() || "";
    if (!link) {
      link = item.querySelector("link")?.getAttribute("href") || src.site;
    }

    const rawDesc =
      item.querySelector("description")?.textContent ||
      item.querySelector("summary")?.textContent ||
      item.querySelector("content")?.textContent ||
      "";
    let summary = cleanText(rawDesc);
    if (summary.length > 340) summary = summary.slice(0, 337) + "...";
    if (summary.length < 25) {
      summary = `Cobertura verificada por ${src.name} (${src.type}). Haz clic para leer la nota completa en la fuente original.`;
    }

    const pubDateRaw =
      item.querySelector("pubDate")?.textContent ||
      item.querySelector("published")?.textContent ||
      item.querySelector("updated")?.textContent ||
      "";
    const parsedDate = pubDateRaw && !isNaN(new Date(pubDateRaw).getTime())
      ? new Date(pubDateRaw).toISOString()
      : new Date().toISOString();

    const image = extractImageFromXmlItem(item);

    results.push({ title, summary, url: link, publishedAt: parsedDate, image });
  }
  return results;
}

async function fetchLiveUpdates() {
  // Sincronización honesta en tiempo real desde el snapshot oficial
  await loadInitialSnapshot();
  renderAll();
}

// Filtering Logic
function getFilteredArticles() {
  return state.articles.filter((art) => {
    // Re-check custom blocked words dynamically
    if (checkFarandula(art.title, art.summary).blocked) return false;

    if (state.onlyIndependent && !art.independent) return false;
    if (state.region !== "all" && art.region !== state.region) return false;
    if (state.sourceId !== "all" && art.sourceId !== state.sourceId) return false;
    if (state.category !== "all" && art.category !== state.category) return false;

    if (state.tier === "saved") {
      if (!state.savedIds.has(art.id)) return false;
    } else if (state.tier !== "all" && art.relevanceTier !== state.tier) {
      return false;
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const hay = `${art.title} ${art.summary} ${art.sourceName} ${art.category} ${art.sourceType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

// Stories Reel & Instagram Stories Player Engine
function renderStoriesReel() {
  const container = document.getElementById("storiesReel");
  if (!container) return;

  const groups = getStoryGroups();
  if (!groups.length) {
    container.innerHTML = `<span class="mono-label" style="padding: 6px 12px;">Cargando historias independientes...</span>`;
    return;
  }

  container.innerHTML = groups.map((g) => {
    const isViewed = state.viewedStoryIds.has(g.id);
    return `
      <div class="story-item ${isViewed ? "viewed" : ""}" data-story-id="${escapeHtml(g.id)}" role="button" tabindex="0" title="Ver historia de ${escapeHtml(g.label)} (${g.articles.length} noticias)">
        <div class="story-ring">
          <div class="story-avatar">${g.icon}</div>
          <span class="story-badge-count">${g.articles.length}</span>
        </div>
        <span class="story-label">${escapeHtml(g.label)}</span>
      </div>
    `;
  }).join("");
}

const StoriesPlayer = {
  activeGroups: [],
  currentGroupIndex: 0,
  currentSlideIndex: 0,
  isOpen: false,
  isPaused: false,
  slideDurationMs: 5500, // 5.5s por slide
  elapsedMs: 0,
  lastTimestamp: 0,
  animFrameId: null,
  touchStartY: 0,
  touchStartX: 0,
  isHolding: false,

  open(groupId) {
    this.activeGroups = getStoryGroups();
    if (!this.activeGroups.length) {
      showToast("No hay historias disponibles en este momento");
      return;
    }

    const targetIdx = this.activeGroups.findIndex((g) => g.id === groupId);
    this.currentGroupIndex = targetIdx !== -1 ? targetIdx : 0;
    this.currentSlideIndex = 0;
    this.isOpen = true;
    this.isPaused = false;
    this.elapsedMs = 0;

    const modal = document.getElementById("storiesViewerModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
    document.body.style.overflow = "hidden";

    this.renderCurrentSlide();
    this.startProgress();
    this.markCurrentGroupViewed();
  },

  close() {
    this.isOpen = false;
    this.isPaused = false;
    this.isHolding = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const modal = document.getElementById("storiesViewerModal");
    if (modal) {
      modal.classList.add("hidden");
    }
    document.body.style.overflow = "";

    const slide = document.getElementById("storySlide");
    if (slide) slide.classList.remove("playing");

    renderStoriesReel();
  },

  getCurrentGroup() {
    return this.activeGroups[this.currentGroupIndex];
  },

  getCurrentArticle() {
    const group = this.getCurrentGroup();
    if (!group || !group.articles || !group.articles.length) return null;
    return group.articles[this.currentSlideIndex];
  },

  markCurrentGroupViewed() {
    const group = this.getCurrentGroup();
    if (!group) return;
    state.viewedStoryIds.add(group.id);
    localStorage.setItem("pulso_viewed_stories", JSON.stringify([...state.viewedStoryIds]));
  },

  renderCurrentSlide() {
    const group = this.getCurrentGroup();
    const article = this.getCurrentArticle();
    if (!group || !article) {
      this.close();
      return;
    }

    // 1. Render Segmented Progress Bars
    const progressWrapper = document.getElementById("storyProgressWrapper");
    if (progressWrapper) {
      progressWrapper.innerHTML = group.articles.map((_, idx) => {
        let cls = "story-progress-segment";
        let width = "0%";
        if (idx < this.currentSlideIndex) {
          cls += " completed";
          width = "100%";
        } else if (idx === this.currentSlideIndex) {
          width = `${(this.elapsedMs / this.slideDurationMs) * 100}%`;
        }
        return `
          <div class="${cls}" data-segment-idx="${idx}">
            <div class="story-progress-fill" style="width: ${width};"></div>
          </div>
        `;
      }).join("");
    }

    // 2. Header Info
    const avatarEl = document.getElementById("storyHeaderAvatar");
    if (avatarEl) avatarEl.textContent = group.icon;
    const sourceEl = document.getElementById("storyHeaderSource");
    if (sourceEl) sourceEl.textContent = article.sourceName || group.title;
    const timeEl = document.getElementById("storyHeaderTime");
    if (timeEl) timeEl.textContent = formatRelativeTime(article.publishedAt);
    const catEl = document.getElementById("storyHeaderCategory");
    if (catEl) catEl.textContent = `${group.title} · ${article.category || group.category}`;

    // 3. Media Background
    const mediaBg = document.getElementById("storyMediaBg");
    if (mediaBg) {
      if (article.image) {
        mediaBg.style.backgroundImage = `url('${article.image}')`;
        mediaBg.classList.remove("story-bg-editorial");
      } else {
        mediaBg.style.backgroundImage = "none";
        mediaBg.classList.add("story-bg-editorial");
      }
    }

    const slide = document.getElementById("storySlide");
    if (slide) {
      slide.classList.remove("playing");
      void slide.offsetWidth; // force DOM reflow for CSS zoom animation
      slide.classList.add("playing");
    }

    // 4. Foreground Content
    const tierBadge = document.getElementById("storyTierBadge");
    if (tierBadge) {
      tierBadge.textContent = article.relevanceTier === "alta" ? "🔥 MÁS RELEVANTE" : "📡 BAJO EL RADAR";
      tierBadge.className = `story-tier-badge tier-${article.relevanceTier}`;
    }

    const idxIndicator = document.getElementById("storyIndexIndicator");
    if (idxIndicator) {
      idxIndicator.textContent = `${this.currentSlideIndex + 1} / ${group.articles.length}`;
    }

    const titleEl = document.getElementById("storyTitle");
    if (titleEl) titleEl.textContent = article.title;

    const summaryEl = document.getElementById("storySummary");
    if (summaryEl) summaryEl.textContent = article.summary;

    const whyText = document.getElementById("storyWhyText");
    if (whyText) whyText.textContent = `${article.relevanceReason} (${article.sourceType}).`;

    // 5. Bookmark button state
    const bookmarkBtn = document.getElementById("storyBookmarkBtn");
    if (bookmarkBtn) {
      const isSaved = state.savedIds.has(article.id);
      bookmarkBtn.textContent = isSaved ? "🔖" : "🤍";
      bookmarkBtn.title = isSaved ? "Guardada en tu lista" : "Guardar noticia";
    }

    // Pause toggle icon
    const pauseBtn = document.getElementById("storyPauseToggleBtn");
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused ? "▶" : "⏸";
    }
  },

  startProgress() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.lastTimestamp = performance.now();

    const loop = (timestamp) => {
      if (!this.isOpen) return;

      if (!this.isPaused && !this.isHolding) {
        const delta = timestamp - this.lastTimestamp;
        this.elapsedMs += delta;

        // Update active segment
        const activeSegment = document.querySelector(`.story-progress-segment[data-segment-idx="${this.currentSlideIndex}"] .story-progress-fill`);
        if (activeSegment) {
          const pct = Math.min(100, (this.elapsedMs / this.slideDurationMs) * 100);
          activeSegment.style.width = `${pct}%`;
        }

        if (this.elapsedMs >= this.slideDurationMs) {
          this.nextSlide();
          return;
        }
      }

      this.lastTimestamp = timestamp;
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  },

  pause() {
    this.isPaused = true;
    const pauseBtn = document.getElementById("storyPauseToggleBtn");
    if (pauseBtn) pauseBtn.textContent = "▶";
    const slide = document.getElementById("storySlide");
    if (slide) slide.classList.remove("playing");
  },

  resume() {
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    const pauseBtn = document.getElementById("storyPauseToggleBtn");
    if (pauseBtn) pauseBtn.textContent = "⏸";
    const slide = document.getElementById("storySlide");
    if (slide) slide.classList.add("playing");
  },

  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
  },

  nextSlide() {
    const group = this.getCurrentGroup();
    if (!group) return;

    if (this.currentSlideIndex < group.articles.length - 1) {
      this.currentSlideIndex++;
      this.elapsedMs = 0;
      this.renderCurrentSlide();
      this.startProgress();
    } else {
      // Avanzar al siguiente canal de historias
      if (this.currentGroupIndex < this.activeGroups.length - 1) {
        this.currentGroupIndex++;
        this.currentSlideIndex = 0;
        this.elapsedMs = 0;
        this.markCurrentGroupViewed();
        this.renderCurrentSlide();
        this.startProgress();
      } else {
        // Se vieron todas las historias disponibles
        this.close();
        showToast("Has completado todas las historias del día ✨");
      }
    }
  },

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this.elapsedMs = 0;
      this.renderCurrentSlide();
      this.startProgress();
    } else if (this.currentGroupIndex > 0) {
      this.currentGroupIndex--;
      const prevGroup = this.getCurrentGroup();
      this.currentSlideIndex = Math.max(0, (prevGroup?.articles.length || 1) - 1);
      this.elapsedMs = 0;
      this.renderCurrentSlide();
      this.startProgress();
    } else {
      // Re-iniciar la primera noticia
      this.elapsedMs = 0;
      this.renderCurrentSlide();
      this.startProgress();
    }
  },

  initListeners() {
    // Next / Prev touch zone clicks
    document.getElementById("storyTouchNext")?.addEventListener("click", () => {
      this.nextSlide();
    });

    document.getElementById("storyTouchPrev")?.addEventListener("click", () => {
      this.prevSlide();
    });

    // Press and hold to pause (identical to Instagram / Facebook)
    const slideContainer = document.getElementById("storySlide");
    if (slideContainer) {
      const handlePressStart = (e) => {
        if (!this.isOpen) return;
        this.isHolding = true;
        this.pause();
        if (e.touches && e.touches[0]) {
          this.touchStartY = e.touches[0].clientY;
          this.touchStartX = e.touches[0].clientX;
        }
      };

      const handlePressEnd = (e) => {
        if (!this.isOpen) return;
        if (this.isHolding) {
          this.isHolding = false;
          this.resume();
        }
        // Swipe down to close check
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaY = e.changedTouches[0].clientY - this.touchStartY;
          const deltaX = Math.abs(e.changedTouches[0].clientX - this.touchStartX);
          if (deltaY > 65 && deltaY > deltaX) {
            this.close();
          }
        }
      };

      slideContainer.addEventListener("touchstart", handlePressStart, { passive: true });
      slideContainer.addEventListener("touchend", handlePressEnd, { passive: true });
      slideContainer.addEventListener("touchcancel", handlePressEnd, { passive: true });
      slideContainer.addEventListener("mousedown", handlePressStart);
      slideContainer.addEventListener("mouseup", handlePressEnd);
      slideContainer.addEventListener("mouseleave", handlePressEnd);
    }

    // Top action buttons
    document.getElementById("storyCloseBtn")?.addEventListener("click", () => {
      this.close();
    });

    document.getElementById("storyPauseToggleBtn")?.addEventListener("click", () => {
      this.togglePause();
    });

    // Bottom action buttons
    document.getElementById("storyReadFullBtn")?.addEventListener("click", () => {
      const art = this.getCurrentArticle();
      if (art) {
        this.close();
        openReaderModal(art.id);
      }
    });

    document.getElementById("storyBookmarkBtn")?.addEventListener("click", () => {
      const art = this.getCurrentArticle();
      if (art) {
        toggleSaveArticle(art.id);
        const isSaved = state.savedIds.has(art.id);
        const bookmarkBtn = document.getElementById("storyBookmarkBtn");
        if (bookmarkBtn) {
          bookmarkBtn.textContent = isSaved ? "🔖" : "🤍";
        }
        showToast(isSaved ? "Guardada en tus notas 🔖" : "Eliminada de tus notas");
      }
    });

    document.getElementById("storyShareBtn")?.addEventListener("click", () => {
      const art = this.getCurrentArticle();
      if (!art) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(art.url).then(() => {
          showToast("¡Enlace de la historia copiado! 📋");
        }).catch(() => {
          showToast("Enlace: " + art.url);
        });
      } else {
        showToast("Enlace: " + art.url);
      }
    });

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        this.close();
      } else if (e.key === "ArrowRight") {
        this.nextSlide();
      } else if (e.key === "ArrowLeft") {
        this.prevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        this.togglePause();
      }
    });
  }
};

// Rendering (Minimalist Unified Feed)
function renderAll() {
  updateMetricsAndCounters();
  renderStoriesReel();
  const filtered = getFilteredArticles();
  const sorted = sortArticles(filtered, state.sortBy);

  const gridContainer = document.getElementById("gridViewContainer");
  if (gridContainer) {
    renderCardsInto(gridContainer, sorted);
  }
}

function renderCardsInto(container, list) {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay noticias para mostrar con este criterio.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map((art) => {
      const isSaved = state.savedIds.has(art.id);
      const badgeInfo = getSourceBadge(art.sourceId, art.region);
      const isHigh = art.relevanceTier === "alta";
      const hasRealImage = !!(art.image && !isGenericImageUrl(art.image));

      return `
        <article class="feed-card ${hasRealImage ? "" : "feed-card-editorial"}" data-article-id="${escapeHtml(art.id)}">
          <!-- Card Header: Source, Time, Save Button -->
          <div class="card-header">
            <div class="card-author" data-filter-source="${escapeHtml(art.sourceId)}">
              <span class="card-avatar">${badgeInfo.icon}</span>
              <div class="card-meta">
                <span class="card-source-name">${escapeHtml(art.sourceName)}</span>
                <span class="card-dot">·</span>
                <span class="card-time">${formatRelativeTime(art.publishedAt)}</span>
              </div>
            </div>
            <button class="card-btn-icon ${isSaved ? "saved" : ""}" data-toggle-save="${escapeHtml(art.id)}" title="${isSaved ? "Guardada" : "Guardar"}">
              ${isSaved ? "🔖" : "🤍"}
            </button>
          </div>

          ${
            hasRealImage
              ? `
          <!-- Card Media: Real Authentic Image -->
          <div class="card-media" data-open-reader="${escapeHtml(art.id)}" role="button" tabindex="0">
            <img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" loading="lazy" onerror="const p=this.closest('.card-media'); if(p) p.style.display='none';" />
            <span class="card-pill ${isHigh ? "pill-high" : "pill-low"}">
              ${isHigh ? "🔥 Relevante" : "📡 Bajo el Radar"}
            </span>
          </div>
          `
              : ""
          }

          <!-- Card Content: Headline & Crisp Summary -->
          <div class="card-content">
            ${
              !hasRealImage
                ? `
            <div class="card-editorial-tags">
              <span class="card-pill-editorial ${isHigh ? "pill-high" : "pill-low"}">
                ${isHigh ? "🔥 Relevante" : "📡 Bajo el Radar"}
              </span>
              <span class="card-category-label">${escapeHtml(art.category)}</span>
            </div>
            `
                : ""
            }
            <h2 class="card-title" data-open-reader="${escapeHtml(art.id)}" role="button" tabindex="0">
              ${escapeHtml(art.title)}
            </h2>
            <p class="card-summary">${escapeHtml(art.summary)}</p>
          </div>


          <!-- Card Footer: Read & Share Actions -->
          <div class="card-footer">
            <button class="card-btn-read" data-open-reader="${escapeHtml(art.id)}">
              Leer completa ↗
            </button>
            <button class="card-btn-share" data-share-link="${escapeHtml(art.url)}" title="Compartir enlace">
              🔗
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateMetricsAndCounters() {
  const baseList = state.articles.filter((a) => !checkFarandula(a.title, a.summary).blocked);
  const chileCount = baseList.filter((a) => a.region === "chile").length;
  const mundoCount = baseList.filter((a) => a.region === "mundo").length;

  // Safe updates for legacy counters if present
  const elAll = document.getElementById("countRegionAll");
  if (elAll) elAll.textContent = baseList.length;
  const elCl = document.getElementById("countRegionChile");
  if (elCl) elCl.textContent = chileCount;
  const elMu = document.getElementById("countRegionMundo");
  if (elMu) elMu.textContent = mundoCount;
  const elSv = document.getElementById("savedCountBadge");
  if (elSv) elSv.textContent = state.savedIds.size;
}

function updateFilterSummaryBanner() {
  // Minimalist layout does not require noisy summary banners
}

function updateFilterSummaryBanner() {
  const parts = [];
  if (state.region === "chile") parts.push("de Chile 🇨🇱");
  if (state.region === "mundo") parts.push("del Mundo 🌍");
  if (state.tier === "alta") parts.push("· Capa: Más Relevantes");
  if (state.tier === "bajo_radar") parts.push("· Capa: No tan relevantes (Bajo el Radar)");
  if (state.tier === "saved") parts.push("· Guardadas");
  if (state.category !== "all") parts.push(`· Tema: ${state.category}`);
  if (state.sourceId !== "all") {
    const s = state.sources.find((x) => x.id === state.sourceId);
    if (s) parts.push(`· Medio: ${s.name}`);
  }
  if (state.onlyIndependent) parts.push("· Solo 100% Independientes");
  if (state.searchQuery) parts.push(`· Búsqueda: "${state.searchQuery}"`);

  if (state.sortBy === "relevance_desc") parts.push("· Orden: Mayor relevancia");
  if (state.sortBy === "relevance_asc") parts.push("· Orden: Más Bajo el Radar");
  if (state.sortBy === "date_asc") parts.push("· Orden: Más antiguas");

  const summaryEl = document.getElementById("activeFilterSummaryText");
  if (summaryEl) summaryEl.textContent = parts.join(" ");

  // Synchronize both sort selectors
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect && sortSelect.value !== state.sortBy) {
    sortSelect.value = state.sortBy;
  }
  const quickSortSelect = document.getElementById("quickSortSelect");
  if (quickSortSelect && quickSortSelect.value !== state.sortBy) {
    quickSortSelect.value = state.sortBy;
  }

  const hasCustomFilter =
    state.region !== "all" ||
    state.tier !== "all" ||
    state.category !== "all" ||
    state.sourceId !== "all" ||
    state.onlyIndependent ||
    state.searchQuery !== "" ||
    state.sortBy !== "date_desc";

  const hasSecondaryFilter =
    state.category !== "all" ||
    state.sourceId !== "all" ||
    state.onlyIndependent ||
    state.searchQuery !== "" ||
    state.sortBy !== "date_desc";

  const mobileDot = document.getElementById("mobileActiveFilterDot");
  if (mobileDot) {
    mobileDot.classList.toggle("hidden", !hasSecondaryFilter);
  }

  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.classList.toggle("hidden", !hasCustomFilter);
  }
}

// Modals & Interactive Handlers
function openReaderModal(articleId) {
  const art = state.articles.find((a) => a.id === articleId);
  if (!art) return;
  state.activeReaderArticle = art;

  const regionBadge = art.region === "chile" ? "🇨🇱 Chile" : "🌍 Mundo";
  document.getElementById("readerMetaTop").innerHTML = `
    <span class="region-flag">${regionBadge}</span>
    <span class="source-badge">${escapeHtml(art.sourceName)}</span>
    <span class="mono-label">${escapeHtml(art.sourceType)} · ${formatRelativeTime(art.publishedAt)}</span>
  `;

  document.getElementById("readerModalTitle").textContent = art.title;
  document.getElementById("readerBadges").innerHTML = `
    <span class="tier-pill tier-${art.relevanceTier}">
      ${art.relevanceTier === "alta" ? `🔥 Más Relevante (Índice ${art.relevanceScore}/100)` : `📡 No tan relevante / Bajo el Radar (Índice ${art.relevanceScore}/100)`}
    </span>
    <span class="indep-tag">${escapeHtml(art.category)}</span>
  `;

  const imgWrap = document.getElementById("readerImageWrap");
  const imgEl = document.getElementById("readerImage");
  if (art.image) {
    imgEl.src = art.image;
    imgWrap.classList.remove("hidden");
  } else {
    imgWrap.classList.add("hidden");
  }

  document.getElementById("readerSummary").textContent = art.summary;
  document.getElementById("readerRelevanceBox").innerHTML = `
    <strong>¿Por qué está clasificada aquí?</strong><br/>
    ${escapeHtml(art.relevanceReason)}. Fuente catalogada como <em>${escapeHtml(art.sourceType)}</em>.
  `;

  const bookmarkBtn = document.getElementById("readerBookmarkBtn");
  const isSaved = state.savedIds.has(art.id);
  bookmarkBtn.textContent = isSaved ? "🔖 Guardada en tu lista" : "🔖 Guardar para leer después";

  const extLink = document.getElementById("readerExternalLink");
  extLink.href = art.url;

  document.getElementById("readerModal").classList.remove("hidden");
}

function openShieldModal() {
  document.getElementById("modalBlockedCount").textContent = state.totalBlockedCount;
  document.getElementById("modalActivePatternsCount").textContent =
    DEFAULT_BLOCKED_TERMS.length + state.customBlockedWords.length;

  const defaultCloud = document.getElementById("defaultBlockedTagsCloud");
  defaultCloud.innerHTML = DEFAULT_BLOCKED_TERMS.map(
    (t) => `<span class="blocked-tag">🚫 ${escapeHtml(t)}</span>`
  ).join("");

  renderCustomBlockedWords();

  const exList = document.getElementById("blockedExamplesList");
  if (state.blockedExamples.length === 0) {
    exList.innerHTML = `<li>Ningún titular de farándula ha logrado atravesar las fuentes independientes seleccionadas en esta sesión.</li>`;
  } else {
    exList.innerHTML = state.blockedExamples
      .slice(0, 12)
      .map(
        (ex) =>
          `<li><strong>[${escapeHtml(ex.source)}]</strong> "${escapeHtml(ex.title)}" — <em>Bloqueado por patrón: "${escapeHtml(ex.reason)}"</em></li>`
      )
      .join("");
  }

  document.getElementById("shieldModal").classList.remove("hidden");
}

function renderCustomBlockedWords() {
  const container = document.getElementById("customBlockedWordsList");
  if (!container) return;
  if (!state.customBlockedWords.length) {
    container.innerHTML = `<span class="mono-label">No has añadido palabras personalizadas aún.</span>`;
    return;
  }
  container.innerHTML = state.customBlockedWords
    .map(
      (w, idx) => `
      <span class="blocked-tag">
        ${escapeHtml(w)}
        <button type="button" data-remove-custom-word="${idx}" title="Eliminar">✕</button>
      </span>
    `
    )
    .join("");
}

function openSourcesModal() {
  const grid = document.getElementById("sourcesDirectoryGrid");
  grid.innerHTML = state.sources
    .map((s) => {
      const count = state.articles.filter((a) => a.sourceId === s.id).length;
      return `
        <div class="source-dir-card">
          <div class="source-dir-top">
            <span>${ s.region === "chile" ? "🇨🇱" : "🌍" } ${escapeHtml(s.name)}</span>
            <span class="indep-tag">${count} notas</span>
          </div>
          <div class="source-dir-meta">${escapeHtml(s.type)}</div>
          <div class="source-dir-meta">
            <a href="${escapeHtml(s.site || s.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-low);">
              Visitar sitio ↗
            </a>
          </div>
        </div>
      `;
    })
    .join("");

  document.getElementById("sourcesModal").classList.remove("hidden");
}

function toggleSaveArticle(articleId) {
  if (state.savedIds.has(articleId)) {
    state.savedIds.delete(articleId);
  } else {
    state.savedIds.add(articleId);
  }
  localStorage.setItem("pulso_saved_ids", JSON.stringify([...state.savedIds]));
  renderAll();
}

function bindEvents() {
  // Navigation tabs (Todo / Chile / Mundo / Guardadas)
  document.querySelectorAll("[data-region]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-region]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-region");
      if (target === "saved") {
        state.tier = "saved";
        state.region = "all";
      } else {
        state.tier = "all";
        state.region = target;
      }
      renderAll();
    });
  });

  // Logo click -> Reset to Todo
  document.querySelector(".brand-logo")?.addEventListener("click", () => {
    state.region = "all";
    state.tier = "all";
    state.searchQuery = "";
    document.querySelectorAll("[data-region]").forEach((b) =>
      b.classList.toggle("active", b.getAttribute("data-region") === "all")
    );
    const searchDrawer = document.getElementById("searchDrawer");
    if (searchDrawer) searchDrawer.classList.add("hidden");
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Search Drawer Toggle
  const searchToggleBtn = document.getElementById("searchToggleBtn");
  const searchDrawer = document.getElementById("searchDrawer");
  const searchInput = document.getElementById("searchInput");
  const closeSearchBtn = document.getElementById("closeSearchBtn");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  searchToggleBtn?.addEventListener("click", () => {
    if (!searchDrawer) return;
    const isHidden = searchDrawer.classList.toggle("hidden");
    if (!isHidden) {
      searchInput?.focus();
    } else {
      state.searchQuery = "";
      if (searchInput) searchInput.value = "";
      renderAll();
    }
  });

  closeSearchBtn?.addEventListener("click", () => {
    searchDrawer?.classList.add("hidden");
    state.searchQuery = "";
    if (searchInput) searchInput.value = "";
    clearSearchBtn?.classList.add("hidden");
    renderAll();
  });

  searchInput?.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim();
    clearSearchBtn?.classList.toggle("hidden", !state.searchQuery);
    renderAll();
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    state.searchQuery = "";
    clearSearchBtn?.classList.add("hidden");
    renderAll();
  });


  // Theme Toggle Button
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pulso_theme", next);
    updateThemeIcon();
  });


  // Initialize Instagram Stories viewer listeners
  StoriesPlayer.initListeners();

  // Delegated clicks for cards and modals
  document.addEventListener("click", (e) => {
    // Story reel bubble click -> Open full-screen Instagram Stories viewer
    const storyTrigger = e.target.closest("[data-story-id]");
    if (storyTrigger) {
      const storyId = storyTrigger.getAttribute("data-story-id");
      StoriesPlayer.open(storyId);
      return;
    }

    // Share link button click
    const shareTrigger = e.target.closest("[data-share-link]");
    if (shareTrigger) {
      const url = shareTrigger.getAttribute("data-share-link");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showToast("¡Enlace copiado al portapapeles! 📋");
        }).catch(() => {
          showToast("Enlace: " + url);
        });
      } else {
        showToast("Enlace: " + url);
      }
      return;
    }

    // Filter by medium author click
    const filterSourceTrigger = e.target.closest("[data-filter-source]");
    if (filterSourceTrigger) {
      const srcId = filterSourceTrigger.getAttribute("data-filter-source");
      state.sourceId = state.sourceId === srcId ? "all" : srcId;
      const sourceSelect = document.getElementById("sourceSelect");
      if (sourceSelect) sourceSelect.value = state.sourceId;
      renderAll();
      showToast(state.sourceId === "all" ? "Mostrando todos los medios" : "Filtrado por medio");
      return;
    }

    const readerTrigger = e.target.closest("[data-open-reader]");
    if (readerTrigger) {
      openReaderModal(readerTrigger.getAttribute("data-open-reader"));
      return;
    }

    const saveTrigger = e.target.closest("[data-toggle-save]");
    if (saveTrigger) {
      toggleSaveArticle(saveTrigger.getAttribute("data-toggle-save"));
      return;
    }

    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      const modalId = closeBtn.getAttribute("data-close-modal");
      document.getElementById(modalId)?.classList.add("hidden");
      return;
    }

    if (e.target.classList.contains("modal-backdrop")) {
      e.target.classList.add("hidden");
      return;
    }

    const removeWordBtn = e.target.closest("[data-remove-custom-word]");
    if (removeWordBtn) {
      const idx = parseInt(removeWordBtn.getAttribute("data-remove-custom-word"), 10);
      state.customBlockedWords.splice(idx, 1);
      localStorage.setItem("pulso_custom_blocked", JSON.stringify(state.customBlockedWords));
      renderCustomBlockedWords();
      renderAll();
    }
  });

  // Reader modal bookmark button
  document.getElementById("readerBookmarkBtn")?.addEventListener("click", () => {
    if (!state.activeReaderArticle) return;
    toggleSaveArticle(state.activeReaderArticle.id);
    const isSaved = state.savedIds.has(state.activeReaderArticle.id);
    document.getElementById("readerBookmarkBtn").textContent = isSaved
      ? "🔖 Guardada en tu lista"
      : "🔖 Guardar para leer después";
  });

  // Custom block form
  document.getElementById("addCustomBlockForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("customBlockInput");
    const val = input.value.trim().toLowerCase();
    if (val && !state.customBlockedWords.includes(val)) {
      state.customBlockedWords.push(val);
      localStorage.setItem("pulso_custom_blocked", JSON.stringify(state.customBlockedWords));
      input.value = "";
      renderCustomBlockedWords();
      renderAll();
    }
  });

  // Custom RSS form
  document.getElementById("addCustomRssForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("rssNameInput").value.trim();
    const url = document.getElementById("rssUrlInput").value.trim();
    const region = document.getElementById("rssRegionInput").value;
    if (!name || !url) return;

    const newSrc = {
      id: `custom-${Date.now()}`,
      name,
      url,
      site: url,
      region,
      type: "Fuente Independiente Personalizada",
      independent: true,
      baseWeight: 78
    };

    state.customSources.push(newSrc);
    localStorage.setItem("pulso_custom_sources", JSON.stringify(state.customSources));
    state.sources.push(newSrc);
    populateSourceDropdown();

    document.getElementById("rssNameInput").value = "";
    document.getElementById("rssUrlInput").value = "";
    openSourcesModal();
    await refreshLiveFeeds(false);
  });
}

document.addEventListener("DOMContentLoaded", initApp);
