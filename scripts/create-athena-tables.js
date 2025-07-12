/**
 * Script para crear tablas Athena en AWS Academy
 * Adaptado para usar LabRole y bucket S3 específico
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configurar AWS SDK
AWS.config.update({
    region: 'us-east-1' // AWS Academy solo permite us-east-1
});

const athena = new AWS.Athena();
const s3 = new AWS.S3();

// Configuración
const CONFIG = {
    database: 'cloudpf_analytics_academy',
    resultLocation: 's3://cloudpf-athena-results-academy/', // Cambiar por tu bucket
    analyticsLocation: 's3://cloudpf-analytics-academy/'     // Cambiar por tu bucket
};

/**
 * Crear base de datos en Athena
 */
async function createDatabase() {
    const query = `CREATE DATABASE IF NOT EXISTS ${CONFIG.database}`;
    
    try {
        console.log('📊 Creando base de datos Athena...');
        await executeQuery(query);
        console.log('✅ Base de datos creada exitosamente');
    } catch (error) {
        console.error('❌ Error creando base de datos:', error.message);
        throw error;
    }
}

/**
 * Crear tabla para productos en Athena
 */
async function createProductsTable() {
    const query = `
        CREATE EXTERNAL TABLE IF NOT EXISTS ${CONFIG.database}.products_analytics (
            product_id string,
            tenant_id string,
            name string,
            category string,
            price double,
            status string,
            created_at string,
            updated_at string,
            processed_at string,
            event_type string,
            previous_data struct<
                product_id: string,
                name: string,
                category: string,
                price: double,
                status: string
            >
        )
        PARTITIONED BY (
            year string,
            month string,
            day string,
            hour string
        )
        STORED AS JSON
        LOCATION '${CONFIG.analyticsLocation}products/'
        TBLPROPERTIES (
            'projection.enabled' = 'true',
            'projection.year.type' = 'integer',
            'projection.year.range' = '2024,2030',
            'projection.month.type' = 'integer',
            'projection.month.range' = '01,12',
            'projection.month.digits' = '2',
            'projection.day.type' = 'integer',
            'projection.day.range' = '01,31',
            'projection.day.digits' = '2',
            'projection.hour.type' = 'integer',
            'projection.hour.range' = '00,23',
            'projection.hour.digits' = '2',
            'storage.location.template' = '${CONFIG.analyticsLocation}products/year=\${year}/month=\${month}/day=\${day}/hour=\${hour}'
        )
    `;
    
    try {
        console.log('📦 Creando tabla products_analytics...');
        await executeQuery(query);
        console.log('✅ Tabla products_analytics creada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla products_analytics:', error.message);
        throw error;
    }
}

/**
 * Crear tabla para compras en Athena
 */
async function createPurchasesTable() {
    const query = `
        CREATE EXTERNAL TABLE IF NOT EXISTS ${CONFIG.database}.purchases_analytics (
            purchase_id string,
            tenant_id string,
            customer_email string,
            customer_name string,
            product_id string,
            product_name string,
            product_category string,
            quantity int,
            total_amount double,
            status string,
            created_at string,
            updated_at string,
            processed_at string,
            event_type string,
            previous_data struct<
                purchase_id: string,
                customer_email: string,
                status: string,
                total_amount: double
            >
        )
        PARTITIONED BY (
            year string,
            month string,
            day string,
            hour string
        )
        STORED AS JSON
        LOCATION '${CONFIG.analyticsLocation}purchases/'
        TBLPROPERTIES (
            'projection.enabled' = 'true',
            'projection.year.type' = 'integer',
            'projection.year.range' = '2024,2030',
            'projection.month.type' = 'integer',
            'projection.month.range' = '01,12',
            'projection.month.digits' = '2',
            'projection.day.type' = 'integer',
            'projection.day.range' = '01,31',
            'projection.day.digits' = '2',
            'projection.hour.type' = 'integer',
            'projection.hour.range' = '00,23',
            'projection.hour.digits' = '2',
            'storage.location.template' = '${CONFIG.analyticsLocation}purchases/year=\${year}/month=\${month}/day=\${day}/hour=\${hour}'
        )
    `;
    
    try {
        console.log('🛒 Creando tabla purchases_analytics...');
        await executeQuery(query);
        console.log('✅ Tabla purchases_analytics creada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla purchases_analytics:', error.message);
        throw error;
    }
}

/**
 * Crear vista agregada para análisis
 */
async function createAnalyticsView() {
    const query = `
        CREATE OR REPLACE VIEW ${CONFIG.database}.sales_summary AS
        SELECT 
            tenant_id,
            product_category,
            DATE_TRUNC('day', CAST(created_at AS timestamp)) as sale_date,
            COUNT(*) as total_sales,
            SUM(total_amount) as total_revenue,
            AVG(total_amount) as avg_sale_amount,
            COUNT(DISTINCT customer_email) as unique_customers
        FROM ${CONFIG.database}.purchases_analytics
        WHERE event_type = 'purchase_created'
        GROUP BY tenant_id, product_category, DATE_TRUNC('day', CAST(created_at AS timestamp))
    `;
    
    try {
        console.log('📈 Creando vista sales_summary...');
        await executeQuery(query);
        console.log('✅ Vista sales_summary creada exitosamente');
    } catch (error) {
        console.error('❌ Error creando vista sales_summary:', error.message);
        throw error;
    }
}

/**
 * Ejecutar consulta en Athena
 */
async function executeQuery(query) {
    const params = {
        QueryString: query,
        ResultConfiguration: {
            OutputLocation: CONFIG.resultLocation
        },
        WorkGroup: 'primary'
    };
    
    try {
        // Iniciar ejecución de consulta
        const result = await athena.startQueryExecution(params).promise();
        const queryExecutionId = result.QueryExecutionId;
        
        // Esperar a que termine la consulta
        let queryStatus = 'RUNNING';
        while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
            
            const statusResult = await athena.getQueryExecution({
                QueryExecutionId: queryExecutionId
            }).promise();
            
            queryStatus = statusResult.QueryExecution.Status.State;
        }
        
        if (queryStatus === 'FAILED') {
            const error = await athena.getQueryExecution({
                QueryExecutionId: queryExecutionId
            }).promise();
            throw new Error(`Query failed: ${error.QueryExecution.Status.StateChangeReason}`);
        }
        
        console.log(`✅ Consulta ejecutada exitosamente (ID: ${queryExecutionId})`);
        return queryExecutionId;
        
    } catch (error) {
        console.error('❌ Error ejecutando consulta:', error.message);
        throw error;
    }
}

/**
 * Verificar y crear buckets S3 necesarios
 */
async function setupS3Buckets() {
    const buckets = [
        CONFIG.resultLocation.replace('s3://', '').replace('/', ''),
        CONFIG.analyticsLocation.replace('s3://', '').replace('/', '')
    ];
    
    for (const bucket of buckets) {
        try {
            await s3.headBucket({ Bucket: bucket }).promise();
            console.log(`✅ Bucket ${bucket} ya existe`);
        } catch (error) {
            if (error.code === 'NotFound') {
                console.log(`📦 Creando bucket ${bucket}...`);
                await s3.createBucket({ Bucket: bucket }).promise();
                console.log(`✅ Bucket ${bucket} creado exitosamente`);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Guardar consultas de ejemplo
 */
async function saveExampleQueries() {
    const exampleQueries = `
-- Consultas de ejemplo para AWS Academy
-- Ejecutar en Athena Console

-- 1. Productos más vendidos por categoría
SELECT 
    product_category,
    product_name,
    COUNT(*) as total_sales,
    SUM(total_amount) as total_revenue
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY product_category, product_name
ORDER BY total_sales DESC
LIMIT 10;

-- 2. Ventas por día
SELECT 
    DATE_TRUNC('day', CAST(created_at AS timestamp)) as sale_date,
    COUNT(*) as total_sales,
    SUM(total_amount) as daily_revenue
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
    AND month = '01'
GROUP BY DATE_TRUNC('day', CAST(created_at AS timestamp))
ORDER BY sale_date;

-- 3. Clientes más activos
SELECT 
    customer_email,
    customer_name,
    COUNT(*) as total_purchases,
    SUM(total_amount) as total_spent
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY customer_email, customer_name
ORDER BY total_spent DESC
LIMIT 10;

-- 4. Análisis de productos por status
SELECT 
    status,
    category,
    COUNT(*) as product_count,
    AVG(price) as avg_price
FROM cloudpf_analytics_academy.products_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'product_created'
    AND year = '2024'
GROUP BY status, category
ORDER BY product_count DESC;

-- 5. Resumen de ventas usando la vista
SELECT 
    product_category,
    SUM(total_sales) as category_sales,
    SUM(total_revenue) as category_revenue,
    AVG(avg_sale_amount) as avg_transaction
FROM cloudpf_analytics_academy.sales_summary
WHERE tenant_id = 'tenant-1'
    AND sale_date >= DATE '2024-01-01'
GROUP BY product_category
ORDER BY category_revenue DESC;
`;
    
    const queryFile = path.join(__dirname, '..', 'athena-queries', 'example-queries-academy.sql');
    fs.writeFileSync(queryFile, exampleQueries);
    console.log(`✅ Consultas de ejemplo guardadas en ${queryFile}`);
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Iniciando configuración de Athena para AWS Academy');
    console.log('📍 Región: us-east-1');
    
    try {
        // Configurar buckets S3
        await setupS3Buckets();
        
        // Crear base de datos
        await createDatabase();
        
        // Crear tablas
        await createProductsTable();
        await createPurchasesTable();
        
        // Crear vista
        await createAnalyticsView();
        
        // Guardar consultas de ejemplo
        await saveExampleQueries();
        
        console.log('\n✅ Configuración de Athena completada exitosamente');
        
        // Mostrar resumen
        console.log('\n📊 Resumen de recursos creados:');
        console.log(`1. Base de datos: ${CONFIG.database}`);
        console.log('2. Tabla: products_analytics (con particiones por fecha)');
        console.log('3. Tabla: purchases_analytics (con particiones por fecha)');
        console.log('4. Vista: sales_summary');
        console.log('5. Consultas de ejemplo guardadas');
        
        console.log('\n🔧 Próximos pasos:');
        console.log('1. Actualizar CONFIG con tus buckets S3 reales');
        console.log('2. Ejecutar las Lambda functions para generar datos');
        console.log('3. Probar las consultas de ejemplo en Athena Console');
        
    } catch (error) {
        console.error('\n❌ Error en la configuración de Athena:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { 
    createDatabase, 
    createProductsTable, 
    createPurchasesTable, 
    createAnalyticsView,
    CONFIG 
};
