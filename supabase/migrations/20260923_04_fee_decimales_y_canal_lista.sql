-- =====================================================================
-- SEGUIMIENTO 360 — ORDEN DE EJECUCIÓN: 4 DE 4
-- Archivo: 20260923_04_fee_decimales_y_canal_lista.sql
-- Propósito: 
-- 1. Ampliar pre_lista_precio_detalle.fee a NUMERIC(7, 3) para admitir
--    fees con hasta 3 decimales (ej. 3.125 %, 0.125 %, etc.).
-- 2. Asegurar que pre_listas_precios.id_proveedor sea NULLable para
--    listas de canal (ej. Lista IA / Lista Aló Cálidda) donde el proveedor
--    reside a nivel de detalle (pre_lista_precio_detalle.id_proveedor).
-- =====================================================================

-- 1. Ampliar fee a NUMERIC(7, 3) (permite hasta 9999.999, cubriendo holgadamente 0 a 100 %)
ALTER TABLE pre_lista_precio_detalle
    ALTER COLUMN fee TYPE NUMERIC(7, 3);

-- 2. Asegurar que id_proveedor en cabecera de listas no sea NOT NULL
ALTER TABLE pre_listas_precios
    ALTER COLUMN id_proveedor DROP NOT NULL;

-- 3. Confirmar que id_proveedor en pre_lista_precio_detalle exista con índice
ALTER TABLE pre_lista_precio_detalle
    ADD COLUMN IF NOT EXISTS id_proveedor VARCHAR(50)
    REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pre_detalle_fee ON pre_lista_precio_detalle(fee);
CREATE INDEX IF NOT EXISTS idx_pre_detalle_proveedor ON pre_lista_precio_detalle(id_proveedor);
