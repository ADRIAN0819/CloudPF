@echo off
echo.
echo ===================================================
echo  CloudPF - Ingesta en Tiempo Real
echo  Script de Inicio Rapido
echo ===================================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no esta instalado
    echo Por favor instala Node.js 18 o superior
    pause
    exit /b 1
)

:: Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no esta instalado
    echo Por favor instala Docker Desktop
    pause
    exit /b 1
)

:: Verificar AWS CLI
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI no esta instalado
    echo Por favor instala AWS CLI v2
    pause
    exit /b 1
)

echo ✅ Verificaciones completadas
echo.

:: Instalar dependencias
echo 📦 Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

:: Copiar archivo de configuración
if not exist .env (
    echo 🔧 Creando archivo de configuración...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANTE: Edita el archivo .env con tu configuración
    echo.
)

:: Verificar Docker corriendo
echo 🐳 Verificando Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no esta corriendo
    echo Por favor inicia Docker Desktop
    pause
    exit /b 1
)

:: Iniciar ElasticSearch
echo 🔍 Iniciando ElasticSearch...
cd docker
docker-compose up -d
cd ..

:: Esperar a que ElasticSearch esté listo
echo ⏳ Esperando a que ElasticSearch esté listo...
timeout /t 30 /nobreak >nul

:: Verificar ElasticSearch
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:9200' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel% neq 0 (
    echo ❌ ElasticSearch no esta respondiendo
    echo Verifica que Docker Desktop esté corriendo
    pause
    exit /b 1
)

echo ✅ ElasticSearch está listo
echo.

:: Configurar índices
echo 🔧 Configurando índices de ElasticSearch...
set STAGE=dev
set TENANT_IDS=tenant1,tenant2,tenant3
node scripts/setup-elasticsearch.js
if %errorlevel% neq 0 (
    echo ❌ Error configurando índices
    pause
    exit /b 1
)

echo.
echo 🎉 Configuración completada exitosamente!
echo.
echo 📋 Próximos pasos:
echo   1. Configura AWS CLI: aws configure
echo   2. Edita el archivo .env con tu configuración
echo   3. Ejecuta: npm run deploy:dev
echo.
echo 🔗 URLs disponibles:
echo   - ElasticSearch: http://localhost:9200
echo   - Kibana: http://localhost:5601
echo.
echo 📖 Más información en docs/manual-despliegue.md
echo.
pause
