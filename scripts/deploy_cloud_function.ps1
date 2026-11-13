# ==============================================================================
# Script de Despliegue de Pulso Independiente para Windows PowerShell
# ==============================================================================

$ErrorActionPreference = "Stop"

$ProjectId    = "noticias-personales-cl"
$Region       = "us-central1"
$FunctionName = "refreshFeeds"
$BucketName   = "pulso-instagram-media"
$JobName      = "pulso-auto-sync"

Write-Host "=== 1. Verificando autenticación en gcloud ===" -ForegroundColor Cyan
$activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $activeAccount) {
    Write-Host "No hay una cuenta activa en gcloud. Abriendo inicio de sesión..." -ForegroundColor Yellow
    gcloud auth login
} else {
    Write-Host "Cuenta activa: $activeAccount" -ForegroundColor Green
}

Write-Host "=== 2. Configurando proyecto: $ProjectId ===" -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "=== 3. Habilitando APIs de Google Cloud ===" -ForegroundColor Cyan
gcloud services enable `
    cloudfunctions.googleapis.com `
    cloudbuild.googleapis.com `
    run.googleapis.com `
    cloudscheduler.googleapis.com `
    storage.googleapis.com

Write-Host "=== 4. Configurando CORS en el bucket de Cloud Storage ===" -ForegroundColor Cyan
try {
    gcloud storage buckets update "gs://$BucketName" --cors-file=cors.json
} catch {
    Write-Host "Aviso: no se pudo actualizar CORS o ya estaba configurado." -ForegroundColor Yellow
}

Write-Host "=== 5. Desplegando Cloud Function: $FunctionName (Python 3.11 Gen 2) ===" -ForegroundColor Cyan
gcloud functions deploy $FunctionName `
    --gen2 `
    --runtime python311 `
    --region $Region `
    --source ./functions `
    --entry-point refresh_feeds `
    --trigger-http `
    --allow-unauthenticated `
    --memory 512MB `
    --timeout 180s `
    --set-env-vars "PULSO_STORAGE_BUCKET=$BucketName"

Write-Host "=== 6. Obteniendo URL de la función ===" -ForegroundColor Cyan
$FunctionUrl = (gcloud functions describe $FunctionName --region $Region --format="value(serviceConfig.uri)").Trim()
Write-Host "URL de la función: $FunctionUrl" -ForegroundColor Green

Write-Host "=== 7. Configurando Cloud Scheduler cada 15 minutos ===" -ForegroundColor Cyan
$jobExists = gcloud scheduler jobs describe $JobName --location $Region --format="value(name)" 2>$null
if ($jobExists) {
    Write-Host "Actualizando job existente en Cloud Scheduler..." -ForegroundColor Yellow
    gcloud scheduler jobs update http $JobName `
        --location $Region `
        --schedule "*/15 * * * *" `
        --uri $FunctionUrl `
        --http-method POST
} else {
    Write-Host "Creando nuevo job en Cloud Scheduler..." -ForegroundColor Green
    gcloud scheduler jobs create http $JobName `
        --location $Region `
        --schedule "*/15 * * * *" `
        --uri $FunctionUrl `
        --http-method POST `
        --description "Sincroniza feeds RSS y publica en Instagram cada 15 minutos"
}

Write-Host "=== 8. Disparo de prueba inmediato ===" -ForegroundColor Cyan
gcloud scheduler jobs run $JobName --location $Region

Write-Host "🎉 ¡Despliegue y programación completados exitosamente!" -ForegroundColor Green
