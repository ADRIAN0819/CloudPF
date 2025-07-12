# CloudPF - Ingesta en Tiempo Real

## Descripción
Sistema de ingesta en tiempo real para capturar eventos de productos y compras, implementando CDC (Change Data Capture) con DynamoDB Streams y máquina virtual de búsqueda. Incluye adaptación completa para AWS Academy.

## 🎯 Optimizado para AWS Academy

Este proyecto está específicamente diseñado y optimizado para AWS Academy:
- ✅ DynamoDB GSI como reemplazo de ElasticSearch
- ✅ LabRole exclusivamente
- ✅ Configuración simplificada para limitaciones de Academy
- ✅ Solo archivos y scripts necesarios para Academy

## Componentes Principales

### 1. Change Data Capture (CDC) - DynamoDB Streams
- ✅ Captura cambios en tiempo real de las tablas DynamoDB
- ✅ Procesamiento mediante Lambda functions
- ✅ Actualización automática en índice de búsqueda

### 2. Máquina Virtual de Búsqueda
- **AWS Academy**: DynamoDB GSI con índice de búsqueda
- ✅ Persistencia con TTL automático
- ✅ APIs REST para consultas optimizadas

### 3. Ingesta en Tiempo Real
- ✅ Lambda para actualizar productos en índice de búsqueda
- ✅ Lambda para procesar compras y generar archivos JSON
- ✅ Integración con S3 y Athena para análisis

## 🏗️ Arquitectura
- **Multi-tenancy**: ✅ Soporte para múltiples tenants
- **Serverless**: ✅ Framework AWS Lambda + DynamoDB Streams
- **Búsqueda**: ✅ DynamoDB GSI optimizado para Academy
- **Análisis**: ✅ S3 + Athena para consultas SQL

## 🚀 Inicio Rápido

```powershell
# 1. Configurar AWS CLI
aws configure

# 2. Crear tablas DynamoDB
node scripts/create-dynamodb-tables-academy.js

# 3. Crear infraestructura Athena
node scripts/create-athena-tables-academy.js

# 4. Desplegar Lambda functions
serverless deploy --config serverless-academy.yml

# 5. Probar funcionamiento
node scripts/test-cdc-academy.js
```

## 📁 Estructura del Proyecto

```
CloudPF/
├── 📂 cdc-lambda-functions/          # Lambda functions para CDC
│   ├── product-stream-processor-academy.js   # Procesador productos
│   └── purchase-stream-processor-academy.js  # Procesador compras
├── 📂 api-rest/                      # API de búsqueda
│   └── search-api-academy.js             # API búsqueda DynamoDB GSI
├── 📂 athena-queries/                # Consultas analíticas
│   └── example-queries-academy.sql       # Ejemplos para Academy
├── 📂 scripts/                       # Scripts de automatización
│   ├── create-dynamodb-tables-academy.js  # Crear tablas DynamoDB
│   ├── create-athena-tables-academy.js    # Crear tablas Athena
│   ├── test-cdc-academy.js               # Probar CDC
│   ├── deploy-academy.ps1                # Desplegar en Academy
│   └── cleanup-academy.ps1               # Limpiar recursos
├── 📂 docs/                          # Documentación
│   ├── guia-aws-academy.md               # Guía específica Academy
│   ├── arquitectura-academy.md           # Arquitectura Academy
│   ├── setup-mv-academy.md               # Setup MV en Academy
│   └── evidencias-implementacion.md      # Evidencias del proyecto
├── serverless-academy.yml            # Configuración Serverless Academy
└── README.md                         # Este archivo
```

## 🔧 Configuración Específica AWS Academy

### Archivos Clave para Academy
- `serverless-academy.yml` - Configuración Serverless
- `*-academy.js` - Lambda functions adaptadas
- `scripts/*-academy.js` - Scripts de setup
- `docs/guia-aws-academy.md` - Guía completa

### Limitaciones Consideradas
- ✅ Solo LabRole disponible
- ✅ Sin ElasticSearch (reemplazado por DynamoDB GSI)
- ✅ Solo región us-east-1
- ✅ Configuración VPC limitada

## 📊 Funcionalidades Implementadas

### Change Data Capture (CDC)
- [x] DynamoDB Streams habilitados
- [x] Lambda procesamiento en tiempo real
- [x] Enriquecimiento de datos
- [x] Almacenamiento en S3 particionado

### Búsqueda en Tiempo Real
- [x] DynamoDB GSI optimizado para Academy
- [x] APIs REST para consultas eficientes
- [x] Índices con TTL automático
- [x] Búsqueda por texto completo

### Análisis con Athena
- [x] Tablas particionadas por fecha
- [x] Consultas SQL complejas
- [x] Vistas agregadas
- [x] Optimización de rendimiento

### Multi-tenancy
- [x] Separación por tenant_id
- [x] Índices específicos por tenant
- [x] Consultas aisladas
- [x] Escalabilidad horizontal

## 🔗 Enlaces Importantes

### GitHub Repository
```
https://github.com/ADRIAN0819/CloudPF#
```

### Lambda Functions Sources
Las funciones Lambda están disponibles públicamente en:
- [Product Stream Processor](https://github.com/TU-USUARIO/CloudPF/blob/main/cdc-lambda-functions/product-stream-processor-academy.js)
- [Purchase Stream Processor](https://github.com/TU-USUARIO/CloudPF/blob/main/cdc-lambda-functions/purchase-stream-processor-academy.js)
- [Search API](https://github.com/TU-USUARIO/CloudPF/blob/main/api-rest/search-api-academy.js)

## 🧪 Pruebas y Validación

### Pruebas CDC
```powershell
# Insertar datos de prueba
node scripts/test-cdc-academy.js

# Verificar procesamiento
aws logs tail /aws/lambda/product-stream-processor-academy --follow
```

### Pruebas de Búsqueda
```powershell
# Probar API de búsqueda
curl -X GET "https://API-ID.execute-api.us-east-1.amazonaws.com/prod/search?q=laptop&tenant_id=tenant-1"
```

### Pruebas Athena
```sql
-- Consulta ejemplo
SELECT * FROM cloudpf_analytics_academy.purchases_analytics 
WHERE tenant_id = 'tenant-1' 
AND year = '2024' 
LIMIT 10;
```

## 📚 Documentación Completa

Para documentación detallada, consultar:
- [Guía AWS Academy](docs/guia-aws-academy.md)
- [Arquitectura Academy](docs/arquitectura-academy.md)
- [Setup MV Academy](docs/setup-mv-academy.md)

---

*Proyecto desarrollado para cumplir con los requisitos de Ingesta en Tiempo Real, CDC y MV Búsqueda, adaptado específicamente para AWS Academy.*