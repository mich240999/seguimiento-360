-- SGT360 — Apellidos de usuario para trazabilidad con nombre completo.
-- Orden: después de 20260923_01 (no depende de ven_*). Idempotente.
-- Los registros existentes quedan con NULL (= se muestra solo el nombre);
-- los nuevos guardados llevan nombre + apellidos. Sin backfill: no se
-- puede separar nombre/apellidos históricos de forma fiable.
ALTER TABLE seg_usuarios ADD COLUMN IF NOT EXISTS apellidos VARCHAR(200);
