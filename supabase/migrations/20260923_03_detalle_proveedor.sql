-- =====================================================================
-- SEGUIMIENTO 360 — ORDEN DE EJECUCIÓN: 3 DE 3
-- Archivo: 20260923_03_detalle_proveedor.sql
-- Ejecutar DESPUÉS de 20260923_02_drop_proveedores.sql en el SQL Editor
-- de Supabase.
--
-- Propósito: nuevo modelo sin duplicar precios por proveedor. Cada canal
-- (IA, ALO, futuros) tiene UNA lista de precios con todos los materiales;
-- cada DETALLE indica a qué proveedor pertenece (el material "dice" de
-- quién es) vía pre_lista_precio_detalle.id_proveedor.
-- La carga de materiales NO crea listas (ver ensureProveedorChain_ en
-- js/supabase-client.js: autocreación LP-CAT desactivada 2026-09-23).
--
-- Idempotente: ADD COLUMN IF NOT EXISTS, FK vía pg_constraint y
-- CREATE INDEX IF NOT EXISTS. Re-ejecutable sin error exista o no la
-- columna. Sin backfill: los datos viejos se dropean igual (ver
-- 20260923_02_drop_proveedores.sql); NULL = detalle sin proveedor asignado.
--
-- Nombres verificados contra supabase/schema.sql: pre_lista_precio_detalle
-- (id_detalle_precio PK), mae_proveedores (id_proveedor PK VARCHAR(50)).
-- =====================================================================

-- Columna de proveedor por detalle (NULLable: no rompe filas existentes;
-- ON DELETE SET NULL: si se borra el proveedor, el detalle queda huérfano
-- pero conserva material+precio para trazabilidad).
ALTER TABLE pre_lista_precio_detalle
    ADD COLUMN IF NOT EXISTS id_proveedor VARCHAR(50)
    REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL;

-- FK idempotente: ADD COLUMN IF NOT EXISTS no crea el FK si la columna ya
-- existía sin constraint (re-runs parciales). Se declara vía pg_constraint
-- como en 20260923_01_canales_flujo.sql.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pre_detalle_proveedor') THEN
        -- Solo si la columna existe y el FK falta (evita error en BD fresca
        -- donde el ADD COLUMN anterior ya creó el FK implícito).
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pre_lista_precio_detalle' AND column_name = 'id_proveedor')
           AND NOT EXISTS (SELECT 1 FROM pg_constraint
                           WHERE conname = 'pre_lista_precio_detalle_id_proveedor_fkey') THEN
            ALTER TABLE pre_lista_precio_detalle
                ADD CONSTRAINT fk_pre_detalle_proveedor
                FOREIGN KEY (id_proveedor) REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Índice de apoyo para derivación de proveedor (gates abono/entrega y mapa
-- de ventas: prioridad detalle.id_proveedor > lista.id_proveedor > match).
CREATE INDEX IF NOT EXISTS idx_pre_detalle_proveedor
    ON pre_lista_precio_detalle(id_proveedor);
