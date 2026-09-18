-- =====================================================================
-- SEGUIMIENTO 360 — Catálogo único por proveedor (AGENTE A, 2026-09-22)
-- Cada proveedor debe tener UN catálogo (su contenedor de materiales+precios).
-- La carga masiva crea listas mensuales por upload; el catálogo (es_catalogo)
-- es la lista permanente que acumula todos los materiales del proveedor.
-- Idempotente: re-ejecutable sin errores ni marcas duplicadas.
-- =====================================================================

ALTER TABLE pre_listas_precios ADD COLUMN IF NOT EXISTS es_catalogo BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pre_listas_precios_catalogo
    ON pre_listas_precios(id_proveedor, es_catalogo);

-- Backfill: para cada proveedor sin catálogo marcado, marca su lista más
-- antigua (prioriza "Lista base%" / "Catálogo %") como es_catalogo = TRUE.
DO $$
DECLARE
  r RECORD;
  v_id VARCHAR(50);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_listas_precios' AND column_name = 'es_catalogo'
  ) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT id_proveedor FROM pre_listas_precios WHERE id_proveedor IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pre_listas_precios m
      WHERE m.id_proveedor = r.id_proveedor AND m.es_catalogo IS TRUE
    ) THEN
      SELECT p.id_lista_precio INTO v_id
      FROM pre_listas_precios p
      WHERE p.id_proveedor = r.id_proveedor
      ORDER BY
        CASE WHEN p.nombre ILIKE 'Lista base%' OR p.nombre ILIKE 'Catalogo %' OR p.nombre ILIKE 'Catálogo %' THEN 0 ELSE 1 END,
        p.fecha_inicio ASC NULLS LAST,
        p.fecha_creacion ASC NULLS LAST,
        p.id_lista_precio ASC
      LIMIT 1;
      IF v_id IS NOT NULL THEN
        UPDATE pre_listas_precios SET es_catalogo = TRUE WHERE id_lista_precio = v_id;
      END IF;
    END IF;
  END LOOP;
END
$$;
