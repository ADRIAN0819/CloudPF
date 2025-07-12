-- Query 1: Reporte de ventas por tenant
SELECT 
    tenant_id,
    COUNT(*) as total_compras,
    SUM(precio_total) as total_ventas,
    AVG(precio_total) as promedio_compra,
    MIN(fecha_compra) as primera_compra,
    MAX(fecha_compra) as ultima_compra
FROM cloudpf_dev.compras
WHERE year >= 2024
GROUP BY tenant_id
ORDER BY total_ventas DESC;

-- Query 2: Productos más vendidos por tenant
SELECT 
    c.tenant_id,
    c.producto_id,
    p.nombre as producto_nombre,
    SUM(c.cantidad) as total_vendido,
    SUM(c.precio_total) as ingresos_totales,
    COUNT(*) as numero_ventas
FROM cloudpf_dev.compras c
LEFT JOIN cloudpf_dev.productos p ON c.producto_id = p.product_id AND c.tenant_id = p.tenant_id
WHERE c.year >= 2024
GROUP BY c.tenant_id, c.producto_id, p.nombre
ORDER BY c.tenant_id, total_vendido DESC;

-- Query 3: Análisis de tendencias mensuales
SELECT 
    tenant_id,
    year,
    month,
    COUNT(*) as compras_mes,
    SUM(precio_total) as ventas_mes,
    AVG(precio_total) as ticket_promedio,
    COUNT(DISTINCT usuario_id) as usuarios_activos
FROM cloudpf_dev.compras
WHERE year >= 2024
GROUP BY tenant_id, year, month
ORDER BY tenant_id, year, month;

-- Query 4: Usuarios más activos
SELECT 
    tenant_id,
    usuario_id,
    COUNT(*) as total_compras,
    SUM(precio_total) as total_gastado,
    AVG(precio_total) as promedio_gasto,
    MIN(fecha_compra) as primera_compra,
    MAX(fecha_compra) as ultima_compra
FROM cloudpf_dev.compras
WHERE year >= 2024
GROUP BY tenant_id, usuario_id
HAVING COUNT(*) >= 5
ORDER BY tenant_id, total_gastado DESC;

-- Query 5: Análisis de inventario
SELECT 
    tenant_id,
    categoria,
    COUNT(*) as total_productos,
    SUM(stock) as stock_total,
    AVG(precio) as precio_promedio,
    MIN(precio) as precio_min,
    MAX(precio) as precio_max
FROM cloudpf_dev.productos
WHERE activo = true
GROUP BY tenant_id, categoria
ORDER BY tenant_id, categoria;
