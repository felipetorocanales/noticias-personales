import os
import sys
import json
import urllib.request
import urllib.parse
from generate_instagram_post import create_instagram_card

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

HISTORY_FILE = "public/data/instagram_history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
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
🔗 Lee el reportaje completo en el enlace de nuestra biografía o en noticias-personales-cl.web.app

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

    # 2. La URL pública de la imagen (Instagram Graph API requiere que la imagen sea accesible por HTTPS)
    public_img_url = f"https://noticias-personales-cl.web.app/instagram_posts/{article['id']}.jpg"
    caption = generate_caption(article)

    # Paso A: Crear el contenedor del medio en Meta
    print(f"[META] Creando contenedor de medio en Instagram para cuenta {ig_account_id}...")
    container_url = f"https://graph.facebook.com/v21.0/{ig_account_id}/media"
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

    # Paso B: Publicar el contenedor
    print(f"[META] Publicando post en el feed de Instagram...")
    publish_url = f"https://graph.facebook.com/v21.0/{ig_account_id}/media_publish"
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
                "publishedAt": article.get("publishedAt")
            })
            save_history(history)
            return True
    except Exception as e:
        print(f"[ERROR] Error al publicar en Instagram: {e}")
        return False

if __name__ == "__main__":
    with open("public/data/initial-feeds.json", encoding="utf-8") as f:
        data = json.load(f)

    history = load_history()
    published_ids = set(h["articleId"] for h in history)

    # Candidato prioritario: Ciclismo o Alto Impacto con foto real
    candidate = None
    for a in data["articles"]:
        if a["id"] not in published_ids and a.get("image"):
            if a.get("category") == "Ciclismo y Deporte" or a.get("relevanceTier") == "alta":
                candidate = a
                break

    if candidate:
        print(f"Candidato seleccionado: [{candidate.get('category')}] {candidate.get('title')}")
        publish_to_instagram(candidate)
    else:
        print("No se encontraron notas nuevas pendientes de publicar.")
