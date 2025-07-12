# Script de despliegue para Windows PowerShell

param(
    [string]$Stage = "dev",
    [string]$Region = "us-east-1",
    [string]$Profile = "default"
)

Write-Host "🚀 Desplegando CloudPF Ingesta en Tiempo Real" -ForegroundColor Green
Write-Host "Stage: $Stage"
Write-Host "Region: $Region"
Write-Host "Profile: $Profile"

# Validar credenciales de AWS
Write-Host "🔑 Validando credenciales de AWS..."
try {
    aws sts get-caller-identity --profile $Profile | Out-Null
    Write-Host "✅ Credenciales de AWS validadas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: No se pueden obtener las credenciales de AWS" -ForegroundColor Red
    Write-Host "Asegúrate de tener configurado AWS CLI con el profile: $Profile" -ForegroundColor Yellow
    exit 1
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias..."
npm ci

# Construir el proyecto
Write-Host "🏗️ Construyendo el proyecto..."
try {
    npm run build
} catch {
    Write-Host "Build script no encontrado, continuando..." -ForegroundColor Yellow
}

# Configurar ElasticSearch local para desarrollo
if ($Stage -eq "dev") {
    Write-Host "🔍 Configurando ElasticSearch local..."
    
    # Verificar si Docker está corriendo
    try {
        docker info | Out-Null
        Write-Host "✅ Docker está corriendo" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Docker no está corriendo" -ForegroundColor Yellow
        Write-Host "Por favor, inicia Docker Desktop"
        Read-Host "Presiona Enter cuando Docker esté listo"
    }
    
    # Iniciar ElasticSearch con Docker Compose
    Write-Host "🐳 Iniciando ElasticSearch con Docker Compose..."
    Set-Location docker
    docker-compose up -d
    Set-Location ..
    
    # Esperar a que ElasticSearch esté listo
    Write-Host "⏳ Esperando a que ElasticSearch esté listo..."
    $timeout = 60
    $elapsed = 0
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ ElasticSearch está listo" -ForegroundColor Green
                break
            }
        } catch {
            Start-Sleep -Seconds 2
            $elapsed += 2
        }
    } while ($elapsed -lt $timeout)
    
    if ($elapsed -ge $timeout) {
        Write-Host "❌ ElasticSearch no está respondiendo después de 60 segundos" -ForegroundColor Red
        exit 1
    }
    
    # Configurar índices
    Write-Host "🔧 Configurando índices de ElasticSearch..."
    $env:STAGE = $Stage
    $env:TENANT_IDS = "tenant1,tenant2,tenant3"
    node scripts/setup-elasticsearch.js
}

# Desplegar funciones Lambda
Write-Host "☁️  Desplegando funciones Lambda..."
npx serverless deploy --stage $Stage --region $Region --aws-profile $Profile

# Crear tablas de Athena
Write-Host "🗄️  Creando tablas de Athena..."
$env:STAGE = $Stage
node scripts/create-athena-tables.js

# Verificar deployment
Write-Host "🔍 Verificando deployment..."
try {
    npx serverless info --stage $Stage --region $Region --aws-profile $Profile | Out-Null
    Write-Host "✅ Deployment verificado correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en la verificación del deployment" -ForegroundColor Red
    exit 1
}

# Mostrar información del deployment
Write-Host ""
Write-Host "📊 Información del deployment:" -ForegroundColor Cyan
npx serverless info --stage $Stage --region $Region --aws-profile $Profile

# Mostrar endpoints
Write-Host ""
Write-Host "🔗 Endpoints disponibles:" -ForegroundColor Cyan
Write-Host "  - ElasticSearch API: https://API_GATEWAY_URL/dev/search/{tenant_id}"
Write-Host "  - Athena Analytics: https://API_GATEWAY_URL/dev/analytics/{tenant_id}"

if ($Stage -eq "dev") {
    Write-Host "  - ElasticSearch Local: http://localhost:9200"
    Write-Host "  - Kibana Local: http://localhost:5601"
}

Write-Host ""
Write-Host "🎉 Deployment completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Configurar los endpoints en tu aplicación frontend"
Write-Host "  2. Probar la ingesta de datos usando los microservicios existentes"
Write-Host "  3. Verificar que los datos se están indexando en ElasticSearch"
Write-Host "  4. Revisar los logs de las funciones Lambda"
Write-Host ""
Write-Host "Para ver los logs en tiempo real:" -ForegroundColor Cyan
Write-Host "  npx serverless logs -f productStreamProcessor --stage $Stage --tail"
Write-Host "  npx serverless logs -f purchaseStreamProcessor --stage $Stage --tail"
