/**
 * Script de prueba para CDC en AWS Academy
 * Genera datos de prueba y verifica el funcionamiento
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
    productsTable: 'CloudPF-Products-Academy',
    purchasesTable: 'CloudPF-Purchases-Academy',
    searchIndexTable: 'CloudPF-SearchIndex-Academy',
    analyticsBucket: 'cloudpf-analytics-academy'
};

/**
 * Datos de prueba para productos
 */
const testProducts = [
    {
        tenant_id: 'tenant-1',
        product_id: 'prod-001',
        name: 'Laptop Gaming',
        category: 'Electrónicos',
        price: 1299.99,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        tenant_id: 'tenant-1',
        product_id: 'prod-002',
        name: 'Mouse Inalámbrico',
        category: 'Accesorios',
        price: 29.99,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        tenant_id: 'tenant-2',
        product_id: 'prod-003',
        name: 'Teclado Mecánico',
        category: 'Accesorios',
        price: 89.99,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

/**
 * Datos de prueba para compras
 */
const testPurchases = [
    {
        tenant_id: 'tenant-1',
        purchase_id: 'purch-001',
        customer_email: 'juan.perez@email.com',
        customer_name: 'Juan Pérez',
        product_id: 'prod-001',
        product_name: 'Laptop Gaming',
        product_category: 'Electrónicos',
        quantity: 1,
        total_amount: 1299.99,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        tenant_id: 'tenant-1',
        purchase_id: 'purch-002',
        customer_email: 'maria.garcia@email.com',
        customer_name: 'María García',
        product_id: 'prod-002',
        product_name: 'Mouse Inalámbrico',
        product_category: 'Accesorios',
        quantity: 2,
        total_amount: 59.98,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

/**
 * Insertar productos de prueba
 */
async function insertTestProducts() {
    console.log('📦 Insertando productos de prueba...');
    
    for (const product of testProducts) {
        try {
            await dynamodb.put({
                TableName: CONFIG.productsTable,
                Item: product
            }).promise();
            
            console.log(`✅ Producto insertado: ${product.product_id} - ${product.name}`);
        } catch (error) {
            console.error(`❌ Error insertando producto ${product.product_id}:`, error.message);
        }
    }
}

/**
 * Insertar compras de prueba
 */
async function insertTestPurchases() {
    console.log('🛒 Insertando compras de prueba...');
    
    for (const purchase of testPurchases) {
        try {
            await dynamodb.put({
                TableName: CONFIG.purchasesTable,
                Item: purchase
            }).promise();
            
            console.log(`✅ Compra insertada: ${purchase.purchase_id} - ${purchase.customer_name}`);
        } catch (error) {
            console.error(`❌ Error insertando compra ${purchase.purchase_id}:`, error.message);
        }
    }
}

/**
 * Actualizar un producto para probar CDC
 */
async function updateTestProduct() {
    console.log('🔄 Actualizando producto para probar CDC...');
    
    const updateData = {
        tenant_id: 'tenant-1',
        product_id: 'prod-001',
        name: 'Laptop Gaming Pro',
        category: 'Electrónicos',
        price: 1499.99,
        status: 'active',
        created_at: testProducts[0].created_at,
        updated_at: new Date().toISOString()
    };
    
    try {
        await dynamodb.put({
            TableName: CONFIG.productsTable,
            Item: updateData
        }).promise();
        
        console.log('✅ Producto actualizado exitosamente');
    } catch (error) {
        console.error('❌ Error actualizando producto:', error.message);
    }
}

/**
 * Actualizar una compra para probar CDC
 */
async function updateTestPurchase() {
    console.log('🔄 Actualizando compra para probar CDC...');
    
    const updateData = {
        tenant_id: 'tenant-1',
        purchase_id: 'purch-002',
        customer_email: 'maria.garcia@email.com',
        customer_name: 'María García',
        product_id: 'prod-002',
        product_name: 'Mouse Inalámbrico',
        product_category: 'Accesorios',
        quantity: 2,
        total_amount: 59.98,
        status: 'completed', // Cambiar de pending a completed
        created_at: testPurchases[1].created_at,
        updated_at: new Date().toISOString()
    };
    
    try {
        await dynamodb.put({
            TableName: CONFIG.purchasesTable,
            Item: updateData
        }).promise();
        
        console.log('✅ Compra actualizada exitosamente');
    } catch (error) {
        console.error('❌ Error actualizando compra:', error.message);
    }
}

/**
 * Verificar datos en el índice de búsqueda
 */
async function verifySearchIndex() {
    console.log('🔍 Verificando índice de búsqueda...');
    
    try {
        const result = await dynamodb.scan({
            TableName: CONFIG.searchIndexTable,
            FilterExpression: 'tenant_id = :tenant_id',
            ExpressionAttributeValues: {
                ':tenant_id': 'tenant-1'
            }
        }).promise();
        
        console.log(`✅ Encontrados ${result.Items.length} elementos en el índice de búsqueda`);
        
        result.Items.forEach(item => {
            console.log(`  - ${item.entity_type}: ${item.entity_id}`);
        });
        
    } catch (error) {
        console.error('❌ Error verificando índice de búsqueda:', error.message);
    }
}

/**
 * Verificar datos en S3
 */
async function verifyS3Data() {
    console.log('📊 Verificando datos en S3...');
    
    try {
        const result = await s3.listObjectsV2({
            Bucket: CONFIG.analyticsBucket,
            MaxKeys: 10
        }).promise();
        
        console.log(`✅ Encontrados ${result.Contents.length} archivos en S3`);
        
        result.Contents.forEach(obj => {
            console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
        });
        
    } catch (error) {
        console.error('❌ Error verificando datos en S3:', error.message);
    }
}

/**
 * Probar búsqueda por texto
 */
async function testSearch() {
    console.log('🔍 Probando búsqueda por texto...');
    
    try {
        // Buscar productos que contengan "laptop"
        const result = await dynamodb.scan({
            TableName: CONFIG.searchIndexTable,
            FilterExpression: 'contains(search_text, :search_term) AND tenant_id = :tenant_id',
            ExpressionAttributeValues: {
                ':search_term': 'laptop',
                ':tenant_id': 'tenant-1'
            }
        }).promise();
        
        console.log(`✅ Encontrados ${result.Items.length} resultados para "laptop"`);
        
        result.Items.forEach(item => {
            console.log(`  - ${item.entity_type}: ${item.data.name || item.data.customer_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error en búsqueda:', error.message);
    }
}

/**
 * Eliminar datos de prueba
 */
async function cleanupTestData() {
    console.log('🧹 Limpiando datos de prueba...');
    
    // Eliminar productos
    for (const product of testProducts) {
        try {
            await dynamodb.delete({
                TableName: CONFIG.productsTable,
                Key: {
                    tenant_id: product.tenant_id,
                    product_id: product.product_id
                }
            }).promise();
            
            console.log(`✅ Producto eliminado: ${product.product_id}`);
        } catch (error) {
            console.error(`❌ Error eliminando producto ${product.product_id}:`, error.message);
        }
    }
    
    // Eliminar compras
    for (const purchase of testPurchases) {
        try {
            await dynamodb.delete({
                TableName: CONFIG.purchasesTable,
                Key: {
                    tenant_id: purchase.tenant_id,
                    purchase_id: purchase.purchase_id
                }
            }).promise();
            
            console.log(`✅ Compra eliminada: ${purchase.purchase_id}`);
        } catch (error) {
            console.error(`❌ Error eliminando compra ${purchase.purchase_id}:`, error.message);
        }
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Iniciando pruebas de CDC para AWS Academy');
    console.log('📍 Región: us-east-1');
    
    try {
        // Insertar datos de prueba
        await insertTestProducts();
        await insertTestPurchases();
        
        console.log('\n⏳ Esperando 30 segundos para que se procesen los streams...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Realizar actualizaciones
        await updateTestProduct();
        await updateTestPurchase();
        
        console.log('\n⏳ Esperando 30 segundos para que se procesen las actualizaciones...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Verificar resultados
        await verifySearchIndex();
        await verifyS3Data();
        await testSearch();
        
        console.log('\n✅ Pruebas completadas exitosamente');
        
        // Preguntar si limpiar datos
        console.log('\n❓ ¿Desea limpiar los datos de prueba? (Ejecutar cleanupTestData() manualmente)');
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { 
    insertTestProducts,
    insertTestPurchases,
    updateTestProduct,
    updateTestPurchase,
    verifySearchIndex,
    verifyS3Data,
    testSearch,
    cleanupTestData
};
