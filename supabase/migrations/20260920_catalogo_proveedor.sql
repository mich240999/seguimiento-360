-- =====================================================================
-- SEGUIMIENTO 360 — Valores de catálogo por proveedor
-- Los catálogos personalizados (app_catalogo_valores) pueden asignarse a
-- un proveedor (NULL = visible para todos). Los maestros MP_* siguen
-- siendo globales (taxonomía compartida).
-- Idempotente.
-- =====================================================================

ALTER TABLE app_catalogo_valores ADD COLUMN IF NOT EXISTS id_proveedor VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_catalogo_valores_proveedor
    ON app_catalogo_valores(catalogo, id_proveedor);
