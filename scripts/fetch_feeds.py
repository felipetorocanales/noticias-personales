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
    # =========================================================================
    # CHILE (Prioridad Nacional Absoluta - Cobertura Exhaustiva)
    # =========================================================================
    {
        "id": "ciper",
        "name": "CIPER Chile",
        "url": "https://www.ciperchile.cl/feed/",
        "site": "https://www.ciperchile.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Investigación Independiente",
        "independent": True,
        "baseWeight": 96,
        "maxArticles": 10
    },
    {
        "id": "interferencia",
        "name": "Interferencia",
        "url": "https://interferencia.cl/rss.xml",
        "site": "https://interferencia.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Investigación y Poder",
        "independent": True,
        "baseWeight": 92,
        "maxArticles": 10
    },
    {
        "id": "fastcheck",
        "name": "Fast Check CL",
        "url": "https://www.fastcheck.cl/feed/",
        "site": "https://www.fastcheck.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Fact-Checking Independiente",
        "independent": True,
        "baseWeight": 88,
        "maxArticles": 10
    },
    {
        "id": "radiouchile",
        "name": "Radio U. de Chile",
        "url": "https://radio.uchile.cl/feed/",
        "site": "https://radio.uchile.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Universitario / Pluralista",
        "independent": True,
        "baseWeight": 88,
        "maxArticles": 10
    },
    {
        "id": "elmostrador",
        "name": "El Mostrador",
        "url": "https://news.google.com/rss/search?q=site:elmostrador.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://www.elmostrador.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Digital Independiente",
        "independent": True,
        "baseWeight": 86,
        "maxArticles": 10
    },
    {
        "id": "eldesconcierto",
        "name": "El Desconcierto",
        "url": "https://news.google.com/rss/search?q=site:eldesconcierto.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://eldesconcierto.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Periodismo Independiente",
        "independent": True,
        "baseWeight": 84,
        "maxArticles": 10
    },
    {
        "id": "laderasur",
        "name": "Ladera Sur",
        "url": "https://news.google.com/rss/search?q=site:laderasur.com&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://laderasur.com",
        "region": "chile",
        "country": "Chile",
        "type": "Naturaleza y Ciencia Indep.",
        "independent": True,
        "baseWeight": 84,
        "maxArticles": 10
    },
    {
        "id": "resumen",
        "name": "Resumen.cl (Biobío)",
        "url": "https://news.google.com/rss/search?q=site:resumen.cl&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://resumen.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Prensa Independiente Regional",
        "independent": True,
        "baseWeight": 82,
        "maxArticles": 10
    },
    {
        "id": "elciudadano",
        "name": "El Ciudadano",
        "url": "https://www.elciudadano.com/feed/",
        "site": "https://www.elciudadano.com",
        "region": "chile",
        "country": "Chile",
        "type": "Prensa Alternativa",
        "independent": True,
        "baseWeight": 80,
        "maxArticles": 8
    },
    {
        "id": "malaespina",
        "name": "Mala Espina Check",
        "url": "https://malaespinacheck.cl/feed/",
        "site": "https://malaespinacheck.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Fact-Checking / Política",
        "independent": True,
        "baseWeight": 85,
        "maxArticles": 8
    },
    {
        "id": "vergara240",
        "name": "Vergara 240 (UDP)",
        "url": "https://vergara240.udp.cl/feed/",
        "site": "https://vergara240.udp.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Investigación y Crónica",
        "independent": True,
        "baseWeight": 85,
        "maxArticles": 8
    },
    {
        "id": "terram",
        "name": "Fundación Terram",
        "url": "https://www.terram.cl/feed/",
        "site": "https://www.terram.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Medioambiente y Territorio",
        "independent": True,
        "baseWeight": 83,
        "maxArticles": 8
    },
    {
        "id": "timeline",
        "name": "Timeline Antofagasta",
        "url": "https://timeline.cl/feed/",
        "site": "https://timeline.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Regional Independiente (Norte)",
        "independent": True,
        "baseWeight": 78,
        "maxArticles": 8
    },
    {
        "id": "diariouach",
        "name": "Diario UACh (Valdivia)",
        "url": "https://diario.uach.cl/feed/",
        "site": "https://diario.uach.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Regional / Ciencia (Sur)",
        "independent": True,
        "baseWeight": 76,
        "maxArticles": 8
    },
    {
        "id": "cooperativa",
        "name": "Radio Cooperativa",
        "url": "https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml",
        "site": "https://www.cooperativa.cl",
        "region": "chile",
        "country": "Chile",
        "type": "Radio Informativa Nacional",
        "independent": False,
        "baseWeight": 76,
        "maxArticles": 6
    },

    # =========================================================================
    # LATINOAMÉRICA (Prensa Independiente de Investigación en Español)
    # =========================================================================
    {
        "id": "elfaro",
        "name": "El Faro",
        "url": "https://elfaro.net/es/feed",
        "site": "https://elfaro.net",
        "region": "latam",
        "country": "Centroamérica",
        "type": "Investigación y Corrupción",
        "independent": True,
        "baseWeight": 88,
        "maxArticles": 8
    },
    {
        "id": "anfibia",
        "name": "Revista Anfibia",
        "url": "https://revistaanfibia.com/feed/",
        "site": "https://revistaanfibia.com",
        "region": "latam",
        "country": "Argentina",
        "type": "Crónica y Ensayo Político",
        "independent": True,
        "baseWeight": 88,
        "maxArticles": 8
    },
    {
        "id": "lasillavacia",
        "name": "La Silla Vacía",
        "url": "https://www.lasillavacia.com/feed/",
        "site": "https://www.lasillavacia.com",
        "region": "latam",
        "country": "Colombia",
        "type": "Poder y Política",
        "independent": True,
        "baseWeight": 87,
        "maxArticles": 8
    },
    {
        "id": "ojopublico",
        "name": "Ojo Público",
        "url": "https://news.google.com/rss/search?q=site:ojo-publico.com&hl=es-419&gl=PE&ceid=PE:es-419",
        "site": "https://ojo-publico.com",
        "region": "latam",
        "country": "Perú",
        "type": "Investigación y Amazonía",
        "independent": True,
        "baseWeight": 86,
        "maxArticles": 8
    },
    {
        "id": "cuestionpublica",
        "name": "Cuestión Pública",
        "url": "https://cuestionpublica.com/feed/",
        "site": "https://cuestionpublica.com",
        "region": "latam",
        "country": "Colombia",
        "type": "Periodismo de Datos y Poder",
        "independent": True,
        "baseWeight": 85,
        "maxArticles": 6
    },
    {
        "id": "chequeado",
        "name": "Chequeado",
        "url": "https://chequeado.com/feed/",
        "site": "https://chequeado.com",
        "region": "latam",
        "country": "Argentina",
        "type": "Fact-Checking Regional",
        "independent": True,
        "baseWeight": 84,
        "maxArticles": 6
    },
    {
        "id": "piedepagina",
        "name": "Pie de Página",
        "url": "https://piedepagina.mx/feed/",
        "site": "https://piedepagina.mx",
        "region": "latam",
        "country": "México",
        "type": "Derechos Humanos y Territorio",
        "independent": True,
        "baseWeight": 84,
        "maxArticles": 6
    },
    {
        "id": "cenital",
        "name": "Cenital",
        "url": "https://cenital.com/feed/",
        "site": "https://cenital.com",
        "region": "latam",
        "country": "Argentina",
        "type": "Análisis y Geopolítica",
        "independent": True,
        "baseWeight": 83,
        "maxArticles": 6
    },
    {
        "id": "brecha",
        "name": "Semanario Brecha",
        "url": "https://news.google.com/rss/search?q=site:brecha.com.uy&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://brecha.com.uy",
        "region": "latam",
        "country": "Uruguay",
        "type": "Periodismo Indep. LatAm",
        "independent": True,
        "baseWeight": 82,
        "maxArticles": 6
    },
    {
        "id": "jacobinlat",
        "name": "Jacobin América Latina",
        "url": "https://jacobinlat.com/feed/",
        "site": "https://jacobinlat.com",
        "region": "latam",
        "country": "Latinoamérica",
        "type": "Análisis Latinoamericano",
        "independent": True,
        "baseWeight": 80,
        "maxArticles": 6
    },

    # =========================================================================
    # CICLISMO (Especializado - Nacional e Internacional)
    # =========================================================================
    {
        "id": "ciclismo-chile",
        "name": "Ciclismo Chile",
        "url": "https://news.google.com/rss/search?q=ciclismo+OR+ciclista+OR+bicicleta+Chile&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://news.google.com",
        "region": "chile",
        "country": "Chile",
        "type": "Ciclismo y Deporte Nacional",
        "independent": True,
        "baseWeight": 90,
        "maxArticles": 8
    },
    {
        "id": "ciclo21",
        "name": "Ciclo 21",
        "url": "https://www.ciclo21.com/feed/",
        "site": "https://www.ciclo21.com",
        "region": "mundo",
        "country": "España",
        "type": "Periodismo Ciclista Especializado",
        "independent": True,
        "baseWeight": 82,
        "maxArticles": 3
    },
    {
        "id": "brujulabike",
        "name": "Brújula Bike",
        "url": "https://brujulabike.com/feed/",
        "site": "https://brujulabike.com",
        "region": "mundo",
        "country": "España",
        "type": "MTB, Gravel y Competición",
        "independent": True,
        "baseWeight": 82,
        "maxArticles": 3
    },
    {
        "id": "esciclismo",
        "name": "EsCiclismo",
        "url": "https://www.esciclismo.com/rss/",
        "site": "https://www.esciclismo.com",
        "region": "mundo",
        "country": "España",
        "type": "Ciclismo Global y Pruebas UCI",
        "independent": True,
        "baseWeight": 82,
        "maxArticles": 3
    },

    # =========================================================================
    # GLOBAL / MUNDO (Investigación Internacional y Cables Acotados)
    # =========================================================================
    {
        "id": "propublica",
        "name": "ProPublica",
        "url": "https://feeds.propublica.org/propublica/main",
        "site": "https://www.propublica.org",
        "region": "mundo",
        "country": "EE.UU.",
        "type": "Investigación Sin Fines de Lucro",
        "independent": True,
        "baseWeight": 86,
        "maxArticles": 4
    },
    {
        "id": "bellingcat",
        "name": "Bellingcat",
        "url": "https://www.bellingcat.com/feed/",
        "site": "https://www.bellingcat.com",
        "region": "mundo",
        "country": "Global",
        "type": "Investigación OSINT",
        "independent": True,
        "baseWeight": 86,
        "maxArticles": 4
    },
    {
        "id": "theintercept",
        "name": "The Intercept",
        "url": "https://theintercept.com/feed/?lang=en",
        "site": "https://theintercept.com",
        "region": "mundo",
        "country": "EE.UU.",
        "type": "Investigación Independiente",
        "independent": True,
        "baseWeight": 86,
        "maxArticles": 4
    },
    {
        "id": "eldiarioes",
        "name": "elDiario.es",
        "url": "https://www.eldiario.es/rss/",
        "site": "https://www.eldiario.es",
        "region": "mundo",
        "country": "España",
        "type": "Independiente de Socios",
        "independent": True,
        "baseWeight": 73,
        "maxArticles": 3
    },
    {
        "id": "elsalto",
        "name": "El Salto Diario",
        "url": "https://news.google.com/rss/search?q=site:elsaltodiario.com&hl=es-419&gl=CL&ceid=CL:es-419",
        "site": "https://www.elsaltodiario.com",
        "region": "mundo",
        "country": "España",
        "type": "Cooperativa Independiente",
        "independent": True,
        "baseWeight": 72,
        "maxArticles": 3
    },
    {
        "id": "sinpermiso",
        "name": "Sin Permiso",
        "url": "https://www.sinpermiso.info/rss.xml",
        "site": "https://www.sinpermiso.info",
        "region": "mundo",
        "country": "España",
        "type": "Análisis Internacional Indep.",
        "independent": True,
        "baseWeight": 68,
        "maxArticles": 3
    },
    {
        "id": "france24",
        "name": "France 24 Español",
        "url": "https://www.france24.com/es/rss",
        "site": "https://www.france24.com/es",
        "region": "mundo",
        "country": "Francia / Global",
        "type": "Medio Público Internacional",
        "independent": False,
        "baseWeight": 71,
        "maxArticles": 3
    },
    {
        "id": "dw",
        "name": "DW Español",
        "url": "https://rss.dw.com/xml/rss-sp-all",
        "site": "https://www.dw.com/es",
        "region": "mundo",
        "country": "Alemania / Global",
        "type": "Medio Público Internacional",
        "independent": False,
        "baseWeight": 71,
        "maxArticles": 3
    },
    {
        "id": "globalvoices",
        "name": "Global Voices ES",
        "url": "https://es.globalvoices.org/feed/",
        "site": "https://es.globalvoices.org",
        "region": "mundo",
        "country": "Global",
        "type": "Periodismo Ciudadano Global",
        "independent": True,
        "baseWeight": 70,
        "maxArticles": 4
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

def clean_full_content(raw_html, title=""):
    if not raw_html:
        return ""
    text = re.sub(r'<(script|style|form|aside|nav|header|footer|figure|noscript|iframe)[^>]*>.*?</\1>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    has_p = bool(re.search(r'<p[^>]*>', text, re.I))
    paragraphs = []
    boilerplate = ['suscríbete', 'newsletter', 'política de privacidad', 'copyright', 'todos los derechos reservados', 'leído en', 'síguenos en']
    if has_p:
        raw_ps = re.findall(r'<p[^>]*>(.*?)</p>', text, flags=re.DOTALL | re.IGNORECASE)
        for p in raw_ps:
            clean_p = re.sub(r'<[^>]+>', '', p)
            clean_p = html.unescape(clean_p).strip()
            clean_p = re.sub(r'\s+', ' ', clean_p)
            if len(clean_p) >= 35 and not any(skip in clean_p.lower() for skip in boilerplate):
                if not ('function(' in clean_p or 'var ' in clean_p or '{' in clean_p):
                    paragraphs.append(clean_p)
    else:
        lines = re.split(r'\n{2,}', text)
        for l in lines:
            clean_l = re.sub(r'<[^>]+>', '', l)
            clean_l = html.unescape(clean_l).strip()
            clean_l = re.sub(r'\s+', ' ', clean_l)
            if len(clean_l) >= 40 and not any(skip in clean_l.lower() for skip in boilerplate):
                paragraphs.append(clean_l)
                
    if paragraphs and title and paragraphs[0].strip().lower() == title.strip().lower():
        paragraphs.pop(0)
        
    return "".join(f"<p>{html.escape(p)}</p>" for p in paragraphs)

def scrape_real_article_image_and_text(url, title=""):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
    img = None
    extracted_text = ""
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as res:
            html_text = res.read(220000).decode('utf-8', 'ignore')

            # 1. Featured WordPress/CMS image
            m = re.search(r'<img[^>]+(?:class=["\'][^"\']*(?:wp-post-image|featured-image|entry-thumb|post-image|attachment-post-thumbnail)[^"\']*["\'][^>]+src=["\']([^"\']+)["\']|src=["\']([^"\']+)["\'][^>]+class=["\'][^"\']*(?:wp-post-image|featured-image|entry-thumb|post-image|attachment-post-thumbnail)[^"\']*["\'])', html_text, re.I)
            if m:
                cand = (m.group(1) or m.group(2)).strip()
                if cand and not is_generic_image(cand) and cand.startswith('http'):
                    img = cand

            # 2. og:image
            if not img:
                og_matches = re.findall(r'<meta[^>]+(?:property|name)=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']|<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image["\']', html_text, re.I)
                for m1, m2 in og_matches:
                    cand = (m1 or m2).strip()
                    if cand and not is_generic_image(cand) and cand.startswith('http'):
                        img = cand
                        break

            # 3. twitter:image
            if not img:
                tw_matches = re.findall(r'<meta[^>]+(?:property|name)=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']|<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']twitter:image["\']', html_text, re.I)
                for m1, m2 in tw_matches:
                    cand = (m1 or m2).strip()
                    if cand and not is_generic_image(cand) and cand.startswith('http'):
                        img = cand
                        break

            # 4. Text paragraphs extraction
            clean = re.sub(r'<(script|style|form|aside|nav|header|footer|figure|noscript|iframe)[^>]*>.*?</\1>', '', html_text, flags=re.DOTALL | re.IGNORECASE)
            art_m = re.search(r'<(?:article|div)[^>]*(?:class|id)=[\'"][^\'"]*(?:entry-content|post-content|article-body|story-body|c-detail__body|cuerpo|nota-content|article__body|elementor-widget-theme-post-content|single-post-content)[^\'"]*[\'"][^>]*>(.*?)</(?:article|div)>', clean, flags=re.DOTALL | re.IGNORECASE)
            scope = art_m.group(1) if art_m else clean
            
            raw_ps = re.findall(r'<p[^>]*>(.*?)</p>', scope, flags=re.DOTALL | re.IGNORECASE)
            valid_ps = []
            boilerplate = ['newsletter', 'suscríbete', 'suscribete', 'todos los derechos', 'copyright', 'política de privacidad', 'términos y condiciones', 'whatsapp', 'telegram', 'síguenos en']
            for p in raw_ps:
                t = re.sub(r'<[^>]+>', '', p)
                t = html.unescape(t).strip()
                t = re.sub(r'\s+', ' ', t)
                if len(t) >= 45 and not any(b in t.lower() for b in boilerplate):
                    if not ('function(' in t or 'var ' in t or '{' in t):
                        valid_ps.append(t)
                        
            if valid_ps and title and valid_ps[0].strip().lower() == title.strip().lower():
                valid_ps.pop(0)

            if len(valid_ps) >= 2:
                extracted_text = "".join(f"<p>{html.escape(p)}</p>" for p in valid_ps)

    except Exception:
        pass
    return img, extracted_text

def is_farandula(title, summary, categories):
    combined = f"{title} {summary} {' '.join(categories)}".lower()
    for pat in BLACKLIST_PATTERNS:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            return True, m.group(0)
    return False, None

CATEGORY_RULES = {
    "Ciclismo y Deporte": [
        r"\bpogacar\b", r"\bvingegaard\b", r"\bevenepoel\b", r"\broglic\b", r"\bciclis(mo|ta|tas)\b",
        r"\btour de (francia|france)\b", r"\bgiro d'italia\b", r"\bgiro de italia\b", r"\bvuelta a espa[nñ]a\b",
        r"\buci\b", r"\bmonumentos ciclistas\b", r"\brouleur\b", r"\bpelot[oó]n\b", r"\bparis-roubaix\b",
        r"\bmarat[oó]n\b", r"\batletismo\b", r"\bol[ií]mpic[ao]s?\b", r"\bf[uú]tbol\b", r"\bcampeonato\b"
    ],
    "Investigación y Poder": [
        r"\binvestigaci[oó]n\b", r"\bcorrupci[oó]n\b", r"\bcontralor[ií]a\b", r"\bfiscal[ií]a\b",
        r"\bexclusivo\b", r"\bfiltraci[oó]n\b", r"\bosint\b", r"\bciper\b", r"\bbellingcat\b",
        r"\bpropublica\b", r"\bcohecho\b", r"\bmalversaci[oó]n\b", r"\blavado de (activos|dinero)\b",
        r"\btr[aá]fico de influencias\b", r"\bcaso convenios\b", r"\bcaso audios\b", r"\bhermosilla\b",
        r"\bconflicto de inter[eé]s\b", r"\bfraude\b", r"\bsoborno\b", r"\bpoder judicial\b",
        r"\bcorte suprema\b"
    ],
    "Economía y Sociedad": [
        r"\beconom[ií]a\b", r"\becon[oó]mic[ao]s?\b", r"\binflaci[oó]n\b", r"\bipc\b", r"\bpensiones\b",
        r"\bjubilac(i[oó]n|iones|iados?)\b", r"\bafp\b", r"\bfondo [a-e]\b", r"\bhacienda\b",
        r"\bbanco central\b", r"\bsueldo(s)?\b", r"\bsalario(s)?\b", r"\blaboral(es)?\b", r"\bdesempleo\b",
        r"\bempleo\b", r"\btributari[ao]s?\b", r"\bimpuesto(s)?\b", r"\bpresupuesto\b", r"\bsindicat[ao]s?\b",
        r"\bmercado(s)?\b", r"\bvivienda\b", r"\bdeuda(s)?\b", r"\bcr[eé]dito(s)?\b", r"\bconsumo\b",
        r"\bsuperintendencia de pensiones\b", r"\bcosto de la vida\b", r"\bcomisiones\b",
        r"\bquiebra\b", r"\bburs[aá]til\b", r"\bcomercio\b", r"\bexportac(i[oó]n|iones)\b"
    ],
    "Medioambiente y Territorio": [
        r"\bmedioambiente\b", r"\bmedio ambiente\b", r"\bclim[aá]tic[ao]s?\b", r"\bhumedal(es)?\b",
        r"\bglaciar(es)?\b", r"\bsequ[ií]a\b", r"\bagua\b", r"\bbosque(s)?\b", r"\bcontaminaci[oó]n\b",
        r"\bbiodiversidad\b", r"\blitio\b", r"\bminer[ií]a\b", r"\bfauna\b", r"\bflora\b",
        r"\bincendio(s)? forestal(es)?\b", r"\bsalar(es)?\b", r"\bnaturaleza\b", r"\becolog[ií]a\b",
        r"\brenovable(s)?\b", r"\bdescarbonizaci[oó]n\b", r"\bterritorio\b", r"\bcuenca(s)?\b"
    ],
    "Ciencia, Salud y Futuro": [
        r"\bcient[ií]fic[ao]s?\b", r"\bciencia\b", r"\btecnolog[ií]a(s)?\b", r"\binteligencia artificial\b",
        r"\b(?:ia|i\.a\.)\b", r"\bastronom[ií]a\b", r"\btelescopio(s)?\b", r"\bnasa\b", r"\bconicyt\b",
        r"\banid\b", r"\bmedicina\b", r"\bm[eé]dic[ao]s?\b", r"\btratamiento(s)? m[eé]dico(s)?\b",
        r"\bvacuna(s)?\b", r"\benfermedad(es)?\b", r"\bgenoma\b", r"\bc[eé]lula(s)?\b",
        r"\bepidemiolog[ií]a\b", r"\bbio(qu[ií]mica|tecnolog[ií]a)\b", r"\bcu[aá]ntic[ao]s?\b",
        r"\brob[oó]tic[ao]s?\b", r"\bhospital(es)?\b", r"\bf[aá]rmaco(s)?\b", r"\bc[aá]ncer\b",
        r"\bneurociencia\b", r"\bsalud p[uú]blica\b", r"\bfarmac[eé]utic[ao]s?\b"
    ],
    "Derechos Humanos y Ciudadanía": [
        r"\bderechos humanos\b", r"\bddhh\b", r"\bdictadura\b", r"\bmemoria\b", r"\bdesaparecid[ao]s?\b",
        r"\bdetenid[ao]s?\b", r"\bjusticia\b", r"\bmapuche\b", r"\bind[ií]gena(s)?\b", r"\bconadi\b",
        r"\bwallmapu\b", r"\bmigraci[oó]n\b", r"\bmigrante(s)?\b", r"\bcomunitar(io|ia)s?\b",
        r"\bprotesta(s)?\b", r"\bdefensor de la ni[nñ]ez\b", r"\bdelitos sexuales\b", r"\bv[ií]ctimas?\b",
        r"\bmanifestaci[oó]n\b", r"\brepresi[oó]n\b"
    ],
    "Geopolítica y Mundo": [
        r"\bguerra\b", r"\bgeopol[ií]tica\b", r"\bonu\b", r"\botan\b", r"\btratado internacional\b",
        r"\belecciones\b", r"\binternacional\b", r"\blatinoam[eé]rica\b", r"\beuropa\b",
        r"\bmedio oriente\b", r"\bee\.uu\.\b", r"\bestados unidos\b", r"\bchina\b", r"\brusia\b",
        r"\bucrania\b", r"\bisrael\b", r"\bpalestina\b", r"\bgaza\b", r"\bnetanyahu\b",
        r"\bmilei\b", r"\bargentina\b", r"\bbiden\b", r"\btrump\b", r"\bcanciller[ií]a\b",
        r"\bdiplom[aá]tic[ao]s?\b", r"\bconflicto armado\b"
    ],
    "Cultura y Sociedad": [
        r"\bcine\b", r"\bpel[ií]cula(s)?\b", r"\bdocumental(es)?\b", r"\bliteratura\b",
        r"\bnovela(s)?\b", r"\bpoes[ií]a\b", r"\bescritor(a|es)?\b", r"\bteatro\b",
        r"\bconcierto(s)?\b", r"\bm[uú]sica\b", r"\bfestival\b", r"\bmuseo(s)?\b",
        r"\barte(s)?\b", r"\bpatrimonio\b", r"\bhomenaje\b"
    ],
    "Política y Actualidad": [
        r"\bgobierno\b", r"\bministr[ao]s?\b", r"\bpresidente\b", r"\bpresidenta\b",
        r"\bcongreso\b", r"\bsenad[ao]s?\b", r"\bdiputad[ao]s?\b", r"\bpalacio de la moneda\b",
        r"\bla moneda\b", r"\boficialismo\b", r"\boposici[oó]n\b", r"\breforma\b",
        r"\bpartido pol[ií]tico\b", r"\bparlamentari[ao]s?\b", r"\blegislativ[ao]s?\b",
        r"\bgabinete\b", r"\bejecutivo\b", r"\balcalde(sa)?\b", r"\bmunicipalidad\b",
        r"\bpol[ií]tic[ao]s?\b", r"\bdemocracia\b"
    ]
}

def classify_category(title, summary, categories):
    text = f"{title} {summary} {' '.join(categories)}".lower()
    
    # 1. Ciclismo y Deporte tiene prioridad destacada para cobertura de nicho
    if any(re.search(p, text) for p in CYCLING_PATTERNS) or any(re.search(p, text) for p in GENERAL_SPORTS_PATTERNS):
        return "Ciclismo y Deporte"

    # 2. Conteo de coincidencias por categoría
    scores = {}
    for cat, patterns in CATEGORY_RULES.items():
        if cat == "Ciclismo y Deporte":
            continue
        score = sum(1 for p in patterns if re.search(p, text))
        if score > 0:
            scores[cat] = score

    if not scores:
        return "Política y Actualidad"

    # La categoría con mayor peso/coincidencias contextuales gana
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_scores[0][0]

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

def balance_source_diversity(article_list, max_consecutive=2):
    """
    Evita que una sola fuente acapare la portada consecutivamente.
    Si una fuente ya tiene max_consecutive artículos consecutivos, busca en la lista
    el siguiente artículo de otra fuente para intercalarlo y asegurar variedad visual.
    """
    if not article_list or len(article_list) <= max_consecutive:
        return article_list

    balanced = []
    pool = list(article_list)
    consec_count = 0
    last_source = None

    while pool:
        next_idx = -1
        if consec_count >= max_consecutive and last_source:
            for j, item in enumerate(pool):
                if item.get("sourceId") != last_source:
                    next_idx = j
                    break

        if next_idx == -1:
            next_idx = 0

        item = pool.pop(next_idx)
        if item.get("sourceId") == last_source:
            consec_count += 1
        else:
            consec_count = 1
            last_source = item.get("sourceId")

        balanced.append(item)

    return balanced

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
                    content_el = item.find("{http://purl.org/rss/1.0/modules/content/}encoded")
                    if content_el is None:
                        content_el = item.find("{http://www.w3.org/2005/Atom}content")
                    raw_desc = desc_el.text if (desc_el is not None and desc_el.text) else ""
                    raw_content = content_el.text if (content_el is not None and content_el.text) else ""
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
                        "content": raw_content,
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
                # Solo eliminar el titulo si el resumen comienza exactamente con el titulo completo
                if summary.lower().startswith(title.lower()):
                    summary = summary[len(title):].strip(" .-–—")

                # Asegurar mayuscula inicial limpia
                if summary:
                    summary = summary[0].upper() + summary[1:]

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

                raw_content = entry.get("content") or ""
                full_content = clean_full_content(raw_content, title) if raw_content else ""
                if not full_content or len(full_content) < 300:
                    if len(raw_desc) > 350:
                        desc_full = clean_full_content(raw_desc, title)
                        if len(desc_full) > len(full_content):
                            full_content = desc_full

                articles.append({
                    "id": f"{src['id']}-{len(articles)+1}",
                    "title": title,
                    "summary": summary,
                    "content": full_content or "",
                    "url": clean_html(entry["link"]),
                    "image": entry.get("img") if (entry.get("img") and not is_generic_image(entry.get("img"))) else None,
                    "publishedAt": parse_date(entry["pubDate"]),
                    "sourceId": src["id"],
                    "sourceName": src["name"],
                    "sourceType": src["type"],
                    "sourceSite": src["site"],
                    "region": src["region"],
                    "country": src.get("country", "Chile" if src.get("region") == "chile" else "Mundo"),
                    "independent": src["independent"],
                    "category": category,
                    "relevanceTier": rel["tier"],
                    "relevanceScore": rel["score"],
                    "relevanceReason": rel["reason"]
                })
                count += 1
                max_allowed = src.get("maxArticles", 10)
                if count >= max_allowed:
                    break

            source_stats.append({
                "id": src["id"],
                "name": src["name"],
                "region": src["region"],
                "country": src.get("country", "Chile" if src.get("region") == "chile" else "Mundo"),
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

        # Enriquecimiento multihilo de imágenes y texto completo para notas
    articles_needing_enrich = [a for a in articles if (not a.get("image") or not a.get("content") or len(a.get("content", "")) < 300)]
    print(f"\n[ENRIQUECIMIENTO] Enriqueciendo fotos y texto completo de {len(articles_needing_enrich)} artículos...")

    def enrich_one(art):
        try:
            real_img, extracted_text = scrape_real_article_image_and_text(art["url"], art["title"])
            if real_img and not art.get("image"):
                art["image"] = real_img
            if extracted_text and (not art.get("content") or len(art.get("content", "")) < 300):
                art["content"] = extracted_text
            return True
        except Exception:
            pass
        return False

    with ThreadPoolExecutor(max_workers=12) as pool:
        enriched_results = list(pool.map(enrich_one, articles_needing_enrich))

    real_img_count = sum(1 for a in articles if a.get("image"))
    full_text_count = sum(1 for a in articles if a.get("content") and len(a.get("content", "")) >= 300)
    print(f"[RESULTADO] {real_img_count} noticias con foto real, {full_text_count} noticias con reportaje completo pre-cargado.")


    articles.sort(key=lambda x: x["publishedAt"], reverse=True)
    articles = balance_source_diversity(articles, max_consecutive=2)

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
