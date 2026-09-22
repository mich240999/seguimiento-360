-- SGT360 — Vaciado SOLO de proveedores y sus listas/solicitudes (carga limpia).
-- Ejecutar en el SQL Editor de Supabase. Idempotente y re-ejecutable.
-- NO toca: ventas ni gestiones (quedan como historial), usuarios, roles,
-- permisos, oficinas, grupos, materiales ni taxonomía.
-- Efectos automáticos por FK: vta_ventas_contado.id_proveedor,
-- vta_gestion_entrega.id_proveedor, seg_usuarios.id_proveedor y
-- ven_empresas.id_proveedor pasan a NULL (ON DELETE SET NULL).

-- 1. Detalles y cabeceras de listas de precios
DELETE FROM pre_lista_precio_detalle
WHERE id_lista_precio IN (SELECT id_lista_precio FROM pre_listas_precios);
DELETE FROM pre_listas_precios;

-- 2. Solicitudes de lista (detalle, historial, cabecera)
DELETE FROM pre_solicitudes_lista_precio_detalle;
DELETE FROM pre_solicitudes_lista_precio_historial;
DELETE FROM pre_solicitudes_lista_precio;

-- 3. Relaciones del proveedor
DELETE FROM rel_proveedor_oficinas;
DELETE FROM rel_proveedor_material;

-- 4. Proveedores
DELETE FROM mae_proveedores;
