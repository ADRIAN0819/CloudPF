/**
 * Script para crear tablas DynamoDB en AWS Academy
 * Adaptado para usar LabRole y limitaciones de Academy
 */

const AWS = require('aws-sdk');

// Configurar AWS SDK
AWS.config.update({
    region: 'us-east-1' // AWS Academy solo permite us-east-1
});

const dynamodb = new AWS.DynamoDB();

// Configuraciones de tablas
const tableConfigs = {
    products: {
        TableName: 'CloudPF-Products-Academy',
        KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'product_id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'tenant_id', AttributeType: 'S' },
            { AttributeName: 'product_id', AttributeType: 'S' },
            { AttributeName: 'category', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'CategoryIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'category', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'StatusIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'status', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        },
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
    },
    
    purchases: {
        TableName: 'CloudPF-Purchases-Academy',
        KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'purchase_id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'tenant_id', AttributeType: 'S' },
            { AttributeName: 'purchase_id', AttributeType: 'S' },
            { AttributeName: 'customer_email', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' },
            { AttributeName: 'created_at', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'CustomerIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'customer_email', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'StatusIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'status', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'DateIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'created_at', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        },
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
    },
    
    searchIndex: {
        TableName: 'CloudPF-SearchIndex-Academy',
        KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'entity_id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'tenant_id', AttributeType: 'S' },
            { AttributeName: 'entity_id', AttributeType: 'S' },
            { AttributeName: 'entity_type', AttributeType: 'S' },
            { AttributeName: 'updated_at', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'TypeIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'entity_type', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'UpdatedIndex',
                KeySchema: [
                    { AttributeName: 'tenant_id', KeyType: 'HASH' },
                    { AttributeName: 'updated_at', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        },
        TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true
        }
    }
};

/**
 * Crear una tabla DynamoDB
 */
async function createTable(tableName, config) {
    try {
        console.log(`\n📋 Creando tabla: ${tableName}`);
        
        // Verificar si la tabla ya existe
        try {
            await dynamodb.describeTable({ TableName: config.TableName }).promise();
            console.log(`✅ La tabla ${tableName} ya existe`);
            return;
        } catch (error) {
            if (error.code !== 'ResourceNotFoundException') {
                throw error;
            }
        }
        
        // Crear la tabla
        const result = await dynamodb.createTable(config).promise();
        console.log(`✅ Tabla ${tableName} creada exitosamente`);
        
        // Esperar a que la tabla esté activa
        console.log(`⏳ Esperando a que la tabla ${tableName} esté activa...`);
        await dynamodb.waitFor('tableExists', { TableName: config.TableName }).promise();
        
        console.log(`✅ Tabla ${tableName} está activa`);
        
        // Mostrar información del stream si está habilitado
        if (config.StreamSpecification && config.StreamSpecification.StreamEnabled) {
            const tableInfo = await dynamodb.describeTable({ TableName: config.TableName }).promise();
            const streamArn = tableInfo.Table.LatestStreamArn;
            console.log(`📡 Stream ARN: ${streamArn}`);
        }
        
        return result;
        
    } catch (error) {
        console.error(`❌ Error creando tabla ${tableName}:`, error.message);
        throw error;
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Iniciando creación de tablas DynamoDB para AWS Academy');
    console.log('📍 Región: us-east-1');
    
    try {
        // Crear tablas en orden
        await createTable('Products', tableConfigs.products);
        await createTable('Purchases', tableConfigs.purchases);
        await createTable('SearchIndex', tableConfigs.searchIndex);
        
        console.log('\n✅ Todas las tablas han sido creadas exitosamente');
        
        // Mostrar resumen
        console.log('\n📊 Resumen de tablas creadas:');
        console.log('1. CloudPF-Products-Academy (con Stream habilitado)');
        console.log('2. CloudPF-Purchases-Academy (con Stream habilitado)');
        console.log('3. CloudPF-SearchIndex-Academy (con TTL habilitado)');
        
        console.log('\n🔧 Próximos pasos:');
        console.log('1. Configurar las Lambda functions');
        console.log('2. Desplegar usando serverless-academy.yml');
        console.log('3. Probar la funcionalidad CDC');
        
    } catch (error) {
        console.error('\n❌ Error en la creación de tablas:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { createTable, tableConfigs };
