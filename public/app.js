// Pulso Independiente — Motor de Agregación, Clasificación de Relevancia y Escudo Anti-Farándula

const CANONICAL_SITE_URL = "https://pulso-independiente.web.app";

function getPulsoArticleUrl(articleId) {
  return `${CANONICAL_SITE_URL}/?id=${encodeURIComponent(articleId)}`;
}

// --- Filtro 2.0 -------------------------------------------------------------
// Nivel 1: espectáculo/farándula y fútbol inequívoco -> bloqueo directo.
const DEFAULT_BLOCKED_TERMS = [
  "farándula", "celebridades", "famosos",
  "reality", "gran hermano", "tierra brava", "ganar o servir", "mundos opuestos",
  "alfombra roja", "horóscopo", "zodiaco", "tarot",
  "chisme", "quiebre amoroso", "nueva pareja",
  "infidelidad", "kardashian",
  "showbiz", "gossip", "miss universo", "reina de viña",
  "red carpet", "polémica entre famosos",

  // Fútbol inequívoco
  "fútbol", "futbol", "futbolero", "balompié", "balompie", "pelotero",
  "anfp", "conmebol", "fifa", "uefa",
  "champions league", "europa league",
  "copa libertadores", "copa sudamericana", "copa américa", "copa chile",
  "clasificatorias"
];

// Nivel 2: clubes, instituciones, jugadores y competiciones genéricas. Su nombre
// también existe fuera del fútbol, así que solo bloquean con contexto explícito.
const AMBIGUOUS_FOOTBALL_TERMS = [
  "colo-colo", "colo colo", "albo", "cacique", "universidad de chile", "la u",
  "romántico viajero", "universidad católica", "cruzados", "cobreloa",
  "huachipato", "coquimbo unido", "audax italiano", "unión española",
  "deportes iquique", "campeonato nacional", "primera división", "primera b",
  "la roja", "selección chilena",
  "gareca", "berizzo", "arturo vidal", "alexis sánchez", "alexis sanchez",
  "claudio bravo", "gary medel", "charles aránguiz", "rodrigo goldberg",
  "barticciotto", "jordhy thompson", "gago", "aránguiz",
  "director técnico", "delantero", "guardameta", "arquero", "mediocampista",
  "penales", "tiro de esquina", "offside", "fuera de juego",
  "lamine yamal", "mbappé", "mbappe", "messi", "cristiano ronaldo", "cr7",
  "haaland", "vinicius", "real madrid", "barcelona fc", "manchester city",
  "liverpool", "boca juniors", "river plate"
];

// Contexto que convierte un nombre ambiguo en fútbol. No incluye "partido":
// en política es demasiado frecuente y generaría falsos positivos.
const FOOTBALL_CONTEXT_PATTERNS = [
  /\bgol(?:es|eada|eó|ea|eador)?\b/i,
  /\btorneo\b/i, /\bliga\b/i, /\bcopa\b/i, /\bestadio\b/i,
  /\bhinchada\b/i, /\bcancha\b/i, /\bplantel\b/i, /\bjugador(?:es)?\b/i,
  /\bentrenador\b/i, /\bcuerpo técnico\b/i, /\bfichajes?\b/i, /\brefuerzos?\b/i,
  /\bempate\b/i, /\bmarcador\b/i, /\bsemifinal\b/i, /\bcuartos de final\b/i,
  /\bprórroga\b/i, /\btabla de posiciones\b/i, /\bcampeonato\b/i,
  /\bprimera división\b/i
];

// Temas protegidos: una nota de ciclismo, ciencia o cultura nunca se descarta
// solo porque mencione a la Universidad de Chile o a los Cruzados.
const PROTECTED_CONTEXT_PATTERNS = [
  /ciclismo|ciclista|bicicleta|\bbici\b|\bmtb\b|gravel|tour de fran|giro d|vuelta a españa/i,
  /astronom|galaxia|telescopio|fósil|biodiversidad/i,
  /museo|exposición|concierto|patrimonio|literatura/i
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
  { id: "mundo", label: "Mundo", icon: "🌍", matcher: (a) => a.region === "mundo" },
  { id: "high", label: "Alto Impacto", icon: "🔥", matcher: (a) => a.relevanceTier === "alta" },
  { id: "low", label: "Bajo el Radar", icon: "📡", matcher: (a) => a.relevanceTier === "bajo_radar" },
  { id: "instagram", label: "En Instagram", icon: "📸", matcher: (a) => state.instagramPostIds && state.instagramPostIds.has(a.id) },
  { id: "saved", label: "Guardadas", icon: "🔖", matcher: (a) => state.savedIds.has(a.id) }
];

// --- Filtros temáticos (coincidencia por palabra completa, no por subcadena) ----
// "bici" dentro de "prohibición" o "deporte" dentro de "Cooperativa Deportes"
// metían notas de farmacias y de fútbol en el filtro de deportes.
const CYCLING_RE = /\b(?:ciclismo|ciclistas?|bicicletas?|bicis?|mtb|gravel|bmx|ciclocr[oó]s|vel[oó]dromo|maillot|contrarreloj|uci|pogacar|vingegaard|evenepoel|roglic|tour de francia|giro de italia|vuelta a espa[ñn]a|vuelta a chile)\b/i;
const SPORTS_RE = /\b(?:deportes?|atletismo|tenis|marat[oó]n|triatl[oó]n|nataci[oó]n|b[aá]squetbol|baloncesto|rugby|voleibol|gimnasia|boxeo|judo|taekwondo|esgrima|canotaje|ol[ií]mpicos?|panamericanos?|paral[ií]mpicos?|ironman|f[uú]tbol|arquero|delantero)\b/i;
const BOILERPLATE_RE = [
  /s[úu]mate[^.]*\./gi,
  /canal de whatsapp[^.]*\./gi,
  /nota publicada por[^.]*\./gi,
  /haz clic para leer[^.]*\./gi,
  /s[íi]guenos en[^.]*\./gi
];

// Texto del artículo sin la retórica de relleno que arrastran algunos medios.
function topicBlob(article) {
  let text = `${article.category || ""} ${article.title || ""} ${article.summary || ""}`;
  for (const re of BOILERPLATE_RE) text = text.replace(re, " ");
  return text;
}

const TOPIC_FILTERS = [
  { id: "all", label: "Todas las temáticas", icon: "🎯", matcher: () => true },  {
    id: "ciclismo",
    label: "Ciclismo y Deportes",
    icon: "🚴",
    matcher: (a) => {
      if (a.category === "Ciclismo y Deporte") return true;
      const text = topicBlob(a);
      return CYCLING_RE.test(text) || SPORTS_RE.test(text);
    }
  },
  { id: "investigacion", label: "Investigación", icon: "🕵️", matcher: (a) => a.category === "Investigación y Poder" },
  { id: "politica", label: "Política", icon: "🏛️", matcher: (a) => a.category === "Política y Actualidad" },
  { id: "medioambiente", label: "Medioambiente", icon: "🌿", matcher: (a) => a.category === "Medioambiente y Territorio" },
  { id: "ciencia", label: "Ciencia y Salud", icon: "🔬", matcher: (a) => a.category === "Ciencia, Salud y Futuro" },
  { id: "economia", label: "Economía", icon: "📈", matcher: (a) => a.category === "Economía y Sociedad" },
  { id: "ddhh", label: "DD.HH. y Justicia", icon: "⚖️", matcher: (a) => a.category === "Derechos Humanos y Ciudadanía" },
  { id: "geopolitica", label: "Geopolítica", icon: "🌐", matcher: (a) => a.category === "Geopolítica y Mundo" },
  { id: "cultura", label: "Cultura", icon: "🎨", matcher: (a) => a.category === "Cultura y Sociedad" }
];

// Temática asociada a la categoría de una tarjeta (para el filtro por clic).
function getTopicIdForCategory(category) {
  if (!category) return null;
  const matched = TOPIC_FILTERS.slice(1).find((topic) => topic.matcher({ category }));
  return matched ? matched.id : null;
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
  sourceStats: [],
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
  legacyIds: null,
  targetArticleId: null,
  lastGeneratedAt: null,
  knownArticleUrls: new Set(),
  archiveIndex: undefined,
  deepLinkHandledId: null,
  // Lupa Parlamentaria (Centro Interactivo de Investigación Ciudadana)
  appMode: "news",
  lupaData: null,
  lupaLens: "fuel_desc",
  lupaChamber: "all",
  lupaRegion: "all",
  lupaDistrict: "all",
  lupaParty: "all",
  lupaQuery: "",
  lupaCompareIds: [],
  activeDossierId: null
};

function balanceSourceDiversity(list, maxConsecutive = 1) {
  if (!list || list.length <= maxConsecutive) return list;
  const result = [];
  const pool = [...list];
  let consecutiveCount = 0;
  let lastSource = null;

  while (pool.length > 0) {
    let nextIdx = -1;
    if (consecutiveCount >= maxConsecutive && lastSource) {
      nextIdx = pool.findIndex(a => a.sourceId !== lastSource);
    }
    if (nextIdx === -1) {
      nextIdx = 0;
    }

    const item = pool.splice(nextIdx, 1)[0];
    if (item.sourceId === lastSource) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastSource = item.sourceId;
    }
    result.push(item);
  }
  return result;
}

function sortArticles(list, criterion) {
  const sorted = [...list];
  let res;
  switch (criterion) {
    case "date_desc":
      res = sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      break;
    case "date_asc":
      res = sorted.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
      break;
    case "relevance_desc":
      res = sorted.sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      break;
    case "relevance_asc":
      return sorted.sort(
        (a, b) =>
          a.relevanceScore - b.relevanceScore ||
          new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    default:
      res = sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return balanceSourceDiversity(res, 1);
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

function matchesBlockedTerm(text, term) {
  if (!term) return false;
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function checkFarandula(title, summary, category) {
  const text = `${title || ""} ${summary || ""} ${category || ""}`.toLowerCase();

  // Nivel 1: farándula, espectáculo y fútbol inequívoco.
  const strictTerms = [...DEFAULT_BLOCKED_TERMS, ...state.customBlockedWords];
  for (const term of strictTerms) {
    if (matchesBlockedTerm(text, term)) {
      return { blocked: true, reason: term };
    }
  }

  // Nivel 2: clubes e instituciones solo cuentan si hay contexto futbolístico
  // y la nota no pertenece a un tema protegido (ciclismo, ciencia, cultura).
  if (PROTECTED_CONTEXT_PATTERNS.some((re) => re.test(text))) {
    return { blocked: false, reason: null };
  }

  const hits = AMBIGUOUS_FOOTBALL_TERMS.filter((term) => matchesBlockedTerm(text, term));
  // Dos o más nombres de clubes/jugadores en la misma nota ya es señal de fútbol.
  if (hits.length >= 2) {
    return { blocked: true, reason: hits[0] };
  }
  if (hits.length && FOOTBALL_CONTEXT_PATTERNS.some((re) => re.test(text))) {
    return { blocked: true, reason: hits[0] };
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

  // Detectar deep link desde Instagram o enlace directo (?id=... o ?mode=lupa o ?politico=...)
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id") || (window.location.hash ? window.location.hash.replace("#", "") : null);
  if (targetId) {
    state.targetArticleId = targetId;
  }
  if (urlParams.get("filter") === "instagram" || urlParams.get("from") === "instagram_bio") {
    state.mainFilter = "instagram";
  }
  const politicoParam = urlParams.get("politico");
  if (urlParams.get("mode") === "lupa" || urlParams.get("mode") === "congreso" || politicoParam) {
    state.appMode = "lupa";
  }

  // Set initial sort selects
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = state.sortBy;
  const quickSortSelect = document.getElementById("quickSortSelect");
  if (quickSortSelect) quickSortSelect.value = state.sortBy;

  const indepCheckbox = document.getElementById("onlyIndependentCheck");
  if (indepCheckbox) {
    indepCheckbox.checked = false;
    state.onlyIndependent = false;
  }

  await Promise.all([loadInitialSnapshot(), loadParliamentData()]);
  renderAll();

  if (politicoParam) {
    openParliamentDossier(politicoParam);
  }

  // Chequeo periódico de novedades en segundo plano cada 60 segundos
  setInterval(checkForFreshSnapshot, 60 * 1000);
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
  const urlTheme = new URLSearchParams(window.location.search).get("theme");
  const savedTheme = urlTheme || localStorage.getItem("pulso_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon();
}


async function loadInitialSnapshot() {
  try {
    let data = null;
    // Bucket de caché cada 10 minutos para aprovechar el CDN gratuito de Google Cloud Storage
    const timeBucket = Math.floor(Date.now() / (10 * 60 * 1000));
    const gcsUrl = `https://storage.googleapis.com/pulso-instagram-media/data/initial-feeds.json?v=${timeBucket}`;
    const localUrl = `/data/initial-feeds.json?v=${timeBucket}`;

    // Intentar primero GCS directo (siempre al día vía Cloud Function), con fallback al archivo local de Hosting
    try {
      const gcsRes = await fetch(gcsUrl);
      if (gcsRes.ok) data = await gcsRes.json();
    } catch (_) {}

    if (!data) {
      const res = await fetch(localUrl, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (!res.ok) throw new Error("No se pudo cargar initial-feeds.json");
      data = await res.json();
    }

    state.sources = [...(data.sources || []), ...state.customSources];
    state.sourceStats = data.sourceStats || [];
    state.blockedExamples = data.blockedExamples || [];
    state.totalBlockedCount = data.totalBlockedFarandula || 0;

    // Filter snapshot articles against any custom user blocked words
    const validArticles = [];
    for (const art of data.articles || []) {
      if (isTranslationDuplicate(art)) continue;
      const check = checkFarandula(art.title, art.summary, art.category);
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
    state.lastGeneratedAt = data.generatedAt || null;
    state.knownArticleUrls = new Set(validArticles.map(a => a.url || a.id));

    // Cargar historial de publicaciones en Instagram para badges y filtro
    try {
      const igRes = await fetch(`/data/instagram_history.json?_cb=${Date.now()}`, { cache: "no-store" });
      if (igRes.ok) {
        state.instagramHistory = await igRes.json();
        state.instagramPostIds = await buildInstagramPostIds(state.instagramHistory);
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

// Chequeo periódico en segundo plano para detectar cuando GitHub Actions publica nuevas noticias
async function checkForFreshSnapshot() {
  try {
    const res = await fetch(`/data/initial-feeds.json?_poll=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });
    if (!res.ok) return;
    const freshData = await res.json();

    // Comprobar si hay un snapshot más reciente o noticias que no estaban en pantalla
    const isNewTimestamp = freshData.generatedAt && freshData.generatedAt !== state.lastGeneratedAt;
    const freshArticles = (freshData.articles || []).filter(a => !isTranslationDuplicate(a));
    const newArticlesCount = freshArticles.filter(a => !state.knownArticleUrls.has(a.url || a.id)).length;

    if (isNewTimestamp && newArticlesCount > 0) {
      showNewArticlesBanner(freshData, newArticlesCount);
    }
  } catch (err) {
    console.debug("[Pulso Sync] Chequeo de novedades:", err.message);
  }
}

function triggerBackgroundCheck(snapshotGeneratedAt) {
  // Ejecutar una verificación inicial tras 30 segundos de navegación
  setTimeout(checkForFreshSnapshot, 30 * 1000);
}

function showNewArticlesBanner(freshData, count = 0) {
  let banner = document.getElementById("newArticlesBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "newArticlesBanner";
    banner.className = "new-articles-banner";
    document.body.appendChild(banner);
  }

  const label = count > 0 
    ? `✨ ${count} noticia${count > 1 ? "s" : ""} nueva${count > 1 ? "s" : ""} · Ver novedades`
    : `✨ Hay noticias recién salidas · Ver novedades`;

  banner.innerHTML = `
    <button type="button" class="btn-new-articles" id="btnApplyNewArticles">
      ${label}
    </button>
  `;
  banner.classList.add("show");

  const btn = document.getElementById("btnApplyNewArticles");
  if (btn) {
    btn.onclick = () => {
      banner.classList.remove("show");
      applyFreshSnapshot(freshData);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("¡Feed actualizado con las últimas noticias! ⚡");
    };
  }
}

function applyFreshSnapshot(data) {
  state.sources = [...(data.sources || []), ...state.customSources];
  state.sourceStats = data.sourceStats || [];
  state.blockedExamples = data.blockedExamples || [];
  state.totalBlockedCount = data.totalBlockedFarandula || 0;
  state.lastGeneratedAt = data.generatedAt || null;

  const validArticles = [];
  for (const art of data.articles || []) {
    if (isTranslationDuplicate(art)) continue;
    const check = checkFarandula(art.title, art.summary, art.category);
    if (!check.blocked) {
      validArticles.push(art);
    }
  }

  state.articles = validArticles;
  state.knownArticleUrls = new Set(validArticles.map(a => a.url || a.id));
  renderAll();
}

function populateSourceDropdown() {
  const select = document.getElementById("sourceSelect");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="all">Todos los medios (${state.sources.length})</option>`;

  const chileGroup = document.createElement("optgroup");
  chileGroup.label = "🇨🇱 Chile (Nacional, Regional y Masivos)";
  const mundoGroup = document.createElement("optgroup");
  mundoGroup.label = "🌍 Mundo (Cobertura Global)";

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
  if (mundoGroup.children.length > 0) select.appendChild(mundoGroup);
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
    if (checkFarandula(art.title, art.summary, art.category).blocked) return false;

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
    (art) => !checkFarandula(art.title, art.summary, art.category).blocked
  );

  // 1. Barra Principal (Ámbito e Impacto)
  if (mainContainer) {
    const lupaCount = state.lupaData && state.lupaData.parlamentarios ? state.lupaData.parlamentarios.length : 36;
    const filterButtonsHtml = MAIN_FILTERS.map((f) => {
      const isActive = state.appMode === "news" && state.mainFilter === f.id;
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

    const lupaBtnHtml = `
      <button
        type="button"
        class="filter-main-btn ${state.appMode === "lupa" ? "active" : ""}"
        data-switch-mode="lupa"
        role="tab"
        aria-selected="${state.appMode === "lupa" ? "true" : "false"}"
      >
        <span class="filter-icon">🔍</span>
        <span class="filter-label">Lupa Parlamentaria</span>
        <span class="filter-count">${lupaCount}</span>
      </button>
    `;

    mainContainer.innerHTML = filterButtonsHtml + lupaBtnHtml;
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

// Rendering (Minimalist Unified Feed + Lupa Parlamentaria)
function renderAll() {
  updateMetricsAndCounters();
  renderFilterBars();

  const newsBtn = document.getElementById("navModeNewsBtn");
  const lupaBtn = document.getElementById("navModeLupaBtn");
  const gridContainer = document.getElementById("gridViewContainer");
  const lupaContainer = document.getElementById("lupaParlamentariaContainer");
  const topicBar = document.getElementById("topicFiltersBar");

  if (state.appMode === "lupa") {
    newsBtn?.classList.remove("active");
    lupaBtn?.classList.add("active");
    gridContainer?.classList.add("hidden");
    topicBar?.classList.add("hidden");
    lupaContainer?.classList.remove("hidden");
    renderLupaParlamentaria();
    return;
  }

  newsBtn?.classList.add("active");
  lupaBtn?.classList.remove("active");
  gridContainer?.classList.remove("hidden");
  topicBar?.classList.remove("hidden");
  lupaContainer?.classList.add("hidden");

  const filtered = getFilteredArticles();
  const sorted = sortArticles(filtered, state.sortBy);

  if (gridContainer) {
    renderCardsInto(gridContainer, sorted);
  }

  // Si hay una noticia objetivo desde Instagram / Deep Link
  if (state.targetArticleId) {
    handleTargetArticleDeepLink(state.targetArticleId);
  }
}

function focusArticleCard(targetId) {
  const el = document.getElementById(`article-${targetId}`);
  if (!el) return false;

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
  return true;
}

function handleTargetArticleDeepLink(targetId) {
  setTimeout(async () => {
    if (focusArticleCard(targetId)) return;

    // Si la noticia no está en la vista actual (por filtros), resetear a 'all'
    if (state.mainFilter !== "all" || state.topicFilter !== "all") {
      state.mainFilter = "all";
      state.topicFilter = "all";
      renderAll();
      return;
    }

    if (state.deepLinkHandledId === targetId) return;
    state.deepLinkHandledId = targetId;

    // El enlace puede apuntar a una nota que ya salió de portada: el archivo
    // histórico la conserva para que el enlace compartido no muera.
    const archived = await resolveArchivedArticle(targetId);
    if (archived) {
      // Un ID antiguo ("cooperativa-130") puede seguir en portada con su ID nuevo.
      if (archived.id !== targetId && focusArticleCard(archived.id)) return;
      renderArchivedArticleCard(archived);
    } else {
      renderMissingArticleNotice();
    }
  }, 150);
}

async function buildInstagramPostIds(history) {
  // Los posts anteriores al cambio de IDs usan el formato "fuente-123": se
  // traducen a su ID estable para que el badge y el filtro sigan funcionando.
  const ids = new Set(history.map((h) => h.articleId));
  try {
    if (!state.legacyIds) {
      const res = await fetch(`/data/legacy_ids.json?_cb=${Date.now()}`, { cache: "no-store" });
      state.legacyIds = res.ok ? await res.json() : {};
    }
    for (const h of history) {
      const mapped = state.legacyIds && state.legacyIds[h.articleId];
      if (mapped) ids.add(mapped);
    }
  } catch (err) {
    console.debug("[Pulso] Sin mapa de IDs heredados:", err.message);
  }
  return ids;
}

async function loadArchiveIndex() {
  if (state.archiveIndex !== undefined) return state.archiveIndex;
  try {
    const res = await fetch(`/data/archive.json?_cb=${Date.now()}`, { cache: "no-store" });
    state.archiveIndex = res.ok ? await res.json() : null;
  } catch (err) {
    console.debug("[Pulso] Archivo histórico no disponible:", err.message);
    state.archiveIndex = null;
  }
  return state.archiveIndex;
}

async function resolveArchivedArticle(targetId) {
  const archive = await loadArchiveIndex();
  if (!archive) return null;
  const entries = archive.entries || [];
  const direct = entries.find((e) => e.id === targetId);
  if (direct) return direct;
  // Los enlaces antiguos usan IDs posicionales ("cooperativa-130"): el archivo
  // guarda su equivalencia para no romper los posts ya publicados.
  const legacy = archive.legacy || {};
  if (legacy[targetId]) {
    return entries.find((e) => e.id === legacy[targetId]) || null;
  }
  return null;
}

function renderArchivedArticleCard(entry) {
  const container = document.getElementById("gridViewContainer");
  if (!container || document.getElementById("archivedArticleNotice")) return;

  const hasImage = entry.image && !isGenericImageUrl(entry.image);
  const isHigh = entry.relevanceTier === "alta";
  const dateLabel = entry.publishedAt ? formatRelativeTime(entry.publishedAt) : "Archivo";

  const wrapper = document.createElement("div");
  wrapper.id = "archivedArticleNotice";
  wrapper.className = "archived-article-wrap";
  wrapper.innerHTML = `
    <div class="instagram-deep-link-banner archived-notice">
      <div>
        <p><strong>📌 Guardada en el archivo de Pulso:</strong> esta nota ya salió de la portada, pero el enlace sigue vivo.</p>
      </div>
      <button id="dismissArchivedBtn" title="Ver portada">Ver noticias de hoy ✕</button>
    </div>
    <article class="feed-card archived-card">
      <div class="card-header">
        <div class="card-header-top">
          <div class="card-author">
            <span class="card-avatar">${getSourceBadge(entry.sourceId, "chile").icon}</span>
            <div class="card-source-group">
              <span class="card-source-name">${escapeHtml(entry.sourceName || "Medio original")}</span>
            </div>
          </div>
        </div>
        <div class="card-header-bottom">
          <span class="card-time">${escapeHtml(dateLabel)}</span>
          <div class="card-header-tags">
            <span class="card-category-pill">${escapeHtml(entry.category || "Archivo")}</span>
            <span class="card-instagram-badge">${isHigh ? "🔥 Relevante" : "📡 Bajo el Radar"}</span>
          </div>
        </div>
      </div>
      ${hasImage ? `
      <div class="card-media">
        <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
      </div>` : ""}
      <div class="card-content">
        <h2 class="card-title">${escapeHtml(entry.title)}</h2>
      </div>
      <div class="card-footer">
        <a class="card-btn-read" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer">
          Leer en el medio original ↗
        </a>
      </div>
    </article>
  `;
  container.insertBefore(wrapper, container.firstChild);
  wrapper.scrollIntoView({ behavior: "smooth", block: "start" });

  document.getElementById("dismissArchivedBtn")?.addEventListener("click", () => {
    wrapper.remove();
    state.targetArticleId = null;
    state.deepLinkHandledId = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderMissingArticleNotice() {
  const container = document.getElementById("gridViewContainer");
  if (!container || document.getElementById("missingArticleNotice")) return;

  const notice = document.createElement("div");
  notice.id = "missingArticleNotice";
  notice.className = "instagram-deep-link-banner archived-notice";
  notice.innerHTML = `
    <div>
      <p><strong>🔎 No encontramos esta nota.</strong> Puede haber salido del archivo o el enlace estar incompleto. Abajo tienes lo más reciente de la portada.</p>
    </div>
    <button id="dismissMissingBtn" title="Ver portada">Ver portada ✕</button>
  `;
  container.insertBefore(notice, container.firstChild);
  notice.scrollIntoView({ behavior: "smooth", block: "center" });

  document.getElementById("dismissMissingBtn")?.addEventListener("click", () => {
    notice.remove();
    state.targetArticleId = null;
    state.deepLinkHandledId = null;
  });
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
    .map((art, index) => {
      const isSaved = state.savedIds.has(art.id);
      const badgeInfo = getSourceBadge(art.sourceId, art.region);
      const isHigh = art.relevanceTier === "alta";
      const hasRealImage = !!(art.image && !isGenericImageUrl(art.image));
      const isLead = index === 0 && hasRealImage;
      const topicId = getTopicIdForCategory(art.category);

      return `
        <article id="article-${escapeHtml(art.id)}" class="feed-card ${hasRealImage ? "" : "feed-card-editorial"} ${isLead ? "feed-card--lead" : ""} ${state.targetArticleId === art.id ? "highlight-target-card" : ""}" data-article-id="${escapeHtml(art.id)}">
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
                <button type="button"
                        class="card-category-pill ${topicId && state.topicFilter === topicId ? "is-active" : ""}"
                        data-filter-topic-name="${escapeHtml(art.category)}"
                        title="${state.topicFilter === topicId ? "Quitar el filtro de temática" : `Ver solo ${escapeHtml(art.category)}`}">
                  ${escapeHtml(art.category)}
                </button>
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
            <div class="card-editorial-note">
              <span class="note-label">Por qué está aquí</span>
              <p class="note-text">${escapeHtml(art.relevanceReason || "Seleccionada por su valor informativo fuera de la agenda de los grandes medios.")}</p>
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
            <div class="card-footer-actions">
              <button class="card-btn-ig" data-share-instagram="${escapeHtml(art.id)}" title="Compartir noticia en Instagram" aria-label="Compartir en Instagram">
                <svg class="ig-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram</span>
              </button>
              <button class="card-btn-share" data-share-article-id="${escapeHtml(art.id)}" data-share-title="${escapeHtml(art.title)}" data-original-url="${escapeHtml(art.url)}" title="Compartir enlace de Pulso" aria-label="Compartir enlace de Pulso">
                🔗
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateMetricsAndCounters() {
  const baseList = state.articles.filter((a) => !checkFarandula(a.title, a.summary, a.category).blocked);
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
    DEFAULT_BLOCKED_TERMS.length + AMBIGUOUS_FOOTBALL_TERMS.length + state.customBlockedWords.length;

  const defaultCloud = document.getElementById("defaultBlockedTagsCloud");
  defaultCloud.innerHTML = [
    ...DEFAULT_BLOCKED_TERMS.map((t) => `<span class="blocked-tag">🚫 ${escapeHtml(t)}</span>`),
    ...AMBIGUOUS_FOOTBALL_TERMS.map(
      (t) =>
        `<span class="blocked-tag blocked-tag-context" title="Solo se bloquea si la nota además habla de fútbol">⚠️ ${escapeHtml(t)}</span>`
    )
  ].join("");

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
      const stat = state.sourceStats.find((x) => x.id === s.id) || {};

      let health = "";
      if (stat.status === "error") {
        health = `<span class="source-health health-bad">⚠️ feed con error</span>`;
      } else if (stat.status === "stale") {
        health = `<span class="source-health health-warn">⏸️ sin notas recientes</span>`;
      } else if (typeof stat.newestAgeHours === "number") {
        const h = stat.newestAgeHours;
        const label = h < 1 ? "hace minutos" : h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`;
        health = `<span class="source-health">🕒 última nota ${label}</span>`;
      }

      return `
        <div class="source-dir-card">
          <div class="source-dir-top">
            <span>${ s.region === "chile" ? "🇨🇱" : "🌍" } ${escapeHtml(s.name)}</span>
            <span class="indep-tag">${count} notas</span>
          </div>
          <div class="source-dir-meta">${escapeHtml(s.type)}</div>
          ${health ? `<div class="source-dir-meta">${health}</div>` : ""}
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
    state.appMode = "news";
    state.mainFilter = "all";
    state.topicFilter = "all";
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
      state.lupaQuery = "";
      if (searchInput) searchInput.value = "";
      renderAll();
    }
  });

  closeSearchBtn?.addEventListener("click", () => {
    searchDrawer?.classList.add("hidden");
    state.searchQuery = "";
    state.lupaQuery = "";
    if (searchInput) searchInput.value = "";
    clearSearchBtn?.classList.add("hidden");
    renderAll();
  });

  searchInput?.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    state.searchQuery = val;
    if (state.appMode === "lupa") {
      state.lupaQuery = val;
    }
    clearSearchBtn?.classList.toggle("hidden", !val);
    renderAll();
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    state.searchQuery = "";
    state.lupaQuery = "";
    clearSearchBtn?.classList.add("hidden");
    renderAll();
  });


  // Reload App Button (For iOS standalone home screen and hard reload)
  document.getElementById("reloadAppBtn")?.addEventListener("click", () => {
    showToast("Actualizando aplicación... 🔄");
    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + "?_cb=" + Date.now();
    }, 250);
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
    // Switch Mode (Noticias vs Lupa Parlamentaria)
    const switchModeBtn = e.target.closest("[data-switch-mode]");
    if (switchModeBtn) {
      const targetMode = switchModeBtn.getAttribute("data-switch-mode");
      state.appMode = targetMode === "lupa" ? "lupa" : "news";
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Filtro Principal click (Todo, Chile, Mundo, Alto Impacto, Bajo el Radar, Guardadas)
    const mainBtnTrigger = e.target.closest("[data-main-filter]");
    if (mainBtnTrigger) {
      const mainId = mainBtnTrigger.getAttribute("data-main-filter");
      state.appMode = "news";
      state.mainFilter = mainId;
      renderAll();
      return;
    }

    // Subfiltro Temático click (Todas, Investigación, Política, Medioambiente, Ciencia, etc.)
    const topicBtnTrigger = e.target.closest("[data-topic-filter]");
    if (topicBtnTrigger) {
      const topicId = topicBtnTrigger.getAttribute("data-topic-filter");
      state.appMode = "news";
      state.topicFilter = topicId;
      renderAll();
      return;
    }

    // Chip de categoría: filtra manteniendo la tarjeta tocada en su sitio
    const catPillTrigger = e.target.closest("[data-filter-topic-name]");
    if (catPillTrigger) {
      e.preventDefault();
      const catName = catPillTrigger.getAttribute("data-filter-topic-name");
      const matched = TOPIC_FILTERS.slice(1).find((t) => t.matcher({ category: catName }));
      if (matched) {
        const card = catPillTrigger.closest("[data-article-id]");
        const anchorId = card ? card.getAttribute("data-article-id") : null;
        const beforeTop = card ? card.getBoundingClientRect().top : null;

        state.topicFilter = state.topicFilter === matched.id ? "all" : matched.id;
        renderAll();

        // Anclaje visual: la tarjeta pulsada no debe saltar bajo el dedo.
        if (anchorId && beforeTop !== null) {
          const after = document.getElementById(`article-${anchorId}`);
          if (after) {
            const delta = after.getBoundingClientRect().top - beforeTop;
            if (Math.abs(delta) > 1) window.scrollBy(0, delta);
          }
        }
        showToast(state.topicFilter === "all" ? "Todas las temáticas" : `Solo ${matched.label}`);
      }
      return;
    }

    // Instagram share button click
    const igTrigger = e.target.closest("[data-share-instagram]");
    if (igTrigger) {
      const artId = igTrigger.getAttribute("data-share-instagram");
      openInstagramShareModal(artId);
      return;
    }

    // Share link button click (Comparte siempre la URL canónica de Pulso)
    const shareTrigger = e.target.closest("[data-share-article-id]") || e.target.closest("[data-share-link]");
    if (shareTrigger) {
      const artId = shareTrigger.getAttribute("data-share-article-id");
      const title = shareTrigger.getAttribute("data-share-title") || "Pulso Independiente";
      const shareUrl = artId ? getPulsoArticleUrl(artId) : (shareTrigger.getAttribute("data-share-link") || CANONICAL_SITE_URL);

      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        navigator.share({
          title: title,
          text: title,
          url: shareUrl
        }).catch((err) => {
          if (err.name !== "AbortError") {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("¡Enlace de Pulso copiado al portapapeles! 🔗");
              });
            }
          }
        });
      } else {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("¡Enlace de Pulso copiado al portapapeles! 🔗");
          }).catch(() => {
            showToast("Enlace: " + shareUrl);
          });
        } else {
          showToast("Enlace: " + shareUrl);
        }
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

  // Reader modal Instagram button
  document.getElementById("readerInstagramBtn")?.addEventListener("click", () => {
    if (!state.activeReaderArticle) return;
    openInstagramShareModal(state.activeReaderArticle.id);
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
    await fetchLiveUpdates();
  });

  initFeedbackModal();
  initInstagramShareModal();
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
      // 2. Transición inmediata de éxito para el usuario (Optimistic UI)
      form.reset();
      form.classList.add("hidden");
      if (successState) successState.classList.remove("hidden");
      showToast("🎉 ¡Gracias por tu sugerencia para mejorar Pulso!");

      // 3. Envío directo a Google Apps Script Web App (almacenamiento y notificación instantánea)
      const payload = {
        tipo: category,
        comentario: comment,
        contacto: contact || "No indicado",
        origen: window.location.href
      };

      const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzu63-E2qnjAEPEhN3LtQApm8xvYuFkbIGoVTafbd8N79NobTzkbDfi8FJGtt4uYIQ/exec";

      try {
        await fetch(GAS_WEBAPP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn("Envío a Google Apps Script:", err);
      }
    });
  }
}



// ==========================================
// Integración de Compartir en Instagram
// ==========================================

function buildInstagramCaption(art) {
  if (!art) return "";
  const title = (art.title || "").trim();
  const summary = (art.summary || "").trim();
  const source = art.sourceName || "Prensa Independiente";
  const category = (art.category || "").toLowerCase();
  const pulsoUrl = getPulsoArticleUrl(art.id);
  const region = art.region || "chile";
  const country = art.country || "";

  let hashtags = "#Pulso #PeriodismoIndependiente";
  if (region === "chile") {
    hashtags += " #Chile #NoticiasChile #Actualidad";
  } else if (region === "latam") {
    hashtags += ` #Latinoamérica #NoticiasLatAm ${country ? "#" + country.replace(/\s+/g, "") : ""}`;
  } else {
    hashtags += " #Internacional #Geopolítica #Mundo";
  }

  if (category.includes("ciclismo")) {
    hashtags += " #Ciclismo #CiclismoRuta #MTB #Gravel #Bicicleta";
  } else if (category.includes("investigación")) {
    hashtags += " #Investigación #Reportaje #Transparencia";
  } else if (category.includes("medioambiente")) {
    hashtags += " #Medioambiente #Clima #Sustentabilidad";
  } else if (category.includes("economía")) {
    hashtags += " #Economía #Mercado";
  }

  return `${title}\n\n${summary}\n\n📰 Fuente: ${source}\n🔗 Reportaje completo en: ${pulsoUrl}\n\n👉 Enlace en nuestra bio o historias para leer sin farándula.\n\n${hashtags}`;
}

function openInstagramShareModal(articleId) {
  const art = state.articles.find((a) => a.id === articleId) || state.activeReaderArticle;
  if (!art) return;

  state.activeInstagramArticle = art;
  const modal = document.getElementById("instagramShareModal");
  if (!modal) return;

  // Set preview title, source, badge
  const previewTitle = document.getElementById("igPreviewTitle");
  if (previewTitle) previewTitle.textContent = art.title;

  const previewSource = document.getElementById("igPreviewSource");
  if (previewSource) {
    previewSource.textContent = `Por ${art.sourceName} · ${art.publishedAt ? formatRelativeTime(art.publishedAt) : ""}`;
  }

  const previewBadge = document.getElementById("igPreviewBadge");
  if (previewBadge) {
    previewBadge.textContent = `● ${(art.category || "Actualidad").toUpperCase()}`;
  }

  // Image preview & download link
  const previewImg = document.getElementById("igPreviewImg");
  const dlBtn = document.getElementById("igDownloadImgBtn");

  const hasImg = art.image && !isGenericImageUrl(art.image);
  const possibleIgImg = `/instagram_posts/${art.id}.jpg`;
  const isIgPublished = state.instagramPostIds && state.instagramPostIds.has(art.id);
  const targetImgUrl = isIgPublished ? possibleIgImg : (hasImg ? art.image : "/pulso_avatar_editorial.png");

  if (previewImg) {
    previewImg.src = targetImgUrl;
    previewImg.alt = art.title;
    previewImg.onerror = () => {
      previewImg.src = hasImg ? art.image : "/pulso_avatar_editorial.png";
    };
  }

  if (dlBtn) {
    dlBtn.href = targetImgUrl;
    dlBtn.setAttribute("download", `pulso-${art.id}.jpg`);
  }

  // Caption text
  const caption = buildInstagramCaption(art);
  const captionTextarea = document.getElementById("igCaptionTextarea");
  if (captionTextarea) {
    captionTextarea.value = caption;
  }

  // Open Instagram app button (mobile deep link or web)
  const openAppBtn = document.getElementById("igOpenAppBtn");
  if (openAppBtn) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    openAppBtn.href = isMobile ? "instagram://app" : "https://www.instagram.com/";
  }

  // Reset copy button text
  const copyCaptionBtn = document.getElementById("igCopyCaptionBtn");
  if (copyCaptionBtn) copyCaptionBtn.textContent = "📋 Copiar texto";

  // Open modal
  modal.classList.remove("hidden");
}

function initInstagramShareModal() {
  const modal = document.getElementById("instagramShareModal");
  if (!modal) return;

  // Copy caption button
  const copyCaptionBtn = document.getElementById("igCopyCaptionBtn");
  copyCaptionBtn?.addEventListener("click", () => {
    const textarea = document.getElementById("igCaptionTextarea");
    if (!textarea) return;
    const text = textarea.value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        copyCaptionBtn.textContent = "✓ ¡Copiado!";
        showToast("¡Texto y hashtags copiados para Instagram! 📋");
        setTimeout(() => {
          copyCaptionBtn.textContent = "📋 Copiar texto";
        }, 2200);
      }).catch(() => {
        textarea.select();
        document.execCommand("copy");
        showToast("¡Texto copiado para Instagram! 📋");
      });
    } else {
      textarea.select();
      document.execCommand("copy");
      showToast("¡Texto copiado para Instagram! 📋");
    }
  });

  // Copy direct link button
  const copyLinkBtn = document.getElementById("igCopyLinkBtn");
  copyLinkBtn?.addEventListener("click", () => {
    if (!state.activeInstagramArticle) return;
    const pulsoUrl = getPulsoArticleUrl(state.activeInstagramArticle.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pulsoUrl).then(() => {
        showToast("¡Enlace directo copiado al portapapeles! 🔗");
      }).catch(() => {
        showToast("Enlace: " + pulsoUrl);
      });
    } else {
      showToast("Enlace: " + pulsoUrl);
    }
  });

  // Native share button (Mobile Instagram Stories / Feed / Chat)
  const nativeBtn = document.getElementById("igNativeShareBtn");
  nativeBtn?.addEventListener("click", async () => {
    if (!state.activeInstagramArticle) return;
    const art = state.activeInstagramArticle;
    const caption = buildInstagramCaption(art);
    const pulsoUrl = getPulsoArticleUrl(art.id);

    if (navigator.share) {
      try {
        await navigator.share({
          title: art.title,
          text: caption,
          url: pulsoUrl
        });
        showToast("¡Abriendo opciones para compartir! 🚀");
      } catch (err) {
        if (err.name !== "AbortError") {
          navigator.clipboard?.writeText(caption);
          showToast("¡Texto copiado para Instagram! 📋");
        }
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(caption).then(() => {
          showToast("¡Texto copiado! Pégalo en tu publicación de Instagram 📋");
        }).catch(() => {
          showToast("Selecciona y copia el texto del recuadro.");
        });
      } else {
        showToast("Selecciona y copia el texto del recuadro.");
      }
    }
  });
}


// ==========================================================================
// 10. LUPA PARLAMENTARIA — MOTOR INTERACTIVO DE INVESTIGACIÓN CIUDADANA
// ==========================================================================

const LUPA_LENSES = [
  {
    id: "fuel_desc",
    icon: "🔥",
    label: "Ranking Bencinazo (Mayor gasto)",
    desc: "Ordenado por quienes más plata fiscal gastaron en combustible en el trimestre."
  },
  {
    id: "febrero_desc",
    icon: "🏖️",
    label: "Gasto en Vacaciones (Febrero)",
    desc: "Ordenado por quienes más gastaron durante febrero con el Congreso cerrado por receso."
  },
  {
    id: "controversies_desc",
    icon: "🚨",
    label: "Escándalos e Investigaciones",
    desc: "Prioriza parlamentarios con investigaciones por colusión, cohecho, financiamiento ilegal o uso irregular."
  },
  {
    id: "judicial_desc",
    icon: "⚖️",
    label: "Causas Judiciales y Demandas",
    desc: "Prioriza parlamentarios con desafueros, causas penales activas, condenas o querellas."
  },
  {
    id: "attendance_asc",
    icon: "📉",
    label: "Menor Asistencia Real",
    desc: "Ordenado desde quienes tienen menor porcentaje de asistencia efectiva a sesiones."
  }
];

function formatCLP(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "$0";
  return "$" + Math.round(amount).toLocaleString("es-CL");
}

async function loadParliamentData() {
  try {
    const res = await fetch(`/data/parlamentarios.json?v=3.1.0`, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar parlamentarios.json");
    state.lupaData = await res.json();
  } catch (err) {
    console.error("[Lupa Parlamentaria] Error cargando datos:", err);
    state.lupaData = { metadata: {}, parlamentarios: [] };
  }
}

function getFilteredParlamentarios() {
  const list = (state.lupaData && state.lupaData.parlamentarios) ? [...state.lupaData.parlamentarios] : [];
  const q = (state.lupaQuery || "").trim().toLowerCase();

  const filtered = list.filter((p) => {
    if (state.lupaChamber !== "all" && p.chamber !== state.lupaChamber) return false;
    if (state.lupaRegion !== "all" && p.region !== state.lupaRegion) return false;
    if (state.lupaDistrict !== "all") {
      const targetDist = parseInt(state.lupaDistrict, 10);
      if (p.districtNumber !== targetDist) return false;
    }
    if (state.lupaParty !== "all" && p.party !== state.lupaParty) return false;

    if (q) {
      const controversiesBlob = (p.controversies || []).map((c) => `${c.title} ${c.summary} ${c.category}`).join(" ");
      const judicialBlob = (p.judicialRecords || []).map((j) => `${j.caseName} ${j.reason} ${j.status}`).join(" ");
      const communesBlob = (p.communes || []).join(" ");
      const hay = `${p.name} ${p.shortName} ${p.party} ${p.coalition} ${p.region} ${p.districtOrCirc} ${communesBlob} ${controversiesBlob} ${judicialBlob}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Ordenar según el lente de investigación activo
  filtered.sort((a, b) => {
    if (state.lupaLens === "febrero_desc") {
      return (b.fuelFebreroVacaciones || 0) - (a.fuelFebreroVacaciones || 0);
    }
    if (state.lupaLens === "controversies_desc") {
      const scoreA = (a.controversies || []).reduce((acc, c) => acc + (c.severity === "alta" ? 3 : 1), 0);
      const scoreB = (b.controversies || []).reduce((acc, c) => acc + (c.severity === "alta" ? 3 : 1), 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.fuelTrimestre || 0) - (a.fuelTrimestre || 0);
    }
    if (state.lupaLens === "judicial_desc") {
      const weight = (rec) => rec.statusType === "active" ? 5 : (rec.statusType === "sanctioned" ? 4 : (rec.statusType === "resolved" ? 2 : 1));
      const scoreA = (a.judicialRecords || []).reduce((acc, r) => acc + weight(r), 0);
      const scoreB = (b.judicialRecords || []).reduce((acc, r) => acc + weight(r), 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.controversies?.length || 0) - (a.controversies?.length || 0);
    }
    if (state.lupaLens === "attendance_asc") {
      return (a.attendance?.realPct || 100) - (b.attendance?.realPct || 100);
    }
    // Default: fuel_desc
    return (b.fuelTrimestre || 0) - (a.fuelTrimestre || 0);
  });

  return filtered;
}

function renderLupaParlamentaria() {
  const container = document.getElementById("lupaParlamentariaContainer");
  if (!container) return;

  if (!state.lupaData || !state.lupaData.parlamentarios) {
    container.innerHTML = `<div class="empty-state"><p>Cargando base de datos de fiscalización parlamentaria...</p></div>`;
    return;
  }

  const allParl = state.lupaData.parlamentarios;
  const meta = state.lupaData.metadata || {};

  // Listas únicas de regiones y partidos para los selectores
  const regions = [...new Set(allParl.map((p) => p.region))].sort((a, b) => a.localeCompare(b, "es"));
  const parties = [...new Set(allParl.map((p) => p.party))].sort((a, b) => a.localeCompare(b, "es"));

  // Si la estructura base de Lupa aún no está montada, crearla para que el buscador no pierda foco al escribir
  if (!document.getElementById("lupaResultsGrid")) {
    container.innerHTML = `
      <div class="lupa-hero">
        <div class="lupa-hero-top">
          <div>
            <span class="lupa-kicker">🔍 LUPA PARLAMENTARIA · EXPEDIENTE PÚBLICO INTERACTIVO</span>
            <h1 class="lupa-title">Investiga por quién votas: Gastos, Vacaciones, Asistencia y Causas</h1>
            <p class="lupa-subtitle">
              Cruza en tiempo real los gastos en bencina y traslación (incluyendo el mes de vacaciones de febrero), la asistencia real vs. oficial al Congreso, las investigaciones periodísticas (CIPER, BíoBío Investiga, El Mostrador, Interferencia) y el historial judicial de cada parlamentario. Compara a representantes de una misma región o partido.
            </p>
          </div>
        </div>

        <div class="lupa-kpis-row">
          <div class="lupa-kpi-card">
            <span class="lupa-kpi-label">Bencina Congreso (Trimestre)</span>
            <span class="lupa-kpi-val lupa-kpi-val--high">${formatCLP(meta.totalCombustibleTrimestreCongreso || 262450000)}</span>
            <span class="lupa-kpi-note">Más de $87 millones mensuales con cargo fiscal</span>
          </div>
          <div class="lupa-kpi-card">
            <span class="lupa-kpi-label">Dieta Parlamentaria Base</span>
            <span class="lupa-kpi-val">${formatCLP(meta.dietaMensualBruta || 8239091)} / mes</span>
            <span class="lupa-kpi-note">+ hasta $10,6M/mes adicionales en asignaciones</span>
          </div>
          <div class="lupa-kpi-card">
            <span class="lupa-kpi-label">Récord Trimestral Combustible</span>
            <span class="lupa-kpi-val lupa-kpi-val--high">$5.032.016</span>
            <span class="lupa-kpi-note">Sen. Carlos Kuschel (RN) · ~$1,67M por mes</span>
          </div>
          <div class="lupa-kpi-card">
            <span class="lupa-kpi-label">Alerta Receso Febrero (Vacaciones)</span>
            <span class="lupa-kpi-val lupa-kpi-val--amber">Congreso Cerrado</span>
            <span class="lupa-kpi-note">Parlamentarios con hasta $1,62M rendidos en febrero</span>
          </div>
        </div>
      </div>

      <!-- Selector de Lente de Investigación -->
      <div class="lupa-lenses-wrap">
        <span class="lupa-lenses-label">1. Elige tu línea de investigación (Ordenar y priorizar por):</span>
        <div class="lupa-lenses-bar" id="lupaLensesBar"></div>
      </div>

      <!-- Barra de Filtros Electorales y Territoriales -->
      <div class="lupa-controls-bar">
        <input
          type="search"
          id="lupaSearchInput"
          class="lupa-input"
          placeholder="Buscar por nombre, región, comuna, partido o caso (ej. Ossandón, Corpesca, Penta, Democracia Viva)..."
          value="${escapeHtml(state.lupaQuery)}"
          autocomplete="off"
        />
        <select id="lupaChamberSelect" class="lupa-select" aria-label="Filtrar por Cámara">
          <option value="all">🏛️ Todas las Cámaras</option>
          <option value="Senado">Senado (50)</option>
          <option value="Cámara de Diputados">Cámara de Diputados (155)</option>
        </select>
        <select id="lupaDistrictSelect" class="lupa-select" aria-label="Filtrar por Distrito">
          <option value="all">🗳️ Todos los Distritos (1 al 28)</option>
          ${Array.from({length: 28}, (_, i) => i + 1).map((d) => `<option value="${d}">Distrito ${d}</option>`).join("")}
        </select>
        <select id="lupaRegionSelect" class="lupa-select" aria-label="Filtrar por Región">
          <option value="all">📍 Todas las Regiones (16)</option>
          ${regions.map((r) => `<option value="${escapeHtml(r)}">Región: ${escapeHtml(r)}</option>`).join("")}
        </select>
        <select id="lupaPartySelect" class="lupa-select" aria-label="Filtrar por Partido">
          <option value="all">🏳️ Todos los Partidos</option>
          ${parties.map((pt) => `<option value="${escapeHtml(pt)}">Partido: ${escapeHtml(pt)}</option>`).join("")}
        </select>
        <button type="button" id="lupaResetFiltersBtn" class="lupa-reset-btn" title="Restablecer filtros">
          Limpiar ✕
        </button>
      </div>

      <!-- Banner contextual de Región o Partido -->
      <div id="lupaContextBanner" class="hidden"></div>

      <!-- Bandeja de Comparación Cara a Cara -->
      <div id="lupaCompareTray" class="hidden"></div>

      <!-- Grilla de Expedientes -->
      <div class="lupa-grid" id="lupaResultsGrid"></div>
    `;

    // Bind input & select listeners once
    document.getElementById("lupaSearchInput")?.addEventListener("input", (e) => {
      state.lupaQuery = e.target.value;
      updateLupaDynamicContent();
    });
    document.getElementById("lupaChamberSelect")?.addEventListener("change", (e) => {
      state.lupaChamber = e.target.value;
      if (state.lupaChamber === "Senado") {
        state.lupaDistrict = "all";
      }
      updateLupaDynamicContent();
    });
    document.getElementById("lupaDistrictSelect")?.addEventListener("change", (e) => {
      state.lupaDistrict = e.target.value;
      if (state.lupaDistrict !== "all") {
        state.lupaChamber = "Cámara de Diputados";
        const sampleDip = allParl.find((p) => p.districtNumber === parseInt(state.lupaDistrict, 10));
        if (sampleDip) {
          state.lupaRegion = sampleDip.region;
        }
      }
      updateLupaDynamicContent();
    });
    document.getElementById("lupaRegionSelect")?.addEventListener("change", (e) => {
      state.lupaRegion = e.target.value;
      if (state.lupaRegion === "all") {
        state.lupaDistrict = "all";
      }
      updateLupaDynamicContent();
    });
    document.getElementById("lupaPartySelect")?.addEventListener("change", (e) => {
      state.lupaParty = e.target.value;
      updateLupaDynamicContent();
    });
    document.getElementById("lupaResetFiltersBtn")?.addEventListener("click", () => {
      state.lupaChamber = "all";
      state.lupaRegion = "all";
      state.lupaDistrict = "all";
      state.lupaParty = "all";
      state.lupaQuery = "";
      state.lupaLens = "fuel_desc";
      const sInput = document.getElementById("lupaSearchInput");
      if (sInput) sInput.value = "";
      updateLupaDynamicContent();
    });
  }

  updateLupaDynamicContent();
}

function updateLupaDynamicContent() {
  const allParl = (state.lupaData && state.lupaData.parlamentarios) ? state.lupaData.parlamentarios : [];
  const filtered = getFilteredParlamentarios();
  const maxFuel = Math.max(...allParl.map((p) => p.fuelTrimestre || 1), 1);

  // Sync select values
  const chSel = document.getElementById("lupaChamberSelect");
  if (chSel && chSel.value !== state.lupaChamber) chSel.value = state.lupaChamber;
  const dtSel = document.getElementById("lupaDistrictSelect");
  if (dtSel && dtSel.value !== state.lupaDistrict) dtSel.value = state.lupaDistrict;
  const rgSel = document.getElementById("lupaRegionSelect");
  if (rgSel && rgSel.value !== state.lupaRegion) rgSel.value = state.lupaRegion;
  const ptSel = document.getElementById("lupaPartySelect");
  if (ptSel && ptSel.value !== state.lupaParty) ptSel.value = state.lupaParty;

  // Render lenses bar
  const lensesBar = document.getElementById("lupaLensesBar");
  if (lensesBar) {
    const counts = {
      fuel_desc: allParl.length,
      febrero_desc: allParl.filter((p) => (p.fuelFebreroVacaciones || 0) >= 600000).length,
      controversies_desc: allParl.filter((p) => (p.controversies || []).length > 0).length,
      judicial_desc: allParl.filter((p) => (p.judicialRecords || []).length > 0).length,
      attendance_asc: allParl.filter((p) => (p.attendance?.realPct || 100) < 90).length
    };
    lensesBar.innerHTML = LUPA_LENSES.map((lens) => `
      <button
        type="button"
        class="lupa-lens-btn ${state.lupaLens === lens.id ? "active" : ""}"
        data-lupa-lens="${lens.id}"
        title="${escapeHtml(lens.desc)}"
      >
        <span>${lens.icon}</span>
        <span>${escapeHtml(lens.label)}</span>
        <span class="lupa-lens-count">${counts[lens.id] || allParl.length}</span>
      </button>
    `).join("");
  }

  // Render Context Banner (District, Region, or Party)
  const ctxBanner = document.getElementById("lupaContextBanner");
  if (ctxBanner) {
    if (state.lupaDistrict !== "all" && filtered.length > 0) {
      const distNum = parseInt(state.lupaDistrict, 10);
      const avgDistrict = Math.round(filtered.reduce((s, p) => s + (p.fuelTrimestre || 0), 0) / filtered.length);
      const byFuel = [...filtered].sort((a, b) => b.fuelTrimestre - a.fuelTrimestre);
      const highest = byFuel[0];
      const lowest = byFuel[byFuel.length - 1];
      const diffPct = lowest && lowest.fuelTrimestre ? Math.round(((highest.fuelTrimestre - lowest.fuelTrimestre) / lowest.fuelTrimestre) * 100) : 0;
      const compareIdsAttr = byFuel.map((p) => p.id).join(",");
      const communesList = highest.communes || [];
      const communesPreview = communesList.length ? ` (${communesList.join(", ")})` : "";

      ctxBanner.className = "lupa-context-banner";
      ctxBanner.innerHTML = `
        <div>
          <strong>📍 Radiografía Distrital — Distrito ${distNum}${escapeHtml(communesPreview)}:</strong>
          ${filtered.length} diputadas y diputados en ejercicio · Promedio trimestral en bencina: <strong>${formatCLP(avgDistrict)}</strong>.
          ${byFuel.length > 1 ? `<br/>En el mismo distrito y cumpliendo las mismas labores territoriales: <strong>${escapeHtml(highest.shortName)} (${escapeHtml(highest.party)})</strong> rinde <strong>${formatCLP(highest.fuelTrimestre)}</strong> vs <strong>${escapeHtml(lowest.shortName)} (${escapeHtml(lowest.party)})</strong> con <strong>${formatCLP(lowest.fuelTrimestre)}</strong> (una diferencia de <strong>+${diffPct}%</strong>).` : ""}
        </div>
        ${byFuel.length > 1 ? `
          <button type="button" class="btn-dossier-share" data-compare-pair="${escapeHtml(compareIdsAttr)}">
            ⚖️ Comparar a todos en el Distrito ${distNum}
          </button>
        ` : ""}
      `;
    } else if (state.lupaRegion !== "all" && filtered.length > 0) {
      const avgRegional = Math.round(filtered.reduce((s, p) => s + (p.fuelTrimestre || 0), 0) / filtered.length);
      const byFuel = [...filtered].sort((a, b) => b.fuelTrimestre - a.fuelTrimestre);
      const highest = byFuel[0];
      const lowest = byFuel[byFuel.length - 1];
      const compareIdsAttr = byFuel.slice(0, 3).map((p) => p.id).join(",");

      ctxBanner.className = "lupa-context-banner";
      ctxBanner.innerHTML = `
        <div>
          <strong>📍 Radiografía Territorial — Región de ${escapeHtml(state.lupaRegion)}:</strong>
          Promedio trimestral en bencina: <strong>${formatCLP(avgRegional)}</strong>.
          ${byFuel.length > 1 ? `En la misma región, <strong>${escapeHtml(highest.shortName)} (${escapeHtml(highest.party)})</strong> gasta <strong>${formatCLP(highest.fuelTrimestre)}</strong> versus <strong>${escapeHtml(lowest.shortName)} (${escapeHtml(lowest.party)})</strong> con <strong>${formatCLP(lowest.fuelTrimestre)}</strong>.` : ""}
        </div>
        ${byFuel.length > 1 ? `
          <button type="button" class="btn-dossier-share" data-compare-pair="${escapeHtml(compareIdsAttr)}">
            ⚖️ Comparar cara a cara en ${escapeHtml(state.lupaRegion)}
          </button>
        ` : ""}
      `;
    } else if (state.lupaParty !== "all" && filtered.length > 0) {
      const avgParty = Math.round(filtered.reduce((s, p) => s + (p.fuelTrimestre || 0), 0) / filtered.length);
      const compareIdsAttr = filtered.slice(0, 3).map((p) => p.id).join(",");
      ctxBanner.className = "lupa-context-banner";
      ctxBanner.innerHTML = `
        <div>
          <strong>🏳️ Radiografía de Bancada — Partido ${escapeHtml(state.lupaParty)}:</strong>
          ${filtered.length} parlamentario(s) en la muestra · Promedio trimestral en combustible: <strong>${formatCLP(avgParty)}</strong>.
        </div>
        ${filtered.length > 1 ? `
          <button type="button" class="btn-dossier-share" data-compare-pair="${escapeHtml(compareIdsAttr)}">
            ⚖️ Comparar representantes de ${escapeHtml(state.lupaParty)}
          </button>
        ` : ""}
      `;
    } else {
      ctxBanner.className = "hidden";
      ctxBanner.innerHTML = "";
    }
  }

  // Render Compare Tray
  const compareTray = document.getElementById("lupaCompareTray");
  if (compareTray) {
    if (state.lupaCompareIds.length > 0) {
      const selectedObjs = state.lupaCompareIds
        .map((id) => allParl.find((p) => p.id === id))
        .filter(Boolean);

      compareTray.className = "lupa-compare-tray";
      compareTray.innerHTML = `
        <div class="lupa-compare-chips">
          <span style="font-family:var(--font-mono);font-size:0.75rem;text-transform:uppercase;color:var(--accent-high);font-weight:700;">
            ⚖️ Mesa de Comparación (${selectedObjs.length}/3):
          </span>
          ${selectedObjs.map((p) => `
            <span class="lupa-compare-chip">
              ${escapeHtml(p.shortName)} (${escapeHtml(p.party)})
              <button type="button" data-toggle-compare="${escapeHtml(p.id)}" title="Quitar">✕</button>
            </span>
          `).join("")}
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-open-dossier" id="openCompareModalBtn" style="padding:7px 14px;">
            ⚖️ Comparar Cara a Cara (${selectedObjs.length})
          </button>
          <button type="button" class="lupa-reset-btn" id="clearCompareTrayBtn" style="padding:7px 10px;">
            Vaciar
          </button>
        </div>
      `;
    } else {
      compareTray.className = "hidden";
      compareTray.innerHTML = "";
    }
  }

  // Render Grid of Dossier Cards
  const grid = document.getElementById("lupaResultsGrid");
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron parlamentarios con esos filtros. Prueba limpiando la búsqueda o cambiando de región.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((p, idx) => {
    const pctBar = Math.min(100, Math.round(((p.fuelTrimestre || 0) / maxFuel) * 100));
    const litersTrimestre = Math.round((p.fuelTrimestre || 0) / 1320);
    const kmTrimestre = litersTrimestre * 10;
    const febRatio = p.fuelMonthlyAvg ? Math.round(((p.fuelFebreroVacaciones || 0) / p.fuelMonthlyAvg) * 100) : 0;
    const isSelectedCompare = state.lupaCompareIds.includes(p.id);

    const hasActiveJudicial = (p.judicialRecords || []).some((j) => j.statusType === "active" || j.statusType === "sanctioned");
    const hasResolvedJudicial = !hasActiveJudicial && (p.judicialRecords || []).length > 0;
    const controversiesCount = (p.controversies || []).length;
    const topControversy = (p.controversies || [])[0];

    return `
      <article class="lupa-card" data-politician-card="${escapeHtml(p.id)}">
        <div>
          <div class="lupa-card-top">
            <span class="lupa-rank-badge ${idx < 5 ? "lupa-rank-badge--top" : ""}">#${idx + 1}</span>
            <div class="lupa-chamber-tags">
              <span class="lupa-tag">${escapeHtml(p.chamber)}</span>
              <span class="lupa-tag lupa-tag--party">${escapeHtml(p.party)}</span>
              <span class="lupa-tag">📍 ${escapeHtml(p.region)}</span>
            </div>
          </div>

          <h2 class="lupa-card-name" data-open-dossier="${escapeHtml(p.id)}" role="button" tabindex="0">
            ${escapeHtml(p.name)}
          </h2>
          <p class="lupa-card-territory">${escapeHtml(p.districtOrCirc)} · ${escapeHtml(p.territoryType)}</p>
        </div>

        <!-- Badges de Alerta Ciudadana -->
        <div class="lupa-alert-row">
          ${(p.fuelFebreroVacaciones || 0) >= 650000 ? `
            <span class="lupa-alert-pill lupa-alert-pill--amber" title="Gasto elevado durante el receso legislativo de febrero">
              🏖️ Febrero: ${formatCLP(p.fuelFebreroVacaciones)} (${febRatio}% de mes normal)
            </span>
          ` : ""}
          ${(p.registeredVehiclesCount || 0) >= 4 ? `
            <span class="lupa-alert-pill lupa-alert-pill--amber">
              🚗 ${p.registeredVehiclesCount} vehículos con tarjeta fiscal
            </span>
          ` : ""}
          ${hasActiveJudicial ? `
            <span class="lupa-alert-pill lupa-alert-pill--danger">
              ⚖️ Causa Judicial Activa / Sanción (${p.judicialRecords.length})
            </span>
          ` : hasResolvedJudicial ? `
            <span class="lupa-alert-pill lupa-alert-pill--amber">
              ⚖️ ${p.judicialRecords.length} antecedente(s) judicial(es) (Resuelto)
            </span>
          ` : ""}
          ${controversiesCount > 0 ? `
            <span class="lupa-alert-pill lupa-alert-pill--danger">
              🚨 ${controversiesCount} controversia(s) / investigación(es)
            </span>
          ` : (!hasActiveJudicial && !hasResolvedJudicial) ? `
            <span class="lupa-alert-pill lupa-alert-pill--clean">
              ✅ Sin causas judiciales ni escándalos reportados
            </span>
          ` : ""}
        </div>

        <!-- Caja de Métricas Auditadas -->
        <div class="lupa-metrics-box">
          <div class="lupa-metric-main">
            <span class="lupa-metric-lbl">⛽ Combustible (Trimestre Mar–May)</span>
            <span class="lupa-metric-val">${formatCLP(p.fuelTrimestre)}</span>
          </div>
          <div class="lupa-fuel-bar-track">
            <div class="lupa-fuel-bar-fill" style="width:${pctBar}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);">
            <span>Promedio: ${formatCLP(p.fuelMonthlyAvg)}/mes</span>
            <span>~${litersTrimestre.toLocaleString("es-CL")} L (~${kmTrimestre.toLocaleString("es-CL")} km)</span>
          </div>

          <div class="lupa-submetrics-grid">
            <div class="lupa-submetric">
              <span class="lupa-submetric-k">🏖️ Vacaciones Feb</span>
              <span class="lupa-submetric-v" style="${(p.fuelFebreroVacaciones || 0) >= 700000 ? "color:var(--accent-low);" : ""}">
                ${formatCLP(p.fuelFebreroVacaciones)}
              </span>
            </div>
            <div class="lupa-submetric">
              <span class="lupa-submetric-k">🏛️ Asistencia Real</span>
              <span class="lupa-submetric-v" style="${(p.attendance?.realPct || 100) < 85 ? "color:var(--accent-high);" : ""}">
                ${p.attendance?.realPct ?? 90}% <small style="font-weight:400;color:var(--text-muted);">(${p.attendance?.sessionsPresent}/${p.attendance?.sessionsTotal})</small>
              </span>
            </div>
            <div class="lupa-submetric">
              <span class="lupa-submetric-k">🚗 Autos Inscritos</span>
              <span class="lupa-submetric-v">${p.registeredVehiclesCount || 2} vehículos</span>
            </div>
          </div>
        </div>

        <!-- Extracto de Investigación o Contexto Territorial -->
        <div class="lupa-card-case-preview">
          ${topControversy
            ? `<strong>📌 Hito en expediente (${topControversy.year}):</strong> ${escapeHtml(topControversy.title)}`
            : `<strong>📋 Contexto territorial:</strong> ${escapeHtml(p.justificationSummary)}`
          }
        </div>

        <!-- Botones de Acción Investigativa -->
        <div class="lupa-card-actions">
          <button type="button" class="btn-open-dossier" data-open-dossier="${escapeHtml(p.id)}">
            🕵️ Abrir Expediente Completo
          </button>
          <button
            type="button"
            class="btn-toggle-compare ${isSelectedCompare ? "selected" : ""}"
            data-toggle-compare="${escapeHtml(p.id)}"
            title="Agregar o quitar de la mesa de comparación"
          >
            ${isSelectedCompare ? "✓ En comparación" : "⚖️ Comparar"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function openParliamentDossier(politicianId) {
  const allParl = (state.lupaData && state.lupaData.parlamentarios) ? state.lupaData.parlamentarios : [];
  const p = allParl.find((x) => x.id === politicianId);
  if (!p) return;

  state.activeDossierId = p.id;
  const modal = document.getElementById("parliamentDossierModal");
  const body = document.getElementById("dossierModalBody");
  const headerMeta = document.getElementById("dossierHeaderMeta");
  if (!modal || !body) return;

  const dieta = (state.lupaData?.metadata?.dietaMensualBruta) || 8239091;
  const sueldoMin = (state.lupaData?.metadata?.sueldoMinimoRef) || 500000;
  const precioLitro = (state.lupaData?.metadata?.precioLitroBencinaRef) || 1320;

  const monthlyLiters = Math.round((p.fuelMonthlyAvg || 0) / precioLitro);
  const monthlyKm = monthlyLiters * 10;
  const dailyKm = Math.round(monthlyKm / 30);
  const minWagesTrimestre = ((p.fuelTrimestre || 0) / sueldoMin).toFixed(1);
  const febPct = p.fuelMonthlyAvg ? Math.round(((p.fuelFebreroVacaciones || 0) / p.fuelMonthlyAvg) * 100) : 0;

  const totalMonthlyCostToState = dieta + (p.operationalTotalMonthly || 0);
  const sessionsMonthApprox = Math.max(1, Math.round((p.attendance?.sessionsPresent || 10) / 3));
  const costPerSessionAttended = Math.round(totalMonthlyCostToState / sessionsMonthApprox);

  // Calcular promedio de su misma región y distrito para contraste directo
  const regionalPeers = allParl.filter((x) => x.region === p.region && x.id !== p.id);
  const partyPeers = allParl.filter((x) => x.party === p.party && x.id !== p.id);
  const districtPeers = p.districtNumber
    ? allParl.filter((x) => x.districtNumber === p.districtNumber && x.id !== p.id)
    : [];
  const districtAll = p.districtNumber
    ? allParl.filter((x) => x.districtNumber === p.districtNumber)
    : [];
  const districtAvgFuel = districtAll.length
    ? Math.round(districtAll.reduce((s, x) => s + (x.fuelTrimestre || 0), 0) / districtAll.length)
    : p.fuelTrimestre;
  const diffVsDistrictPct = districtAvgFuel
    ? Math.round(((p.fuelTrimestre - districtAvgFuel) / districtAvgFuel) * 100)
    : 0;

  const regionAll = allParl.filter((x) => x.region === p.region);
  const regionAvgFuel = regionAll.length
    ? Math.round(regionAll.reduce((s, x) => s + (x.fuelTrimestre || 0), 0) / regionAll.length)
    : p.fuelTrimestre;
  const diffVsRegionPct = regionAvgFuel
    ? Math.round(((p.fuelTrimestre - regionAvgFuel) / regionAvgFuel) * 100)
    : 0;

  // Historial mensual (Enero a Mayo)
  const fh = p.fuelHistory || {
    enero: p.fuelMonthlyAvg,
    febrero: p.fuelFebreroVacaciones,
    marzo: p.fuelMonthlyAvg,
    abril: p.fuelMonthlyAvg,
    mayo: p.fuelMonthlyAvg
  };
  const monthsData = [
    { key: "enero", label: "Enero", val: fh.enero || 0, isFeb: false },
    { key: "febrero", label: "🏖️ Febrero (Vacaciones)", val: fh.febrero || 0, isFeb: true },
    { key: "marzo", label: "Marzo", val: fh.marzo || 0, isFeb: false },
    { key: "abril", label: "Abril", val: fh.abril || 0, isFeb: false },
    { key: "mayo", label: "Mayo", val: fh.mayo || 0, isFeb: false }
  ];
  const maxMonthVal = Math.max(...monthsData.map((m) => m.val), 1);

  // Cruzar noticias en vivo de Pulso Independiente relacionadas con este parlamentario
  const lastName = p.shortName.split(" ").slice(-1)[0].toLowerCase();
  const relatedArticles = (state.articles || []).filter((art) => {
    const text = `${art.title} ${art.summary}`.toLowerCase();
    return text.includes(p.shortName.toLowerCase()) || (lastName.length > 4 && text.includes(lastName));
  }).slice(0, 4);

  if (headerMeta) {
    headerMeta.innerHTML = `
      <span class="dossier-code-badge">EXPEDIENTE #${escapeHtml(p.id.toUpperCase())} · ${escapeHtml(p.chamber.toUpperCase())}</span>
    `;
  }

  body.innerHTML = `
    <!-- Ficha Principal del Parlamentario -->
    <div class="dossier-hero">
      <div class="dossier-hero-top">
        <div>
          <div class="lupa-chamber-tags" style="margin-bottom:8px;">
            <span class="lupa-tag">${escapeHtml(p.chamber)}</span>
            <span class="lupa-tag lupa-tag--party">Partido: ${escapeHtml(p.party)} (${escapeHtml(p.coalition)})</span>
            <span class="lupa-tag">📍 Región de ${escapeHtml(p.region)}</span>
            ${p.districtNumber ? `<span class="lupa-tag" style="background:rgba(217,119,6,0.15);color:var(--accent-low);font-weight:700;">🗳️ Distrito ${p.districtNumber}</span>` : ""}
            <span class="lupa-tag">Período ${escapeHtml(p.period)}</span>
          </div>
          <h2 class="dossier-name" id="dossierModalTitle">${escapeHtml(p.name)}</h2>
          <p class="dossier-meta-line">${escapeHtml(p.districtOrCirc)} — <em>${escapeHtml(p.territoryType)}</em></p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${districtPeers.length > 0 ? `
            <button type="button" class="btn-open-dossier" data-compare-pair="${escapeHtml([p.id, ...districtPeers.map((x) => x.id)].join(","))}" style="padding:8px 12px;background:var(--accent-low);">
              ⚖️ Comparar con diputados de su Distrito ${p.districtNumber}
            </button>
          ` : (regionalPeers.length > 0 ? `
            <button type="button" class="btn-open-dossier" data-compare-pair="${escapeHtml([p.id, ...regionalPeers.slice(0, 2).map((x) => x.id)].join(","))}" style="padding:8px 12px;">
              ⚖️ Comparar con su misma Región (${escapeHtml(p.region)})
            </button>
          ` : "")}
          <a href="${escapeHtml(p.officialProfileUrl)}" target="_blank" rel="noopener noreferrer" class="btn-dossier-share" style="text-decoration:none;display:inline-flex;align-items:center;">
            🏛️ Fuente Oficial Transparencia ↗
          </a>
        </div>
      </div>

      <!-- 4 Indicadores Clave del Expediente -->
      <div class="dossier-summary-grid">
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">⛽ Bencina (Trimestre Mar–May)</span>
          <div class="dossier-stat-v" style="color:var(--accent-high);">${formatCLP(p.fuelTrimestre)}</div>
          <div class="dossier-stat-sub">${formatCLP(p.fuelMonthlyAvg)}/mes · Equivale a ${minWagesTrimestre} sueldos mínimos</div>
        </div>
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">🏖️ Gasto en Vacaciones (Febrero)</span>
          <div class="dossier-stat-v" style="color:var(--accent-low);">${formatCLP(p.fuelFebreroVacaciones)}</div>
          <div class="dossier-stat-sub">${febPct}% de lo que gasta en un mes normal con Congreso abierto</div>
        </div>
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">🏛️ Asistencia Real vs. Oficial</span>
          <div class="dossier-stat-v">${p.attendance?.realPct ?? 90}% real</div>
          <div class="dossier-stat-sub">Asistió a ${p.attendance?.sessionsPresent}/${p.attendance?.sessionsTotal} sesiones (${p.attendance?.sessionsJustified || 0} con permiso/licencia · Oficial: ${p.attendance?.officialPct}%)</div>
        </div>
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">💰 Costo Mensual Total Estado</span>
          <div class="dossier-stat-v">${formatCLP(totalMonthlyCostToState)}/mes</div>
          <div class="dossier-stat-sub">Dieta ($8,23M) + Operacional (${formatCLP(p.operationalTotalMonthly)}) · ~${formatCLP(costPerSessionAttended)} por sesión asistida</div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 1: Auditoría de Combustible, Vacaciones de Febrero y Vehículos -->
    <div class="dossier-section">
      <h3 class="dossier-section-title">⛽ 1. Auditoría de Combustible, Vacaciones (Febrero) y Flota</h3>
      <p class="dossier-section-desc">
        Evolución mensual rendida en Transparencia Activa. En <strong>febrero</strong> el Congreso en Valparaíso permanece cerrado por receso legislativo (vacaciones).
      </p>

      <!-- Gráfico de barras Enero a Mayo -->
      <div class="dossier-month-chart">
        ${monthsData.map((m) => {
          const hPct = Math.max(8, Math.round((m.val / maxMonthVal) * 100));
          return `
            <div class="month-col ${m.isFeb ? "month-col--feb" : ""}">
              <span class="month-val">${formatCLP(m.val)}</span>
              <div class="month-bar-wrap">
                <div class="month-bar" style="height:${hPct}%"></div>
              </div>
              <span class="month-lbl">${m.label}</span>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Calculadora Ciudadana y Contraste Territorial -->
      <div class="dossier-summary-grid" style="margin-top:10px;">
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">🧮 Equivalencia Física del Gasto</span>
          <div class="dossier-stat-v">~${monthlyLiters.toLocaleString("es-CL")} litros / mes</div>
          <div class="dossier-stat-sub">Equivale a recorrer <strong>~${monthlyKm.toLocaleString("es-CL")} km todos los meses</strong> (~${dailyKm} km diarios de lunes a domingo).</div>
        </div>
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">📍 Comparación con su propia Región (${escapeHtml(p.region)})</span>
          <div class="dossier-stat-v" style="color:${diffVsRegionPct > 15 ? "var(--accent-high)" : "var(--text-primary)"};">
            ${diffVsRegionPct > 0 ? `+${diffVsRegionPct}% sobre` : `${diffVsRegionPct}% bajo`} el promedio regional
          </div>
          <div class="dossier-stat-sub">Promedio en Región de ${escapeHtml(p.region)}: ${formatCLP(regionAvgFuel)} en el trimestre.</div>
        </div>
        <div class="dossier-stat-box">
          <span class="dossier-stat-k">🚗 Flota y Arriendo Fiscal</span>
          <div class="dossier-stat-v">${p.registeredVehiclesCount || 2} vehículos inscritos</div>
          <div class="dossier-stat-sub">Gasto adicional en arriendo de vehículos: <strong>${formatCLP(p.vehicleLeaseMonthly)}/mes</strong>.</div>
        </div>
      </div>

      <div class="dossier-justification-box">
        <strong>🗣️ ¿Qué justificación se da para este gasto?</strong><br/>
        ${escapeHtml(p.justificationSummary)}
      </div>

      <!-- Tabla de Vehículos Declarados (InfoProbidad) -->
      <table class="dossier-vehicles-table">
        <thead>
          <tr>
            <th>Vehículo Declarado (InfoProbidad)</th>
            <th>Año</th>
            <th>Avalúo Fiscal</th>
            <th>Placa Patente</th>
          </tr>
        </thead>
        <tbody>
          ${(p.patrimonyVehicles || []).map((v) => `
            <tr>
              <td><strong>${escapeHtml(v.type)}</strong></td>
              <td>${escapeHtml(String(v.year))}</td>
              <td style="font-family:var(--font-mono);">${formatCLP(v.avaluo)}</td>
              <td><span class="lupa-tag">${escapeHtml(v.plateStatus)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- SECCIÓN 2: Escándalos, Controversias e Investigaciones Periodísticas -->
    <div class="dossier-section">
      <h3 class="dossier-section-title">🚨 2. Escándalos, Controversias e Investigaciones a su Persona</h3>
      <p class="dossier-section-desc">
        Registro de investigaciones periodísticas, cuestionamientos éticos, casos de colusión/cohecho o anomalías detectadas en el uso de recursos públicos.
      </p>
      ${(p.controversies && p.controversies.length > 0) ? `
        <div class="dossier-timeline-list">
          ${p.controversies.map((c) => `
            <div class="dossier-case-card">
              <div class="dossier-case-top">
                <span class="dossier-case-year">AÑO ${escapeHtml(String(c.year))} · ${escapeHtml(c.category.toUpperCase())}</span>
                <span class="lupa-alert-pill ${c.severity === "alta" ? "lupa-alert-pill--danger" : "lupa-alert-pill--amber"}">
                  Gravedad ${escapeHtml(c.severity.toUpperCase())}
                </span>
              </div>
              <div class="dossier-case-title">${escapeHtml(c.title)}</div>
              <p class="dossier-case-desc">${escapeHtml(c.summary)}</p>
              <div style="margin-top:8px;font-size:0.78rem;">
                <a href="${escapeHtml(c.sourceUrl || "#")}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-low);font-weight:600;">
                  📰 Fuente investigadora: ${escapeHtml(c.source)} ↗
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="dossier-justification-box" style="border-left-color:var(--accent-indep);">
          <strong>✅ Sin escándalos de corrupción o colusión documentados en este expediente:</strong> No registra controversias graves de financiamiento ilegal o desvío de fondos en las auditorías revisadas. Puedes contrastar su nivel de gasto operacional con los demás representantes de su región más abajo.
        </div>
      `}
    </div>

    <!-- SECCIÓN 3: Causas Judiciales, Demandas, Desafueros y Estado Legal -->
    <div class="dossier-section">
      <h3 class="dossier-section-title">⚖️ 3. Historial Judicial, Demandas y Estado de Causas</h3>
      <p class="dossier-section-desc">
        Causas penales, solicitudes de desafuero, querellas o procedimientos en Fiscalía, Contraloría y Tribunales de Justicia, indicando la razón y si están activas o resueltas.
      </p>
      ${(p.judicialRecords && p.judicialRecords.length > 0) ? `
        <div class="dossier-timeline-list">
          ${p.judicialRecords.map((j) => {
            const pillClass = (j.statusType === "active" || j.statusType === "sanctioned")
              ? "lupa-alert-pill--danger"
              : (j.statusType === "resolved" ? "lupa-alert-pill--amber" : "lupa-alert-pill--clean");
            return `
              <div class="dossier-case-card" style="border-left-color:${j.statusType === "active" ? "var(--accent-danger)" : "var(--accent-low)"};">
                <div class="dossier-case-top">
                  <span class="dossier-case-year">${escapeHtml(String(j.year))} · ${escapeHtml(j.courtOrBody)}</span>
                  <span class="lupa-alert-pill ${pillClass}">
                    Estado: ${escapeHtml(j.status)}
                  </span>
                </div>
                <div class="dossier-case-title">${escapeHtml(j.caseName)}</div>
                <p class="dossier-case-desc"><strong>Razón / Materia:</strong> ${escapeHtml(j.reason)}</p>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="dossier-justification-box" style="border-left-color:var(--accent-indep);">
          <strong>✅ Sin causas judiciales ni demandas penales activas registradas:</strong> No figura con procesos de desafuero ni imputaciones penales vigentes en los registros públicos consultados.
        </div>
      `}
    </div>

    <!-- SECCIÓN 4: Red de Relacionados — Seguir Investigando (Misma Región y Mismo Partido) -->
    <div class="dossier-section">
      <h3 class="dossier-section-title">🕸️ 4. Seguir Investigando: Comparar con su Misma Región y Partido</h3>
      <p class="dossier-section-desc">
        Haz clic en cualquier parlamentario relacionado para abrir su expediente o compararlos cara a cara y verificar si la distancia geográfica o el partido justifican su gasto.
      </p>

      ${districtPeers.length > 0 ? `
        <div style="background:rgba(217, 119, 6, 0.08);border:1px solid rgba(217, 119, 6, 0.25);border-radius:10px;padding:14px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <h4 style="font-family:var(--font-mono);font-size:0.82rem;text-transform:uppercase;color:var(--accent-low);margin:0;">
              🏛️ Compañeros del MISMO Distrito ${p.districtNumber} (Mismas labores territoriales)
            </h4>
            <button type="button" class="btn-dossier-share" data-compare-pair="${escapeHtml([p.id, ...districtPeers.map(x => x.id)].join(','))}" style="font-size:0.75rem;padding:4px 8px;">
              ⚖️ Comparar a todos en el Distrito ${p.districtNumber}
            </button>
          </div>
          <p style="font-size:0.78rem;color:var(--text-secondary);margin:0 0 10px;">
            Representan exactamente a las mismas comunas: ${(p.communes || []).slice(0, 6).join(", ")}${(p.communes || []).length > 6 ? "..." : ""}. Compara quién gasta más y quién gasta menos teniendo las mismas funciones:
          </p>
          <div class="dossier-peers-grid">
            ${districtPeers.map((peer) => {
              const diff = p.fuelTrimestre ? Math.round(((peer.fuelTrimestre - p.fuelTrimestre) / p.fuelTrimestre) * 100) : 0;
              return `
                <div class="dossier-peer-card" style="border-left:3px solid var(--accent-low);">
                  <div>
                    <div class="lupa-chamber-tags" style="margin-bottom:4px;">
                      <span class="lupa-tag lupa-tag--party">${escapeHtml(peer.party)}</span>
                      <span class="lupa-tag">${escapeHtml(peer.chamber)}</span>
                    </div>
                    <div class="dossier-peer-name" data-open-dossier="${escapeHtml(peer.id)}">${escapeHtml(peer.shortName)}</div>
                    <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                      Bencina Trimestre: <strong>${formatCLP(peer.fuelTrimestre)}</strong> · Feb: ${formatCLP(peer.fuelFebreroVacaciones)}
                    </div>
                    <div class="dossier-peer-diff" style="color:${diff < 0 ? "#7ab88a" : "var(--accent-high)"};margin-top:4px;">
                      ${diff < 0 ? `Gasta ${Math.abs(diff)}% MENOS en este distrito` : `Gasta +${diff}% MÁS en este distrito`}
                    </div>
                  </div>
                  <div class="dossier-peer-actions">
                    <button type="button" class="btn-peer-investigate" data-open-dossier="${escapeHtml(peer.id)}">
                      🕵️ Ver expediente
                    </button>
                    <button type="button" class="btn-peer-investigate" data-compare-pair="${escapeHtml(p.id)},${escapeHtml(peer.id)}">
                      ⚖️ Cara a cara
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : ""}

      <h4 style="font-family:var(--font-mono);font-size:0.78rem;text-transform:uppercase;color:var(--accent-low);margin:10px 0 8px;">
        📍 Parlamentarios de su misma Región (${escapeHtml(p.region)})
      </h4>
      ${regionalPeers.length > 0 ? `
        <div class="dossier-peers-grid">
          ${regionalPeers.map((peer) => {
            const diff = p.fuelTrimestre
              ? Math.round(((peer.fuelTrimestre - p.fuelTrimestre) / p.fuelTrimestre) * 100)
              : 0;
            return `
              <div class="dossier-peer-card">
                <div>
                  <div class="lupa-chamber-tags" style="margin-bottom:4px;">
                    <span class="lupa-tag">${escapeHtml(peer.chamber)}</span>
                    <span class="lupa-tag lupa-tag--party">${escapeHtml(peer.party)}</span>
                  </div>
                  <div class="dossier-peer-name" data-open-dossier="${escapeHtml(peer.id)}">${escapeHtml(peer.shortName)}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                    Bencina Trimestre: <strong>${formatCLP(peer.fuelTrimestre)}</strong> · Feb: ${formatCLP(peer.fuelFebreroVacaciones)}
                  </div>
                  <div class="dossier-peer-diff" style="color:${diff < 0 ? "#7ab88a" : "var(--accent-high)"};margin-top:4px;">
                    ${diff < 0 ? `Gasta ${Math.abs(diff)}% MENOS en la misma región` : `Gasta +${diff}% MÁS en la misma región`}
                  </div>
                </div>
                <div class="dossier-peer-actions">
                  <button type="button" class="btn-peer-investigate" data-open-dossier="${escapeHtml(peer.id)}">
                    🕵️ Ver expediente
                  </button>
                  <button type="button" class="btn-peer-investigate" data-compare-pair="${escapeHtml(p.id)},${escapeHtml(peer.id)}">
                    ⚖️ Comparar
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `<p style="font-size:0.84rem;color:var(--text-muted);">No hay otros parlamentarios de esta misma región en la muestra actual.</p>`}

      <h4 style="font-family:var(--font-mono);font-size:0.78rem;text-transform:uppercase;color:var(--accent-low);margin:18px 0 8px;">
        🏳️ Compañeros de su mismo Partido / Bancada (${escapeHtml(p.party)})
      </h4>
      ${partyPeers.length > 0 ? `
        <div class="dossier-peers-grid">
          ${partyPeers.slice(0, 4).map((peer) => `
            <div class="dossier-peer-card">
              <div>
                <div class="lupa-chamber-tags" style="margin-bottom:4px;">
                  <span class="lupa-tag">${escapeHtml(peer.chamber)}</span>
                  <span class="lupa-tag">📍 ${escapeHtml(peer.region)}</span>
                </div>
                <div class="dossier-peer-name" data-open-dossier="${escapeHtml(peer.id)}">${escapeHtml(peer.shortName)}</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                  Bencina Trimestre: <strong>${formatCLP(peer.fuelTrimestre)}</strong> · Asistencia: ${peer.attendance?.realPct}%
                </div>
              </div>
              <div class="dossier-peer-actions">
                <button type="button" class="btn-peer-investigate" data-open-dossier="${escapeHtml(peer.id)}">
                  🕵️ Investigar
                </button>
                <button type="button" class="btn-peer-investigate" data-compare-pair="${escapeHtml(p.id)},${escapeHtml(peer.id)}">
                  ⚖️ Comparar
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `<p style="font-size:0.84rem;color:var(--text-muted);">Parlamentario independiente o sin otros miembros del mismo partido en la muestra.</p>`}

      ${relatedArticles.length > 0 ? `
        <h4 style="font-family:var(--font-mono);font-size:0.78rem;text-transform:uppercase;color:var(--accent-low);margin:18px 0 8px;">
          📰 Noticias Recientes en Pulso Independiente vinculadas a este expediente
        </h4>
        <div class="dossier-timeline-list">
          ${relatedArticles.map((art) => `
            <div class="dossier-case-card" style="cursor:pointer;" data-open-reader="${escapeHtml(art.id)}">
              <div class="dossier-case-top">
                <span class="dossier-case-year">${escapeHtml(art.sourceName)} · ${formatRelativeTime(art.publishedAt)}</span>
                <span class="lupa-tag">Leer reportaje ↗</span>
              </div>
              <div class="dossier-case-title">${escapeHtml(art.title)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;

  modal.classList.remove("hidden");
  body.scrollTop = 0;
}

function openParliamentCompareModal(idsArray) {
  const allParl = (state.lupaData && state.lupaData.parlamentarios) ? state.lupaData.parlamentarios : [];
  const items = idsArray.map((id) => allParl.find((p) => p.id === id)).filter(Boolean);
  if (items.length < 1) return;

  const modal = document.getElementById("parliamentCompareModal");
  const body = document.getElementById("compareModalBody");
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Indicador de Fiscalización</th>
            ${items.map((p) => `
              <th>
                <div style="font-family:var(--font-serif);font-size:1.25rem;color:var(--text-primary);text-transform:none;">
                  ${escapeHtml(p.shortName)}
                </div>
                <div style="margin-top:4px;">${escapeHtml(p.chamber)} · ${escapeHtml(p.party)} · 📍 ${escapeHtml(p.region)}</div>
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>📍 Territorio / Distrito</strong></td>
            ${items.map((p) => `<td>${escapeHtml(p.districtOrCirc)}<br/><small style="color:var(--text-muted);">${escapeHtml(p.territoryType)}</small></td>`).join("")}
          </tr>
          <tr>
            <td><strong>⛽ Combustible (Trimestre Mar–May)</strong></td>
            ${items.map((p) => `<td style="font-family:var(--font-mono);font-size:1.05rem;font-weight:700;color:var(--accent-high);">${formatCLP(p.fuelTrimestre)}<br/><small style="font-weight:400;color:var(--text-secondary);">${formatCLP(p.fuelMonthlyAvg)}/mes</small></td>`).join("")}
          </tr>
          <tr>
            <td><strong>🏖️ Gasto en Vacaciones (Febrero)</strong></td>
            ${items.map((p) => {
              const pct = p.fuelMonthlyAvg ? Math.round((p.fuelFebreroVacaciones / p.fuelMonthlyAvg) * 100) : 0;
              return `<td style="font-family:var(--font-mono);font-weight:700;color:var(--accent-low);">${formatCLP(p.fuelFebreroVacaciones)}<br/><small style="font-weight:400;color:var(--text-secondary);">${pct}% de un mes normal</small></td>`;
            }).join("")}
          </tr>
          <tr>
            <td><strong>🚗 Vehículos Inscritos y Arriendo</strong></td>
            ${items.map((p) => `<td><strong>${p.registeredVehiclesCount} vehículos</strong> con tarjeta fiscal<br/><small style="color:var(--text-secondary);">Arriendo: ${formatCLP(p.vehicleLeaseMonthly)}/mes</small></td>`).join("")}
          </tr>
          <tr>
            <td><strong>🏛️ Asistencia Real vs. Oficial</strong></td>
            ${items.map((p) => `<td><strong>${p.attendance?.realPct}% real</strong> (${p.attendance?.sessionsPresent}/${p.attendance?.sessionsTotal} sesiones)<br/><small style="color:var(--text-secondary);">Oficial reportada: ${p.attendance?.officialPct}% (${p.attendance?.sessionsJustified} con permiso/licencia)</small></td>`).join("")}
          </tr>
          <tr>
            <td><strong>💰 Gasto Operacional Mensual</strong></td>
            ${items.map((p) => `<td style="font-family:var(--font-mono);">${formatCLP(p.operationalTotalMonthly)}/mes<br/><small style="color:var(--text-secondary);">+ Dieta de $8.239.091</small></td>`).join("")}
          </tr>
          <tr>
            <td><strong>🚨 Controversias e Investigaciones</strong></td>
            ${items.map((p) => `<td>${
              (p.controversies && p.controversies.length)
                ? p.controversies.map((c) => `<div style="margin-bottom:6px;">• <strong>(${c.year})</strong> ${escapeHtml(c.title)}</div>`).join("")
                : `<span style="color:#7ab88a;">✅ Sin controversias registradas</span>`
            }</td>`).join("")}
          </tr>
          <tr>
            <td><strong>⚖️ Historial Judicial y Estado</strong></td>
            ${items.map((p) => `<td>${
              (p.judicialRecords && p.judicialRecords.length)
                ? p.judicialRecords.map((j) => `<div style="margin-bottom:6px;">• <strong>${escapeHtml(j.caseName)}:</strong> <em>${escapeHtml(j.status)}</em></div>`).join("")
                : `<span style="color:#7ab88a;">✅ Sin causas judiciales registradas</span>`
            }</td>`).join("")}
          </tr>
          <tr>
            <td><strong>Acción</strong></td>
            ${items.map((p) => `
              <td>
                <button type="button" class="btn-open-dossier" data-open-dossier="${escapeHtml(p.id)}" style="width:100%;">
                  🕵️ Ver Expediente de ${escapeHtml(p.shortName)}
                </button>
              </td>
            `).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  modal.classList.remove("hidden");
}

// Delegación global de eventos para Lupa Parlamentaria
document.addEventListener("click", (e) => {
  // Cambiar lente de investigación
  const lensBtn = e.target.closest("[data-lupa-lens]");
  if (lensBtn) {
    state.lupaLens = lensBtn.getAttribute("data-lupa-lens");
    updateLupaDynamicContent();
    return;
  }

  // Abrir expediente de un parlamentario
  const openDossierTrigger = e.target.closest("[data-open-dossier]");
  if (openDossierTrigger) {
    const polId = openDossierTrigger.getAttribute("data-open-dossier");
    document.getElementById("parliamentCompareModal")?.classList.add("hidden");
    openParliamentDossier(polId);
    return;
  }

  // Agregar / quitar parlamentario de la bandeja de comparación
  const toggleCompareBtn = e.target.closest("[data-toggle-compare]");
  if (toggleCompareBtn) {
    const polId = toggleCompareBtn.getAttribute("data-toggle-compare");
    const idx = state.lupaCompareIds.indexOf(polId);
    if (idx >= 0) {
      state.lupaCompareIds.splice(idx, 1);
    } else {
      if (state.lupaCompareIds.length >= 3) {
        showToast("Puedes comparar hasta 3 parlamentarios a la vez ⚖️");
        return;
      }
      state.lupaCompareIds.push(polId);
    }
    updateLupaDynamicContent();
    return;
  }

  // Comparar par o grupo directo (desde banner regional o desde expediente)
  const comparePairBtn = e.target.closest("[data-compare-pair]");
  if (comparePairBtn) {
    const ids = comparePairBtn.getAttribute("data-compare-pair").split(",").filter(Boolean);
    openParliamentCompareModal(ids);
    return;
  }

  // Botón abrir modal comparador desde la bandeja
  if (e.target.closest("#openCompareModalBtn")) {
    openParliamentCompareModal(state.lupaCompareIds);
    return;
  }

  // Botón vaciar bandeja comparadora
  if (e.target.closest("#clearCompareTrayBtn")) {
    state.lupaCompareIds = [];
    updateLupaDynamicContent();
    return;
  }

  // Compartir enlace directo a un expediente parlamentario
  if (e.target.closest("#dossierShareLinkBtn")) {
    if (!state.activeDossierId) return;
    const shareUrl = `${CANONICAL_SITE_URL}/?politico=${encodeURIComponent(state.activeDossierId)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("¡Enlace directo al expediente copiado al portapapeles! 🔗");
      });
    } else {
      showToast("Enlace: " + shareUrl);
    }
  }
});

document.addEventListener("DOMContentLoaded", initApp);

