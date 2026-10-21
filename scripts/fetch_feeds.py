import json
import re
import html
import gzip
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from concurrent.futures import ThreadPoolExecutor
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


SOURCES = [
    # CHILE - Independientes / Investigación / Regionales
    {
        "id": "ciper",
        "name": "CIPER Chile",
        "url": "https://www.ciperchile.cl/feed/",
        "site": "https://www.ciperchile.cl",
        "region": "chile",
        "type": "Investigación Independiente",
        "independent": True,
        "baseWeight": 92
    },
    {
        "id": "interferencia",
        "name": "Interferencia",
        "url": "https://interferencia.cl/rss.xml",
        "site": "https://interferencia.cl",
        "region": "chile",
        "type": "Investigación Independiente",
        "independent": True,
        "baseWeight": 88
    },
    {
        "id": "fastcheck",
        "name": "Fast Check CL",
        "url": "https://www.fastcheck.cl/feed/",
        "site": "https://www.fastcheck.cl",
        "region": "chile",
        "type": "Fact-Checking Independiente",
        "independent": True,
        "baseWeight": 85
    },
    {
        "id": "radiouchile",
        "name": "Radio U. de Chile",
        "url": "https://radio.uchile.cl/feed/",
        "site": "https://radio.uchile.cl",
        "region": "chile",
        "type": "Universitario / Pluralista",
        "independent": True,
        "baseWeight": 84
    },
    {
        "id": "resumen",
        "name": "Resumen.cl (Biobío)",
        "url": "https://news.google.com/rss/search?q=site:resumen.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://resumen.cl",
        "region": "chile",
        "type": "Prensa Independiente Regional",
        "independent": True,
        "baseWeight": 70
    },
    {
        "id": "laderasur",
        "name": "Ladera Sur",
        "url": "https://news.google.com/rss/search?q=site:laderasur.com&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://laderasur.com",
        "region": "chile",
        "type": "Naturaleza y Ciencia Indep.",
        "independent": True,
        "baseWeight": 72
    },
    {
        "id": "timeline",
        "name": "Timeline Antofagasta",
        "url": "https://timeline.cl/feed/",
        "site": "https://timeline.cl",
        "region": "chile",
        "type": "Regional Independiente (Norte)",
        "independent": True,
        "baseWeight": 68
    },
    {
        "id": "diariouach",
        "name": "Diario UACh (Valdivia)",
        "url": "https://diario.uach.cl/feed/",
        "site": "https://diario.uach.cl",
        "region": "chile",
        "type": "Regional / Ciencia (Sur)",
        "independent": True,
        "baseWeight": 65
    },
    {
        "id": "elmostrador",
        "name": "El Mostrador",
        "url": "https://news.google.com/rss/search?q=site:elmostrador.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://www.elmostrador.cl",
        "region": "chile",
        "type": "Digital Independiente",
        "independent": True,
        "baseWeight": 82
    },
    {
        "id": "eldesconcierto",
        "name": "El Desconcierto",
        "url": "https://news.google.com/rss/search?q=site:eldesconcierto.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://eldesconcierto.cl",
        "region": "chile",
        "type": "Periodismo Independiente",
        "independent": True,
        "baseWeight": 78
    },
    {
        "id": "elciudadano",
        "name": "El Ciudadano",
        "url": "https://www.elciudadano.com/feed/",
        "site": "https://www.elciudadano.com",
        "region": "chile",
        "type": "Prensa Alternativa",
        "independent": True,
        "baseWeight": 74
    },
    {
        "id": "cooperativa",
        "name": "Radio Cooperativa",
        "url": "https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml",
        "site": "https://www.cooperativa.cl",
        "region": "chile",
        "type": "Radio Informativa Nacional",
        "independent": False,
        "baseWeight": 78
    },

    # CICLISMO - Especializado Chile y Mundo (Todas las disciplinas)
    {
        "id": "ciclismo-chile",
        "name": "Ciclismo Chile",
        "url": "https://news.google.com/rss/search?q=ciclismo+OR+ciclista+OR+bicicleta+Chile&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://news.google.com",
        "region": "chile",
        "type": "Ciclismo y Deporte Nacional",
        "independent": True,
        "baseWeight": 88
    },
    {
        "id": "ciclo21",
        "name": "Ciclo 21",
        "url": "https://www.ciclo21.com/feed/",
        "site": "https://www.ciclo21.com",
        "region": "mundo",
        "type": "Periodismo Ciclista Especializado",
        "independent": True,
        "baseWeight": 86
    },
    {
        "id": "brujulabike",
        "name": "Brújula Bike",
        "url": "https://brujulabike.com/feed/",
        "site": "https://brujulabike.com",
        "region": "mundo",
        "type": "MTB, Gravel y Competición",
        "independent": True,
        "baseWeight": 85
    },
    {
        "id": "esciclismo",
        "name": "EsCiclismo",
        "url": "https://www.esciclismo.com/rss/",
        "site": "https://www.esciclismo.com",
        "region": "mundo",
        "type": "Ciclismo Global y Pruebas UCI",
        "independent": True,
        "baseWeight": 85
    },

    # MUNDO - Independientes / Investigación / Cooperativas
    {
        "id": "globalvoices",
        "name": "Global Voices ES",
        "url": "https://es.globalvoices.org/feed/",
        "site": "https://es.globalvoices.org",
        "region": "mundo",
        "type": "Periodismo Ciudadano Global",
        "independent": True,
        "baseWeight": 72
    },
    {
        "id": "elsalto",
        "name": "El Salto Diario",
        "url": "https://news.google.com/rss/search?q=site:elsaltodiario.com&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://www.elsaltodiario.com",
        "region": "mundo",
        "type": "Cooperativa Independiente",
        "independent": True,
        "baseWeight": 80
    },
    {
        "id": "eldiarioes",
        "name": "elDiario.es",
        "url": "https://www.eldiario.es/rss/",
        "site": "https://www.eldiario.es",
        "region": "mundo",
        "type": "Independiente de Socios",
        "independent": True,
        "baseWeight": 83
    },
    {
        "id": "jacobinlat",
        "name": "Jacobin América Latina",
        "url": "https://jacobinlat.com/feed/",
        "site": "https://jacobinlat.com",
        "region": "mundo",
        "type": "Análisis Latinoamericano",
        "independent": True,
        "baseWeight": 74
    },
    {
        "id": "sinpermiso",
        "name": "Sin Permiso",
        "url": "https://www.sinpermiso.info/rss.xml",
        "site": "https://www.sinpermiso.info",
        "region": "mundo",
        "type": "Análisis Internacional Indep.",
        "independent": True,
        "baseWeight": 71
    },
    {
        "id": "brecha",
        "name": "Semanario Brecha (LatAm)",
        "url": "https://news.google.com/rss/search?q=site:brecha.com.uy&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://brecha.com.uy",
        "region": "mundo",
        "type": "Periodismo Indep. LatAm",
        "independent": True,
        "baseWeight": 73
    },
    {
        "id": "bellingcat",
        "name": "Bellingcat",
        "url": "https://www.bellingcat.com/feed/",
        "site": "https://www.bellingcat.com",
        "region": "mundo",
        "type": "Investigación OSINT",
        "independent": True,
        "baseWeight": 90
    },
    {
        "id": "theintercept",
        "name": "The Intercept",
        "url": "https://theintercept.com/feed/?lang=en",
        "site": "https://theintercept.com",
        "region": "mundo",
        "type": "Investigación Independiente",
        "independent": True,
        "baseWeight": 90
    },
    {
        "id": "propublica",
        "name": "ProPublica",
        "url": "https://feeds.propublica.org/propublica/main",
        "site": "https://www.propublica.org",
        "region": "mundo",
        "type": "Investigación Sin Fines de Lucro",
        "independent": True,
        "baseWeight": 91
    },
    {
        "id": "dw",
        "name": "DW Español",
        "url": "https://rss.dw.com/xml/rss-sp-all",
        "site": "https://www.dw.com/es",
        "region": "mundo",
        "type": "Medio Público Internacional",
        "independent": False,
        "baseWeight": 80
    },
    {
        "id": "france24",
        "name": "France 24 Español",
        "url": "https://www.france24.com/es/rss",
        "site": "https://www.france24.com/es",
        "region": "mundo",
        "type": "Medio Público Internacional",
        "independent": False,
        "baseWeight": 80
    }
]

BLACKLIST_PATTERNS = [
    # Filtro estricto anti-fútbol (manteniendo otros deportes intactos)
    r"\bf[uú]tbol\b",
    r"\bfutbolero\b",
    r"\bbalompi[eé]\b",
    r"\bpeloteros?\b",
    r"\bcolo[- ]colo\b",
    r"\bcacique\b",
    r"\buniversidad de chile\b",
    r"\brom[aá]ntico viajero\b",
    r"\buniversidad cat[oó]lica\b",
    r"\bcruzados?\b",
    r"\bcobreloa\b",
    r"\bhuachipato\b",
    r"\bcoquimbo unido\b",
    r"\bpalestino\b",
    r"\baudax italiano\b",
    r"\buni[oó]n espa[ñn]ola\b",
    r"\bdeportes iquique\b",
    r"\bcampeonato nacional\b",
    r"\bprimera divisi[oó]n\b",
    r"\bprimera b\b",
    r"\banfp\b",
    r"\bconmebol\b",
    r"\bfifa\b",
    r"\buefa\b",
    r"\bcopa libertadores\b",
    r"\bcopa sudamericana\b",
    r"\bchampions league\b",
    r"\beuropa league\b",
    r"\bcopa am[eé]rica\b",
    r"\bcopa chile\b",
    r"\bla roja\b",
    r"\bselecci[oó]n chilena\b",
    r"\bclasificatorias\b",
    r"\bgareca\b",
    r"\bberizzo\b",
    r"\barturo vidal\b",
    r"\balexis s[aá]nchez\b",
    r"\bclaudio bravo\b",
    r"\bgary medel\b",
    r"\bcharles ar[aá]nguiz\b",
    r"\brodrigo goldberg\b",
    r"\bbarticciotto\b",
    r"\bjordhy thompson\b",
    r"\bdt de\b",
    r"\bdirector t[eé]cnico\b",
    r"\bgol de\b",
    r"\bgoles de\b",
    r"\bgoleador\b",
    r"\bpenales?\b",
    r"\btiro de esquina\b",
    r"\bguardameta\b",
    r"\barquero\b",
    r"\bdelantero\b",
    r"\bmediocampista\b",
    r"\boffside\b",
    r"\bfuera de juego\b",
    r"\blamine yamal\b",
    r"\bmbapp[eé]\b",
    r"\bmessi\b",
    r"\bcristiano ronaldo\b",
    r"\bcr7\b",
    r"\bhaaland\b",
    r"\bvinicius\b",
    r"\breal madrid\b",
    r"\bbarcelona fc\b",
    r"\bmanchester city\b",
    r"\bliverpool\b",
    r"\bboca juniors\b",
    r"\briver plate\b",
    r"\bfar[aá]ndula\b",
    r"\breality\b",
    r"\brealities\b",
    r"\bgran hermano\b",
    r"\btierra brava\b",
    r"\bganar o servir\b",
    r"\bmundos opuestos\b",
    r"\bhor[oó]scopo\b",
    r"\bzodiaco\b",
    r"\btarot\b",
    r"\bchismes?\b",
    r"\bquiebre amoroso\b",
    r"\bnueva pareja\b",
    r"\binfidelidad\b",
    r"\bkardashian\b",
    r"\bgossip\b",
    r"\bred carpet\b",
    r"\bmiss universo\b",
    r"\breina de vi[ñn]a\b",
    r"\bpol[eé]mica entre famosos\b"
]


CYCLING_PATTERNS = [
    r"\bciclismo\b", r"\bciclista[s]?\b", r"\bbicicleta[s]?\b", r"\bbici[s]?\b",
    r"\bmountain bike\b", r"\bmtb\b", r"\bgravel\b", r"\bciclocr[oó]s\b", r"\bbmx\b",
    r"\bciclismo de ruta\b", r"\bciclismo en pista\b", r"\bvel[oó]dromo\b",
    r"\btour de fran\b", r"\bgiro d[e']\b", r"\bvuelta a espa[ñn]a\b", r"\bvuelta a chile\b",
    r"\bcontrarreloj\b", r"\bmaillot\b", r"\bpar[ií]s[- ]roubaix\b", r"\bmonumentos ciclistas\b",
    r"\bpogacar\b", r"\bvingegaard\b", r"\bevenepoel\b", r"\broglic\b", r"\bnairo\b",
    r"\bcarapaz\b", r"\bvidaurre\b", r"\bcatalina soto\b", r"\bmacarena p[eé]rez\b",
    r"\bfecichile\b"
]

GENERAL_SPORTS_PATTERNS = [
    r"\batletismo\b", r"\bmarat[oó]n\b", r"\btenis\b",
    r"\bnataci[oó]n\b", r"\bb[aá]squetbol\b", r"\bbaloncesto\b", r"\brugby\b",
    r"\bvoleibol\b", r"\bgimnasia\b", r"\bartes marciales\b", r"\bboxeo\b",
    r"\bjudo\b", r"\btaekwondo\b", r"\besgrima\b", r"\bcanotaje\b", r"\bescalada deportiva\b",
    r"\bjuegos ol[ií]mpicos\b", r"\bpanamericanos\b", r"\bparal[ií]mpicos\b",
    r"\btriatl[oó]n\b", r"\bironman\b"
]

HIGH_IMPACT_KEYWORDS = [
    "investigación", "investigacion", "corrupción", "corrupcion", "fiscalía", "fiscalia",
    "corte suprema", "congreso", "senado", "diputados", "gobierno", "presidente",
    "constitución", "constitucion", "derechos humanos", "ddhh", "economía", "economia",
    "inflación", "inflacion", "presupuesto", "banco central", "litio", "cobre",
    "codelco", "conflicto", "guerra", "tratado", "onu", "crisis", "cambio climático",
    "sequía", "contaminación", "extractivismo", "licitación", "contraloría",
    "impuestos", "reforma", "pensiones", "afp", "isapre", "salud pública", "educación",
    "seguridad", "crimen organizado", "transparencia", "filtración", "exclusivo",
    "investigation", "supreme court", "government", "war", "climate", "sanctions",
    "intelligence", "surveillance", "military", "election", "economy"
]

LOW_RADAR_KEYWORDS = [
    "local", "regional", "comuna", "barrio", "vecinos", "comunidad", "rural",
    "hallazgo", "especie", "biodiversidad", "flora", "fauna", "arqueología",
    "historia", "archivo", "memoria", "patrimonio", "universidad", "estudio",
    "astronóm", "ciencia", "tecnología", "cooperativa", "oficio", "crónica",
    "libro", "ensayo", "documental", "valdivia", "antofagasta", "biobío", "concepción",
    "chiloé", "patagonia", "atacama", "campesino", "indígena", "mapuche", "agua",
    "humedal", "glaciar", "conservación", "seminario", "coloquio"
]

GENERIC_IMAGE_PATTERNS = [
    r'el-ciudadano-img',
    r'icono-twitter',
    r'twitter-icon',
    r'logo',
    r'brand',
    r'favicon',
    r'placeholder',
    r'default[_-]?share',
    r'default[_-]?image',
    r'avatar',
    r'banner',
    r'1x1',
    r'pixel',
    r'assets/img',
    r'themes/symsassets',
    r'\.svg',
    r'transparente',
    r'blank\.png'
]

def is_generic_image(url):
    if not url:
        return True
    url_lower = url.lower()
    return any(re.search(p, url_lower) for p in GENERIC_IMAGE_PATTERNS)

def clean_html(raw_html):
    if not raw_html:
        return ""
    text = html.unescape(raw_html)
    text = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"<script.*?>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style.*?>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_image(item, raw_desc="", extra_html=""):
    # Check item children tags & media namespaces
    if item is not None:
        for child in list(item) + item.findall(".//*"):
            tag = child.tag.lower()
            if any(k in tag for k in ["content", "thumbnail", "enclosure", "image"]):
                url = child.attrib.get("url") or child.attrib.get("href") or (child.text if child.text and child.text.startswith("http") else "")
                if url and any(ext in url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp", "photo", "image"]):
                    if not is_generic_image(url):
                        return url.strip()

    # Fallback to description or content:encoded
    combined = f"{raw_desc} {extra_html}"
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', combined, re.IGNORECASE)
    if m:
        url = m.group(1).strip()
        if url.startswith("http") and not is_generic_image(url):
            return url
    return None

def scrape_real_article_image(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as res:
            html_text = res.read(120000).decode('utf-8', 'ignore')

            # 1. Featured WordPress/CMS image (wp-post-image, featured-image, post-image)
            m = re.search(r'<img[^>]+(?:class=["\'][^"\']*(?:wp-post-image|featured-image|entry-thumb|post-image|attachment-post-thumbnail)[^"\']*["\'][^>]+src=["\']([^"\']+)["\']|src=["\']([^"\']+)["\'][^>]+class=["\'][^"\']*(?:wp-post-image|featured-image|entry-thumb|post-image|attachment-post-thumbnail)[^"\']*["\'])', html_text, re.I)
            if m:
                img = m.group(1) or m.group(2)
                if img and not is_generic_image(img):
                    return img.strip()

            # 2. og:image
            og_matches = re.findall(r'<meta[^>]+(?:property|name)=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']|<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image["\']', html_text, re.I)
            for m1, m2 in og_matches:
                img = (m1 or m2).strip()
                if img and not is_generic_image(img) and img.startswith('http'):
                    return img

            # 3. twitter:image
            tw_matches = re.findall(r'<meta[^>]+(?:property|name)=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']|<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']twitter:image["\']', html_text, re.I)
            for m1, m2 in tw_matches:
                img = (m1 or m2).strip()
                if img and not is_generic_image(img) and img.startswith('http'):
                    return img

            # 4. First valid image inside article body
            art_m = re.search(r'<(?:article|div\s+class=["\'][^"\']*(?:entry-content|post-content|article-body|c-detail__body)[^"\']*["\'])[^>]*>(.*?)</(?:article|div)>', html_text, re.I | re.DOTALL)
            if art_m:
                body_html = art_m.group(1)
                body_imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', body_html, re.I)
                for img in body_imgs:
                    if img.startswith('http') and not is_generic_image(img):
                        return img.strip()
    except Exception:
        return None
    return None


def is_farandula(title, summary, categories):
    combined = f"{title} {summary} {' '.join(categories)}".lower()
    for pat in BLACKLIST_PATTERNS:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            return True, m.group(0)
    return False, None

def classify_category(title, summary, categories):
    text = f"{title} {summary} {' '.join(categories)}".lower()
    # Prioridad destacada a Ciclismo y Deportes generales
    if any(re.search(p, text) for p in CYCLING_PATTERNS) or any(re.search(p, text) for p in GENERAL_SPORTS_PATTERNS):
        return "Ciclismo y Deporte" 
    if any(w in text for w in ["investigación", "corrupción", "contraloría", "fiscalía", "exclusivo", "filtración", "osint", "propublica", "ciper", "bellingcat"]):
        return "Investigación y Poder"
    if any(w in text for w in ["medioambiente", "clima", "humedal", "agua", "sequía", "glaciar", "especie", "bosque", "contaminación", "naturaleza", "biodiversidad", "litio", "minería"]):
        return "Medioambiente y Territorio"
    if any(w in text for w in ["ciencia", "universidad", "estudio", "tecnología", "ia ", "inteligencia artificial", "salud", "medicina", "astronomía"]):
        return "Ciencia, Salud y Futuro"
    if any(w in text for w in ["economía", "inflación", "trabajo", "sindicato", "laboral", "pensiones", "impuestos", "presupuesto", "mercado", "vivienda"]):
        return "Economía y Sociedad"
    if any(w in text for w in ["derechos humanos", "ddhh", "memoria", "justicia", "comunidad", "indígena", "mapuche", "migración", "protesta"]):
        return "Derechos Humanos y Ciudadanía"
    if any(w in text for w in ["guerra", "geopolítica", "onu", "tratado", "elecciones", "internacional", "latinoamérica", "europa", "medio oriente", "ee.uu.", "china"]):
        return "Geopolítica y Mundo"
    if any(w in text for w in ["cultura", "cine", "película", "pelicula", "festival", "concierto", "música", "musica", "teatro", "literatura", "libro", "arte", "homenaje", "museo"]):
        return "Cultura y Sociedad"
    return "Política y Actualidad"

def score_and_classify_relevance(source, title, summary, categories):
    text = f"{title} {summary}".lower()
    # Énfasis especial al Ciclismo en todas sus disciplinas
    if any(re.search(p, text) for p in CYCLING_PATTERNS):
        return {
            "tier": "alta",
            "score": 94,
            "reason": "Ciclismo destacado: cobertura especializada de la disciplina"
        }
    high_hits = [w for w in HIGH_IMPACT_KEYWORDS if w in text]
    low_hits = [w for w in LOW_RADAR_KEYWORDS if w in text]

    score = source["baseWeight"]
    score += min(len(high_hits) * 5, 18)
    score -= min(len(low_hits) * 4, 15)

    if source["id"] in ["timeline", "diariouach", "laderasur", "resumen", "globalvoices", "sinpermiso", "brecha", "jacobinlat"] and len(high_hits) <= 1:
        tier = "bajo_radar"
        reason = "Historia regional, comunitaria o de nicho fuera de la agenda mediática tradicional"
    elif score >= 83 or len(high_hits) >= 2:
        tier = "alta"
        reason = "Alto impacto público, investigativo o estructural"
    else:
        tier = "bajo_radar"
        reason = "Bajo el radar: hallazgo específico, crónica local o análisis periférico"

    return {
        "tier": tier,
        "score": max(40, min(99, score)),
        "reason": reason
    }

def parse_date(date_str):
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    date_str = clean_html(date_str).strip()
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        pass
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()

def fallback_regex_items(xml_text):
    items = []
    for block in re.findall(r"<item\b[^>]*>(.*?)</item>", xml_text, flags=re.DOTALL | re.IGNORECASE):
        t = re.search(r"<title[^>]*>(.*?)</title>", block, flags=re.DOTALL | re.IGNORECASE)
        l = re.search(r"<link[^>]*>(.*?)</link>", block, flags=re.DOTALL | re.IGNORECASE)
        d = re.search(r"<description[^>]*>(.*?)</description>", block, flags=re.DOTALL | re.IGNORECASE)
        p = re.search(r"<pubDate[^>]*>(.*?)</pubDate>", block, flags=re.DOTALL | re.IGNORECASE)
        cats = re.findall(r"<category[^>]*>(.*?)</category>", block, flags=re.DOTALL | re.IGNORECASE)
        items.append({
            "title": t.group(1) if t else "",
            "link": l.group(1) if l else "",
            "description": d.group(1) if d else "",
            "pubDate": p.group(1) if p else "",
            "categories": [clean_html(c) for c in cats]
        })
    return items

def fetch_all():
    articles = []
    blocked_items = []
    source_stats = []
    seen_titles = set()

    for src in SOURCES:
        count = 0
        blocked_count = 0
        try:
            req = urllib.request.Request(
                src["url"],
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/rss+xml, application/xml, text/xml, */*"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read()
                if raw_bytes[:2] == b"\x1f\x8b":
                    raw_bytes = gzip.decompress(raw_bytes)

            parsed_entries = []
            try:
                root = ET.fromstring(raw_bytes)
                xml_items = root.findall(".//item")
                if not xml_items:
                    xml_items = root.findall(".//{http://www.w3.org/2005/Atom}entry")
                for item in xml_items[:18]:
                    title_el = item.find("title")
                    if title_el is None:
                        title_el = item.find("{http://www.w3.org/2005/Atom}title")
                    link_el = item.find("link")
                    link = ""
                    if link_el is not None:
                        link = (link_el.text or link_el.attrib.get("href", "")).strip()
                    else:
                        atom_link = item.find("{http://www.w3.org/2005/Atom}link")
                        if atom_link is not None:
                            link = atom_link.attrib.get("href", "").strip()
                    desc_el = item.find("description")
                    if desc_el is None:
                        desc_el = item.find("{http://www.w3.org/2005/Atom}summary")
                    if desc_el is None:
                        desc_el = item.find("{http://purl.org/rss/1.0/modules/content/}encoded")
                    raw_desc = desc_el.text if (desc_el is not None and desc_el.text) else ""
                    pub_el = item.find("pubDate")
                    if pub_el is None:
                        pub_el = item.find("{http://www.w3.org/2005/Atom}published")
                    if pub_el is None:
                        pub_el = item.find("{http://www.w3.org/2005/Atom}updated")
                    if pub_el is None:
                        pub_el = item.find("{http://purl.org/dc/elements/1.1/}date")
                    cats = [clean_html(c.text) for c in item.findall("category") if c.text]
                    parsed_entries.append({
                        "title": title_el.text if title_el is not None else "",
                        "link": link,
                        "description": raw_desc,
                        "pubDate": pub_el.text if pub_el is not None else "",
                        "categories": cats,
                        "img": extract_image(item, raw_desc)
                    })
            except Exception:
                xml_text = raw_bytes.decode("utf-8", errors="ignore")
                for d_item in fallback_regex_items(xml_text)[:18]:
                    d_item["img"] = extract_image(None, d_item["description"])
                    parsed_entries.append(d_item)

            for entry in parsed_entries:
                title = clean_html(entry["title"])
                if not title:
                    continue

                if " - " in title and src["id"] in ["elmostrador", "eldesconcierto", "brecha", "laderasur", "resumen", "elsalto"]:
                    parts = title.rsplit(" - ", 1)
                    if len(parts[1]) < 30:
                        title = parts[0].strip()

                norm_title = re.sub(r"\W+", "", title.lower())[:50]
                if norm_title in seen_titles:
                    continue

                raw_desc = entry["description"] or ""
                summary = clean_html(raw_desc)
                if summary.lower().startswith(title.lower()[:30]):
                    summary = summary[len(title):].strip(" .-–—")
                if len(summary) > 340:
                    summary = summary[:337].rsplit(" ", 1)[0] + "..."
                if len(summary) < 25:
                    summary = f"Nota publicada por {src['name']} ({src['type']}). Haz clic para leer el reportaje o cobertura completa en la fuente original."

                # Descartar traducciones y duplicados multilingües de medios en español
                # (ej: El Ciudadano publica copias automáticas en alemán /deustche/ e inglés /en/)
                link = entry.get("link", "")
                if src.get("region") == "chile" or src.get("id") in ["elciudadano", "elmostrador", "eldesconcierto", "ciper", "interferencia", "cooperativa"]:
                    if re.search(r"/(deustche|deutsch|de|en|fr|it|pt)/", link, re.I):
                        continue
                    if re.search(r"\b(originalbeitrag|original article|article original)\b", summary, re.I):
                        continue

                cats = entry["categories"]
                blocked, matched_word = is_farandula(title, summary, cats)
                if blocked:
                    blocked_count += 1
                    blocked_items.append({
                        "title": title,
                        "source": src["name"],
                        "reason": matched_word
                    })
                    continue

                seen_titles.add(norm_title)
                rel = score_and_classify_relevance(src, title, summary, cats)
                category = classify_category(title, summary, cats)

                articles.append({
                    "id": f"{src['id']}-{len(articles)+1}",
                    "title": title,
                    "summary": summary,
                    "url": clean_html(entry["link"]),
                    "image": entry.get("img") if (entry.get("img") and not is_generic_image(entry.get("img"))) else None,
                    "publishedAt": parse_date(entry["pubDate"]),
                    "sourceId": src["id"],
                    "sourceName": src["name"],
                    "sourceType": src["type"],
                    "sourceSite": src["site"],
                    "region": src["region"],
                    "independent": src["independent"],
                    "category": category,
                    "relevanceTier": rel["tier"],
                    "relevanceScore": rel["score"],
                    "relevanceReason": rel["reason"]
                })
                count += 1
                if count >= 10:
                    break

            source_stats.append({
                "id": src["id"],
                "name": src["name"],
                "region": src["region"],
                "type": src["type"],
                "independent": src["independent"],
                "status": "ok",
                "count": count,
                "blocked": blocked_count
            })
            print(f"[OK] {src['name']}: {count} noticias ({blocked_count} filtradas por farándula)")
        except Exception as e:
            source_stats.append({
                "id": src["id"],
                "name": src["name"],
                "region": src["region"],
                "type": src["type"],
                "independent": src["independent"],
                "status": "error",
                "error": str(e),
                "count": 0,
                "blocked": 0
            })
            print(f"[WARN] {src['name']}: {e}")

    # Enriquecimiento multihilo de imágenes reales para notas sin imagen directa en el RSS
    articles_needing_image = [a for a in articles if not a.get("image")]
    print(f"\n[FOTOS REALES] Enriqueciendo {len(articles_needing_image)} artículos sin foto directa del RSS...")

    def enrich_one(art):
        try:
            real_img = scrape_real_article_image(art["url"])
            if real_img:
                art["image"] = real_img
                return True
        except Exception:
            pass
        return False

    with ThreadPoolExecutor(max_workers=12) as pool:
        enriched_results = list(pool.map(enrich_one, articles_needing_image))

    real_img_count = sum(1 for a in articles if a.get("image"))
    editorial_count = len(articles) - real_img_count
    print(f"[FOTOS REALES] Resultado: {real_img_count} noticias con foto real verificada, {editorial_count} notas editoriales/texto legítimas (cero stock falso).")

    articles.sort(key=lambda x: x["publishedAt"], reverse=True)

    os.makedirs("public/data", exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalArticles": len(articles),
        "totalBlockedFarandula": len(blocked_items),
        "blockedExamples": blocked_items[:15],
        "sources": SOURCES,
        "sourceStats": source_stats,
        "articles": articles
    }
    with open("public/data/initial-feeds.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"\nGuardado public/data/initial-feeds.json con {len(articles)} noticias y {len(blocked_items)} descartadas.")


if __name__ == "__main__":
    fetch_all()
