# Guía de Implementación para AWS Academy

## Introducción

Esta guía detalla cómo implementar la solución de **Ingesta en Tiempo Real** en AWS Academy, considerando las limitaciones específicas del entorno educativo.

## Arquitectura Adaptada para AWS Academy

### Componentes Principales

1. **DynamoDB** - Base de datos principal con Streams habilitados
2. **Lambda Functions** - Procesamiento de eventos CDC
3. **S3** - Almacenamiento de datos para análisis
4. **Athena** - Consultas analíticas
5. **DynamoDB GSI** - Reemplazo de ElasticSearch para búsquedas

### Limitaciones de AWS Academy

- **IAM Roles**: Solo se puede usar `LabRole`
- **ElasticSearch**: No disponible (reemplazado por DynamoDB GSI)
- **VPC**: Configuración limitada
- **Regiones**: Solo `us-east-1` disponible

## Archivos Específicos para AWS Academy

### Lambda Functions

#### 1. product-stream-processor-academy.js
```javascript
// Procesa cambios en la tabla Products
// Adaptado para usar LabRole y DynamoDB GSI
```

#### 2. purchase-stream-processor-academy.js
```javascript
// Procesa cambios en la tabla Purchases
// Adaptado para usar LabRole y DynamoDB GSI
```

### Configuración Serverless

#### serverless-academy.yml
```yaml
# Configuración específica para AWS Academy
# Usa LabRole y servicios limitados
```

## Configuración Paso a Paso

### 1. Preparación del Entorno

```powershell
# Clonar el repositorio
git clone https://github.com/tu-usuario/CloudPF.git
cd CloudPF

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### 2. Configurar AWS CLI para Academy

```powershell
# Configurar credenciales de AWS Academy
aws configure
# AWS Access Key ID: [Tu Access Key de Academy]
# AWS Secret Access Key: [Tu Secret Key de Academy]
# Default region name: us-east-1
# Default output format: json
```

### 3. Crear Tablas DynamoDB

```powershell
# Ejecutar script de creación
node scripts/create-dynamodb-tables-academy.js
```

### 4. Desplegar Lambda Functions

```powershell
# Desplegar usando serverless
serverless deploy --config serverless-academy.yml
```

### 5. Configurar S3 Bucket

```powershell
# Crear bucket para análisis
aws s3 mb s3://cloudpf-analytics-academy-[tu-id]
```

### 6. Configurar Athena

```powershell
# Crear tablas en Athena
node scripts/create-athena-tables-academy.js
```

## Estructura de Datos

### Tabla Products
```json
{
  "product_id": "prod-123",
  "tenant_id": "tenant-1",
  "name": "Producto A",
  "category": "Electrónicos",
  "price": 299.99,
  "status": "active",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Tabla Purchases
```json
{
  "purchase_id": "purch-456",
  "tenant_id": "tenant-1",
  "customer_email": "cliente@email.com",
  "customer_name": "Juan Pérez",
  "product_id": "prod-123",
  "product_name": "Producto A",
  "quantity": 2,
  "total_amount": 599.98,
  "status": "completed",
  "created_at": "2024-01-01T11:00:00Z"
}
```

### Tabla SearchIndex (GSI)
```json
{
  "tenant_id": "tenant-1",
  "entity_type": "product",
  "entity_id": "prod-123",
  "search_text": "producto a electrónicos",
  "data": { /* datos completos del producto */ },
  "updated_at": "2024-01-01T10:00:00Z",
  "ttl": 1735689600
}
```

## Flujo de Procesamiento

### 1. Cambio en DynamoDB
- Usuario realiza CRUD en tabla Products/Purchases
- DynamoDB Stream captura el cambio
- Lambda se ejecuta automáticamente

### 2. Procesamiento en Lambda
- Lambda procesa el evento del stream
- Enriquece los datos con metadata
- Guarda en S3 para análisis
- Actualiza índice de búsqueda en DynamoDB GSI

### 3. Consultas y Análisis
- Athena consulta datos históricos en S3
- API REST consulta índice de búsqueda
- Dashboards consumen datos analíticos

## Scripts de Despliegue

### deploy-academy.ps1
```powershell
# Script completo de despliegue para AWS Academy
# Incluye validaciones y configuraciones específicas
```

### cleanup-academy.ps1
```powershell
# Script de limpieza para AWS Academy
# Elimina todos los recursos creados
```

## Validación y Pruebas

### 1. Prueba de CDC
```powershell
# Insertar datos de prueba
node scripts/test-cdc-academy.js
```

### 2. Prueba de Búsqueda
```powershell
# Probar API de búsqueda
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/prod/search?q=producto&tenant_id=tenant-1"
```

### 3. Prueba de Análisis
```sql
-- Consulta en Athena
SELECT * FROM products_analytics 
WHERE tenant_id = 'tenant-1' 
AND year = '2024' 
LIMIT 10;
```

## Monitoreo y Logs

### CloudWatch Logs
- `/aws/lambda/product-stream-processor-academy`
- `/aws/lambda/purchase-stream-processor-academy`
- `/aws/lambda/search-api-academy`

### CloudWatch Metrics
- Lambda duration
- DynamoDB read/write capacity
- S3 PUT requests
- Athena query execution time

## Solución de Problemas

### Error: Access Denied
```
Problema: Lambda no puede acceder a recursos
Solución: Verificar que se está usando LabRole
```

### Error: ElasticSearch not available
```
Problema: Código intenta usar ElasticSearch
Solución: Usar versión -academy.js de las funciones
```

### Error: Wrong region
```
Problema: Recursos en región incorrecta
Solución: Usar solo us-east-1 en AWS Academy
```

## Consideraciones de Rendimiento

### DynamoDB
- Configurar RCU/WCU apropiadas
- Usar GSI para consultas eficientes
- Implementar TTL para limpieza automática

### Lambda
- Optimizar tamaño de memoria
- Usar connection pooling
- Implementar retry logic

### S3
- Usar particionamiento por fecha
- Configurar lifecycle policies
- Optimizar estructura de carpetas

## Entregables

### 1. Código Fuente
- **GitHub Repository**: https://github.com/tu-usuario/CloudPF
- **Lambda Functions**: Específicamente adaptadas para Academy
- **Serverless Config**: serverless-academy.yml

### 2. Documentación
- Esta guía de implementación
- Diagramas de arquitectura
- Manual de usuario

### 3. Scripts
- Despliegue automatizado
- Pruebas de validación
- Limpieza de recursos

### 4. Evidencias
- Screenshots de recursos creados
- Logs de ejecución
- Resultados de consultas Athena

## Contacto y Soporte

Para dudas o problemas con la implementación:
- **Email**: tu-email@universidad.edu
- **GitHub Issues**: https://github.com/tu-usuario/CloudPF/issues
- **Documentación**: Consultar /docs en el repositorio

---

*Esta implementación cumple con los requisitos del proyecto final, adaptada específicamente para las limitaciones de AWS Academy mientras mantiene toda la funcionalidad requerida.*
