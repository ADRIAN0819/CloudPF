const AWS = require('aws-sdk');
const { Client } = require('@elastic/elasticsearch');

const es = new Client({
  node: process.env.ELASTICSEARCH_ENDPOINT,
  auth: {
    username: 'admin',
    password: 'admin'
  }
});

exports.handler = async (event) => {
  console.log('Product Stream Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventSource !== 'aws:dynamodb') {
      continue;
    }

    const { eventName, dynamodb } = record;
    const tenantId = dynamodb.Keys.tenant_id.S;
    const productId = dynamodb.Keys.product_id.S;

    try {
      switch (eventName) {
        case 'INSERT':
          await handleInsert(tenantId, productId, dynamodb.NewImage);
          break;
        case 'MODIFY':
          await handleModify(tenantId, productId, dynamodb.NewImage, dynamodb.OldImage);
          break;
        case 'REMOVE':
          await handleRemove(tenantId, productId);
          break;
        default:
          console.log(`Unhandled event type: ${eventName}`);
      }
    } catch (error) {
      console.error('Error processing record:', error);
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Product stream processed successfully' })
  };
};

async function handleInsert(tenantId, productId, newImage) {
  console.log(`Inserting product ${productId} for tenant ${tenantId}`);
  
  const product = unmarshall(newImage);
  const indexName = `products-${tenantId}`;

  // Crear índice si no existe
  await ensureIndexExists(indexName);

  // Insertar producto en ElasticSearch
  await es.index({
    index: indexName,
    id: productId,
    body: {
      ...product,
      indexed_at: new Date().toISOString()
    }
  });

  console.log(`Product ${productId} indexed successfully`);
}

async function handleModify(tenantId, productId, newImage, oldImage) {
  console.log(`Modifying product ${productId} for tenant ${tenantId}`);
  
  const product = unmarshall(newImage);
  const indexName = `products-${tenantId}`;

  // Actualizar producto en ElasticSearch
  await es.update({
    index: indexName,
    id: productId,
    body: {
      doc: {
        ...product,
        updated_at: new Date().toISOString()
      }
    }
  });

  console.log(`Product ${productId} updated successfully`);
}

async function handleRemove(tenantId, productId) {
  console.log(`Removing product ${productId} for tenant ${tenantId}`);
  
  const indexName = `products-${tenantId}`;

  // Eliminar producto de ElasticSearch
  await es.delete({
    index: indexName,
    id: productId
  });

  console.log(`Product ${productId} removed successfully`);
}

async function ensureIndexExists(indexName) {
  const exists = await es.indices.exists({ index: indexName });
  
  if (!exists) {
    await es.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            tenant_id: { type: 'keyword' },
            product_id: { type: 'keyword' },
            nombre: { 
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            descripcion: { 
              type: 'text',
              analyzer: 'standard'
            },
            categoria: { type: 'keyword' },
            precio: { type: 'double' },
            stock: { type: 'integer' },
            activo: { type: 'boolean' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
            indexed_at: { type: 'date' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              fuzzy_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding']
              }
            }
          }
        }
      }
    });
    console.log(`Index ${indexName} created successfully`);
  }
}

function unmarshall(dynamoDbItem) {
  return AWS.DynamoDB.Converter.unmarshall(dynamoDbItem);
}
