import functions_framework
import json
import os
import traceback
from datetime import datetime, timezone

from fetch_feeds_core import fetch_all, SOURCES
from storage_helper import upload_json_to_gcs, download_json_from_gcs
import instagram_publisher

SYNC_SECRET = os.environ.get("PULSO_SYNC_SECRET", "")

@functions_framework.http
def refresh_feeds(request):
    """
    Cloud Function (Python 3.11):
    1. Descarga y clasifica los 38 feeds RSS independientes.
    2. Guarda initial-feeds.json y archive.json en Cloud Storage.
    3. Evalúa cooldown y publica la mejor noticia en Instagram.
    4. Devuelve resumen de ejecución en JSON.
    """
    # CORS
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600"
        }
        return ("", 204, headers)

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    }

    # Comprobar secreto si está configurado
    if SYNC_SECRET:
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        param_token = request.args.get("secret", "").strip()
        if token != SYNC_SECRET and param_token != SYNC_SECRET:
            return (json.dumps({"error": "Unauthorized"}), 401, headers)

    print("=== [Pulso Cloud Function] Iniciando ciclo de sincronización ===")
    start_time = datetime.now(timezone.utc)

    try:
        # 1. Ejecutar agregación RSS y filtrado
        payload, archive = fetch_all()
        print(f"[OK] Feeds procesados: {payload.get('totalArticles')} artículos válidos.")

        # 2. Guardar en Google Cloud Storage para consumo público inmediato
        upload_json_to_gcs("data/initial-feeds.json", payload, cache_control="public, max-age=60, s-maxage=60")
        upload_json_to_gcs("data/archive.json", archive, cache_control="public, max-age=300")

        # 3. Instagram: evaluar candidato y publicar si cumple cooldown/horario
        ig_result = "omitted"
        try:
            history = download_json_from_gcs("data/instagram_history.json", default=[])
            if instagram_publisher.check_cooldown(history):
                candidate = instagram_publisher.get_candidate(payload, history)
                if candidate:
                    published = instagram_publisher.publish_to_instagram(candidate)
                    ig_result = "published" if published else "failed"
                    # Si se publicó, actualizar historial en Cloud Storage
                    new_history = instagram_publisher.load_history()
                    upload_json_to_gcs("data/instagram_history.json", new_history)
                else:
                    ig_result = "no_candidate"
            else:
                ig_result = "cooldown_or_outside_hours"
        except Exception as ig_err:
            print(f"[INSTAGRAM] Error en ciclo de publicación: {ig_err}")
            ig_result = f"error: {str(ig_err)}"

        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        res = {
            "status": "success",
            "message": "Sincronización completada con éxito.",
            "totalArticles": payload.get("totalArticles"),
            "blockedFarandula": payload.get("totalBlockedFarandula"),
            "instagramResult": ig_result,
            "generatedAt": payload.get("generatedAt"),
            "durationSeconds": round(elapsed, 2)
        }
        return (json.dumps(res, ensure_ascii=False), 200, headers)

    except Exception as e:
        err_trace = traceback.format_exc()
        print(f"[FATAL] Error en Cloud Function: {err_trace}")
        return (json.dumps({
            "status": "error",
            "message": str(e),
            "trace": err_trace[:400]
        }), 500, headers)

# Alias para compatibilidad de entry-point (refreshFeeds o refresh_feeds)
refreshFeeds = refresh_feeds
