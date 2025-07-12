/**
 * API de Búsqueda
 * Versión adaptada para usar DynamoDB GSI en lugar de ElasticSearch
 * 
 * Funcionalidades:
 * - Búsqueda de productos por texto
 * - Búsqueda de compras por criterios
 * - Soporte multi-tenant
 * - Paginación de resultados
 */

const AWS = require('aws-sdk');

// Configuración de clientes AWS
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Variables de entorno
const SEARCH_INDEX_TABLE = process.env.DYNAMODB_TABLE_PRODUCT_SEARCH || 'CloudPF-SearchIndex';

/**
 * Handler principal para el API de búsqueda
 */
exports.handler = async (event) => {
    console.log('Search API Event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, queryStringParameters } = event;
    
    try {
        let response;
        
        switch (httpMethod) {
            case 'GET':
                response = await handleSearch(queryStringParameters);
                break;
            case 'OPTIONS':
                response = {
                    statusCode: 200,
                    body: { message: 'CORS preflight' }
                };
                break;
            default:
                response = {
                    statusCode: 405,
                    body: { error: 'Method not allowed' }
                };
        }
        
        return {
            statusCode: response.statusCode || 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(response.body)
        };
        
    } catch (error) {
        console.error('Error en Search API:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error', 
                details: error.message 
            })
        };
    }
};

/**
 * Maneja las solicitudes de búsqueda
 */
async function handleSearch(queryParams) {
    if (!queryParams) {
        return {
            statusCode: 400,
            body: {
                error: 'Query parameters required',
                message: 'Please provide tenant_id and optionally q for search query'
            }
        };
    }
    
    const { tenant_id, q, type, limit } = queryParams;
    
    // Validar tenant_id requerido
    if (!tenant_id) {
        return {
            statusCode: 400,
            body: {
                error: 'tenant_id is required',
                message: 'Please provide tenant_id in query parameters'
            }
        };
    }
    
    try {
        let results;
        
        if (q) {
            // Búsqueda por texto
            results = await searchByText(tenant_id, q, type, limit);
        } else {
            // Listar todos los elementos
            results = await listAll(tenant_id, type, limit);
        }
        
        return {
            statusCode: 200,
            body: {
                results: results.items,
                total: results.count,
                tenant_id: tenant_id,
                query: q || null,
                type: type || 'all'
            }
        };
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        return {
            statusCode: 500,
            body: {
                error: 'Search error',
                details: error.message
            }
        };
    }
}

/**
 * Búsqueda por texto en el índice
 */
async function searchByText(tenantId, query, type, limit = 50) {
    console.log(`Buscando: "${query}" para tenant: ${tenantId}`);
    
    const params = {
        TableName: SEARCH_INDEX_TABLE,
        FilterExpression: 'tenant_id = :tenant_id AND contains(search_text, :query)',
        ExpressionAttributeValues: {
            ':tenant_id': tenantId,
            ':query': query.toLowerCase()
        },
        Limit: parseInt(limit)
    };
    
    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
        params.FilterExpression += ' AND entity_type = :type';
        params.ExpressionAttributeValues[':type'] = type;
    }
    
    try {
        const result = await dynamodb.scan(params).promise();
        
        // Procesar resultados
        const items = result.Items.map(item => ({
            id: item.entity_id,
            type: item.entity_type,
            data: item.data,
            updated_at: item.updated_at,
            score: calculateScore(item.search_text, query)
        }));
        
        // Ordenar por score
        items.sort((a, b) => b.score - a.score);
        
        return {
            items: items,
            count: items.length
        };
        
    } catch (error) {
        console.error('Error en búsqueda por texto:', error);
        throw error;
    }
}

/**
 * Listar todos los elementos
 */
async function listAll(tenantId, type, limit = 50) {
    console.log(`Listando elementos para tenant: ${tenantId}`);
    
    const params = {
        TableName: SEARCH_INDEX_TABLE,
        FilterExpression: 'tenant_id = :tenant_id',
        ExpressionAttributeValues: {
            ':tenant_id': tenantId
        },
        Limit: parseInt(limit)
    };
    
    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
        params.FilterExpression += ' AND entity_type = :type';
        params.ExpressionAttributeValues[':type'] = type;
    }
    
    try {
        const result = await dynamodb.scan(params).promise();
        
        // Procesar resultados
        const items = result.Items.map(item => ({
            id: item.entity_id,
            type: item.entity_type,
            data: item.data,
            updated_at: item.updated_at
        }));
        
        // Ordenar por fecha de actualización (más reciente primero)
        items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        return {
            items: items,
            count: items.length
        };
        
    } catch (error) {
        console.error('Error listando elementos:', error);
        throw error;
    }
}

/**
 * Calcula un score simple para la búsqueda
 */
function calculateScore(searchText, query) {
    const lowerQuery = query.toLowerCase();
    const lowerSearchText = searchText.toLowerCase();
    
    // Score basado en coincidencias exactas y parciales
    let score = 0;
    
    // Coincidencia exacta de la query completa
    if (lowerSearchText.includes(lowerQuery)) {
        score += 100;
    }
    
    // Coincidencias de palabras individuales
    const queryWords = lowerQuery.split(' ');
    const searchWords = lowerSearchText.split(' ');
    
    queryWords.forEach(queryWord => {
        searchWords.forEach(searchWord => {
            if (searchWord === queryWord) {
                score += 50; // Coincidencia exacta de palabra
            } else if (searchWord.includes(queryWord)) {
                score += 25; // Coincidencia parcial
            }
        });
    });
    
    return score;
}

/**
 * Función auxiliar para validar parámetros
 */
function validateParams(params) {
    const errors = [];
    
    if (!params.tenant_id) {
        errors.push('tenant_id is required');
    }
    
    if (params.limit && (isNaN(params.limit) || params.limit < 1 || params.limit > 100)) {
        errors.push('limit must be a number between 1 and 100');
    }
    
    if (params.type && !['product', 'purchase', 'all'].includes(params.type)) {
        errors.push('type must be one of: product, purchase, all');
    }
    
    return errors;
}
