-- =====================================================================
-- SEGUIMIENTO 360 — ORDEN DE EJECUCIÓN: 1 DE 2
-- Archivo: 20260923_00_reset_comercial.sql
-- Ejecutar PRIMERO en el SQL Editor de Supabase, antes de
-- 20260923_01_canales_flujo.sql.
--
-- Propósito: partir de cero el nuevo flujo comercial (canales ALO / IA).
-- Vacía las tablas operativas y de catálogo propias del flujo anterior.
-- Idempotente: TRUNCATE y UPDATE son re-ejecutables sin error.
--
-- Nombres de tabla verificados contra supabase/schema.sql (SECCIÓN 4 y 5).
-- NO toca: seg_roles, app_modulos, seg_permisos, sys_parametros,
-- filas de seg_usuarios, mae_negocios, mae_productos_principales,
-- mae_tipos_material, mae_subtipos_material, mae_marcas,
-- mae_oficinas, mae_grupos, mae_proveedores.
-- Tampoco toca ven_canales / ven_empresas (creadas por
-- 20260923_01_canales_flujo.sql): el reset preserva el catálogo de canales
-- en re-ejecuciones posteriores a 01.
-- =====================================================================

-- PASO 1: desvincular usuarios de la estructura anterior.
-- seg_usuarios.id_proveedor / id_oficina / id_grupo son NULLables
-- (FKs ON DELETE SET NULL en schema.sql), por lo que NULL es seguro.
UPDATE seg_usuarios
SET id_proveedor = NULL,
    id_oficina = NULL,
    id_grupo = NULL;

-- PASO 1b: desvincular empresa vendedora (columna creada por 01).
-- Defensivo: 00 se ejecuta PRIMERO (la columna aún no existe en ese
-- momento), así que solo se limpia si ya existe (re-runs tras 01).
-- Idempotente: re-ejecutable sin error exista o no la columna.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'seg_usuarios' AND column_name = 'id_empresa') THEN
        UPDATE seg_usuarios SET id_empresa = NULL WHERE id_empresa IS NOT NULL;
    END IF;
END $$;

-- PASO 2: vaciado FK-seguro (hojas primero, raíces al final).
-- Una sola sentencia TRUNCATE multi-tabla: Postgres resuelve el orden
-- interno entre las tablas listadas. SIN CASCADE a propósito: si una FK
-- apuntara a una tabla protegida (p.ej. mae_proveedores), la sentencia
-- falla en lugar de borrar datos protegidos.
-- RESTART IDENTITY reinicia el BIGSERIAL de
-- pre_solicitudes_lista_precio_historial (id_historial).
TRUNCATE TABLE
    vta_evidencias_entrega,
    vta_gestion_entrega,
    vta_ventas_contado_detalle,
    vta_ventas_contado,
    pre_solicitudes_lista_precio_historial,
    pre_solicitudes_lista_precio_detalle,
    pre_solicitudes_lista_precio,
    pre_lista_precio_detalle,
    pre_listas_precios,
    rel_proveedor_material,
    rel_negocio_material,
    rel_material_componentes,
    rel_proveedor_oficinas,
    mae_materiales
RESTART IDENTITY;
