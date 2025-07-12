#!/usr/bin/env node

// Script para configurar índices de búsqueda como alternativa a ElasticSearch
// Usa DynamoDB Global Secondary Index para búsquedas

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB({ region: 'us-east-1' });

const STAGE = process.env.STAGE || 'academy';
const PRODUCTS_TABLE = `Productos-${STAGE}`;
const PURCHASES_TABLE = `Compras-${STAGE}`;

async function setupSearchIndex() {
  console.log(`🔍 Configurando índices de búsqueda para stage: ${STAGE}`);
  
  try {
    // Configurar GSI para productos
    await setupProductsSearchIndex();
    
    // Configurar GSI para compras
    await setupPurchasesSearchIndex();
    
    console.log('✅ Índices de búsqueda configurados exitosamente');
  } catch (error) {
    console.error('❌ Error configurando índices:', error);
    process.exit(1);
  }
}

async function setupProductsSearchIndex() {
  console.log(`📦 Configurando índice de búsqueda para productos...`);
  
  try {
    // Verificar si la tabla existe
    const tableExists = await checkTableExists(PRODUCTS_TABLE);
    if (!tableExists) {
      console.log(`⚠️  Tabla ${PRODUCTS_TABLE} no existe, creándola...`);
      await createProductsTable();
    }
    
    // Verificar si ya tiene GSI
    const table = await dynamodb.describeTable({ TableName: PRODUCTS_TABLE }).promise();
    const hasSearchIndex = table.Table.GlobalSecondaryIndexes?.some(
      gsi => gsi.IndexName === 'SearchIndex'
    );
    
    if (!hasSearchIndex) {
      console.log('➕ Agregando GSI para búsqueda de productos...');
      await addProductsSearchGSI();
    } else {
      console.log('✅ GSI de búsqueda ya existe para productos');
    }
    
  } catch (error) {
    console.error('Error configurando índice de productos:', error);
    throw error;
  }
}

async function setupPurchasesSearchIndex() {
  console.log(`🛒 Configurando índice de búsqueda para compras...`);
  
  try {
    // Verificar si la tabla existe
    const tableExists = await checkTableExists(PURCHASES_TABLE);
    if (!tableExists) {
      console.log(`⚠️  Tabla ${PURCHASES_TABLE} no existe, creándola...`);
      await createPurchasesTable();
    }
    
    // Verificar si ya tiene GSI
    const table = await dynamodb.describeTable({ TableName: PURCHASES_TABLE }).promise();
    const hasSearchIndex = table.Table.GlobalSecondaryIndexes?.some(
      gsi => gsi.IndexName === 'UserPurchasesIndex'
    );
    
    if (!hasSearchIndex) {
      console.log('➕ Agregando GSI para búsqueda de compras...');
      await addPurchasesSearchGSI();
    } else {
      console.log('✅ GSI de búsqueda ya existe para compras');
    }
    
  } catch (error) {
    console.error('Error configurando índice de compras:', error);
    throw error;
  }
}

async function checkTableExists(tableName) {
  try {
    await dynamodb.describeTable({ TableName: tableName }).promise();
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createProductsTable() {
  const params = {
    TableName: PRODUCTS_TABLE,
    KeySchema: [
      { AttributeName: 'tenant_id', KeyType: 'HASH' },
      { AttributeName: 'product_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'tenant_id', AttributeType: 'S' },
      { AttributeName: 'product_id', AttributeType: 'S' },
      { AttributeName: 'categoria', AttributeType: 'S' },
      { AttributeName: 'nombre_lower', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SearchIndex',
        KeySchema: [
          { AttributeName: 'tenant_id', KeyType: 'HASH' },
          { AttributeName: 'categoria', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      },
      {
        IndexName: 'NameSearchIndex',
        KeySchema: [
          { AttributeName: 'tenant_id', KeyType: 'HASH' },
          { AttributeName: 'nombre_lower', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  };
  
  await dynamodb.createTable(params).promise();
  console.log(`✅ Tabla ${PRODUCTS_TABLE} creada con GSI`);
  
  // Esperar a que la tabla esté activa
  await waitForTableActive(PRODUCTS_TABLE);
}

async function createPurchasesTable() {
  const params = {
    TableName: PURCHASES_TABLE,
    KeySchema: [
      { AttributeName: 'tenant_id', KeyType: 'HASH' },
      { AttributeName: 'purchase_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'tenant_id', AttributeType: 'S' },
      { AttributeName: 'purchase_id', AttributeType: 'S' },
      { AttributeName: 'usuario_id', AttributeType: 'S' },
      { AttributeName: 'fecha_compra', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserPurchasesIndex',
        KeySchema: [
          { AttributeName: 'tenant_id', KeyType: 'HASH' },
          { AttributeName: 'usuario_id', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      },
      {
        IndexName: 'DateIndex',
        KeySchema: [
          { AttributeName: 'tenant_id', KeyType: 'HASH' },
          { AttributeName: 'fecha_compra', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  };
  
  await dynamodb.createTable(params).promise();
  console.log(`✅ Tabla ${PURCHASES_TABLE} creada con GSI`);
  
  // Esperar a que la tabla esté activa
  await waitForTableActive(PURCHASES_TABLE);
}

async function addProductsSearchGSI() {
  const params = {
    TableName: PRODUCTS_TABLE,
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: 'SearchIndex',
          KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'categoria', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          BillingMode: 'PAY_PER_REQUEST'
        }
      }
    ]
  };
  
  await dynamodb.updateTable(params).promise();
  console.log('✅ GSI agregado a tabla de productos');
}

async function addPurchasesSearchGSI() {
  const params = {
    TableName: PURCHASES_TABLE,
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: 'UserPurchasesIndex',
          KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'usuario_id', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          BillingMode: 'PAY_PER_REQUEST'
        }
      }
    ]
  };
  
  await dynamodb.updateTable(params).promise();
  console.log('✅ GSI agregado a tabla de compras');
}

async function waitForTableActive(tableName) {
  console.log(`⏳ Esperando a que la tabla ${tableName} esté activa...`);
  
  while (true) {
    const result = await dynamodb.describeTable({ TableName: tableName }).promise();
    const status = result.Table.TableStatus;
    
    if (status === 'ACTIVE') {
      console.log(`✅ Tabla ${tableName} está activa`);
      break;
    }
    
    console.log(`⏳ Estado actual: ${status}, esperando...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupSearchIndex().catch(console.error);
}

module.exports = { setupSearchIndex };
