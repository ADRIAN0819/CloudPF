const { Client } = require('@elastic/elasticsearch');

const es = new Client({
  node: process.env.ELASTICSEARCH_ENDPOINT,
  auth: {
    username: 'admin',
    password: 'admin'
  }
});

exports.handler = async (event) => {
  console.log('ElasticSearch API Event:', JSON.stringify(event, null, 2));

  const { httpMethod, pathParameters, queryStringParameters, body } = event;
  const tenantId = pathParameters.tenant_id;

  try {
    let response;

    switch (httpMethod) {
      case 'GET':
        response = await handleGet(tenantId, pathParameters, queryStringParameters);
        break;
      case 'POST':
        response = await handlePost(tenantId, pathParameters, JSON.parse(body || '{}'));
        break;
      default:
        response = {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    return {
      statusCode: response.statusCode || 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function handleGet(tenantId, pathParameters, queryStringParameters) {
  const path = event.path || '';
  
  if (path.includes('/products')) {
    return await searchProducts(tenantId, queryStringParameters);
  } else if (path.includes('/purchases')) {
    return await searchPurchases(tenantId, queryStringParameters);
  } else {
    return await generalSearch(tenantId, queryStringParameters);
  }
}

async function searchProducts(tenantId, queryParams) {
  const indexName = `products-${tenantId}`;
  const {
    q = '*',
    fuzzy = 'false',
    prefix = '',
    autocomplete = 'false',
    size = 10,
    from = 0,
    sort = 'created_at:desc'
  } = queryParams || {};

  let query = {
    match_all: {}
  };

  if (q && q !== '*') {
    if (fuzzy === 'true') {
      // Búsqueda fuzzy
      query = {
        multi_match: {
          query: q,
          fields: ['nombre^2', 'descripcion', 'categoria'],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      };
    } else if (prefix) {
      // Búsqueda por prefijo
      query = {
        bool: {
          should: [
            {
              prefix: {
                'nombre.keyword': prefix
              }
            },
            {
              prefix: {
                'descripcion': prefix
              }
            }
          ]
        }
      };
    } else if (autocomplete === 'true') {
      // Autocompletado
      query = {
        bool: {
          should: [
            {
              match_phrase_prefix: {
                nombre: {
                  query: q,
                  max_expansions: 10
                }
              }
            },
            {
              match_phrase_prefix: {
                descripcion: {
                  query: q,
                  max_expansions: 10
                }
              }
            }
          ]
        }
      };
    } else {
      // Búsqueda estándar
      query = {
        multi_match: {
          query: q,
          fields: ['nombre^2', 'descripcion', 'categoria'],
          operator: 'and'
        }
      };
    }
  }

  const searchBody = {
    query: query,
    size: parseInt(size),
    from: parseInt(from),
    sort: [
      {
        [sort.split(':')[0]]: {
          order: sort.split(':')[1] || 'desc'
        }
      }
    ],
    highlight: {
      fields: {
        nombre: {},
        descripcion: {}
      }
    }
  };

  const result = await es.search({
    index: indexName,
    body: searchBody
  });

  return {
    statusCode: 200,
    body: {
      total: result.hits.total.value,
      products: result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlight: hit.highlight
      }))
    }
  };
}

async function searchPurchases(tenantId, queryParams) {
  const indexName = `purchases-${tenantId}`;
  const {
    usuario_id,
    producto_id,
    fecha_desde,
    fecha_hasta,
    size = 10,
    from = 0,
    sort = 'fecha_compra:desc'
  } = queryParams || {};

  let filters = [];

  if (usuario_id) {
    filters.push({ term: { usuario_id } });
  }

  if (producto_id) {
    filters.push({ term: { producto_id } });
  }

  if (fecha_desde || fecha_hasta) {
    const dateRange = {};
    if (fecha_desde) dateRange.gte = fecha_desde;
    if (fecha_hasta) dateRange.lte = fecha_hasta;
    
    filters.push({
      range: {
        fecha_compra: dateRange
      }
    });
  }

  const query = filters.length > 0 ? {
    bool: {
      filter: filters
    }
  } : {
    match_all: {}
  };

  const searchBody = {
    query: query,
    size: parseInt(size),
    from: parseInt(from),
    sort: [
      {
        [sort.split(':')[0]]: {
          order: sort.split(':')[1] || 'desc'
        }
      }
    ],
    aggs: {
      total_sales: {
        sum: {
          field: 'precio_total'
        }
      },
      avg_purchase_amount: {
        avg: {
          field: 'precio_total'
        }
      }
    }
  };

  const result = await es.search({
    index: indexName,
    body: searchBody
  });

  return {
    statusCode: 200,
    body: {
      total: result.hits.total.value,
      purchases: result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      })),
      aggregations: {
        total_sales: result.aggregations.total_sales.value,
        avg_purchase_amount: result.aggregations.avg_purchase_amount.value
      }
    }
  };
}

async function generalSearch(tenantId, queryParams) {
  const { q = '*', type = 'products', size = 10, from = 0 } = queryParams || {};
  
  if (type === 'products') {
    return await searchProducts(tenantId, queryParams);
  } else if (type === 'purchases') {
    return await searchPurchases(tenantId, queryParams);
  } else {
    return {
      statusCode: 400,
      body: { error: 'Invalid search type. Use "products" or "purchases"' }
    };
  }
}
