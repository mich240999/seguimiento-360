-- Habilita las tablas que alimentan Administración > Auditoría en proyectos
-- existentes y permite su uso por usuarios autenticados de la aplicación.
-- La autorización funcional (solo ADMIN/SUPERADMIN puede cerrar) se valida en
-- el puente de la aplicación; esta política evita que RLS devuelva listas vacías.
ALTER TABLE IF EXISTS seg_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seg_auditoria_accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seg_auditoria_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seg_auditoria_permisos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['seg_sesiones', 'seg_auditoria_accesos', 'seg_auditoria_eventos', 'seg_auditoria_permisos']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tabla || '_app_access', tabla);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tabla || '_app_access', tabla);
  END LOOP;
END $$;
