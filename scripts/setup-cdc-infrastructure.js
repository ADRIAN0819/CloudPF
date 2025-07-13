/**
 * Script para configurar la infraestructura CDC
 * Crea las tablas y buckets necesarios para el sistema
 */

const AWS = require('aws-sdk');

// Configurar AWS SDK
AWS.config.update({
    region: 'us-east-1'
});

const dynamodb = new AWS.DynamoDB();
const s3 = new AWS.S3();

// Configuración específica para tu cuenta
const ACCOUNT_ID = '281612000535';

/**
 * Crear tabla de índice de búsqueda
 */
async function createSearchIndexTable() {
    const tableName = 'CloudPF-SearchIndex';
    
    const params = {
        TableName: tableName,
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
    };

    try {
        // Verificar si la tabla ya existe
        await dynamodb.describeTable({ TableName: tableName }).promise();
        console.log(`✅ La tabla ${tableName} ya existe`);
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log(`📋 Creando tabla: ${tableName}`);
            await dynamodb.createTable(params).promise();
            console.log(`✅ Tabla ${tableName} creada exitosamente`);
            
            // Esperar a que esté activa
            await dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
            console.log(`✅ Tabla ${tableName} está activa`);
        } else {
            throw error;
        }
    }
}

/**
 * Crear buckets S3 para analytics
 */
async function createS3Buckets() {
    const buckets = [
        `cloudpf-data-lake-${ACCOUNT_ID}`,
        `cloudpf-analytics-${ACCOUNT_ID}`
    ];

    for (const bucketName of buckets) {
        try {
            await s3.headBucket({ Bucket: bucketName }).promise();
            console.log(`✅ El bucket ${bucketName} ya existe`);
        } catch (error) {
            if (error.code === 'NotFound') {
                console.log(`📦 Creando bucket: ${bucketName}`);
                await s3.createBucket({ Bucket: bucketName }).promise();
                console.log(`✅ Bucket ${bucketName} creado exitosamente`);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Configurando infraestructura CDC');
    console.log(`📍 Cuenta AWS: ${ACCOUNT_ID}`);
    console.log('📍 Región: us-east-1');
    
    try {
        // Crear tabla de búsqueda
        await createSearchIndexTable();
        
        // Crear buckets S3
        await createS3Buckets();
        
        console.log('\n✅ Infraestructura CDC configurada exitosamente');
        console.log('\n📊 Recursos creados:');
        console.log('1. CloudPF-SearchIndex (tabla DynamoDB)');
        console.log(`2. cloudpf-data-lake-${ACCOUNT_ID} (bucket S3)`);
        console.log(`3. cloudpf-analytics-${ACCOUNT_ID} (bucket S3)`);
        
        console.log('\n🔧 Próximos pasos:');
        console.log('1. Desplegar las Lambda functions: serverless deploy');
        console.log('2. Probar el sistema CDC insertando datos');
        
    } catch (error) {
        console.error('\n❌ Error configurando infraestructura:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { 
    createSearchIndexTable, 
    createS3Buckets, 
    main 
};
