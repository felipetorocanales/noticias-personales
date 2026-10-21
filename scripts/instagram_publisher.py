import os
import sys
import json
import subprocess
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from generate_instagram_post import create_instagram_card

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Cargar variables de entorno desde .env si existe
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HISTORY_FILE = os.path.join(ROOT_DIR, "public", "data", "instagram_history.json")
PENDING_POST_FILE = os.path.join(ROOT_DIR, "public", "data", "pending_instagram_post.json")
FEEDS_FILE = os.path.join(ROOT_DIR, "public", "data", "initial-feeds.json")

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[HISTORIAL] Error leyendo historial: {e}")
            return []
    return []

def save_history(history):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def generate_caption(article):
    title = article.get("title", "")
    summary = article.get("summary", "")
    source = article.get("sourceName", "Prensa")
    category = article.get("category", "")
    original_link = article.get("link", "").strip()
    article_id = article.get("id", "")
    pulso_link = f"https://noticias-personales-cl.web.app/?id={article_id}"
    
    hashtags = "#Pulso #Noticias #PeriodismoIndependiente #Chile #Actualidad"
    if "ciclismo" in category.lower():
        hashtags += " #Ciclismo #CiclismoRuta #MTB #Gravel #Bicicleta #Cicloturismo #TeamChile"
    elif "investigación" in category.lower():
        hashtags += " #Investigacion #CIPER #Reportaje #Poder"
    elif "medioambiente" in category.lower():
        hashtags += " #Medioambiente #Clima #Sustentabilidad #Naturaleza"
        
    caption = f"""{title}

{summary}

📰 Cobertura por: {source}

🔗 Lee el reportaje completo:
• Enlace directo: {pulso_link}
• Fuente original: {original_link}

👉 O entra al enlace de nuestra bio (@pulso.independiente.26) para abrirla al instante en nuestra web.

{hashtags}"""
    return caption.strip()

def publish_to_instagram(article, ig_account_id=None, ig_token=None):
    ig_account_id = ig_account_id or os.environ.get("INSTAGRAM_ACCOUNT_ID")
    ig_token = ig_token or os.environ.get("INSTAGRAM_ACCESS_TOKEN")

    # 1. Generar la imagen visual
    output_img = f"public/instagram_posts/{article['id']}.jpg"
    create_instagram_card(article, output_img)
    print(f"[IMAGEN] Imagen de publicación lista en: {output_img}")

    if not ig_account_id or not ig_token:
        print("\n" + "="*70)
        print("⚠️ CREDENCIALES DE INSTAGRAM NO DETECTADAS")
        print("="*70)
        print("La imagen del post fue generada con éxito, pero para publicar automáticamente")
        print("en tu cuenta de Instagram necesitas configurar 2 variables de entorno:")
        print("  1. INSTAGRAM_ACCOUNT_ID (El ID de tu cuenta profesional de Instagram)")
        print("  2. INSTAGRAM_ACCESS_TOKEN (Token generado en Meta for Developers)")
        print("\n📌 Pasos para obtenerlas:")
        print("  a) En tu Instagram: Cambia tu cuenta a 'Profesional / Creador' (gratis).")
        print("  b) Vincula tu cuenta de Instagram a una página de Facebook.")
        print("  c) Entra a developers.facebook.com -> Mis Apps -> Crear App (Negocios).")
        print("  d) Agrega el producto 'Instagram Graph API' y genera un Token con permisos:")
        print("     - instagram_basic")
        print("     - instagram_content_publish")
        print("="*70)
        return False

    # 2. Subir imagen a Cloud Storage para que Instagram la descargue en milisegundos
    bucket_url = f"gs://pulso-instagram-media/{article['id']}.jpg"
    public_img_url = f"https://storage.googleapis.com/pulso-instagram-media/{article['id']}.jpg"
    print(f"[STORAGE] Subiendo imagen a Google Cloud Storage...")
    try:
        subprocess.run(["gcloud", "storage", "cp", output_img, bucket_url], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)
        print(f"[STORAGE] Imagen pública disponible en: {public_img_url}")
    except Exception as e:
        print(f"[STORAGE] Advertencia: Fallo gcloud cp, intentando fallback de hosting: {e}")
        public_img_url = f"https://noticias-personales-cl.web.app/instagram_posts/{article['id']}.jpg"

    caption = generate_caption(article)

    # Determinar endpoint según el tipo de token (Instagram Login vs Facebook Login)
    api_base = "https://graph.instagram.com/v20.0" if ig_token.startswith("IG") else "https://graph.facebook.com/v21.0"

    # Paso A: Crear el contenedor del medio en Meta / Instagram
    print(f"[META] Creando contenedor de medio en Instagram ({api_base}) para cuenta {ig_account_id}...")
    container_url = f"{api_base}/{ig_account_id}/media"
    container_data = urllib.parse.urlencode({
        "image_url": public_img_url,
        "caption": caption,
        "access_token": ig_token
    }).encode("utf-8")

    try:
        req = urllib.request.Request(container_url, data=container_data)
        with urllib.request.urlopen(req, timeout=20) as resp:
            res_json = json.loads(resp.read().decode())
            creation_id = res_json.get("id")
            print(f"[META] Contenedor creado con ID: {creation_id}")
    except Exception as e:
        print(f"[ERROR] Error creando contenedor en Meta: {e}")
        return False

    # Paso B: Esperar a que Meta termine de procesar el medio (status_code == 'FINISHED')
    print(f"[META] Esperando procesamiento del medio en Instagram...")
    import time
    for _ in range(10):
        time.sleep(2)
        try:
            status_url = f"{api_base}/{creation_id}?fields=status_code&access_token={ig_token}"
            with urllib.request.urlopen(status_url, timeout=10) as s_resp:
                s_data = json.loads(s_resp.read().decode())
                status = s_data.get("status_code")
                if status == "FINISHED":
                    print("[META] Medio procesado y listo.")
                    break
                elif status == "ERROR":
                    print("[ERROR] Meta reportó un error procesando la imagen.")
                    return False
        except Exception:
            pass

    # Paso C: Publicar el contenedor
    print(f"[META] Publicando post en el feed de Instagram...")
    publish_url = f"{api_base}/{ig_account_id}/media_publish"
    publish_data = urllib.parse.urlencode({
        "creation_id": creation_id,
        "access_token": ig_token
    }).encode("utf-8")

    try:
        req = urllib.request.Request(publish_url, data=publish_data)
        with urllib.request.urlopen(req, timeout=20) as resp:
            publish_res = json.loads(resp.read().decode())
            post_id = publish_res.get("id")
            print(f"🎉 [ÉXITO] Noticia publicada en Instagram con Post ID: {post_id}")
            
            history = load_history()
            history.append({
                "articleId": article["id"],
                "title": article["title"],
                "postId": post_id,
                "publishedAt": article.get("publishedAt"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            save_history(history)
            return True
    except Exception as e:
        print(f"[ERROR] Error al publicar en Instagram: {e}")
        return False


def get_candidate(data, history):
    published_ids = set(h["articleId"] for h in history)
    # Candidato prioritario: Ciclismo o Alto Impacto con foto real
    for a in data.get("articles", []):
        if a["id"] not in published_ids and a.get("image"):
            if a.get("category") == "Ciclismo y Deporte" or a.get("relevanceTier") == "alta":
                return a
    return None

def check_cooldown(history):
    force_post = os.environ.get("INSTAGRAM_FORCE_POST", "0") == "1"

    # 1. Comprobar ventana horaria activa (08:00 a 23:00 hora de Chile)
    try:
        from zoneinfo import ZoneInfo
        chile_tz = ZoneInfo("America/Santiago")
    except Exception:
        chile_tz = timezone(timedelta(hours=-3))

    now_chile = datetime.now(chile_tz)
    current_hour = now_chile.hour

    if not (8 <= current_hour < 23) and not force_post:
        print(f"[HORARIO] Fuera de ventana activa ({current_hour:02d}:{now_chile.minute:02d} hrs en Chile). El bot publica entre 08:00 y 23:00 hrs.")
        return False

    # 2. Comprobar cooldown entre publicaciones (mínimo 3 horas)
    cooldown_hours = float(os.environ.get("INSTAGRAM_POST_COOLDOWN_HOURS", "3.0"))

    if history and not force_post:
        last_item = history[-1]
        last_time_str = last_item.get("timestamp")
        if last_time_str:
            elapsed_hours = 999.0
            try:
                last_time = datetime.fromisoformat(last_time_str)
                now = datetime.now(timezone.utc)
                elapsed_hours = (now - last_time).total_seconds() / 3600.0
            except Exception as e:
                print(f"[ERROR] Error calculando tiempo: {e}")

            if elapsed_hours < cooldown_hours:
                print(f"[COOLDOWN] La última publicación en Instagram fue hace {elapsed_hours:.1f}h. Frecuencia configurada: al menos {cooldown_hours}h entre posts.")
                return False

    return True

def prepare_post():
    if not os.path.exists(FEEDS_FILE):
        return None
    with open(FEEDS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    history = load_history()
    if not check_cooldown(history):
        return None
    candidate = get_candidate(data, history)
    if not candidate:
        print("No se encontraron notas nuevas pendientes de publicar.")
        return None

    print(f"Candidato preparado: [{candidate.get('category')}] {candidate.get('title')}")
    output_img = f"public/instagram_posts/{candidate['id']}.jpg"
    create_instagram_card(candidate, output_img)
    print(f"[IMAGEN] Imagen de publicación lista en: {output_img}")

    os.makedirs(os.path.dirname(PENDING_POST_FILE), exist_ok=True)
    with open(PENDING_POST_FILE, "w", encoding="utf-8") as f:
        json.dump(candidate, f, ensure_ascii=False, indent=2)
    return candidate

def publish_pending_post():
    if not os.path.exists(PENDING_POST_FILE):
        return False
    with open(PENDING_POST_FILE, "r", encoding="utf-8") as f:
        candidate = json.load(f)
    success = publish_to_instagram(candidate)
    if success and os.path.exists(PENDING_POST_FILE):
        try:
            os.remove(PENDING_POST_FILE)
        except Exception:
            pass
    return success

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode == "--prepare":
        prepare_post()
    elif mode == "--publish":
        publish_pending_post()
    else:
        # Modo completo
        history = load_history()
        if not check_cooldown(history):
            sys.exit(0)
        with open(FEEDS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        cand = get_candidate(data, history)
        if cand:
            print(f"Candidato seleccionado: [{cand.get('category')}] {cand.get('title')}")
            publish_to_instagram(cand)
        else:
            print("No se encontraron notas nuevas pendientes de publicar.")
