# CloudPF - Ingesta en Tiempo Real - Arquitectura Técnica

## Resumen Ejecutivo
Este documento describe la implementación de un sistema de ingesta en tiempo real para capturar eventos de productos y compras, cumpliendo con los requisitos del proyecto final.

## Arquitectura General

### Componentes Principales

#### 1. Change Data Capture (CDC)
- **DynamoDB Streams**: Captura cambios en tiempo real
- **Lambda Functions**: Procesamiento de eventos
- **Multi-tenancy**: Soporte para múltiples tenants

#### 2. Máquina Virtual de Búsqueda
- **ElasticSearch**: 1 contenedor por tenant_id
- **Volumen Persistente**: Almacenamiento de índices
- **APIs REST**: Interfaces de consulta

#### 3. Data Lake y Analytics
- **S3**: Almacenamiento de archivos CSV/JSON
- **Athena**: Consultas SQL sobre el Data Lake
- **Particionamiento**: Por fecha (año/mes/día)

## Flujo de Datos

### Productos
1. **Evento DynamoDB** → **DynamoDB Stream** → **Lambda CDC**
2. **Lambda CDC** → **ElasticSearch** (indexación)
3. **ElasticSearch** → **API REST** (búsquedas)

### Compras
1. **Evento DynamoDB** → **DynamoDB Stream** → **Lambda CDC**
2. **Lambda CDC** → **ElasticSearch** (indexación)
3. **Lambda CDC** → **S3** (archivos CSV/JSON)
4. **S3** → **Athena** (consultas SQL)

## Tecnologías Implementadas

### Backend
- **AWS Lambda**: Procesamiento serverless
- **DynamoDB Streams**: CDC en tiempo real
- **ElasticSearch**: Motor de búsqueda
- **S3**: Data Lake
- **Athena**: Analytics SQL

### Contenedores
- **Docker**: ElasticSearch por tenant
- **Docker Compose**: Orquestación local
- **Volúmenes**: Persistencia de datos

### APIs
- **API Gateway**: Endpoints REST
- **Serverless Framework**: Infraestructura como código
- **Node.js**: Runtime de las funciones

## Funcionalidades Implementadas

### Búsqueda de Productos
- **Búsqueda Fuzzy**: Tolerancia a errores de escritura
- **Búsqueda por Prefijo**: Filtros por inicio de palabra
- **Autocompletado**: Sugerencias en tiempo real
- **Multi-field**: Búsqueda en nombre, descripción, categoría

### Analytics de Compras
- **Agregaciones**: Totales, promedios, conteos
- **Filtros Temporales**: Por fechas
- **Consultas SQL**: Via Athena
- **Reportes**: Personalizables

### Multi-tenancy
- **Aislamiento**: Índices separados por tenant
- **Escalabilidad**: Contenedores independientes
- **Seguridad**: Acceso controlado por tenant

## Endpoints Disponibles

### ElasticSearch API
```
GET /search/{tenant_id}
GET /search/{tenant_id}/products
GET /search/{tenant_id}/purchases
```

### Athena Analytics
```
GET /analytics/{tenant_id}
POST /analytics/{tenant_id}/report
```

## Configuración y Despliegue

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Configurar ElasticSearch
npm run docker:up

# Configurar índices
npm run setup:elasticsearch

# Desplegar funciones
npm run deploy:dev
```

### Producción
```bash
# Desplegar a producción
npm run deploy:prod

# Crear tablas Athena
npm run athena:create-tables
```

## Monitoreo y Observabilidad

### Métricas
- **CloudWatch**: Logs y métricas de Lambda
- **ElasticSearch**: Métricas de búsqueda
- **Athena**: Métricas de consultas

### Alertas
- **Errores de procesamiento**: Lambda failures
- **Latencia alta**: ElasticSearch response time
- **Costos**: Athena query costs

## Pruebas y Validación

### Casos de Prueba
1. **CDC Productos**: Crear, modificar, eliminar
2. **CDC Compras**: Registrar, listar
3. **Búsquedas**: Fuzzy, prefijo, autocompletado
4. **Analytics**: Consultas SQL, reportes

### Datos de Prueba
- **Productos**: 1000+ registros por tenant
- **Compras**: 500+ transacciones por tenant
- **Tenants**: 3 tenants de prueba

## Consideraciones de Seguridad

### Acceso
- **IAM Roles**: Permisos mínimos necesarios
- **VPC**: ElasticSearch en red privada
- **Encryption**: Datos en tránsito y reposo

### Auditoría
- **CloudTrail**: Logs de acceso
- **DynamoDB**: Streams de cambios
- **S3**: Logs de acceso

## Optimizaciones de Performance

### ElasticSearch
- **Sharding**: 1 shard por tenant pequeño
- **Replication**: 0 réplicas en desarrollo
- **Analyzers**: Optimizados para búsqueda

### Lambda
- **Memory**: 512MB para procesamiento CDC
- **Timeout**: 5 minutos para batch processing
- **Concurrency**: Limitada por tenant

### S3
- **Partitioning**: Por fecha y tenant
- **Compression**: GZIP para archivos CSV
- **Lifecycle**: Archivado automático

## Costos Estimados

### Por Tenant (Mensual)
- **ElasticSearch**: $50-100 USD
- **Lambda**: $10-20 USD
- **S3**: $5-10 USD
- **Athena**: $5-15 USD

### Total: $70-145 USD por tenant/mes

## Roadmap y Mejoras

### Fase 2
- **Machine Learning**: Recomendaciones de productos
- **Real-time Dashboards**: Visualización en tiempo real
- **Data Streaming**: Kinesis para mayor throughput

### Fase 3
- **Global Distribution**: Multi-región
- **Advanced Analytics**: Data warehouse
- **AI Integration**: Procesamiento de lenguaje natural

## Documentación Adicional

### Enlaces Útiles
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [ElasticSearch Documentation](https://www.elastic.co/guide/)
- [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [Serverless Framework](https://www.serverless.com/framework/docs/)

### Repositorio
- **GitHub**: Link al repositorio
- **Issues**: Tracking de problemas
- **Wiki**: Documentación extendida
