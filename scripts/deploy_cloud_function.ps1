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

# Detectar variables de Instagram desde .env o el entorno actual
$envVars = "PULSO_STORAGE_BUCKET=$BucketName"
if (Test-Path ".env") {
    Write-Host "Leyendo credenciales desde .env..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "INSTAGRAM_ACCOUNT_ID" -or $k -eq "INSTAGRAM_ACCESS_TOKEN") {
                $envVars += ",$k=$v"
            }
        }
    }
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
    --memory 256MB `
    --max-instances 1 `
    --timeout 180s `
    --update-env-vars "$envVars"

Write-Host "=== 6. Obteniendo URL de la función ===" -ForegroundColor Cyan
$FunctionUrl = (gcloud functions describe $FunctionName --region $Region --format="value(serviceConfig.uri)").Trim()
Write-Host "URL de la función: $FunctionUrl" -ForegroundColor Green

Write-Host "=== 7. Configurando Cloud Scheduler (07:00 a 23:59 Chile, cada 20 min) ===" -ForegroundColor Cyan
$jobExists = gcloud scheduler jobs describe $JobName --location $Region --format="value(name)" 2>$null
if ($jobExists) {
    Write-Host "Actualizando job existente en Cloud Scheduler..." -ForegroundColor Yellow
    gcloud scheduler jobs update http $JobName `
        --location $Region `
        --schedule "*/20 7-23 * * *" `
        --time-zone "America/Santiago" `
        --uri $FunctionUrl `
        --http-method POST
} else {
    Write-Host "Creando nuevo job en Cloud Scheduler..." -ForegroundColor Green
    gcloud scheduler jobs create http $JobName `
        --location $Region `
        --schedule "*/20 7-23 * * *" `
        --time-zone "America/Santiago" `
        --uri $FunctionUrl `
        --http-method POST `
        --description "Sincroniza feeds RSS y publica en Instagram cada 20 min (07:00-23:59 Chile)"
}

Write-Host "=== 8. Disparo de prueba inmediato ===" -ForegroundColor Cyan
gcloud scheduler jobs run $JobName --location $Region

Write-Host "🎉 ¡Despliegue y programación completados exitosamente!" -ForegroundColor Green
