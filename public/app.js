// Pulso Independiente — Motor de Agregación, Clasificación de Relevancia y Escudo Anti-Farándula

const DEFAULT_BLOCKED_TERMS = [
  "farándula", "celebridades", "famosos",
  "reality", "gran hermano", "tierra brava", "ganar o servir", "mundos opuestos",
  "alfombra roja", "horóscopo", "zodiaco", "tarot",
  "chisme", "quiebre amoroso", "nueva pareja",
  "infidelidad", "kardashian",
  "showbiz", "gossip", "miss universo", "reina de viña",
  "red carpet", "polémica entre famosos",

  // Filtro estricto anti-fútbol (manteniendo intacto el resto de deportes y ciclismo)
  "fútbol", "futbol", "futbolero", "balompié", "balompie", "pelotero",
  "colo-colo", "colo colo", "albo", "cacique", "universidad de chile", "la u",
  "romántico viajero", "universidad católica", "cruzados", "cobreloa",
  "huachipato", "coquimbo unido", "palestino", "audax italiano", "unión española",
  "deportes iquique", "campeonato nacional", "primera división", "primera b",
  "anfp", "conmebol", "fifa", "uefa", "copa libertadores", "copa sudamericana",
  "champions league", "europa league", "copa américa", "copa chile",
  "la roja", "selección chilena", "clasificatorias", "gareca", "berizzo",
  "arturo vidal", "alexis sánchez", "alexis sanchez", "claudio bravo", "gary medel",
  "charles aránguiz", "rodrigo goldberg", "barticciotto", "jordhy thompson",
  "director técnico", "delantero", "guardameta", "arquero", "mediocampista",
  "penales", "tiro de esquina", "offside", "fuera de juego",
  "lamine yamal", "mbappé", "mbappe", "messi", "cristiano ronaldo", "cr7",
  "haaland", "vinicius", "real madrid", "barcelona fc", "manchester city",
  "liverpool", "boca juniors", "river plate"
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


const MAIN_FILTERS = [
  { id: "all", label: "Todo", icon: "⚡", matcher: () => true },
  { id: "chile", label: "Chile", icon: "🇨🇱", matcher: (a) => a.region === "chile" },
  { id: "latam", label: "Latinoamérica", icon: "🌎", matcher: (a) => a.region === "latam" },
  { id: "mundo", label: "Mundo", icon: "🌍", matcher: (a) => a.region === "mundo" },
  { id: "high", label: "Alto Impacto", icon: "🔥", matcher: (a) => a.relevanceTier === "alta" },
  { id: "low", label: "Bajo el Radar", icon: "📡", matcher: (a) => a.relevanceTier === "bajo_radar" },
  { id: "instagram", label: "En Instagram", icon: "📸", matcher: (a) => state.instagramPostIds && state.instagramPostIds.has(a.id) },
  { id: "saved", label: "Guardadas", icon: "🔖", matcher: (a) => state.savedIds.has(a.id) }
];

const TOPIC_FILTERS = [
  { id: "all", label: "Todas las temáticas", icon: "🎯", matcher: () => true },
  { id: "ciclismo", label: "Ciclismo y Deportes", icon: "🚴", matcher: (a) => /ciclismo|ciclis|bici|mtb|gravel|bmx|deporte|atletismo|tenis|marat|pelot[oó]n|tour de francia|giro de italia|vuelta a espa/i.test((a.category || "") + " " + (a.title || "") + " " + (a.summary || "")) },
  { id: "investigacion", label: "Investigación", icon: "🕵️", matcher: (a) => /investigaci/i.test(a.category || "") },
  { id: "politica", label: "Política", icon: "🏛️", matcher: (a) => /pol[ií]tic/i.test(a.category || "") },
  { id: "medioambiente", label: "Medioambiente", icon: "🌿", matcher: (a) => /medioambiente|ambiente|territorio/i.test(a.category || "") },
  { id: "ciencia", label: "Ciencia y Salud", icon: "🔬", matcher: (a) => /ciencia|salud|futuro/i.test(a.category || "") },
  { id: "economia", label: "Economía", icon: "📈", matcher: (a) => /econom[ií]a/i.test(a.category || "") },
  { id: "ddhh", label: "DD.HH. y Justicia", icon: "⚖️", matcher: (a) => /derechos|humanos|ciudadan/i.test(a.category || "") },
  { id: "geopolitica", label: "Geopolítica", icon: "🌐", matcher: (a) => /geopol[ií]tic|mundo/i.test(a.category || "") },
  { id: "cultura", label: "Cultura", icon: "🎨", matcher: (a) => /cultura/i.test(a.category || "") }
];

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
    malaespina: { icon: "🔍", abbr: "ME" },
    vergara240: { icon: "🎓", abbr: "V240" },
    terram: { icon: "🌱", abbr: "TM" },
    anfibia: { icon: "🇦🇷", abbr: "ANF" },
    elfaro: { icon: "🇸🇻", abbr: "ELF" },
    lasillavacia: { icon: "🇨🇴", abbr: "LSV" },
    ojopublico: { icon: "🇵🇪", abbr: "OP" },
    cuestionpublica: { icon: "🇨🇴", abbr: "CQP" },
    chequeado: { icon: "🇦🇷", abbr: "CHQ" },
    piedepagina: { icon: "🇲🇽", abbr: "PDP" },
    cenital: { icon: "🇦🇷", abbr: "CEN" },
    brecha: { icon: "🇺🇾", abbr: "BR" },
    jacobinlat: { icon: "🚩", abbr: "JB" },
    bellingcat: { icon: "🌐", abbr: "BC" },
    propublica: { icon: "📜", abbr: "PP" },
    theintercept: { icon: "👁️", abbr: "TI" },
    globalvoices: { icon: "🌍", abbr: "GV" },
    elsalto: { icon: "✊", abbr: "ES" },
    eldiarioes: { icon: "🗞️", abbr: "ED" },
    sinpermiso: { icon: "📑", abbr: "SP" },
    dw: { icon: "🇩🇪", abbr: "DW" },
    france24: { icon: "🇫🇷", abbr: "F24" },
    "ciclismo-chile": { icon: "🚴", abbr: "CC" },
    ciclo21: { icon: "🚴", abbr: "C21" },
    brujulabike: { icon: "🚵", abbr: "BB" },
    esciclismo: { icon: "🚲", abbr: "EC" }
  };
  return flags[sourceId] || { icon: region === "chile" ? "🇨🇱" : (region === "latam" ? "🌎" : "🌍"), abbr: "NEWS" };
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
  mainFilter: "all",
  topicFilter: "all",
  onlyIndependent: false,
  searchQuery: "",
  viewMode: "split",
  sortBy: localStorage.getItem("pulso_sort_by") || "date_desc",
  savedIds: new Set(JSON.parse(localStorage.getItem("pulso_saved_ids") || "[]")),
  customBlockedWords: JSON.parse(localStorage.getItem("pulso_custom_blocked") || "[]"),
  customSources: JSON.parse(localStorage.getItem("pulso_custom_sources") || "[]"),
  activeReaderArticle: null,
  instagramPostIds: new Set(),
  instagramHistory: [],
  targetArticleId: null
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


function isTranslationDuplicate(art) {
  const url = art.url || "";
  const summary = (art.summary || "").toLowerCase();
  const src = art.sourceId || "";
  if (src === "elciudadano" || art.region === "chile") {
    if (/\/(deustche|deutsch|de|en|fr|it|pt)\//i.test(url)) return true;
    if (/\b(originalbeitrag|original article|article original)\b/i.test(summary)) return true;
  }
  return false;
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

  const categoryRules = [
    { cat: "Investigación y Poder", patterns: [/\binvestigaci[oó]n\b/i, /\bcorrupci[oó]n\b/i, /\bcontralor[ií]a\b/i, /\bfiscal[ií]a\b/i, /\bexclusivo\b/i, /\bfiltraci[oó]n\b/i, /\bciper\b/i, /\bcohecho\b/i, /\bmalversaci[oó]n\b/i, /\blavado de activos\b/i, /\btr[aá]fico de influencias\b/i, /\bcaso convenios\b/i, /\bcaso audios\b/i, /\bhermosilla\b/i] },
    { cat: "Economía y Sociedad", patterns: [/\beconom[ií]a\b/i, /\becon[oó]mic/i, /\binflaci[oó]n\b/i, /\bipc\b/i, /\bpensiones\b/i, /\bjubilac/i, /\bafp\b/i, /\bfondo [a-e]\b/i, /\bhacienda\b/i, /\bbanco central\b/i, /\bsueldo/i, /\bsalario/i, /\blaboral/i, /\bdesempleo\b/i, /\bempleo\b/i, /\btributari/i, /\bimpuesto/i, /\bpresupuesto\b/i, /\bsindicat/i, /\bmercado/i, /\bvivienda\b/i, /\bsuperintendencia de pensiones\b/i] },
    { cat: "Medioambiente y Territorio", patterns: [/\bmedioambiente\b/i, /\bmedio ambiente\b/i, /\bclim[aá]tic/i, /\bhumedal/i, /\bglaciar/i, /\bsequ[ií]a\b/i, /\bagua\b/i, /\bbosque/i, /\bcontaminaci[oó]n\b/i, /\bbiodiversidad\b/i, /\blitio\b/i, /\bminer[ií]a\b/i, /\bfauna\b/i, /\bflora\b/i, /\bincendio.*forestal/i, /\bsalar/i] },
    { cat: "Ciencia, Salud y Futuro", patterns: [/\bcient[ií]fic/i, /\bciencia\b/i, /\btecnolog[ií]a/i, /\binteligencia artificial\b/i, /\b(?:ia|i\.a\.)\b/i, /\bastronom[ií]a\b/i, /\btelescopio/i, /\bnasa\b/i, /\bconicyt\b/i, /\banid\b/i, /\bmedicina\b/i, /\bm[eé]dic/i, /\bvacuna/i, /\benfermedad/i, /\bgenoma\b/i, /\bc[eé]lula/i, /\bepidemiolog[ií]a\b/i, /\bhospital/i, /\bf[aá]rmaco/i, /\bc[aá]ncer\b/i] },
    { cat: "Derechos Humanos y Ciudadanía", patterns: [/\bderechos humanos\b/i, /\bddhh\b/i, /dictadura\b/i, /\bmemoria\b/i, /\bdesaparecid/i, /\bjusticia\b/i, /\bmapuche\b/i, /\bind[ií]gena/i, /\bconadi\b/i, /\bwallmapu\b/i, /\bmigraci[oó]n\b/i, /\bmigrante/i, /\bdefensor de la ni[nñ]ez\b/i, /\bdelitos sexuales\b/i] },
    { cat: "Geopolítica y Mundo", patterns: [/\bguerra\b/i, /\bgeopol[ií]tica\b/i, /\bonu\b/i, /\botan\b/i, /\belecciones\b/i, /\binternacional\b/i, /\blatinoam[eé]rica\b/i, /\beuropa\b/i, /\bmedio oriente\b/i, /\bee\.uu\.\b/i, /\bestados unidos\b/i, /\bchina\b/i, /\brusia\b/i, /\bucrania\b/i, /\bisrael\b/i, /\bpalestina\b/i, /\bgaza\b/i, /\bnetanyahu\b/i, /\bmilei\b/i] },
    { cat: "Cultura y Sociedad", patterns: [/\bcine\b/i, /\bpel[ií]cula/i, /\bdocumental/i, /\bliteratura\b/i, /\bnovela/i, /\bpoes[ií]a\b/i, /\bescritor/i, /\bteatro\b/i, /\bconcierto/i, /\bm[uú]sica\b/i, /\bfestival\b/i, /\bmuseo/i, /\barte\b/i, /\bpatrimonio\b/i] }
  ];

  let bestCat = "Política y Actualidad";
  let maxMatches = 0;
  for (const { cat, patterns } of categoryRules) {
    let count = 0;
    for (const p of patterns) {
      if (p.test(text)) count++;
    }
    if (count > maxMatches) {
      maxMatches = count;
      bestCat = cat;
    }
  }
  let category = bestCat;

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

  // Detectar deep link desde Instagram o enlace directo (?id=...)
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id") || (window.location.hash ? window.location.hash.replace("#", "") : null);
  if (targetId) {
    state.targetArticleId = targetId;
  }
  if (urlParams.get("filter") === "instagram" || urlParams.get("from") === "instagram_bio") {
    state.mainFilter = "instagram";
  }

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
      if (isTranslationDuplicate(art)) continue;
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

    // Cargar historial de publicaciones en Instagram para badges y filtro
    try {
      const igRes = await fetch(`/data/instagram_history.json?_cb=${Date.now()}`, { cache: "no-store" });
      if (igRes.ok) {
        state.instagramHistory = await igRes.json();
        state.instagramPostIds = new Set(state.instagramHistory.map(h => h.articleId));
      }
    } catch (_) {}

    populateSourceDropdown();

    const syncText = document.getElementById("syncStatusText");
    if (syncText) {
      syncText.textContent = `Red activa · ${state.sources.length} medios conectados`;
    }

    // Chequeo y sincronización en segundo plano al ingresar (Stale-While-Revalidate)
    triggerBackgroundCheck(data.generatedAt);
  } catch (err) {
    console.error("Error cargando snapshot inicial:", err);
  }
}

// Chequeo y sincronización inteligente en segundo plano (Stale-While-Revalidate)
async function triggerBackgroundCheck(snapshotGeneratedAt) {
  try {
    let isStale = false;
    if (snapshotGeneratedAt) {
      const genTime = new Date(snapshotGeneratedAt).getTime();
      const elapsedMin = (Date.now() - genTime) / (1000 * 60);
      if (elapsedMin >= 8) {
        isStale = true;
      }
    } else {
      isStale = true;
    }

    if (!isStale) return;

    // Evitar peticiones redundantes si el usuario recarga rápidamente la pestaña
    const lastTrigger = parseInt(localStorage.getItem("pulso_last_bg_trigger") || "0", 10);
    if (Date.now() - lastTrigger < 8 * 60 * 1000) {
      return;
    }

    localStorage.setItem("pulso_last_bg_trigger", Date.now().toString());

    // Llamada silenciosa a la Google Cloud Function
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) return;
    const data = await res.json();
    console.log("[Pulso Cloud Sync]", data);

    if (data.status === "triggered" || data.status === "in_progress") {
      pollForFreshSnapshot(snapshotGeneratedAt);
    }
  } catch (err) {
    console.debug("[Pulso Cloud Sync] Error en background check:", err.message);
  }
}

function pollForFreshSnapshot(oldGeneratedAt) {
  let attempts = 0;
  const maxAttempts = 8;
  const pollTimer = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(pollTimer);
      return;
    }

    try {
      const res = await fetch(`/data/initial-feeds.json?_poll=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) return;
      const freshData = await res.json();

      if (freshData.generatedAt && freshData.generatedAt !== oldGeneratedAt) {
        clearInterval(pollTimer);
        showNewArticlesBanner(freshData);
      }
    } catch (_) {}
  }, 15000);
}

function showNewArticlesBanner(freshData) {
  let banner = document.getElementById("newArticlesBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "newArticlesBanner";
    banner.className = "new-articles-banner";
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <button type="button" class="btn-new-articles" id="btnApplyNewArticles">
      ✨ Hay noticias recién salidas · Ver novedades
    </button>
  `;
  banner.classList.add("show");

  document.getElementById("btnApplyNewArticles")?.addEventListener("click", () => {
    banner.classList.remove("show");
    applyFreshSnapshot(freshData);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("¡Feed actualizado con las últimas noticias! ⚡");
  });
}

function applyFreshSnapshot(data) {
  state.sources = [...(data.sources || []), ...state.customSources];
  state.blockedExamples = data.blockedExamples || [];
  state.totalBlockedCount = data.totalBlockedFarandula || 0;

  const validArticles = [];
  for (const art of data.articles || []) {
    if (isTranslationDuplicate(art)) continue;
    const check = checkFarandula(art.title, art.summary);
    if (!check.blocked) {
      validArticles.push(art);
    }
  }

  state.articles = validArticles;
  renderAll();
}

function populateSourceDropdown() {
  const select = document.getElementById("sourceSelect");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="all">Todos los medios (${state.sources.length})</option>`;

  const chileGroup = document.createElement("optgroup");
  chileGroup.label = "🇨🇱 Chile (Independientes y Regionales)";
  const latamGroup = document.createElement("optgroup");
  latamGroup.label = "🌎 Latinoamérica (Independientes e Investigación)";
  const mundoGroup = document.createElement("optgroup");
  mundoGroup.label = "🌍 Mundo (Global e Investigación)";

  state.sources.forEach((src) => {
    const opt = document.createElement("option");
    opt.value = src.id;
    opt.textContent = `${src.name} — ${src.type}`;
    if (src.region === "chile") {
      chileGroup.appendChild(opt);
    } else if (src.region === "latam") {
      latamGroup.appendChild(opt);
    } else {
      mundoGroup.appendChild(opt);
    }
  });

  select.appendChild(chileGroup);
  select.appendChild(latamGroup);
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

// Filtering Logic (Filtro Principal de Ámbito + Subfiltro de Temáticas)
function getFilteredArticles() {
  const currentMain = MAIN_FILTERS.find((p) => p.id === state.mainFilter) || MAIN_FILTERS[0];
  const currentTopic = TOPIC_FILTERS.find((p) => p.id === state.topicFilter) || TOPIC_FILTERS[0];

  return state.articles.filter((art) => {
    // Re-check custom blocked words dynamically
    if (checkFarandula(art.title, art.summary).blocked) return false;

    // Descartar traducciones y duplicados multilingües
    if (isTranslationDuplicate(art)) return false;

    // Filtro Principal (Todo, Chile, Mundo, Alto Impacto, Bajo el Radar, Guardadas)
    if (!currentMain.matcher(art)) return false;

    // Subfiltro Temático (Todas, Investigación, Política, Medioambiente, Ciencia, etc.)
    if (!currentTopic.matcher(art)) return false;

    // Búsqueda por texto libre
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const hay = `${art.title} ${art.summary} ${art.sourceName} ${art.category} ${art.sourceType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

function renderFilterBars() {
  const mainContainer = document.getElementById("mainFiltersBar");
  const topicContainer = document.getElementById("topicFiltersBar");

  const unblockedArticles = state.articles.filter(
    (art) => !checkFarandula(art.title, art.summary).blocked
  );

  // 1. Barra Principal (Ámbito e Impacto)
  if (mainContainer) {
    mainContainer.innerHTML = MAIN_FILTERS.map((f) => {
      const isActive = state.mainFilter === f.id;
      const count = unblockedArticles.filter((art) => f.matcher(art)).length;
      return `
        <button 
          type="button" 
          class="filter-main-btn ${isActive ? "active" : ""}" 
          data-main-filter="${escapeHtml(f.id)}"
          role="tab"
          aria-selected="${isActive ? "true" : "false"}"
        >
          <span class="filter-icon">${f.icon}</span>
          <span class="filter-label">${escapeHtml(f.label)}</span>
          <span class="filter-count">${count}</span>
        </button>
      `;
    }).join("");
  }

  // 2. Subfiltro de Temáticas (Calculado contextualmente sobre el filtro principal activo)
  if (topicContainer) {
    const currentMain = MAIN_FILTERS.find((p) => p.id === state.mainFilter) || MAIN_FILTERS[0];
    const contextualArticles = unblockedArticles.filter((art) => currentMain.matcher(art));

    topicContainer.innerHTML = TOPIC_FILTERS.map((t) => {
      const isActive = state.topicFilter === t.id;
      const count = contextualArticles.filter((art) => t.matcher(art)).length;
      return `
        <button 
          type="button" 
          class="filter-topic-btn ${isActive ? "active" : ""}" 
          data-topic-filter="${escapeHtml(t.id)}"
          role="tab"
          aria-selected="${isActive ? "true" : "false"}"
        >
          <span class="filter-icon">${t.icon}</span>
          <span class="filter-label">${escapeHtml(t.label)}</span>
          <span class="filter-count">${count}</span>
        </button>
      `;
    }).join("");
  }
}

// Rendering (Minimalist Unified Feed)
function renderAll() {
  updateMetricsAndCounters();
  renderFilterBars();
  const filtered = getFilteredArticles();
  const sorted = sortArticles(filtered, state.sortBy);

  const gridContainer = document.getElementById("gridViewContainer");
  if (gridContainer) {
    renderCardsInto(gridContainer, sorted);
  }

  // Si hay una noticia objetivo desde Instagram / Deep Link
  if (state.targetArticleId) {
    handleTargetArticleDeepLink(state.targetArticleId);
  }
}

function handleTargetArticleDeepLink(targetId) {
  setTimeout(() => {
    const el = document.getElementById(`article-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-target-card");

      const container = document.getElementById("gridViewContainer");
      if (container && !document.getElementById("instagramDeepLinkBanner")) {
        const art = state.articles.find((a) => a.id === targetId);
        const banner = document.createElement("div");
        banner.id = "instagramDeepLinkBanner";
        banner.className = "instagram-deep-link-banner";
        banner.innerHTML = `
          <div>
            <p><strong>📸 Noticia destacada desde Instagram:</strong> ${art ? escapeHtml(art.title) : "Reportaje seleccionado"}</p>
          </div>
          <button id="dismissIgBannerBtn" title="Cerrar">Ver todas las noticias ✕</button>
        `;
        container.insertBefore(banner, container.firstChild);
        document.getElementById("dismissIgBannerBtn")?.addEventListener("click", () => {
          banner.remove();
          el.classList.remove("highlight-target-card");
          state.targetArticleId = null;
        });
      }
    } else {
      // Si la noticia no está en la vista actual (por filtros), resetear a 'all'
      if (state.mainFilter !== "all" || state.topicFilter !== "all") {
        state.mainFilter = "all";
        state.topicFilter = "all";
        renderAll();
      }
    }
  }, 150);
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
        <article id="article-${escapeHtml(art.id)}" class="feed-card ${hasRealImage ? "" : "feed-card-editorial"} ${state.targetArticleId === art.id ? "highlight-target-card" : ""}" data-article-id="${escapeHtml(art.id)}">
          <!-- Card Header: Distribución espaciosa por filas -->
          <div class="card-header">
            <!-- Fila 1: Medio, País y Acción Guardar -->
            <div class="card-header-top">
              <div class="card-author">
                <span class="card-avatar">${badgeInfo.icon}</span>
                <div class="card-source-group">
                  <span class="card-source-name">${escapeHtml(art.sourceName)}</span>
                  ${art.country && art.country !== "Chile" ? `<span class="card-country-badge">${escapeHtml(art.country)}</span>` : ""}
                </div>
              </div>
              <button class="card-btn-icon ${isSaved ? "saved" : ""}" data-toggle-save="${escapeHtml(art.id)}" title="${isSaved ? "Guardada" : "Guardar"}" aria-label="Guardar">
                ${isSaved ? "🔖" : "🤍"}
              </button>
            </div>

            <!-- Fila 2: Tiempo relativo y Temática / Instagram -->
            <div class="card-header-bottom">
              <span class="card-time">${formatRelativeTime(art.publishedAt)}</span>
              <div class="card-header-tags">
                <span class="card-category-pill" data-filter-topic-name="${escapeHtml(art.category)}" title="Filtrar por temática: ${escapeHtml(art.category)}">
                  ${escapeHtml(art.category)}
                </span>
                ${
                  state.instagramPostIds && state.instagramPostIds.has(art.id)
                    ? `<span class="card-instagram-badge" title="Publicado en Instagram @pulso.independiente.26">📸 En Instagram</span>`
                    : ""
                }
              </div>
            </div>
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

  const badgeInfo = getSourceBadge(art.sourceId, art.region);
  const regionFlag = art.region === "chile" ? "🇨🇱" : (art.region === "latam" ? "🌎" : "🌍");
  const countryName = art.country || (art.region === "chile" ? "Chile" : "Mundo");

  document.getElementById("readerMetaTop").innerHTML = `
    <div class="reader-header-top">
      <div class="reader-source-brand">
        <span class="reader-source-icon">${badgeInfo.icon}</span>
        <span class="reader-source-name">${escapeHtml(art.sourceName)}</span>
        <span class="reader-country-pill">${regionFlag} ${escapeHtml(countryName)}</span>
      </div>
    </div>
    <div class="reader-header-sub">
      <span class="reader-time">${formatRelativeTime(art.publishedAt)}</span>
      <span class="reader-dot">·</span>
      <span class="reader-source-type">${escapeHtml(art.sourceType || "Prensa Independiente")}</span>
    </div>
  `;

  // Limpiar prefijos de fuente entre corchetes si vienen en el titular (ej: "[Diario Financiero] ...")
  let displayTitle = art.title || "";
  if (/^\[[^\]]+\]\s*/.test(displayTitle)) {
    displayTitle = displayTitle.replace(/^\[[^\]]+\]\s*/, "");
  }
  document.getElementById("readerModalTitle").textContent = displayTitle;

  document.getElementById("readerBadges").innerHTML = `
    <span class="reader-pill ${art.relevanceTier === "alta" ? "pill-high" : "pill-low"}">
      ${art.relevanceTier === "alta" ? `🔥 Relevante (${art.relevanceScore}/100)` : `📡 Bajo el Radar (${art.relevanceScore}/100)`}
    </span>
    <span class="reader-category-pill">${escapeHtml(art.category)}</span>
    ${
      state.instagramPostIds && state.instagramPostIds.has(art.id)
        ? `<span class="reader-instagram-pill">📸 En Instagram</span>`
        : ""
    }
  `;

  const imgWrap = document.getElementById("readerImageWrap");
  const imgEl = document.getElementById("readerImage");
  if (art.image && !isGenericImageUrl(art.image)) {
    imgEl.src = art.image;
    imgWrap.classList.remove("hidden");
  } else {
    imgWrap.classList.add("hidden");
  }

  // 1. Bajada / Lead de la noticia
  const leadEl = document.getElementById("readerLead");
  if (leadEl) {
    leadEl.textContent = art.summary || "";
    leadEl.style.display = art.summary ? "block" : "none";
  }

  // 2. Contenido completo
  const contentEl = document.getElementById("readerFullContent");
  const statsEl = document.getElementById("readerStatsBar");
  const loadingEl = document.getElementById("readerLoadingWrap");

  if (contentEl) contentEl.innerHTML = "";
  if (statsEl) statsEl.innerHTML = "";

  const hasFullContent = art.content && art.content.length > 280 && art.content.includes("<p");

  if (hasFullContent) {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (contentEl) contentEl.innerHTML = art.content;
    const plainText = art.content.replace(/<[^>]+>/g, " ").trim();
    const words = plainText.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.round(words / 200));
    if (statsEl) {
      statsEl.innerHTML = `<span>📖 Cobertura Completa</span><span>·</span><span>${words.toLocaleString()} palabras</span><span>·</span><span>~${readTime} min de lectura</span>`;
    }
  } else {
    if (loadingEl) loadingEl.classList.remove("hidden");
    fetchAndRenderFullArticle(art);
  }

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

async function fetchArticleHtmlViaProxy(articleUrl) {
  const timestamp = Date.now();
  const sep = articleUrl.includes("?") ? "&" : "?";
  const targetWithBust = `${articleUrl}${sep}_nocache=${timestamp}`;

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetWithBust)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetWithBust)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetWithBust)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4800);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        cache: "no-store"
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 500 && (text.includes("<p") || text.includes("<article"))) {
          return text;
        }
      }
    } catch (_) {}
  }
  return null;
}

async function fetchAndRenderFullArticle(art) {
  const loadingEl = document.getElementById("readerLoadingWrap");
  const contentEl = document.getElementById("readerFullContent");
  const statsEl = document.getElementById("readerStatsBar");

  try {
    const rawHtml = await fetchArticleHtmlViaProxy(art.url);
    if (!rawHtml) throw new Error("No se pudo obtener el texto remoto");

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    // Eliminar elementos no periodísticos
    const toRemove = doc.querySelectorAll(
      "script, style, noscript, header, footer, nav, aside, form, iframe, figure, " +
      ".advertisement, .ads, .publicidad, .share, .social-share, .compartir, .newsletter, " +
      ".subscription, .comments, .related-posts, .relacionadas, .tags, .autor-bio, svg"
    );
    toRemove.forEach((el) => el.remove());

    const mainContainer =
      doc.querySelector("article") ||
      doc.querySelector(".entry-content") ||
      doc.querySelector(".post-content") ||
      doc.querySelector(".article-body") ||
      doc.querySelector(".c-detail__body") ||
      doc.querySelector(".cuerpo") ||
      doc.querySelector(".nota-content") ||
      doc.querySelector(".single-post-content") ||
      doc.querySelector(".main-content") ||
      doc.querySelector("#main-content") ||
      doc.body;

    const rawPs = Array.from(mainContainer.querySelectorAll("p"));
    const validParagraphs = [];
    const boilerplate = [
      "newsletter", "suscríbete", "suscribete", "todos los derechos reservados",
      "copyright", "política de privacidad", "términos y condiciones", "whatsapp",
      "telegram", "síguenos en", "leído en", "foto de portada", "crédito:"
    ];

    for (const p of rawPs) {
      const text = p.textContent.trim();
      if (text.length >= 40 && !boilerplate.some((b) => text.toLowerCase().includes(b))) {
        if (!text.includes("function(") && !text.includes("var ") && !text.includes("{") && !text.includes("};")) {
          validParagraphs.push(text);
        }
      }
    }

    if (validParagraphs.length >= 2) {
      if (validParagraphs[0].toLowerCase() === art.title.toLowerCase()) {
        validParagraphs.shift();
      }
      const formattedHtml = validParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      art.content = formattedHtml;

      if (state.activeReaderArticle && state.activeReaderArticle.id === art.id) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.innerHTML = formattedHtml;
        const words = validParagraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0);
        const readTime = Math.max(1, Math.round(words / 200));
        if (statsEl) {
          statsEl.innerHTML = `<span>📖 Cobertura Completa</span><span>·</span><span>${words.toLocaleString()} palabras</span><span>·</span><span>~${readTime} min de lectura</span>`;
        }
      }
      return;
    }
    throw new Error("Párrafos insuficientes");
  } catch (_) {
    if (state.activeReaderArticle && state.activeReaderArticle.id === art.id) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl && !contentEl.innerHTML.trim()) {
        contentEl.innerHTML = `
          <div class="reader-fallback-note">
            <p><strong>Lectura directa en fuente:</strong> El medio original protege o requiere visualización en su portal para este reportaje.</p>
            <p>Puedes leer la crónica completa con todas sus fotografías y fuentes haciendo clic en <strong>"Abrir en fuente original ↗"</strong>.</p>
          </div>
        `;
      }
    }
  }
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



  // Delegated clicks for cards and modals
  document.addEventListener("click", (e) => {
    // Filtro Principal click (Todo, Chile, Mundo, Alto Impacto, Bajo el Radar, Guardadas)
    const mainBtnTrigger = e.target.closest("[data-main-filter]");
    if (mainBtnTrigger) {
      const mainId = mainBtnTrigger.getAttribute("data-main-filter");
      state.mainFilter = mainId;
      renderAll();
      return;
    }

    // Subfiltro Temático click (Todas, Investigación, Política, Medioambiente, Ciencia, etc.)
    const topicBtnTrigger = e.target.closest("[data-topic-filter]");
    if (topicBtnTrigger) {
      const topicId = topicBtnTrigger.getAttribute("data-topic-filter");
      state.topicFilter = topicId;
      renderAll();
      return;
    }

    // Click directo en chip de categoría en tarjeta
    const catPillTrigger = e.target.closest("[data-filter-topic-name]");
    if (catPillTrigger) {
      const catName = catPillTrigger.getAttribute("data-filter-topic-name");
      const matched = TOPIC_FILTERS.slice(1).find((t) => t.matcher({ category: catName }));
      if (matched) {
        state.topicFilter = state.topicFilter === matched.id ? "all" : matched.id;
        renderAll();
        showToast(state.topicFilter === "all" ? "Todas las temáticas" : `Temática: ${matched.label}`);
      }
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

  initFeedbackModal();
}

function initFeedbackModal() {
  const btn = document.getElementById("floatingFeedbackBtn");
  const modal = document.getElementById("feedbackModal");
  const form = document.getElementById("feedbackForm");
  const successState = document.getElementById("feedbackSuccessState");
  const categoryInput = document.getElementById("feedbackCategoryInput");
  const textarea = document.getElementById("feedbackTextInput");
  const contactInput = document.getElementById("feedbackContactInput");
  const chips = document.querySelectorAll("#feedbackTypeChips .feedback-chip");

  if (!btn || !modal) return;

  const placeholders = {
    idea: "¿Qué función o mejora te gustaría que agreguemos a Pulso?",
    medio: "¿Qué medio independiente de Chile o Latinoamérica deberíamos sumar a Pulso?",
    bug: "¿Qué problema o error detectaste en la página? (Indica dispositivo o navegador si es posible)",
    opinion: "¿Qué te parece Pulso Independiente? Tu opinión nos ayuda muchísimo a seguir mejorando."
  };

  btn.addEventListener("click", () => {
    if (form) form.classList.remove("hidden");
    if (successState) successState.classList.add("hidden");
    modal.classList.remove("hidden");
    if (textarea) setTimeout(() => textarea.focus(), 100);
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const type = chip.getAttribute("data-type") || "idea";
      if (categoryInput) categoryInput.value = type;
      if (textarea) textarea.placeholder = placeholders[type] || placeholders.idea;
    });
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const comment = (textarea?.value || "").trim();
      if (!comment) return;

      const contact = (contactInput?.value || "").trim();
      const category = categoryInput?.value || "idea";
      const timestamp = new Date().toISOString();

      // 1. Guardar localmente en el navegador
      const feedbackList = JSON.parse(localStorage.getItem("pulso_user_feedback") || "[]");
      feedbackList.push({
        category,
        comment,
        contact: contact || "Anónimo",
        date: timestamp
      });
      localStorage.setItem("pulso_user_feedback", JSON.stringify(feedbackList));

      // 2. Enviar a Formsubmit vía AJAX en segundo plano
      const submitBtn = document.getElementById("feedbackSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
      }

      try {
        await fetch("https://formsubmit.co/ajax/felipetoro.c@gmail.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            _subject: `💡 Sugerencia Pulso: ${category.toUpperCase()} (${contact || "Anónimo"})`,
            tipo: category,
            comentario: comment,
            contacto: contact || "No indicado",
            fecha: new Date().toLocaleString("es-CL"),
            origen: window.location.href
          })
        });
      } catch (_) {}

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Enviar sugerencia</span> <span>🚀</span>`;
      }

      form.reset();
      form.classList.add("hidden");
      if (successState) successState.classList.remove("hidden");
      showToast("🎉 ¡Gracias por tu sugerencia para mejorar Pulso!");
    });
  }
}

document.addEventListener("DOMContentLoaded", initApp);
