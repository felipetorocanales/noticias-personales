#!/bin/bash
set -e

# ==============================================================================
# Script de Despliegue de Pulso Independiente en Google Cloud Functions (Gen 2)
# y programación automática con Cloud Scheduler (cada 15 minutos).
# ==============================================================================

PROJECT_ID="noticias-personales-cl"
REGION="us-central1"
FUNCTION_NAME="refreshFeeds"
BUCKET_NAME="pulso-instagram-media"
JOB_NAME="pulso-auto-sync"

echo "=== 1. Verificando autenticación en gcloud ==="
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "No hay una cuenta activa en gcloud. Iniciando sesión..."
  gcloud auth login
fi

echo "=== 2. Configurando proyecto: ${PROJECT_ID} ==="
gcloud config set project "$PROJECT_ID"

echo "=== 3. Habilitando APIs requeridas ==="
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  storage.googleapis.com

echo "=== 4. Configurando CORS en el bucket de Cloud Storage ==="
gcloud storage buckets update "gs://${BUCKET_NAME}" --cors-file=cors.json || true

echo "=== 5. Desplegando Cloud Function: ${FUNCTION_NAME} ==="
gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --runtime python311 \
  --region "$REGION" \
  --source ./functions \
  --entry-point refresh_feeds \
  --trigger-http \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 180s \
  --set-env-vars PULSO_STORAGE_BUCKET="$BUCKET_NAME"

FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --region "$REGION" --format='value(serviceConfig.uri)')
echo "Función desplegada en: ${FUNCTION_URL}"

echo "=== 6. Configurando Cloud Scheduler cada 15 minutos ==="
if gcloud scheduler jobs describe "$JOB_NAME" --location "$REGION" >/dev/null 2>&1; then
  echo "Actualizando job existente en Cloud Scheduler..."
  gcloud scheduler jobs update http "$JOB_NAME" \
    --location "$REGION" \
    --schedule "*/15 * * * *" \
    --uri "$FUNCTION_URL" \
    --http-method POST
else
  echo "Creando nuevo job en Cloud Scheduler..."
  gcloud scheduler jobs create http "$JOB_NAME" \
    --location "$REGION" \
    --schedule "*/15 * * * *" \
    --uri "$FUNCTION_URL" \
    --http-method POST \
    --description "Sincroniza feeds RSS y publica en Instagram cada 15 minutos"
fi

echo "=== 7. Ejecutando primer disparo de prueba ==="
gcloud scheduler jobs run "$JOB_NAME" --location "$REGION"

echo "🎉 ¡Despliegue y programación completados exitosamente!"
