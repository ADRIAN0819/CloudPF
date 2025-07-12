const AWS = require('aws-sdk');

const athena = new AWS.Athena({ region: 'us-east-1' });

exports.handler = async (event) => {
  console.log('Athena Query Event:', JSON.stringify(event, null, 2));

  const { httpMethod, pathParameters, queryStringParameters, body } = event;
  const tenantId = pathParameters.tenant_id;

  try {
    let response;

    switch (httpMethod) {
      case 'GET':
        response = await handleGet(tenantId, queryStringParameters);
        break;
      case 'POST':
        response = await handlePost(tenantId, JSON.parse(body || '{}'));
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

async function handleGet(tenantId, queryParams) {
  const { 
    query_type = 'sales_summary',
    start_date,
    end_date,
    limit = 100 
  } = queryParams || {};

  let sqlQuery;

  switch (query_type) {
    case 'sales_summary':
      sqlQuery = getSalesSummaryQuery(tenantId, start_date, end_date);
      break;
    case 'top_products':
      sqlQuery = getTopProductsQuery(tenantId, start_date, end_date, limit);
      break;
    case 'monthly_trends':
      sqlQuery = getMonthlyTrendsQuery(tenantId, start_date, end_date);
      break;
    case 'active_users':
      sqlQuery = getActiveUsersQuery(tenantId, start_date, end_date, limit);
      break;
    case 'inventory_analysis':
      sqlQuery = getInventoryAnalysisQuery(tenantId);
      break;
    default:
      return {
        statusCode: 400,
        body: { error: 'Invalid query_type' }
      };
  }

  const result = await executeQuery(sqlQuery);
  
  return {
    statusCode: 200,
    body: {
      query_type,
      tenant_id: tenantId,
      execution_id: result.QueryExecutionId,
      results: result.ResultSet ? result.ResultSet.Rows : [],
      column_info: result.ResultSet ? result.ResultSet.ResultSetMetadata.ColumnInfo : []
    }
  };
}

async function handlePost(tenantId, requestBody) {
  const { query_type, custom_query, parameters = {} } = requestBody;

  if (custom_query) {
    // Ejecutar query personalizada
    const result = await executeQuery(custom_query);
    
    return {
      statusCode: 200,
      body: {
        query_type: 'custom',
        tenant_id: tenantId,
        execution_id: result.QueryExecutionId,
        results: result.ResultSet ? result.ResultSet.Rows : [],
        column_info: result.ResultSet ? result.ResultSet.ResultSetMetadata.ColumnInfo : []
      }
    };
  }

  // Generar reporte personalizado
  const reportData = await generateCustomReport(tenantId, query_type, parameters);
  
  return {
    statusCode: 200,
    body: reportData
  };
}

async function executeQuery(sqlQuery) {
  const params = {
    QueryString: sqlQuery,
    ResultConfiguration: {
      OutputLocation: process.env.ATHENA_OUTPUT_LOCATION
    },
    WorkGroup: 'primary'
  };

  // Iniciar ejecución de la query
  const startResult = await athena.startQueryExecution(params).promise();
  const executionId = startResult.QueryExecutionId;

  // Esperar a que termine la ejecución
  await waitForQueryCompletion(executionId);

  // Obtener resultados
  const resultsParams = {
    QueryExecutionId: executionId,
    MaxResults: 1000
  };

  const results = await athena.getQueryResults(resultsParams).promise();
  
  return {
    QueryExecutionId: executionId,
    ResultSet: results.ResultSet
  };
}

async function waitForQueryCompletion(executionId) {
  let status = 'RUNNING';
  
  while (status === 'RUNNING' || status === 'QUEUED') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await athena.getQueryExecution({ QueryExecutionId: executionId }).promise();
    status = result.QueryExecution.Status.State;
    
    if (status === 'FAILED' || status === 'CANCELLED') {
      throw new Error(`Query failed: ${result.QueryExecution.Status.StateChangeReason}`);
    }
  }
}

function getSalesSummaryQuery(tenantId, startDate, endDate) {
  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = `AND fecha_compra BETWEEN '${startDate}' AND '${endDate}'`;
  }

  return `
    SELECT 
      tenant_id,
      COUNT(*) as total_compras,
      SUM(precio_total) as total_ventas,
      AVG(precio_total) as promedio_compra,
      MIN(fecha_compra) as primera_compra,
      MAX(fecha_compra) as ultima_compra
    FROM ${process.env.ATHENA_DATABASE}.compras
    WHERE tenant_id = '${tenantId}' ${dateFilter}
    GROUP BY tenant_id
  `;
}

function getTopProductsQuery(tenantId, startDate, endDate, limit) {
  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = `AND c.fecha_compra BETWEEN '${startDate}' AND '${endDate}'`;
  }

  return `
    SELECT 
      c.tenant_id,
      c.producto_id,
      p.nombre as producto_nombre,
      SUM(c.cantidad) as total_vendido,
      SUM(c.precio_total) as ingresos_totales,
      COUNT(*) as numero_ventas
    FROM ${process.env.ATHENA_DATABASE}.compras c
    LEFT JOIN ${process.env.ATHENA_DATABASE}.productos p 
      ON c.producto_id = p.product_id AND c.tenant_id = p.tenant_id
    WHERE c.tenant_id = '${tenantId}' ${dateFilter}
    GROUP BY c.tenant_id, c.producto_id, p.nombre
    ORDER BY total_vendido DESC
    LIMIT ${limit}
  `;
}

function getMonthlyTrendsQuery(tenantId, startDate, endDate) {
  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = `AND fecha_compra BETWEEN '${startDate}' AND '${endDate}'`;
  }

  return `
    SELECT 
      tenant_id,
      year,
      month,
      COUNT(*) as compras_mes,
      SUM(precio_total) as ventas_mes,
      AVG(precio_total) as ticket_promedio,
      COUNT(DISTINCT usuario_id) as usuarios_activos
    FROM ${process.env.ATHENA_DATABASE}.compras
    WHERE tenant_id = '${tenantId}' ${dateFilter}
    GROUP BY tenant_id, year, month
    ORDER BY year, month
  `;
}

function getActiveUsersQuery(tenantId, startDate, endDate, limit) {
  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = `AND fecha_compra BETWEEN '${startDate}' AND '${endDate}'`;
  }

  return `
    SELECT 
      tenant_id,
      usuario_id,
      COUNT(*) as total_compras,
      SUM(precio_total) as total_gastado,
      AVG(precio_total) as promedio_gasto,
      MIN(fecha_compra) as primera_compra,
      MAX(fecha_compra) as ultima_compra
    FROM ${process.env.ATHENA_DATABASE}.compras
    WHERE tenant_id = '${tenantId}' ${dateFilter}
    GROUP BY tenant_id, usuario_id
    HAVING COUNT(*) >= 2
    ORDER BY total_gastado DESC
    LIMIT ${limit}
  `;
}

function getInventoryAnalysisQuery(tenantId) {
  return `
    SELECT 
      tenant_id,
      categoria,
      COUNT(*) as total_productos,
      SUM(stock) as stock_total,
      AVG(precio) as precio_promedio,
      MIN(precio) as precio_min,
      MAX(precio) as precio_max
    FROM ${process.env.ATHENA_DATABASE}.productos
    WHERE tenant_id = '${tenantId}' AND activo = true
    GROUP BY tenant_id, categoria
    ORDER BY categoria
  `;
}

async function generateCustomReport(tenantId, queryType, parameters) {
  // Lógica para generar reportes personalizados
  // Esto se puede extender según las necesidades específicas
  
  return {
    tenant_id: tenantId,
    query_type: queryType,
    parameters: parameters,
    generated_at: new Date().toISOString(),
    message: 'Custom report generation not implemented yet'
  };
}
