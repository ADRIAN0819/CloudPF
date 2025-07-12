-- Crear base de datos en Athena
CREATE DATABASE IF NOT EXISTS cloudpf_dev;

-- Tabla para productos
CREATE EXTERNAL TABLE IF NOT EXISTS cloudpf_dev.productos (
  tenant_id string,
  product_id string,
  nombre string,
  descripcion string,
  categoria string,
  precio double,
  stock int,
  activo boolean,
  created_at timestamp,
  updated_at timestamp
)
PARTITIONED BY (
  year int,
  month int,
  day int
)
STORED AS PARQUET
LOCATION 's3://cloudpf-data-lake-dev/data-lake/products/'
TBLPROPERTIES (
  'projection.enabled'='true',
  'projection.year.type'='integer',
  'projection.year.range'='2023,2030',
  'projection.month.type'='integer',
  'projection.month.range'='1,12',
  'projection.day.type'='integer',
  'projection.day.range'='1,31',
  'storage.location.template'='s3://cloudpf-data-lake-dev/data-lake/products/year=${year}/month=${month}/day=${day}/'
);

-- Tabla para compras
CREATE EXTERNAL TABLE IF NOT EXISTS cloudpf_dev.compras (
  tenant_id string,
  purchase_id string,
  usuario_id string,
  producto_id string,
  cantidad int,
  precio_unitario double,
  precio_total double,
  fecha_compra timestamp,
  estado string,
  created_at timestamp,
  updated_at timestamp
)
PARTITIONED BY (
  year int,
  month int,
  day int
)
STORED AS PARQUET
LOCATION 's3://cloudpf-data-lake-dev/data-lake/purchases/'
TBLPROPERTIES (
  'projection.enabled'='true',
  'projection.year.type'='integer',
  'projection.year.range'='2023,2030',
  'projection.month.type'='integer',
  'projection.month.range'='1,12',
  'projection.day.type'='integer',
  'projection.day.range'='1,31',
  'storage.location.template'='s3://cloudpf-data-lake-dev/data-lake/purchases/year=${year}/month=${month}/day=${day}/'
);
