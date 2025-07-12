# CloudPF - Sistema CDC

Sistema de **Change Data Capture (CDC)** usando DynamoDB Streams, Lambda y S3.

## 🏗️ Arquitectura

```
Microservicios → DynamoDB → Streams → Lambda → S3 + SearchIndex
                    ↓
                 GSI Search
```

## 📊 Datos Reales

El sistema está configurado para procesar los datos reales de tus 3 microservicios:

### MS1 - API Usuarios (Python)
- Endpoint: `/api/users`
- Campos: `user_id`, `nombre`, `email`, `rol`, `fecha_creacion`

### MS2 - API Productos (Node.js)
- Endpoint: `/api/products`
- Campos: `codigo`, `nombre`, `descripcion`, `categoria`, `precio`, `cantidad`, `estado`

### MS3 - API Compras (Python)
- Endpoint: `/api/purchases`
- Campos: `compra_id`, `user_id`, `fecha`, `total`, `estado`, `productos[]`

## 🚀 Despliegue

### Prerrequisitos
- AWS Lab iniciado
- Node.js 18+
- Serverless Framework

### Instalación
```bash
npm install
npm install -g serverless
```

### Crear tablas DynamoDB
```bash
node scripts/create-dynamodb-tables.js
```

### Desplegar Lambda Functions
```bash
serverless deploy
```

## 🧪 Pruebas

### Prueba completa del sistema
```bash
node scripts/test-complete.js
```

### Prueba individual de CDC
```bash
node scripts/test-cdc.js
```

## 📋 Tablas DynamoDB

### CloudPF-Products
- **Clave**: `tenant_id` (HASH) + `codigo` (RANGE)
- **Campos**: `nombre`, `descripcion`, `categoria`, `precio`, `cantidad`, `estado`
- **GSI**: `CategoriaIndex`, `EstadoIndex`
- **Stream**: Habilitado

### CloudPF-Purchases
- **Clave**: `tenant_id` (HASH) + `compra_id` (RANGE)
- **Campos**: `user_id`, `fecha`, `total`, `estado`, `productos[]`
- **GSI**: `UserIndex`, `FechaIndex`
- **Stream**: Habilitado

### CloudPF-SearchIndex
- **Clave**: `tenant_id` (HASH) + `entity_id` (RANGE)
- **Campos**: `entity_type`, `title`, `search_text`, `data`
- **GSI**: `TypeIndex`, `UpdatedIndex`
- **TTL**: Habilitado

## 🔍 API de Búsqueda

### Endpoint: `/search`
```bash
GET /search?tenant_id=tenant-test&q=laptop
GET /search?tenant_id=tenant-test&type=product
GET /search?tenant_id=tenant-test&limit=5
```

### Respuesta:
```json
{
  "results": [
    {
      "entity_id": "PROD-001",
      "entity_type": "product",
      "title": "Laptop Gaming ASUS",
      "score": 0.95,
      "data": {
        "codigo": "PROD-001",
        "nombre": "Laptop Gaming ASUS",
        "precio": 1299.99
      }
    }
  ],
  "total": 1
}
```

## 🔄 Proceso CDC

1. **Inserción/Actualización** en DynamoDB
2. **DynamoDB Stream** dispara Lambda
3. **Lambda Function** procesa el evento
4. **Datos analíticos** → S3 (particionados por fecha)
5. **Índice de búsqueda** → Tabla SearchIndex

## 📁 Estructura del Proyecto

```
CloudPF/
├── api-rest/
│   └── search-api-academy.js          # API de búsqueda
├── cdc-lambda-functions/
│   ├── product-stream-processor-academy.js   # CDC productos
│   └── purchase-stream-processor-academy.js  # CDC compras
├── scripts/
│   ├── create-dynamodb-tables-academy.js     # Crear tablas
│   ├── test-complete-academy.js              # Prueba completa
│   └── deploy-academy.ps1                    # Deploy PowerShell
├── athena-queries/
│   └── example-queries-academy.sql           # Queries analíticas
├── docs/
│   ├── arquitectura-academy.md               # Documentación
│   └── guia-aws-academy.md                   # Guía Academy
└── serverless-academy.yml                    # Configuración deployment
```

## 🏢 Multi-tenancy

Todas las operaciones usan `tenant_id` como clave de partición:
- `tenant-academy` para pruebas
- Cada tenant tiene datos aislados
- Búsquedas filtradas por tenant

## 📊 Análisis con Athena

Los datos se almacenan en S3 particionados por fecha:
```
s3://cloudpf-analytics-academy/
├── products/year=2024/month=12/day=15/
└── purchases/year=2024/month=12/day=15/
```

Ejemplo de query:
```sql
SELECT 
    DATE(fecha) as fecha,
    COUNT(*) as total_compras,
    SUM(total) as ingresos
FROM purchases
WHERE year = '2024' AND month = '12'
GROUP BY DATE(fecha)
ORDER BY fecha DESC;
```

## 🔧 Configuración

### Variables de entorno (serverless-academy.yml)
```yaml
environment:
  PRODUCTS_TABLE: CloudPF-Products-Academy
  PURCHASES_TABLE: CloudPF-Purchases-Academy
  SEARCH_INDEX_TABLE: CloudPF-SearchIndex-Academy
  ANALYTICS_BUCKET: cloudpf-analytics-academy
```

## 🚨 Limitaciones AWS Academy

- **Región**: Solo `us-east-1`
- **Rol**: `LabRole` (permisos predefinidos)
- **Servicios**: DynamoDB, Lambda, S3, Athena
- **ElasticSearch**: No disponible → Reemplazado por DynamoDB GSI

## 📞 Soporte

Para dudas o problemas:
1. Verificar logs en CloudWatch
2. Revisar configuración de tablas
3. Validar permisos de LabRole
4. Ejecutar script de pruebas

---

**Nota**: Este sistema está optimizado para AWS Academy y procesará los datos reales de tus microservicios MS1, MS2 y MS3.
