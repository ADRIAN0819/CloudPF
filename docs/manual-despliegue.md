# Manual de Despliegue - CloudPF Ingesta en Tiempo Real

## Requisitos Previos

### Software Necesario
- **Node.js**: v18 o superior
- **AWS CLI**: v2 configurado
- **Docker**: Para ElasticSearch local
- **Git**: Para control de versiones

### Configuración de AWS
```bash
# Configurar AWS CLI
aws configure --profile cloudpf-dev
# AWS Access Key ID: TU_ACCESS_KEY
# AWS Secret Access Key: TU_SECRET_KEY  
# Default region: us-east-1
# Default output format: json
```

### Variables de Entorno
```bash
# Crear archivo .env
cp .env.example .env

# Editar variables
STAGE=dev
AWS_REGION=us-east-1
AWS_PROFILE=cloudpf-dev
TENANT_IDS=tenant1,tenant2,tenant3
ES_USERNAME=admin
ES_PASSWORD=admin123
```

## Despliegue Paso a Paso

### 1. Preparación del Entorno

```bash
# Clonar repositorio
git clone <tu-repo-url>
cd CloudPF

# Instalar dependencias
npm install

# Verificar configuración
npm run lint
npm run test
```

### 2. Configuración Local (Desarrollo)

```bash
# Iniciar ElasticSearch local
npm run docker:up

# Esperar a que esté listo
npm run docker:health

# Configurar índices
npm run setup:elasticsearch
```

### 3. Despliegue en AWS

#### Desarrollo
```bash
# Desplegar funciones Lambda
npm run deploy:dev

# Crear tablas Athena
npm run athena:create-tables

# Verificar deployment
npm run verify:dev
```

#### Testing
```bash
# Desplegar a testing
npm run deploy:test

# Ejecutar pruebas de integración
npm run test:integration
```

#### Producción
```bash
# Desplegar a producción
npm run deploy:prod

# Ejecutar smoke tests
npm run test:smoke
```

## Verificación del Despliegue

### 1. Verificar Funciones Lambda

```bash
# Listar funciones
aws lambda list-functions --region us-east-1

# Verificar función específica
aws lambda get-function --function-name cloudpf-ingesta-tiempo-real-dev-productStreamProcessor
```

### 2. Verificar DynamoDB Streams

```bash
# Verificar que los streams están habilitados
aws dynamodb describe-table --table-name Productos-dev --query "Table.StreamSpecification"
aws dynamodb describe-table --table-name Compras-dev --query "Table.StreamSpecification"
```

### 3. Verificar ElasticSearch

```bash
# Verificar salud del cluster
curl -X GET "localhost:9200/_cluster/health?pretty"

# Verificar índices
curl -X GET "localhost:9200/_cat/indices?v"
```

### 4. Verificar API Gateway

```bash
# Obtener URL del API Gateway
aws apigateway get-rest-apis --query "items[?name=='cloudpf-ingesta-tiempo-real-dev'].{id:id,name:name}"

# Probar endpoint
curl -X GET "https://API_GATEWAY_URL/dev/search/tenant1/products?q=test"
```

## Pruebas Funcionales

### 1. Prueba de CDC Productos

```bash
# Crear producto de prueba
curl -X POST "https://m8vt18jy9b.execute-api.us-east-1.amazonaws.com/dev/productos/crear" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant1",
    "nombre": "Producto Test",
    "descripcion": "Producto de prueba para CDC",
    "categoria": "test",
    "precio": 100.0,
    "stock": 50
  }'

# Verificar indexación en ElasticSearch
curl -X GET "https://API_GATEWAY_URL/dev/search/tenant1/products?q=Producto Test"
```

### 2. Prueba de CDC Compras

```bash
# Registrar compra de prueba
curl -X POST "https://2xp51jtgca.execute-api.us-east-1.amazonaws.com/dev/compras/registrar" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant1",
    "usuario_id": "user123",
    "producto_id": "prod123",
    "cantidad": 2,
    "precio_unitario": 50.0
  }'

# Verificar indexación y archivos S3
curl -X GET "https://API_GATEWAY_URL/dev/search/tenant1/purchases?usuario_id=user123"
```

### 3. Prueba de Analytics

```bash
# Consulta de resumen de ventas
curl -X GET "https://API_GATEWAY_URL/dev/analytics/tenant1?query_type=sales_summary"

# Consulta de productos más vendidos
curl -X GET "https://API_GATEWAY_URL/dev/analytics/tenant1?query_type=top_products&limit=10"
```

## Solución de Problemas

### Errores Comunes

#### 1. Error de Permisos IAM
```bash
# Verificar política IAM
aws iam get-role-policy --role-name cloudpf-ingesta-tiempo-real-dev-us-east-1-lambdaRole --policy-name dev-cloudpf-ingesta-tiempo-real-lambda

# Solución: Actualizar permisos en serverless.yml
```

#### 2. ElasticSearch no responde
```bash
# Verificar estado del contenedor
docker ps | grep elasticsearch

# Reiniciar contenedor
docker-compose -f docker/docker-compose.yml restart elasticsearch

# Verificar logs
docker logs elasticsearch-default
```

#### 3. DynamoDB Streams no funciona
```bash
# Verificar configuración de streams
aws dynamodb describe-table --table-name Productos-dev

# Verificar trigger de Lambda
aws lambda get-event-source-mapping --uuid EVENT_SOURCE_MAPPING_UUID
```

#### 4. Athena no encuentra tablas
```bash
# Verificar base de datos
aws athena list-databases --catalog-name AwsDataCatalog

# Recrear tablas
node scripts/create-athena-tables.js
```

### Logs y Debugging

#### CloudWatch Logs
```bash
# Ver logs de Lambda
aws logs describe-log-groups | grep cloudpf-ingesta-tiempo-real

# Seguir logs en tiempo real
npx serverless logs -f productStreamProcessor --stage dev --tail
```

#### ElasticSearch Logs
```bash
# Logs del contenedor
docker logs elasticsearch-default --tail 100 -f

# Logs via API
curl -X GET "localhost:9200/_cat/indices?v&s=index"
```

## Monitoreo y Alertas

### CloudWatch Dashboards

```bash
# Crear dashboard personalizado
aws cloudwatch put-dashboard --dashboard-name "CloudPF-Ingesta-Real-Time" --dashboard-body file://monitoring/dashboard.json
```

### Alertas Críticas

1. **Lambda Errors**: > 5 errores en 5 minutos
2. **DynamoDB Throttling**: > 10 throttles en 1 minuto
3. **ElasticSearch Latency**: > 2 segundos promedio
4. **S3 Upload Failures**: > 3 fallos en 10 minutos

### Métricas Clave

- **Lambda Duration**: < 30 segundos
- **DynamoDB Streams Latency**: < 1 segundo
- **ElasticSearch Query Time**: < 500ms
- **S3 Upload Time**: < 5 segundos

## Backup y Recuperación

### ElasticSearch
```bash
# Crear snapshot
curl -X PUT "localhost:9200/_snapshot/backup/snapshot_1?wait_for_completion=true"

# Restaurar snapshot
curl -X POST "localhost:9200/_snapshot/backup/snapshot_1/_restore"
```

### DynamoDB
```bash
# Habilitar backup continuo
aws dynamodb put-backup-policy --table-name Productos-dev --backup-policy BackupEnabled=true

# Crear backup bajo demanda
aws dynamodb create-backup --table-name Productos-dev --backup-name productos-backup-$(date +%Y%m%d)
```

## Escalabilidad

### Horizontal Scaling

1. **Más Tenants**: Agregar nuevos tenant_ids
2. **Más Regiones**: Desplegar en múltiples regiones
3. **Más Shards**: Configurar ElasticSearch para mayor throughput

### Vertical Scaling

1. **Lambda Memory**: Aumentar memoria asignada
2. **DynamoDB Capacity**: Ajustar RCU/WCU
3. **ElasticSearch Instances**: Usar instancias más grandes

## Limpieza de Recursos

### Desarrollo
```bash
# Eliminar stack de desarrollo
npm run remove:dev

# Detener contenedores
npm run docker:down

# Limpiar volúmenes
docker volume prune
```

### Producción
```bash
# CUIDADO: Esto eliminará todos los recursos
npm run remove:prod

# Confirmar eliminación
# Type 'cloudpf-ingesta-tiempo-real-prod' to confirm: cloudpf-ingesta-tiempo-real-prod
```

## Contacto y Soporte

- **Desarrollador**: Tu Nombre
- **Email**: tu.email@ejemplo.com
- **Slack**: #cloudpf-support
- **Documentación**: [Wiki del proyecto]
