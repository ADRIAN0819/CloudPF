# Script de despliegue para AWS Academy

param(
    [string]$StudentId = "student123",
    [string]$Region = "us-east-1"
)

Write-Host "🎓 Desplegando CloudPF para AWS Academy" -ForegroundColor Green
Write-Host "Student ID: $StudentId"
Write-Host "Region: $Region"

# Verificar credenciales de AWS Academy
Write-Host "🔑 Verificando credenciales de AWS Academy..."
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    $accountId = $identity.Account
    Write-Host "✅ Account ID: $accountId" -ForegroundColor Green
    
    # Verificar que es LabRole
    if ($identity.Arn -like "*LabRole*") {
        Write-Host "✅ Usando LabRole correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No se detectó LabRole, continuando..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: No se pueden obtener las credenciales de AWS Academy" -ForegroundColor Red
    Write-Host "Asegúrate de haber copiado las credenciales del Lab" -ForegroundColor Yellow
    exit 1
}

# Configurar variables de entorno para Academy
$env:AWS_ACCOUNT_ID = $accountId
$env:STUDENT_ID = $StudentId
$env:STAGE = "academy"

# Instalar dependencias
Write-Host "📦 Instalando dependencias..."
npm ci

# Desplegar con configuración de Academy
Write-Host "☁️  Desplegando funciones Lambda..."
try {
    npx serverless deploy --stage academy --region $Region
    Write-Host "✅ Funciones Lambda desplegadas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error desplegando funciones Lambda" -ForegroundColor Red
    Write-Host "Verifica que tengas permisos de LabRole" -ForegroundColor Yellow
    exit 1
}

# Crear tablas de Athena (si está disponible)
Write-Host "🗄️  Configurando Athena..."
try {
    $env:STAGE = "academy"
    node scripts/create-athena-tables.js
    Write-Host "✅ Tablas de Athena creadas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Athena no disponible o limitado en Academy" -ForegroundColor Yellow
}

# Configurar búsqueda alternativa (DynamoDB GSI)
Write-Host "🔍 Configurando índices de búsqueda..."
try {
    node scripts/setup-search-index.js
    Write-Host "✅ Índices de búsqueda configurados" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Configuración de búsqueda limitada" -ForegroundColor Yellow
}

# Verificar deployment
Write-Host "🔍 Verificando deployment..."
try {
    $info = npx serverless info --stage academy --region $Region
    Write-Host "✅ Deployment verificado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en la verificación" -ForegroundColor Red
    exit 1
}

# Mostrar información del deployment
Write-Host ""
Write-Host "📊 Información del deployment:" -ForegroundColor Cyan
npx serverless info --stage academy --region $Region

# Mostrar endpoints para Academy
Write-Host ""
Write-Host "🔗 Endpoints para Academy:" -ForegroundColor Cyan
Write-Host "  - API Gateway: https://[API-ID].execute-api.us-east-1.amazonaws.com/academy"
Write-Host "  - DynamoDB Tables: Productos-academy, Compras-academy"
Write-Host "  - S3 Bucket: cloudpf-data-academy-$accountId"

Write-Host ""
Write-Host "🎉 Deployment para AWS Academy completado!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Recordatorios importantes:" -ForegroundColor Yellow
Write-Host "  1. Las credenciales de Academy expiran en 4 horas"
Write-Host "  2. Elimina recursos después de las pruebas"
Write-Host "  3. Monitorea los costos en el dashboard"
Write-Host ""
Write-Host "📝 Para limpiar recursos:" -ForegroundColor Cyan
Write-Host "  .\scripts\cleanup-academy.ps1"
