-- =====================================================================
-- SEGUIMIENTO 360 — Trazabilidad por responsables + bono de vendedor
-- Quién efectuó la venta / aprobó el abono / programó / entregó, y
-- parámetro BONO_VENDEDOR_MONTO (monto por venta, hoy en cero).
-- Idempotente.
-- =====================================================================

ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS abono_aprobado_id VARCHAR(50);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS abono_aprobado_nombre VARCHAR(200);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS programado_id VARCHAR(50);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS programado_nombre VARCHAR(200);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS entregado_id VARCHAR(50);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS entregado_nombre VARCHAR(200);

INSERT INTO sys_parametros (clave, valor, descripcion, tipo, editable, estado)
VALUES
    ('BONO_VENDEDOR_MONTO', '0', 'Monto del bono que se lleva el vendedor por cada venta (PEN)', 'NUMERO', TRUE, 'ACTIVO')
ON CONFLICT (clave) DO NOTHING;
