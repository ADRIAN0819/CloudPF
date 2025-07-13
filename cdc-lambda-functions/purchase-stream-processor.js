/**
 * Lambda Function para procesar cambios en DynamoDB Stream de Purchases
 * Adaptada para LabRole y estructuras de datos reales
 * 
 * Funcionalidades:
 * - Procesa eventos de CDC de la tabla Purchases
 * - Almacena datos en S3 para análisis con Athena
 * - Mantiene índice de búsqueda en DynamoDB GSI
 * - Soporte multi-tenant
 */

const AWS = require('aws-sdk');

// Configuración de clientes AWS
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Variables de entorno
const ANALYTICS_BUCKET = process.env.ANALYTICS_BUCKET || 'cloudpf-analytics-281612000535';
const SEARCH_INDEX_TABLE = process.env.DYNAMODB_TABLE_PRODUCT_SEARCH || 'CloudPF-SearchIndex';
const PURCHASES_TABLE = process.env.DYNAMODB_TABLE_COMPRAS || 'dev-t_MS3_compras';

/**
 * Handler principal para procesar eventos de DynamoDB Stream
 */
exports.handler = async (event) => {
    console.log('Procesando eventos de Purchase Stream:', JSON.stringify(event, null, 2));
    
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };
    
    try {
        // Procesar cada registro del stream
        for (const record of event.Records) {
            try {
                await processRecord(record);
                results.successful++;
            } catch (error) {
                console.error('Error procesando registro:', error);
                results.failed++;
                results.errors.push({
                    recordId: record.dynamodb?.Keys?.compra_id?.S,
                    error: error.message
                });
            }
        }
        
        console.log('Resultados del procesamiento:', results);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Purchase stream procesado exitosamente',
                results: results
            })
        };
        
    } catch (error) {
        console.error('Error general en el procesamiento:', error);
        throw error;
    }
};

/**
 * Procesa un registro individual del stream
 */
async function processRecord(record) {
    const eventName = record.eventName;
    const dynamoDbData = record.dynamodb;
    
    console.log(`Procesando evento: ${eventName}`);
    
    // Extraer datos según el tipo de evento
    let purchaseData;
    
    switch (eventName) {
        case 'INSERT':
            purchaseData = unmarshalDynamoData(dynamoDbData.NewImage);
            await handleInsert(purchaseData);
            break;
            
        case 'MODIFY':
            const oldData = unmarshalDynamoData(dynamoDbData.OldImage);
            const newData = unmarshalDynamoData(dynamoDbData.NewImage);
            await handleModify(oldData, newData);
            break;
            
        case 'REMOVE':
            purchaseData = unmarshalDynamoData(dynamoDbData.OldImage);
            await handleRemove(purchaseData);
            break;
            
        default:
            console.log(`Evento no soportado: ${eventName}`);
    }
}

/**
 * Maneja inserción de nueva compra
 */
async function handleInsert(purchaseData) {
    console.log('Procesando inserción de compra:', purchaseData);
    
    // Validar datos de compra
    validatePurchaseData(purchaseData);
    
    // Enriquecer datos con timestamp
    const enrichedData = {
        ...purchaseData,
        processed_at: new Date().toISOString(),
        event_type: 'purchase_created'
    };
    
    // Guardar en S3 para análisis
    await saveToS3(enrichedData, 'purchases');
    
    // Actualizar índice de búsqueda
    await updateSearchIndex(enrichedData, 'INSERT');
    
    console.log('Compra procesada exitosamente');
}

/**
 * Maneja modificación de compra existente
 */
async function handleModify(oldData, newData) {
    console.log('Procesando modificación de compra:', { oldData, newData });
    
    // Validar datos de compra
    validatePurchaseData(newData);
    
    // Enriquecer datos con timestamp
    const enrichedData = {
        ...newData,
        processed_at: new Date().toISOString(),
        event_type: 'purchase_updated',
        previous_data: oldData
    };
    
    // Guardar en S3 para análisis
    await saveToS3(enrichedData, 'purchases');
    
    // Actualizar índice de búsqueda
    await updateSearchIndex(enrichedData, 'MODIFY');
    
    console.log('Modificación de compra procesada exitosamente');
}

/**
 * Maneja eliminación de compra
 */
async function handleRemove(purchaseData) {
    console.log('Procesando eliminación de compra:', purchaseData);
    
    // Enriquecer datos con timestamp
    const enrichedData = {
        ...purchaseData,
        processed_at: new Date().toISOString(),
        event_type: 'purchase_deleted'
    };
    
    // Guardar en S3 para análisis
    await saveToS3(enrichedData, 'purchases');
    
    // Actualizar índice de búsqueda
    await updateSearchIndex(enrichedData, 'REMOVE');
    
    console.log('Eliminación de compra procesada exitosamente');
}

/**
 * Guarda datos en S3 para análisis con Athena
 */
async function saveToS3(data, type) {
    const timestamp = new Date();
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hour = String(timestamp.getHours()).padStart(2, '0');
    
    // Estructura particionada por fecha para optimizar consultas Athena
    const key = `${type}/year=${year}/month=${month}/day=${day}/hour=${hour}/${data.tenant_id}_${data.compra_id}_${timestamp.getTime()}.json`;
    
    const params = {
        Bucket: ANALYTICS_BUCKET,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
    };
    
    try {
        await s3.putObject(params).promise();
        console.log(`Datos guardados en S3: ${key}`);
    } catch (error) {
        console.error('Error guardando en S3:', error);
        throw error;
    }
}

/**
 * Actualiza el índice de búsqueda en DynamoDB GSI
 */
async function updateSearchIndex(data, operation) {
    const searchEntry = {
        tenant_id: data.tenant_id,
        entity_type: 'purchase',
        entity_id: data.compra_id,
        search_text: createSearchText(data),
        data: data,
        updated_at: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // TTL de 1 año
    };
    
    try {
        if (operation === 'REMOVE') {
            // Eliminar del índice
            await dynamodb.delete({
                TableName: SEARCH_INDEX_TABLE,
                Key: {
                    tenant_id: data.tenant_id,
                    entity_id: data.compra_id
                }
            }).promise();
            console.log('Entrada eliminada del índice de búsqueda');
        } else {
            // Insertar o actualizar en el índice
            await dynamodb.put({
                TableName: SEARCH_INDEX_TABLE,
                Item: searchEntry
            }).promise();
            console.log('Índice de búsqueda actualizado');
        }
    } catch (error) {
        console.error('Error actualizando índice de búsqueda:', error);
        throw error;
    }
}

/**
 * Crea texto de búsqueda para indexación
 */
function createSearchText(data) {
    const searchableFields = [
        data.compra_id,
        data.user_id,
        data.tenant_id,
        data.fecha
    ];
    
    // Agregar información de productos si existe
    if (data.productos && Array.isArray(data.productos)) {
        data.productos.forEach(producto => {
            searchableFields.push(producto.codigo);
            searchableFields.push(producto.nombre);
        });
    }
    
    return searchableFields
        .filter(field => field) // Filtrar campos vacíos
        .join(' ')
        .toLowerCase();
}

/**
 * Convierte datos de DynamoDB a formato JavaScript
 */
function unmarshalDynamoData(data) {
    if (!data) return null;
    
    const result = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (value.S) {
            result[key] = value.S;
        } else if (value.N) {
            result[key] = Number(value.N);
        } else if (value.BOOL) {
            result[key] = value.BOOL;
        } else if (value.SS) {
            result[key] = value.SS;
        } else if (value.NS) {
            result[key] = value.NS.map(n => Number(n));
        } else if (value.M) {
            result[key] = unmarshalDynamoData(value.M);
        } else if (value.L) {
            result[key] = value.L.map(item => unmarshalDynamoData({ temp: item }).temp);
        }
    }
    
    return result;
}

/**
 * Función de validación para datos de compra
 */
function validatePurchaseData(data) {
    const required = ['compra_id', 'tenant_id', 'user_id'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
        throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
    
    return true;
}
