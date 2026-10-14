import os
import sys
import subprocess
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "sync_and_deploy.log")

def log(msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{now}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def main():
    log("=== Iniciando sincronización de Pulso ===")
    python_exe = sys.executable
    fetch_script = os.path.join(BASE_DIR, "scripts", "fetch_feeds.py")
    
    # 1. Fetch feeds
    log(f"Ejecutando {fetch_script}...")
    res_fetch = subprocess.run([python_exe, fetch_script], cwd=BASE_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res_fetch.returncode != 0:
        log(f"ERROR en fetch_feeds: {res_fetch.stderr}")
        return
    log("fetch_feeds completado con éxito.")

    # 2. Deploy to Firebase Hosting
    firebase_cmd = "firebase.cmd" if os.name == "nt" else "firebase"
    # Find full path if possible
    npm_path = os.path.expandvars(r"%APPDATA%\npm\firebase.cmd")
    if os.path.exists(npm_path):
        firebase_cmd = npm_path

    log("Desplegando en Firebase Hosting...")
    res_deploy = subprocess.run([firebase_cmd, "deploy", "--only", "hosting", "--project", "noticias-personales-cl"], cwd=BASE_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res_deploy.returncode != 0:
        log(f"ERROR en firebase deploy: {res_deploy.stderr}")
        return
    log("Firebase deploy completado con éxito.")
    log("=== Sincronización finalizada correctamente ===")

if __name__ == "__main__":
    main()
