#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configuración de AWS
const athena = new AWS.Athena({ region: 'us-east-1' });
const s3 = new AWS.S3({ region: 'us-east-1' });

const STAGE = process.env.STAGE || 'dev';
const DATABASE_NAME = `cloudpf_${STAGE}`;
const OUTPUT_LOCATION = `s3://cloudpf-athena-results-${STAGE}/`;

async function createAthenaTables() {
  console.log(`Creating Athena tables for stage: ${STAGE}`);
  
  try {
    // Crear base de datos
    await createDatabase();
    
    // Crear tabla de productos
    await createProductsTable();
    
    // Crear tabla de compras
    await createPurchasesTable();
    
    // Crear vistas para análisis
    await createAnalyticsViews();
    
    console.log('Athena tables created successfully!');
  } catch (error) {
    console.error('Error creating Athena tables:', error);
    process.exit(1);
  }
}

async function createDatabase() {
  const query = `CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`;
  
  await executeQuery(query);
  console.log(`Database ${DATABASE_NAME} created/verified`);
}

async function createProductsTable() {
  const query = `
    CREATE EXTERNAL TABLE IF NOT EXISTS ${DATABASE_NAME}.productos (
      tenant_id string,
      product_id string,
      nombre string,
      descripcion string,
      categoria string,
      precio double,
      stock int,
      activo boolean,
      created_at timestamp,
      updated_at timestamp
    )
    PARTITIONED BY (
      year int,
      month int,
      day int
    )
    STORED AS PARQUET
    LOCATION 's3://cloudpf-data-lake-${STAGE}/data-lake/products/'
    TBLPROPERTIES (
      'projection.enabled'='true',
      'projection.year.type'='integer',
      'projection.year.range'='2023,2030',
      'projection.month.type'='integer',
      'projection.month.range'='1,12',
      'projection.day.type'='integer',
      'projection.day.range'='1,31',
      'storage.location.template'='s3://cloudpf-data-lake-${STAGE}/data-lake/products/year=\${year}/month=\${month}/day=\${day}/'
    )
  `;
  
  await executeQuery(query);
  console.log('Products table created/verified');
}

async function createPurchasesTable() {
  const query = `
    CREATE EXTERNAL TABLE IF NOT EXISTS ${DATABASE_NAME}.compras (
      tenant_id string,
      purchase_id string,
      usuario_id string,
      producto_id string,
      cantidad int,
      precio_unitario double,
      precio_total double,
      fecha_compra timestamp,
      estado string,
      created_at timestamp,
      updated_at timestamp
    )
    PARTITIONED BY (
      year int,
      month int,
      day int
    )
    STORED AS PARQUET
    LOCATION 's3://cloudpf-data-lake-${STAGE}/data-lake/purchases/'
    TBLPROPERTIES (
      'projection.enabled'='true',
      'projection.year.type'='integer',
      'projection.year.range'='2023,2030',
      'projection.month.type'='integer',
      'projection.month.range'='1,12',
      'projection.day.type'='integer',
      'projection.day.range'='1,31',
      'storage.location.template'='s3://cloudpf-data-lake-${STAGE}/data-lake/purchases/year=\${year}/month=\${month}/day=\${day}/'
    )
  `;
  
  await executeQuery(query);
  console.log('Purchases table created/verified');
}

async function createAnalyticsViews() {
  // Vista para resumen de ventas por tenant
  const salesSummaryView = `
    CREATE OR REPLACE VIEW ${DATABASE_NAME}.sales_summary AS
    SELECT 
      tenant_id,
      COUNT(*) as total_compras,
      SUM(precio_total) as total_ventas,
      AVG(precio_total) as promedio_compra,
      MIN(fecha_compra) as primera_compra,
      MAX(fecha_compra) as ultima_compra,
      COUNT(DISTINCT usuario_id) as usuarios_unicos
    FROM ${DATABASE_NAME}.compras
    GROUP BY tenant_id
  `;
  
  await executeQuery(salesSummaryView);
  console.log('Sales summary view created');

  // Vista para productos más vendidos
  const topProductsView = `
    CREATE OR REPLACE VIEW ${DATABASE_NAME}.top_products AS
    SELECT 
      c.tenant_id,
      c.producto_id,
      p.nombre as producto_nombre,
      p.categoria,
      SUM(c.cantidad) as total_vendido,
      SUM(c.precio_total) as ingresos_totales,
      COUNT(*) as numero_ventas,
      AVG(c.precio_unitario) as precio_promedio
    FROM ${DATABASE_NAME}.compras c
    LEFT JOIN ${DATABASE_NAME}.productos p 
      ON c.producto_id = p.product_id AND c.tenant_id = p.tenant_id
    GROUP BY c.tenant_id, c.producto_id, p.nombre, p.categoria
  `;
  
  await executeQuery(topProductsView);
  console.log('Top products view created');

  // Vista para análisis temporal
  const temporalAnalysisView = `
    CREATE OR REPLACE VIEW ${DATABASE_NAME}.temporal_analysis AS
    SELECT 
      tenant_id,
      year,
      month,
      COUNT(*) as compras_mes,
      SUM(precio_total) as ventas_mes,
      AVG(precio_total) as ticket_promedio,
      COUNT(DISTINCT usuario_id) as usuarios_activos_mes,
      COUNT(DISTINCT producto_id) as productos_vendidos_mes
    FROM ${DATABASE_NAME}.compras
    GROUP BY tenant_id, year, month
  `;
  
  await executeQuery(temporalAnalysisView);
  console.log('Temporal analysis view created');
}

async function executeQuery(sqlQuery) {
  const params = {
    QueryString: sqlQuery,
    ResultConfiguration: {
      OutputLocation: OUTPUT_LOCATION
    },
    WorkGroup: 'primary'
  };

  console.log('Executing query:', sqlQuery.substring(0, 100) + '...');
  
  const result = await athena.startQueryExecution(params).promise();
  const executionId = result.QueryExecutionId;
  
  // Esperar a que la query termine
  await waitForQueryCompletion(executionId);
  
  return executionId;
}

async function waitForQueryCompletion(executionId) {
  let status = 'RUNNING';
  
  while (status === 'RUNNING' || status === 'QUEUED') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await athena.getQueryExecution({ QueryExecutionId: executionId }).promise();
    status = result.QueryExecution.Status.State;
    
    if (status === 'FAILED' || status === 'CANCELLED') {
      throw new Error(`Query failed: ${result.QueryExecution.Status.StateChangeReason}`);
    }
  }
  
  console.log(`Query ${executionId} completed with status: ${status}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAthenaTables().catch(console.error);
}

module.exports = { createAthenaTables };
