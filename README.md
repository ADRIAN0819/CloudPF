# CloudPF - Ingesta en Tiempo Real

## Descripción
Sistema de ingesta en tiempo real para capturar eventos de productos y compras, implementando CDC (Change Data Capture) con DynamoDB Streams y máquina virtual de búsqueda con ElasticSearch.

## Componentes Principales

### 1. Change Data Capture (CDC) - DynamoDB Streams
- Captura cambios en tiempo real de las tablas DynamoDB
- Procesamiento mediante Lambda functions
- Actualización automática en ElasticSearch

### 2. Máquina Virtual de Búsqueda
- 1 contenedor ElasticSearch por tenant_id
- Volumen persistente para índices
- APIs REST para consultas

### 3. Ingesta en Tiempo Real
- Lambda para actualizar productos en ElasticSearch
- Lambda para procesar compras y generar archivos CSV/JSON
- Integración con S3 y Athena para análisis

## Arquitectura
- **Multi-tenancy**: Soporte para múltiples tenants
- **Serverless**: Framework AWS Lambda + DynamoDB Streams
- **Elasticsearch**: Búsqueda en tiempo real
- **S3 + Athena**: Almacenamiento y consultas SQL