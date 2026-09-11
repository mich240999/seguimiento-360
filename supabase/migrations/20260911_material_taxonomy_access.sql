-- Permite que la aplicación autenticada consulte los catálogos reales usados
-- al registrar materiales. No inserta ni modifica datos maestros existentes.
ALTER TABLE IF EXISTS mae_negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mae_productos_principales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mae_tipos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mae_subtipos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mae_marcas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['mae_negocios', 'mae_productos_principales', 'mae_tipos_material', 'mae_subtipos_material', 'mae_marcas']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tabla || '_app_catalog_access', tabla);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tabla || '_app_catalog_access', tabla);
  END LOOP;
END $$;
