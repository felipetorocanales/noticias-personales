import functions_framework
import urllib.request
import json
import os
from datetime import datetime, timezone

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "felipetorocanales/noticias-personales"
WORKFLOW_ID = "sync_feeds.yml"
COOLDOWN_MINUTES = 10

@functions_framework.http
def refresh_feeds(request):
    # Soporte CORS para llamadas fetch desde el frontend
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600"
        }
        return ("", 204, headers)

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    }

    try:
        # 1. Consultar el estado de la última ejecución en GitHub Actions
        runs_url = f"https://api.github.com/repos/{REPO}/actions/workflows/{WORKFLOW_ID}/runs?per_page=1"
        check_req = urllib.request.Request(runs_url, headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Pulso-Cloud-Function"
        })

        with urllib.request.urlopen(check_req, timeout=8) as resp:
            runs_data = json.loads(resp.read().decode())
            runs = runs_data.get("workflow_runs", [])

        if runs:
            last_run = runs[0]
            status = last_run.get("status")
            created_at_str = last_run.get("created_at")

            # Si ya se está ejecutando una actualización en este momento
            if status in ("in_progress", "queued", "waiting"):
                return (json.dumps({
                    "status": "in_progress",
                    "message": "Sincronización en curso en la nube.",
                    "runId": last_run.get("id")
                }), 200, headers)

            # Si terminó hace menos de COOLDOWN_MINUTES
            if created_at_str:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                elapsed_min = (datetime.now(timezone.utc) - created_at).total_seconds() / 60.0

                if elapsed_min < COOLDOWN_MINUTES:
                    return (json.dumps({
                        "status": "recent",
                        "message": f"Contenido fresco (sincronizado hace {int(elapsed_min)} min).",
                        "elapsedMinutes": round(elapsed_min, 1)
                    }), 200, headers)

        # 2. Si pasaron más de 10 minutos o no hay ejecuciones previas, disparar nueva sincronización
        dispatch_url = f"https://api.github.com/repos/{REPO}/actions/workflows/{WORKFLOW_ID}/dispatches"
        payload = json.dumps({"ref": "main"}).encode("utf-8")
        dispatch_req = urllib.request.Request(dispatch_url, data=payload, headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Pulso-Cloud-Function"
        })

        with urllib.request.urlopen(dispatch_req, timeout=10) as resp:
            if resp.status in (200, 204):
                return (json.dumps({
                    "status": "triggered",
                    "message": "Sincronización iniciada en segundo plano con éxito."
                }), 200, headers)
            else:
                return (json.dumps({
                    "status": "error",
                    "message": f"Respuesta inesperada de GitHub: HTTP {resp.status}"
                }), 502, headers)

    except Exception as e:
        return (json.dumps({
            "status": "error",
            "message": str(e)
        }), 500, headers)
