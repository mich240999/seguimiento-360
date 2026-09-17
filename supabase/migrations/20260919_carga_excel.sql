-- =====================================================================
-- SEGUIMIENTO 360 — MIGRACION 20260919: RESERVA PARA CARGA EXCEL GSD
-- Agente 2. Idempotente: solo ADD COLUMN IF NOT EXISTS + comentarios.
-- No modifica ni elimina columnas existentes (no toca 20260918_*).
--
-- El parser GSD del frontend (js/modules/materials-prices.js, bloque
-- GSD-EXCEL) IGNORA las columnas de cuotas por plazo (0/6/9/12/18/24/36/
-- 48/60: montos derivados del PRECIO base) y graba el precio base con
-- vigencia mensual. Esta migración reserva cuotas_json para persistir
-- esas cuotas a futuro sin otra alteración de esquema.
-- =====================================================================

ALTER TABLE IF EXISTS pre_lista_precio_detalle
  ADD COLUMN IF NOT EXISTS cuotas_json TEXT;

COMMENT ON COLUMN pre_lista_precio_detalle.cuotas_json IS
'GSD Excel: reserva para las cuotas por plazo (0/6/9/12/18/24/36/48/60) como JSON {"6": 123.45, ...}. El parser actual las ignora y graba el precio base.';
