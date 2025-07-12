const AWS = require('aws-sdk');
const { Client } = require('@elastic/elasticsearch');
const { Parser } = require('json2csv');
const moment = require('moment');

const s3 = new AWS.S3();
const es = new Client({
  node: process.env.ELASTICSEARCH_ENDPOINT,
  auth: {
    username: 'admin',
    password: 'admin'
  }
});

exports.handler = async (event) => {
  console.log('Purchase Stream Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventSource !== 'aws:dynamodb') {
      continue;
    }

    const { eventName, dynamodb } = record;
    const tenantId = dynamodb.Keys.tenant_id.S;
    const purchaseId = dynamodb.Keys.purchase_id.S;

    try {
      switch (eventName) {
        case 'INSERT':
          await handleInsert(tenantId, purchaseId, dynamodb.NewImage);
          break;
        case 'MODIFY':
          await handleModify(tenantId, purchaseId, dynamodb.NewImage, dynamodb.OldImage);
          break;
        case 'REMOVE':
          await handleRemove(tenantId, purchaseId);
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
    body: JSON.stringify({ message: 'Purchase stream processed successfully' })
  };
};

async function handleInsert(tenantId, purchaseId, newImage) {
  console.log(`Processing new purchase ${purchaseId} for tenant ${tenantId}`);
  
  const purchase = unmarshall(newImage);
  
  // 1. Indexar en ElasticSearch
  await indexPurchaseInElasticsearch(tenantId, purchaseId, purchase);
  
  // 2. Generar archivo CSV y JSON en S3
  await generateDataFiles(tenantId, purchase);
  
  console.log(`Purchase ${purchaseId} processed successfully`);
}

async function handleModify(tenantId, purchaseId, newImage, oldImage) {
  console.log(`Modifying purchase ${purchaseId} for tenant ${tenantId}`);
  
  const purchase = unmarshall(newImage);
  
  // Actualizar en ElasticSearch
  await updatePurchaseInElasticsearch(tenantId, purchaseId, purchase);
  
  console.log(`Purchase ${purchaseId} updated successfully`);
}

async function handleRemove(tenantId, purchaseId) {
  console.log(`Removing purchase ${purchaseId} for tenant ${tenantId}`);
  
  // Eliminar de ElasticSearch
  await removePurchaseFromElasticsearch(tenantId, purchaseId);
  
  console.log(`Purchase ${purchaseId} removed successfully`);
}

async function indexPurchaseInElasticsearch(tenantId, purchaseId, purchase) {
  const indexName = `purchases-${tenantId}`;
  
  // Crear índice si no existe
  await ensureIndexExists(indexName);
  
  // Indexar compra
  await es.index({
    index: indexName,
    id: purchaseId,
    body: {
      ...purchase,
      indexed_at: new Date().toISOString()
    }
  });
}

async function updatePurchaseInElasticsearch(tenantId, purchaseId, purchase) {
  const indexName = `purchases-${tenantId}`;
  
  await es.update({
    index: indexName,
    id: purchaseId,
    body: {
      doc: {
        ...purchase,
        updated_at: new Date().toISOString()
      }
    }
  });
}

async function removePurchaseFromElasticsearch(tenantId, purchaseId) {
  const indexName = `purchases-${tenantId}`;
  
  await es.delete({
    index: indexName,
    id: purchaseId
  });
}

async function generateDataFiles(tenantId, purchase) {
  const timestamp = moment().format('YYYY-MM-DD-HH-mm-ss');
  const s3Bucket = process.env.S3_BUCKET;
  
  // Generar archivo CSV
  const csvFields = [
    'tenant_id', 'purchase_id', 'usuario_id', 'producto_id', 
    'cantidad', 'precio_unitario', 'precio_total', 'fecha_compra'
  ];
  
  const csvParser = new Parser({ fields: csvFields });
  const csvData = csvParser.parse([purchase]);
  
  // Subir CSV a S3
  const csvKey = `data-lake/${tenantId}/purchases/csv/year=${moment().format('YYYY')}/month=${moment().format('MM')}/day=${moment().format('DD')}/purchase-${timestamp}.csv`;
  
  await s3.putObject({
    Bucket: s3Bucket,
    Key: csvKey,
    Body: csvData,
    ContentType: 'text/csv'
  }).promise();
  
  // Generar archivo JSON
  const jsonKey = `data-lake/${tenantId}/purchases/json/year=${moment().format('YYYY')}/month=${moment().format('MM')}/day=${moment().format('DD')}/purchase-${timestamp}.json`;
  
  await s3.putObject({
    Bucket: s3Bucket,
    Key: jsonKey,
    Body: JSON.stringify(purchase, null, 2),
    ContentType: 'application/json'
  }).promise();
  
  console.log(`Data files generated: ${csvKey}, ${jsonKey}`);
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
            purchase_id: { type: 'keyword' },
            usuario_id: { type: 'keyword' },
            producto_id: { type: 'keyword' },
            cantidad: { type: 'integer' },
            precio_unitario: { type: 'double' },
            precio_total: { type: 'double' },
            fecha_compra: { type: 'date' },
            estado: { type: 'keyword' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
            indexed_at: { type: 'date' }
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
