# Configuración Alternativa para AWS Academy
# (ElasticSearch Service no está disponible)

## Opción 1: DynamoDB + OpenSearch Local

### Arquitectura Híbrida
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Productos │    │   Lambda CDC    │    │   DynamoDB      │
│   (existente)   │───▶│   Productos     │───▶│   + GSI Search  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ ElasticSearch   │
                       │ (Docker Local)  │
                       │ x tenant_id     │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Compras   │    │   Lambda CDC    │    │   S3 Bucket     │
│   (existente)   │───▶│   Compras       │───▶│   CSV/JSON      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Athena        │
                       │   SQL Queries   │
                       │   (Glue Catalog)│
                       └─────────────────┘
```

## Opción 2: Solo AWS Services

### Arquitectura Nativa AWS
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Productos │    │   Lambda CDC    │    │   DynamoDB      │
│   (existente)   │───▶│   Productos     │───▶│   + GSI Search  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   S3 Bucket     │
                       │   Productos     │
                       │   (JSON Index)  │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Compras   │    │   Lambda CDC    │    │   S3 Bucket     │
│   (existente)   │───▶│   Compras       │───▶│   CSV/JSON      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Athena        │
                       │   SQL Queries   │
                       │   (Glue Catalog)│
                       └─────────────────┘
```
