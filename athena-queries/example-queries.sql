-- Consultas de ejemplo para AWS Academy
-- Ejecutar en Athena Console después de que las Lambda functions generen datos

-- ====================================
-- 1. CONSULTAS DE PRODUCTOS
-- ====================================

-- Productos más populares por categoría
SELECT 
    product_category,
    product_name,
    COUNT(*) as total_sales,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_sale_amount
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY product_category, product_name
ORDER BY total_sales DESC
LIMIT 10;

-- Análisis de productos por status
SELECT 
    status,
    category,
    COUNT(*) as product_count,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price
FROM cloudpf_analytics_academy.products_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type IN ('product_created', 'product_updated')
    AND year = '2024'
GROUP BY status, category
ORDER BY product_count DESC;

-- Productos más caros por categoría
SELECT 
    category,
    name,
    price,
    status,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) as rank_in_category
FROM cloudpf_analytics_academy.products_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'product_created'
    AND year = '2024'
    AND status = 'active'
QUALIFY rank_in_category <= 3;

-- ====================================
-- 2. CONSULTAS DE VENTAS
-- ====================================

-- Ventas por día
SELECT 
    DATE_TRUNC('day', CAST(created_at AS timestamp)) as sale_date,
    COUNT(*) as total_sales,
    SUM(total_amount) as daily_revenue,
    AVG(total_amount) as avg_transaction_amount,
    COUNT(DISTINCT customer_email) as unique_customers
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
    AND month = '01'
GROUP BY DATE_TRUNC('day', CAST(created_at AS timestamp))
ORDER BY sale_date;

-- Ventas por hora del día
SELECT 
    EXTRACT(hour FROM CAST(created_at AS timestamp)) as hour_of_day,
    COUNT(*) as total_sales,
    SUM(total_amount) as hourly_revenue
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
    AND month = '01'
    AND day = '01'
GROUP BY EXTRACT(hour FROM CAST(created_at AS timestamp))
ORDER BY hour_of_day;

-- Análisis de ventas por categoría
SELECT 
    product_category,
    COUNT(*) as total_sales,
    SUM(total_amount) as category_revenue,
    AVG(total_amount) as avg_sale_amount,
    SUM(quantity) as total_quantity_sold
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY product_category
ORDER BY category_revenue DESC;

-- ====================================
-- 3. ANÁLISIS DE CLIENTES
-- ====================================

-- Clientes más activos
SELECT 
    customer_email,
    customer_name,
    COUNT(*) as total_purchases,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_purchase_amount,
    MIN(CAST(created_at AS timestamp)) as first_purchase,
    MAX(CAST(created_at AS timestamp)) as last_purchase
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY customer_email, customer_name
ORDER BY total_spent DESC
LIMIT 10;

-- Análisis de retención de clientes
WITH customer_months AS (
    SELECT 
        customer_email,
        DATE_TRUNC('month', CAST(created_at AS timestamp)) as purchase_month,
        COUNT(*) as purchases_in_month,
        SUM(total_amount) as spent_in_month
    FROM cloudpf_analytics_academy.purchases_analytics
    WHERE tenant_id = 'tenant-1'
        AND event_type = 'purchase_created'
        AND year = '2024'
    GROUP BY customer_email, DATE_TRUNC('month', CAST(created_at AS timestamp))
)
SELECT 
    purchase_month,
    COUNT(DISTINCT customer_email) as active_customers,
    SUM(purchases_in_month) as total_purchases,
    SUM(spent_in_month) as total_revenue
FROM customer_months
GROUP BY purchase_month
ORDER BY purchase_month;

-- ====================================
-- 4. ANÁLISIS DE ESTADO DE COMPRAS
-- ====================================

-- Distribución de estados de compras
SELECT 
    status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    SUM(total_amount) as total_amount
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year = '2024'
GROUP BY status
ORDER BY count DESC;

-- Análisis de cambios de estado
SELECT 
    event_type,
    status,
    COUNT(*) as event_count,
    SUM(total_amount) as total_amount_affected
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND year = '2024'
GROUP BY event_type, status
ORDER BY event_count DESC;

-- ====================================
-- 5. ANÁLISIS TEMPORAL
-- ====================================

-- Tendencias mensuales
SELECT 
    year,
    month,
    COUNT(*) as total_sales,
    SUM(total_amount) as monthly_revenue,
    COUNT(DISTINCT customer_email) as unique_customers,
    COUNT(DISTINCT product_id) as unique_products
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
GROUP BY year, month
ORDER BY year, month;

-- Comparación año sobre año (cuando tengas datos de múltiples años)
SELECT 
    month,
    SUM(CASE WHEN year = '2024' THEN total_amount ELSE 0 END) as revenue_2024,
    SUM(CASE WHEN year = '2023' THEN total_amount ELSE 0 END) as revenue_2023,
    COUNT(CASE WHEN year = '2024' THEN 1 END) as sales_2024,
    COUNT(CASE WHEN year = '2023' THEN 1 END) as sales_2023
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
    AND event_type = 'purchase_created'
    AND year IN ('2023', '2024')
GROUP BY month
ORDER BY month;

-- ====================================
-- 6. ANÁLISIS MULTI-TENANT
-- ====================================

-- Comparación entre tenants
SELECT 
    tenant_id,
    COUNT(*) as total_sales,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_sale_amount,
    COUNT(DISTINCT customer_email) as unique_customers,
    COUNT(DISTINCT product_id) as unique_products
FROM cloudpf_analytics_academy.purchases_analytics
WHERE event_type = 'purchase_created'
    AND year = '2024'
GROUP BY tenant_id
ORDER BY total_revenue DESC;

-- Top categorías por tenant
SELECT 
    tenant_id,
    product_category,
    COUNT(*) as sales_count,
    SUM(total_amount) as category_revenue,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY SUM(total_amount) DESC) as rank_in_tenant
FROM cloudpf_analytics_academy.purchases_analytics
WHERE event_type = 'purchase_created'
    AND year = '2024'
GROUP BY tenant_id, product_category
QUALIFY rank_in_tenant <= 3
ORDER BY tenant_id, rank_in_tenant;

-- ====================================
-- 7. ANÁLISIS DE RENDIMIENTO CDC
-- ====================================

-- Latencia de procesamiento
SELECT 
    event_type,
    DATE_TRUNC('hour', CAST(processed_at AS timestamp)) as processing_hour,
    COUNT(*) as events_processed,
    AVG(
        DATE_DIFF('second', 
            CAST(COALESCE(created_at, updated_at) AS timestamp), 
            CAST(processed_at AS timestamp)
        )
    ) as avg_processing_latency_seconds
FROM cloudpf_analytics_academy.purchases_analytics
WHERE year = '2024'
    AND month = '01'
    AND day = '01'
GROUP BY event_type, DATE_TRUNC('hour', CAST(processed_at AS timestamp))
ORDER BY processing_hour;

-- Volumen de eventos por tipo
SELECT 
    event_type,
    COUNT(*) as event_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM cloudpf_analytics_academy.purchases_analytics
WHERE year = '2024'
GROUP BY event_type
ORDER BY event_count DESC;

-- ====================================
-- 8. USANDO LA VISTA SALES_SUMMARY
-- ====================================

-- Resumen de ventas usando la vista
SELECT 
    product_category,
    SUM(total_sales) as category_sales,
    SUM(total_revenue) as category_revenue,
    AVG(avg_sale_amount) as avg_transaction,
    SUM(unique_customers) as total_unique_customers
FROM cloudpf_analytics_academy.sales_summary
WHERE tenant_id = 'tenant-1'
    AND sale_date >= DATE '2024-01-01'
    AND sale_date < DATE '2024-02-01'
GROUP BY product_category
ORDER BY category_revenue DESC;

-- Tendencia diaria usando la vista
SELECT 
    sale_date,
    SUM(total_sales) as daily_sales,
    SUM(total_revenue) as daily_revenue,
    SUM(unique_customers) as daily_unique_customers
FROM cloudpf_analytics_academy.sales_summary
WHERE tenant_id = 'tenant-1'
    AND sale_date >= DATE '2024-01-01'
    AND sale_date < DATE '2024-02-01'
GROUP BY sale_date
ORDER BY sale_date;

-- ====================================
-- 9. CONSULTAS DE OPTIMIZACIÓN
-- ====================================

-- Verificar particionamiento
SELECT 
    year,
    month,
    day,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM cloudpf_analytics_academy.purchases_analytics
WHERE tenant_id = 'tenant-1'
GROUP BY year, month, day
ORDER BY year, month, day;

-- Análisis de tamaño de datos
SELECT 
    year,
    month,
    COUNT(*) as record_count,
    COUNT(DISTINCT tenant_id) as tenant_count,
    COUNT(DISTINCT customer_email) as customer_count,
    COUNT(DISTINCT product_id) as product_count
FROM cloudpf_analytics_academy.purchases_analytics
GROUP BY year, month
ORDER BY year, month;
