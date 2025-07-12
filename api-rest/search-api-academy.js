const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('Search API Event (Academy):', JSON.stringify(event, null, 2));

  const { httpMethod, pathParameters, queryStringParameters } = event;
  const tenantId = pathParameters.tenant_id;

  try {
    let response;

    switch (httpMethod) {
      case 'GET':
        response = await handleSearch(tenantId, queryStringParameters);
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

async function handleSearch(tenantId, queryParams) {
  const {
    q = '',
    type = 'products',
    size = 10,
    from = 0
  } = queryParams || {};

  if (type === 'products') {
    return await searchProducts(tenantId, q, size, from);
  } else if (type === 'purchases') {
    return await searchPurchases(tenantId, queryParams);
  } else {
    return {
      statusCode: 400,
      body: { error: 'Invalid search type. Use "products" or "purchases"' }
    };
  }
}

// Búsqueda de productos usando DynamoDB GSI
async function searchProducts(tenantId, query, size, from) {
  const searchTable = `ProductSearch-${process.env.STAGE || 'academy'}`;
  
  try {
    let params = {
      TableName: searchTable,
      IndexName: 'tenant_id-search_key-index',
      KeyConditionExpression: 'tenant_id = :tenant_id',
      ExpressionAttributeValues: {
        ':tenant_id': tenantId
      },
      Limit: parseInt(size)
    };

    // Si hay query específico, agregar filtro
    if (query && query !== '*') {
      params.FilterExpression = 'contains(search_key, :query)';
      params.ExpressionAttributeValues[':query'] = query.toLowerCase();
    }

    const result = await dynamodb.query(params).promise();
    
    return {
      statusCode: 200,
      body: {
        total: result.Count,
        products: result.Items.map(item => ({
          id: item.product_id,
          tenant_id: item.tenant_id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          categoria: item.categoria,
          precio: item.precio,
          stock: item.stock,
          activo: item.activo,
          created_at: item.created_at,
          updated_at: item.updated_at
        }))
      }
    };
  } catch (error) {
    console.error('Error searching products in DynamoDB:', error);
    
    // Fallback: Buscar en S3
    return await searchProductsInS3(tenantId, query, size, from);
  }
}

// Fallback: Búsqueda en S3
async function searchProductsInS3(tenantId, query, size, from) {
  const s3Bucket = process.env.S3_BUCKET;
  const s3Prefix = `search-index/${tenantId}/products/`;
  
  try {
    const listResult = await s3.listObjectsV2({
      Bucket: s3Bucket,
      Prefix: s3Prefix,
      MaxKeys: parseInt(size)
    }).promise();

    const products = [];
    
    for (const object of listResult.Contents || []) {
      try {
        const productData = await s3.getObject({
          Bucket: s3Bucket,
          Key: object.Key
        }).promise();
        
        const product = JSON.parse(productData.Body.toString());
        
        // Filtrar por query si es necesario
        if (!query || query === '*' || 
            product.search_terms?.some(term => term.includes(query.toLowerCase()))) {
          products.push({
            id: product.product_id,
            tenant_id: product.tenant_id,
            nombre: product.nombre,
            descripcion: product.descripcion,
            categoria: product.categoria,
            precio: product.precio,
            stock: product.stock,
            activo: product.activo,
            created_at: product.created_at,
            updated_at: product.updated_at
          });
        }
      } catch (error) {
        console.error(`Error processing product ${object.Key}:`, error);
      }
    }
    
    return {
      statusCode: 200,
      body: {
        total: products.length,
        products: products.slice(parseInt(from), parseInt(from) + parseInt(size)),
        source: 'S3'
      }
    };
  } catch (error) {
    console.error('Error searching products in S3:', error);
    throw error;
  }
}

// Búsqueda de compras usando DynamoDB GSI
async function searchPurchases(tenantId, queryParams) {
  const purchasesTable = `Compras-${process.env.STAGE || 'academy'}`;
  const {
    usuario_id,
    producto_id,
    fecha_desde,
    fecha_hasta,
    size = 10,
    from = 0
  } = queryParams || {};

  try {
    let params = {
      TableName: purchasesTable,
      KeyConditionExpression: 'tenant_id = :tenant_id',
      ExpressionAttributeValues: {
        ':tenant_id': tenantId
      },
      Limit: parseInt(size)
    };

    // Agregar filtros
    const filters = [];
    if (usuario_id) {
      filters.push('usuario_id = :usuario_id');
      params.ExpressionAttributeValues[':usuario_id'] = usuario_id;
    }
    if (producto_id) {
      filters.push('producto_id = :producto_id');
      params.ExpressionAttributeValues[':producto_id'] = producto_id;
    }
    if (fecha_desde) {
      filters.push('fecha_compra >= :fecha_desde');
      params.ExpressionAttributeValues[':fecha_desde'] = fecha_desde;
    }
    if (fecha_hasta) {
      filters.push('fecha_compra <= :fecha_hasta');
      params.ExpressionAttributeValues[':fecha_hasta'] = fecha_hasta;
    }

    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
    }

    const result = await dynamodb.query(params).promise();
    
    return {
      statusCode: 200,
      body: {
        total: result.Count,
        purchases: result.Items.map(item => ({
          id: item.purchase_id,
          tenant_id: item.tenant_id,
          usuario_id: item.usuario_id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          precio_total: item.precio_total,
          fecha_compra: item.fecha_compra,
          estado: item.estado,
          created_at: item.created_at
        }))
      }
    };
  } catch (error) {
    console.error('Error searching purchases:', error);
    throw error;
  }
}
