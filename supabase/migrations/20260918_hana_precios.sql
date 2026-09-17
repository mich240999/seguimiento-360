-- =====================================================================
-- SEGUIMIENTO 360 — MIGRACION 20260918: COLUMNAS GSD HANA + PRECIOS
-- Excel GSD: N°, PROVEEDOR, MARCA, TIPO, SUBTIPO, INCLUYE_CONEXION,
-- CODIGO_HANA (= codigo_sap), PRODUCTO_PRINCIPAL, COMBO, COMENTARIOS,
-- FEE (% Calidda), PRECIO, meses 0/6/9/12/18/24/36/48/60,
-- Producto original, Combo original.
-- Idempotente: solo ADD COLUMN IF NOT EXISTS + comentarios/indices.
-- No modifica ni elimina columnas existentes.
-- =====================================================================

-- 1. MATERIALES (mae_materiales): columnas que faltaban del formato GSD.
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS proveedor TEXT;
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS incluye_conexion TEXT;
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS producto_principal TEXT;
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS combo TEXT;
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS codigo_hana TEXT;
ALTER TABLE IF EXISTS mae_materiales ADD COLUMN IF NOT EXISTS comentarios TEXT;

COMMENT ON COLUMN mae_materiales.proveedor IS 'GSD Excel PROVEEDOR (texto libre del formato).';
COMMENT ON COLUMN mae_materiales.incluye_conexion IS 'GSD Excel INCLUYE_CONEXION (SI/NO o texto del formato).';
COMMENT ON COLUMN mae_materiales.producto_principal IS 'GSD Excel PRODUCTO_PRINCIPAL (calculado en el formato).';
COMMENT ON COLUMN mae_materiales.combo IS 'GSD Excel COMBO (texto del formato).';
COMMENT ON COLUMN mae_materiales.codigo_hana IS 'GSD Excel CODIGO_HANA; equivale a codigo_sap y se mapea a el.';
COMMENT ON COLUMN mae_materiales.comentarios IS 'GSD Excel COMENTARIOS.';

CREATE INDEX IF NOT EXISTS idx_mae_materiales_codigo_hana ON mae_materiales(codigo_hana);
CREATE INDEX IF NOT EXISTS idx_mae_materiales_proveedor_txt ON mae_materiales(proveedor);

-- 2. PRECIOS: FEE (% que se lleva Calidda) a nivel de detalle;
-- RESPONSABLE_VENTA (al lado de proveedor) a nivel de detalle y de lista.
-- VIGENCIA mensual: FECHA_INICIO = dia 1 del mes de carga,
-- FECHA_FIN = ultimo dia de ese mes (al mes siguiente se cargan nuevos).
ALTER TABLE IF EXISTS pre_lista_precio_detalle ADD COLUMN IF NOT EXISTS fee NUMERIC(5, 2);
ALTER TABLE IF EXISTS pre_lista_precio_detalle ADD COLUMN IF NOT EXISTS responsable_venta TEXT;
ALTER TABLE IF EXISTS pre_listas_precios ADD COLUMN IF NOT EXISTS responsable_venta TEXT;

COMMENT ON COLUMN pre_lista_precio_detalle.fee IS 'GSD Excel FEE: % que se lleva Calidda por la venta. Oculto al rol PROVEEDOR en la app.';
COMMENT ON COLUMN pre_lista_precio_detalle.responsable_venta IS 'GSD Excel RESPONSABLE_VENTA, columna nueva al lado de PROVEEDOR.';
COMMENT ON COLUMN pre_listas_precios.responsable_venta IS 'Responsable de venta por defecto de la lista (cabecera).';

CREATE INDEX IF NOT EXISTS idx_pre_detalle_fee ON pre_lista_precio_detalle(fee);
