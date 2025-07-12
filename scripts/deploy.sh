#!/bin/bash

# Script para desplegar el proyecto de ingesta en tiempo real

set -e

# Variables
STAGE=${1:-dev}
REGION=${2:-us-east-1}
PROFILE=${3:-default}

echo "🚀 Desplegando CloudPF Ingesta en Tiempo Real"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "Profile: $PROFILE"

# Validar que existan las credenciales de AWS
if ! aws sts get-caller-identity --profile $PROFILE > /dev/null 2>&1; then
    echo "❌ Error: No se pueden obtener las credenciales de AWS"
    echo "Asegúrate de tener configurado AWS CLI con el profile: $PROFILE"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Construir el proyecto
echo "🏗️ Construyendo el proyecto..."
npm run build 2>/dev/null || echo "Build script no encontrado, continuando..."

# Configurar ElasticSearch local para desarrollo
if [ "$STAGE" = "dev" ]; then
    echo "🔍 Configurando ElasticSearch local..."
    
    # Verificar si Docker está corriendo
    if ! docker info > /dev/null 2>&1; then
        echo "⚠️  Docker no está corriendo. Iniciando contenedores de ElasticSearch..."
        echo "Por favor, inicia Docker Desktop o el daemon de Docker"
        read -p "Presiona Enter cuando Docker esté listo..."
    fi
    
    # Iniciar ElasticSearch con Docker Compose
    echo "🐳 Iniciando ElasticSearch con Docker Compose..."
    cd docker
    docker-compose up -d
    cd ..
    
    # Esperar a que ElasticSearch esté listo
    echo "⏳ Esperando a que ElasticSearch esté listo..."
    timeout 60 bash -c 'until curl -s http://localhost:9200/_cluster/health > /dev/null; do sleep 2; done' || {
        echo "❌ ElasticSearch no está respondiendo después de 60 segundos"
        exit 1
    }
    
    echo "✅ ElasticSearch está listo"
    
    # Configurar índices
    echo "🔧 Configurando índices de ElasticSearch..."
    STAGE=$STAGE TENANT_IDS="tenant1,tenant2,tenant3" node scripts/setup-elasticsearch.js
fi

# Desplegar funciones Lambda
echo "☁️  Desplegando funciones Lambda..."
npx serverless deploy --stage $STAGE --region $REGION --aws-profile $PROFILE

# Crear tablas de Athena
echo "🗄️  Creando tablas de Athena..."
STAGE=$STAGE node scripts/create-athena-tables.js

# Verificar deployment
echo "🔍 Verificando deployment..."
if npx serverless info --stage $STAGE --region $REGION --aws-profile $PROFILE > /dev/null 2>&1; then
    echo "✅ Deployment verificado correctamente"
else
    echo "❌ Error en la verificación del deployment"
    exit 1
fi

# Mostrar información del deployment
echo ""
echo "📊 Información del deployment:"
npx serverless info --stage $STAGE --region $REGION --aws-profile $PROFILE

# Mostrar endpoints
echo ""
echo "🔗 Endpoints disponibles:"
echo "  - ElasticSearch API: https://API_GATEWAY_URL/dev/search/{tenant_id}"
echo "  - Athena Analytics: https://API_GATEWAY_URL/dev/analytics/{tenant_id}"

if [ "$STAGE" = "dev" ]; then
    echo "  - ElasticSearch Local: http://localhost:9200"
    echo "  - Kibana Local: http://localhost:5601"
fi

echo ""
echo "🎉 Deployment completado exitosamente!"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Configurar los endpoints en tu aplicación frontend"
echo "  2. Probar la ingesta de datos usando los microservicios existentes"
echo "  3. Verificar que los datos se están indexando en ElasticSearch"
echo "  4. Revisar los logs de las funciones Lambda"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  npx serverless logs -f productStreamProcessor --stage $STAGE --tail"
echo "  npx serverless logs -f purchaseStreamProcessor --stage $STAGE --tail"
