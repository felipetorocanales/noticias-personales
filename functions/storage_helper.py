import json
import os
from google.cloud import storage

BUCKET_NAME = os.environ.get("PULSO_STORAGE_BUCKET", "pulso-instagram-media")

def get_bucket():
    client = storage.Client()
    return client.bucket(BUCKET_NAME)

def download_json_from_gcs(blob_path, default=None):
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_path)
        if blob.exists():
            data = blob.download_as_text(encoding="utf-8")
            return json.loads(data)
    except Exception as e:
        print(f"[GCS] Error descargando {blob_path}: {e}")
    return default

def upload_json_to_gcs(blob_path, data, cache_control="no-cache, no-store, max-age=0"):
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_path)
        blob.cache_control = cache_control
        blob.upload_from_string(
            json.dumps(data, ensure_ascii=False, indent=2),
            content_type="application/json; charset=utf-8"
        )
        print(f"[GCS] Subido exitosamente: gs://{BUCKET_NAME}/{blob_path}")
        return True
    except Exception as e:
        print(f"[GCS] Error subiendo {blob_path}: {e}")
        return False

def upload_file_to_gcs(local_file_path, blob_path, content_type="image/jpeg"):
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_path)
        blob.upload_from_filename(local_file_path, content_type=content_type)
        print(f"[GCS] Archivo subido: gs://{BUCKET_NAME}/{blob_path}")
        return f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_path}"
    except Exception as e:
        print(f"[GCS] Error subiendo archivo {local_file_path}: {e}")
        return None
