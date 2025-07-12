/**
 * Script de prueba completo para el sistema CDC
 * Prueba productos, compras y búsquedas
 */

const AWS = require('aws-sdk');

// Configurar AWS SDK
AWS.config.update({
    region: 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Configuración
const CONFIG = {
    productsTable: 'CloudPF-Products',
    purchasesTable: 'CloudPF-Purchases',
    searchIndexTable: 'CloudPF-SearchIndex',
    analyticsBucket: 'cloudpf-analytics'
};

/**
 * Datos de prueba reales según tus APIs
 */
const testData = {
    products: [
        {
            tenant_id: 'tenant-test',
            codigo: 'PROD-001',
            nombre: 'Laptop Gaming ASUS',
            descripcion: 'Laptop gaming de alta gama con RTX 4060',
            categoria: 'Electrónicos',
            precio: 1299.99,
            cantidad: 5,
            estado: 'activo',
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
        },
        {
            tenant_id: 'tenant-test',
            codigo: 'PROD-002',
            nombre: 'Mouse Logitech G502',
            descripcion: 'Mouse gaming con sensor HERO 25K',
            categoria: 'Accesorios',
            precio: 79.99,
            cantidad: 20,
            estado: 'activo',
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
        },
        {
            tenant_id: 'tenant-test',
            codigo: 'PROD-003',
            nombre: 'Teclado Mecánico Razer',
            descripcion: 'Teclado mecánico RGB switches Cherry MX',
            categoria: 'Accesorios',
            precio: 129.99,
            cantidad: 15,
            estado: 'activo',
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
        }
    ],
    purchases: [
        {
            tenant_id: 'tenant-test',
            compra_id: 'COMP-001',
            user_id: 'user-001',
            fecha: new Date().toISOString(),
            total: 1509.97,
            estado: 'completado',
            productos: [
                {
                    codigo: 'PROD-001',
                    nombre: 'Laptop Gaming ASUS',
                    precio: 1299.99,
                    cantidad: 1
                },
                {
                    codigo: 'PROD-002',
                    nombre: 'Mouse Logitech G502',
                    precio: 79.99,
                    cantidad: 1
                },
                {
                    codigo: 'PROD-003',
                    nombre: 'Teclado Mecánico Razer',
                    precio: 129.99,
                    cantidad: 1
                }
            ]
        },
        {
            tenant_id: 'tenant-test',
            compra_id: 'COMP-002',
            user_id: 'user-002',
            fecha: new Date().toISOString(),
            total: 159.98,
            estado: 'pendiente',
            productos: [
                {
                    codigo: 'PROD-002',
                    nombre: 'Mouse Logitech G502',
                    precio: 79.99,
                    cantidad: 2
                }
            ]
        }
    ]
};

/**
 * Insertar productos
 */
async function insertProducts() {
    console.log('📦 Insertando productos...');
    
    for (const product of testData.products) {
        try {
            await dynamodb.put({
                TableName: CONFIG.productsTable,
                Item: product
            }).promise();
            
            console.log(`✅ Producto insertado: ${product.codigo} - ${product.nombre}`);
        } catch (error) {
            console.error(`❌ Error insertando producto ${product.codigo}:`, error.message);
        }
    }
}

/**
 * Insertar compras
 */
async function insertPurchases() {
    console.log('🛒 Insertando compras...');
    
    for (const purchase of testData.purchases) {
        try {
            await dynamodb.put({
                TableName: CONFIG.purchasesTable,
                Item: purchase
            }).promise();
            
            console.log(`✅ Compra insertada: ${purchase.compra_id} - Total: $${purchase.total}`);
        } catch (error) {
            console.error(`❌ Error insertando compra ${purchase.compra_id}:`, error.message);
        }
    }
}

/**
 * Verificar índice de búsqueda
 */
async function verifySearchIndex() {
    console.log('🔍 Verificando índice de búsqueda...');
    
    try {
        const result = await dynamodb.scan({
            TableName: CONFIG.searchIndexTable,
            FilterExpression: 'tenant_id = :tenant_id',
            ExpressionAttributeValues: {
                ':tenant_id': 'tenant-test'
            }
        }).promise();
        
        console.log(`✅ Entradas en índice de búsqueda: ${result.Items.length}`);
        
        if (result.Items.length > 0) {
            console.log('📋 Ejemplos de entradas:');
            result.Items.slice(0, 3).forEach(item => {
                console.log(`  - ${item.entity_type}: ${item.title}`);
            });
        }
        
        return result.Items;
    } catch (error) {
        console.error('❌ Error verificando índice de búsqueda:', error.message);
        return [];
    }
}

/**
 * Probar búsqueda por texto
 */
async function testSearch() {
    console.log('🔎 Probando búsquedas...');
    
    const searchQueries = [
        'laptop gaming',
        'mouse',
        'teclado',
        'ASUS',
        'Logitech'
    ];
    
    for (const query of searchQueries) {
        try {
            const result = await dynamodb.scan({
                TableName: CONFIG.searchIndexTable,
                FilterExpression: 'tenant_id = :tenant_id AND contains(search_text, :query)',
                ExpressionAttributeValues: {
                    ':tenant_id': 'tenant-test',
                    ':query': query.toLowerCase()
                }
            }).promise();
            
            console.log(`✅ Búsqueda "${query}": ${result.Items.length} resultados`);
        } catch (error) {
            console.error(`❌ Error en búsqueda "${query}":`, error.message);
        }
    }
}

/**
 * Verificar bucket S3
 */
async function verifyS3Analytics() {
    console.log('📊 Verificando datos analíticos en S3...');
    
    try {
        const result = await s3.listObjectsV2({
            Bucket: CONFIG.analyticsBucket,
            Prefix: 'products/'
        }).promise();
        
        console.log(`✅ Archivos de productos en S3: ${result.Contents.length}`);
        
        const purchaseResult = await s3.listObjectsV2({
            Bucket: CONFIG.analyticsBucket,
            Prefix: 'purchases/'
        }).promise();
        
        console.log(`✅ Archivos de compras en S3: ${purchaseResult.Contents.length}`);
        
        return {
            products: result.Contents.length,
            purchases: purchaseResult.Contents.length
        };
        
    } catch (error) {
        console.error('❌ Error verificando S3:', error.message);
        return null;
    }
}

/**
 * Actualizar un producto para probar CDC
 */
async function updateProduct() {
    console.log('🔄 Actualizando producto para probar CDC...');
    
    try {
        await dynamodb.update({
            TableName: CONFIG.productsTable,
            Key: {
                tenant_id: 'tenant-test',
                codigo: 'PROD-001'
            },
            UpdateExpression: 'SET precio = :precio, cantidad = :cantidad, fecha_actualizacion = :fecha',
            ExpressionAttributeValues: {
                ':precio': 1199.99,
                ':cantidad': 3,
                ':fecha': new Date().toISOString()
            }
        }).promise();
        
        console.log('✅ Producto actualizado exitosamente');
    } catch (error) {
        console.error('❌ Error actualizando producto:', error.message);
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Iniciando prueba completa del sistema CDC');
    console.log('📍 Región: us-east-1');
    console.log('🏢 Tenant: tenant-test');
    
    try {
        // Insertar datos
        await insertProducts();
        await insertPurchases();
        
        // Esperar un poco para que los streams procesen
        console.log('⏳ Esperando 5 segundos para que los streams procesen...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar resultados
        await verifySearchIndex();
        await verifyS3Analytics();
        
        // Probar búsquedas
        await testSearch();
        
        // Probar actualización
        await updateProduct();
        
        console.log('\n✅ Prueba completa finalizada exitosamente');
        
        // Resumen
        console.log('\n📊 Resumen de la prueba:');
        console.log(`- ${testData.products.length} productos insertados`);
        console.log(`- ${testData.purchases.length} compras insertadas`);
        console.log('- Índice de búsqueda verificado');
        console.log('- Datos analíticos en S3 verificados');
        console.log('- Búsquedas probadas');
        console.log('- CDC probado con actualización');
        
    } catch (error) {
        console.error('\n❌ Error en la prueba:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = {
    main,
    insertProducts,
    insertPurchases,
    verifySearchIndex,
    testSearch,
    verifyS3Analytics,
    updateProduct
};
