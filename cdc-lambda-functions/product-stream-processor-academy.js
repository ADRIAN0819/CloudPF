const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('Product Stream Event (Academy):', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventSource !== 'aws:dynamodb') {
      continue;
    }

    const { eventName, dynamodb: dynamoRecord } = record;
    const tenantId = dynamoRecord.Keys.tenant_id.S;
    const productId = dynamoRecord.Keys.product_id.S;

    try {
      switch (eventName) {
        case 'INSERT':
          await handleInsert(tenantId, productId, dynamoRecord.NewImage);
          break;
        case 'MODIFY':
          await handleModify(tenantId, productId, dynamoRecord.NewImage, dynamoRecord.OldImage);
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
  
  // Para AWS Academy: Actualizar en DynamoDB GSI + S3
  await updateSearchIndex(tenantId, productId, product);
  await updateS3SearchIndex(tenantId, productId, product);
  
  console.log(`Product ${productId} indexed successfully`);
}

async function handleModify(tenantId, productId, newImage, oldImage) {
  console.log(`Modifying product ${productId} for tenant ${tenantId}`);
  
  const product = unmarshall(newImage);
  
  // Actualizar índices
  await updateSearchIndex(tenantId, productId, product);
  await updateS3SearchIndex(tenantId, productId, product);
  
  console.log(`Product ${productId} updated successfully`);
}

async function handleRemove(tenantId, productId) {
  console.log(`Removing product ${productId} for tenant ${tenantId}`);
  
  // Eliminar de índices
  await removeFromSearchIndex(tenantId, productId);
  await removeFromS3SearchIndex(tenantId, productId);
  
  console.log(`Product ${productId} removed successfully`);
}

// Alternativa 1: Usar DynamoDB GSI como índice de búsqueda
async function updateSearchIndex(tenantId, productId, product) {
  const searchTable = `ProductSearch-${process.env.STAGE || 'academy'}`;
  
  const searchItem = {
    tenant_id: tenantId,
    product_id: productId,
    search_key: `${product.nombre} ${product.descripcion} ${product.categoria}`.toLowerCase(),
    nombre: product.nombre,
    descripcion: product.descripcion,
    categoria: product.categoria,
    precio: product.precio,
    stock: product.stock,
    activo: product.activo,
    created_at: product.created_at,
    updated_at: new Date().toISOString(),
    indexed_at: new Date().toISOString()
  };
  
  try {
    await dynamodb.put({
      TableName: searchTable,
      Item: searchItem
    }).promise();
    
    console.log(`Product ${productId} indexed in DynamoDB search table`);
  } catch (error) {
    console.error('Error updating search index:', error);
    // Continuar con S3 como fallback
  }
}

// Alternativa 2: Usar S3 como índice de búsqueda
async function updateS3SearchIndex(tenantId, productId, product) {
  const s3Bucket = process.env.S3_BUCKET;
  const s3Key = `search-index/${tenantId}/products/${productId}.json`;
  
  const searchDocument = {
    tenant_id: tenantId,
    product_id: productId,
    nombre: product.nombre,
    descripcion: product.descripcion,
    categoria: product.categoria,
    precio: product.precio,
    stock: product.stock,
    activo: product.activo,
    search_terms: [
      product.nombre?.toLowerCase(),
      product.descripcion?.toLowerCase(),
      product.categoria?.toLowerCase()
    ].filter(Boolean),
    created_at: product.created_at,
    updated_at: new Date().toISOString(),
    indexed_at: new Date().toISOString()
  };
  
  try {
    await s3.putObject({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: JSON.stringify(searchDocument, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`Product ${productId} indexed in S3 search index`);
  } catch (error) {
    console.error('Error updating S3 search index:', error);
  }
}

async function removeFromSearchIndex(tenantId, productId) {
  const searchTable = `ProductSearch-${process.env.STAGE || 'academy'}`;
  
  try {
    await dynamodb.delete({
      TableName: searchTable,
      Key: {
        tenant_id: tenantId,
        product_id: productId
      }
    }).promise();
    
    console.log(`Product ${productId} removed from DynamoDB search table`);
  } catch (error) {
    console.error('Error removing from search index:', error);
  }
}

async function removeFromS3SearchIndex(tenantId, productId) {
  const s3Bucket = process.env.S3_BUCKET;
  const s3Key = `search-index/${tenantId}/products/${productId}.json`;
  
  try {
    await s3.deleteObject({
      Bucket: s3Bucket,
      Key: s3Key
    }).promise();
    
    console.log(`Product ${productId} removed from S3 search index`);
  } catch (error) {
    console.error('Error removing from S3 search index:', error);
  }
}

function unmarshall(dynamoDbItem) {
  return AWS.DynamoDB.Converter.unmarshall(dynamoDbItem);
}
