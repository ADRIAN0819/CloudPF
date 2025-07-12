#!/usr/bin/env node

const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');

// Configuración de ElasticSearch
const ES_ENDPOINTS = {
  dev: 'http://localhost:9200',
  test: 'https://vpc-cloudpf-test-xxxxx.us-east-1.es.amazonaws.com',
  prod: 'https://vpc-cloudpf-prod-xxxxx.us-east-1.es.amazonaws.com'
};

const STAGE = process.env.STAGE || 'dev';
const TENANT_IDS = process.env.TENANT_IDS ? process.env.TENANT_IDS.split(',') : ['tenant1', 'tenant2', 'tenant3'];

async function setupElasticsearch() {
  console.log(`Setting up ElasticSearch for stage: ${STAGE}`);
  
  const es = new Client({
    node: ES_ENDPOINTS[STAGE],
    auth: STAGE === 'dev' ? undefined : {
      username: process.env.ES_USERNAME || 'admin',
      password: process.env.ES_PASSWORD || 'admin'
    }
  });

  try {
    // Verificar conexión
    const health = await es.cluster.health();
    console.log(`ElasticSearch cluster health: ${health.status}`);

    // Crear índices para cada tenant
    for (const tenantId of TENANT_IDS) {
      await createProductsIndex(es, tenantId);
      await createPurchasesIndex(es, tenantId);
      await createIndexTemplates(es, tenantId);
    }

    console.log('ElasticSearch setup completed successfully!');
  } catch (error) {
    console.error('Error setting up ElasticSearch:', error);
    process.exit(1);
  }
}

async function createProductsIndex(es, tenantId) {
  const indexName = `products-${tenantId}`;
  
  const exists = await es.indices.exists({ index: indexName });
  if (exists) {
    console.log(`Index ${indexName} already exists, skipping...`);
    return;
  }

  const indexConfig = {
    index: indexName,
    body: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            fuzzy_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'stop']
            },
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'edge_ngram']
            }
          },
          filter: {
            edge_ngram: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20
            }
          }
        }
      },
      mappings: {
        properties: {
          tenant_id: { type: 'keyword' },
          product_id: { type: 'keyword' },
          nombre: { 
            type: 'text',
            analyzer: 'fuzzy_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              autocomplete: { 
                type: 'text',
                analyzer: 'autocomplete_analyzer'
              }
            }
          },
          descripcion: { 
            type: 'text',
            analyzer: 'fuzzy_analyzer',
            fields: {
              autocomplete: { 
                type: 'text',
                analyzer: 'autocomplete_analyzer'
              }
            }
          },
          categoria: { 
            type: 'keyword',
            fields: {
              text: { type: 'text' }
            }
          },
          precio: { type: 'double' },
          stock: { type: 'integer' },
          activo: { type: 'boolean' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          indexed_at: { type: 'date' }
        }
      }
    }
  };

  await es.indices.create(indexConfig);
  console.log(`Created products index: ${indexName}`);
}

async function createPurchasesIndex(es, tenantId) {
  const indexName = `purchases-${tenantId}`;
  
  const exists = await es.indices.exists({ index: indexName });
  if (exists) {
    console.log(`Index ${indexName} already exists, skipping...`);
    return;
  }

  const indexConfig = {
    index: indexName,
    body: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0
      },
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
  };

  await es.indices.create(indexConfig);
  console.log(`Created purchases index: ${indexName}`);
}

async function createIndexTemplates(es, tenantId) {
  // Template para índices de productos
  const productTemplate = {
    name: `products-${tenantId}-template`,
    body: {
      index_patterns: [`products-${tenantId}-*`],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              fuzzy_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'stop']
              }
            }
          }
        },
        mappings: {
          properties: {
            tenant_id: { type: 'keyword' },
            product_id: { type: 'keyword' },
            nombre: { 
              type: 'text',
              analyzer: 'fuzzy_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            descripcion: { 
              type: 'text',
              analyzer: 'fuzzy_analyzer'
            },
            categoria: { type: 'keyword' },
            precio: { type: 'double' },
            stock: { type: 'integer' },
            activo: { type: 'boolean' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
            indexed_at: { type: 'date' }
          }
        }
      }
    }
  };

  await es.indices.putIndexTemplate(productTemplate);
  console.log(`Created product index template for tenant: ${tenantId}`);

  // Template para índices de compras
  const purchaseTemplate = {
    name: `purchases-${tenantId}-template`,
    body: {
      index_patterns: [`purchases-${tenantId}-*`],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0
        },
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
    }
  };

  await es.indices.putIndexTemplate(purchaseTemplate);
  console.log(`Created purchase index template for tenant: ${tenantId}`);
}

// Ejecutar setup si se llama directamente
if (require.main === module) {
  setupElasticsearch().catch(console.error);
}

module.exports = { setupElasticsearch };
