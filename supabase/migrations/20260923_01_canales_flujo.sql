-- =====================================================================
-- SEGUIMIENTO 360 — ORDEN DE EJECUCIÓN: 2 DE 2
-- Archivo: 20260923_01_canales_flujo.sql
-- Ejecutar DESPUÉS de 20260923_00_reset_comercial.sql en el SQL Editor
-- de Supabase.
--
-- Propósito: nuevo modelo de canales (ALO / IA) y empresas vendedoras,
-- trazabilidad de canal en listas/ventas, y roles+permisos del flujo.
-- Idempotente: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- constraints vía pg_constraint, seeds con ON CONFLICT. Re-ejecutable.
--
-- DECISIÓN ALCANCES: schema.sql documenta para seg_permisos.alcance los
-- valores TOTAL, PROVEEDOR, OFICINA, GRUPO, PROPIO (no existe GLOBAL en
-- el código). Todo pedido con alcance "GLOBAL" se siembra como TOTAL
-- (visibilidad máxima, equivalente funcional). PROVEEDOR y PROPIO se
-- respetan tal cual por ser valores válidos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Canales de venta
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ven_canales (
    id_canal VARCHAR(50) PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(120),
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ven_canales (id_canal, codigo, nombre, descripcion, estado)
VALUES
    ('CANAL-IA', 'IA', 'Instaladores Aliados',
     'Canal de instaladores aliados / gasodomésticos', 'ACTIVO'),
    ('CANAL-ALO', 'ALO', 'Aló Cálidda',
     'Canal de televentas Aló Cálidda', 'ACTIVO')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Empresas vendedoras (teles + instaladores). id_proveedor queda NULL
-- y se vincula cuando exista el proveedor en mae_proveedores.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ven_empresas (
    id_empresa VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ALO', 'IA')),
    id_canal VARCHAR(50) REFERENCES ven_canales(id_canal) ON DELETE SET NULL,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ven_empresas (id_empresa, nombre, tipo, id_canal, id_proveedor, estado)
VALUES
    ('EMP-IBR', 'IBR LATAM', 'ALO', 'CANAL-ALO', NULL, 'ACTIVO'),
    ('EMP-ABAI', 'ABAI', 'ALO', 'CANAL-ALO', NULL, 'ACTIVO'),
    ('EMP-ESTRATEK', 'ESTRATEK', 'ALO', 'CANAL-ALO', NULL, 'ACTIVO'),
    ('EMP-JUAN-SOL', 'Juan Soluciones', 'IA', 'CANAL-IA', NULL, 'ACTIVO'),
    ('EMP-HERMANOS-GALLO', 'Los Hermanos Gallo', 'IA', 'CANAL-IA', NULL, 'ACTIVO')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. RLS + política abierta (mismo patrón de schema.sql SECCIÓN 8:
-- ENABLE RLS + policy_all USING (true) WITH CHECK (true)).
-- Sin esto, con RLS habilitado la app leería cero filas de ven_*.
-- ---------------------------------------------------------------------
ALTER TABLE ven_canales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ven_empresas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ven_canales', 'ven_empresas'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_policy_all ON %I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY %I_policy_all ON %I FOR ALL USING (true) WITH CHECK (true);',
            tbl, tbl
        );
    END LOOP;
END $$;

-- Índices de apoyo para los FK de ven_empresas
CREATE INDEX IF NOT EXISTS idx_ven_empresas_canal ON ven_empresas(id_canal);
CREATE INDEX IF NOT EXISTS idx_ven_empresas_proveedor ON ven_empresas(id_proveedor);

-- ---------------------------------------------------------------------
-- 4. Columnas de trazabilidad de canal/empresa (NULLables: no rompen
-- filas existentes; ON DELETE SET NULL en sus FKs).
-- ---------------------------------------------------------------------
ALTER TABLE pre_listas_precios ADD COLUMN IF NOT EXISTS id_canal VARCHAR(50);
ALTER TABLE mae_proveedores ADD COLUMN IF NOT EXISTS id_canal_origen VARCHAR(50);
ALTER TABLE seg_usuarios ADD COLUMN IF NOT EXISTS id_empresa VARCHAR(50);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS id_canal VARCHAR(50);
ALTER TABLE vta_ventas_contado ADD COLUMN IF NOT EXISTS id_empresa_vendedora VARCHAR(50);

-- Columnas defensivas del flujo de precios (ya creadas por
-- 20260918_hana_precios.sql y 20260922_catalogo_proveedor.sql; se reafirman
-- con IF NOT EXISTS para que 00+01 sean autocontenidas sobre schema.sql
-- base, que no las trae. Sin esto, fee / es_catalogo fallarían en BD fresca).
ALTER TABLE pre_lista_precio_detalle ADD COLUMN IF NOT EXISTS fee NUMERIC(5, 2);
ALTER TABLE pre_lista_precio_detalle ADD COLUMN IF NOT EXISTS responsable_venta TEXT;
ALTER TABLE pre_listas_precios ADD COLUMN IF NOT EXISTS responsable_venta TEXT;
ALTER TABLE pre_listas_precios ADD COLUMN IF NOT EXISTS es_catalogo BOOLEAN DEFAULT FALSE;

-- FKs idempotentes (ADD COLUMN IF NOT EXISTS no crea el FK en re-runs,
-- por eso se declaran aquí vía pg_constraint).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pre_listas_precios_canal') THEN
        ALTER TABLE pre_listas_precios
            ADD CONSTRAINT fk_pre_listas_precios_canal
            FOREIGN KEY (id_canal) REFERENCES ven_canales(id_canal) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mae_proveedores_canal_origen') THEN
        ALTER TABLE mae_proveedores
            ADD CONSTRAINT fk_mae_proveedores_canal_origen
            FOREIGN KEY (id_canal_origen) REFERENCES ven_canales(id_canal) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seg_usuarios_empresa') THEN
        ALTER TABLE seg_usuarios
            ADD CONSTRAINT fk_seg_usuarios_empresa
            FOREIGN KEY (id_empresa) REFERENCES ven_empresas(id_empresa) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vta_ventas_canal') THEN
        ALTER TABLE vta_ventas_contado
            ADD CONSTRAINT fk_vta_ventas_canal
            FOREIGN KEY (id_canal) REFERENCES ven_canales(id_canal) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vta_ventas_empresa') THEN
        ALTER TABLE vta_ventas_contado
            ADD CONSTRAINT fk_vta_ventas_empresa
            FOREIGN KEY (id_empresa_vendedora) REFERENCES ven_empresas(id_empresa) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_listas_precios_canal ON pre_listas_precios(id_canal);
CREATE INDEX IF NOT EXISTS idx_mae_proveedores_canal_origen ON mae_proveedores(id_canal_origen);
CREATE INDEX IF NOT EXISTS idx_seg_usuarios_empresa ON seg_usuarios(id_empresa);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_canal ON vta_ventas_contado(id_canal);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_empresa ON vta_ventas_contado(id_empresa_vendedora);

-- ---------------------------------------------------------------------
-- 5. Roles nuevos (columnas verificadas en schema.sql/seed.sql:
-- id_rol, codigo UNIQUE, nombre, nivel, estado, sistema).
-- Niveles 65/55 libres (vecinos: GESTOR_ENTREGA 60, DESPACHADOR 50,
-- COORDINADOR_VENTAS 70). sistema=FALSE como DESPACHADOR (rol operativo).
-- ---------------------------------------------------------------------
INSERT INTO seg_roles (id_rol, codigo, nombre, descripcion, nivel, estado, sistema, usuario_creacion)
VALUES
    ('ROL-VALIDADOR-ABONO', 'VALIDADOR_ABONO', 'Validador de Abonos',
     'Confirma abonos de ventas contado con visibilidad total', 65, 'ACTIVO', FALSE, 'SISTEMA'),
    ('ROL-PROGRAMADOR', 'PROGRAMADOR', 'Programador de Entregas',
     'Programa entregas de su proveedor', 55, 'ACTIVO', FALSE, 'SISTEMA')
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    nivel = EXCLUDED.nivel,
    estado = 'ACTIVO';

-- ---------------------------------------------------------------------
-- 6. Recursos VENTAS_CONTADO (ya existen vía 20260911_permission_resources;
-- se reafirman por si el seed base no se ejecutó).
-- ---------------------------------------------------------------------
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-VTA-01', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-VTA-02', 'VENTAS_CONTADO', 'VER_LISTADO', 'Ver ventas', 'ACCION', 20, 'ACTIVO'),
    ('RES-VTA-03', 'VENTAS_CONTADO', 'VER_DETALLE', 'Ver detalle de venta', 'ACCION', 30, 'ACTIVO'),
    ('RES-VTA-04', 'VENTAS_CONTADO', 'REGISTRAR_VENTA', 'Registrar ventas', 'ACCION', 40, 'ACTIVO'),
    ('RES-VTA-06', 'VENTAS_CONTADO', 'CONFIRMAR_ABONO', 'Validar abonos', 'ACCION', 60, 'ACTIVO'),
    ('RES-VTA-07', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', 'Gestionar entregas', 'ACCION', 70, 'ACTIVO'),
    ('RES-VTA-08', 'VENTAS_CONTADO', 'CONFIRMAR_ENTREGA', 'Confirmar entregas', 'ACCION', 80, 'ACTIVO'),
    ('RES-MAT-12', 'MATERIALES_PRECIOS', 'EDITAR_FEE', 'Editar fee', 'ACCION', 95, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Permisos semilla (tipo_sujeto ROL, estado ACTIVO).
-- id_sujeto = codigo del rol (convención usada en migraciones previas,
-- p.ej. 'DESPACHADOR' en 20260919_despacho_en_ventas.sql).
-- GLOBAL pedido => TOTAL (ver nota de alcances arriba).
-- ---------------------------------------------------------------------
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
VALUES
    -- VENDEDOR: opera solo lo propio
    ('PERM-SEED-VEND-VIS', 'ROL', 'VENDEDOR', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-SEED-VEND-LIS', 'ROL', 'VENDEDOR', 'VENTAS_CONTADO', 'VER_LISTADO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-SEED-VEND-DET', 'ROL', 'VENDEDOR', 'VENTAS_CONTADO', 'VER_DETALLE', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-SEED-VEND-REG', 'ROL', 'VENDEDOR', 'VENTAS_CONTADO', 'REGISTRAR_VENTA', TRUE, 'PROPIO', 'ACTIVO'),
    -- VALIDADOR_ABONO: visibilidad total
    ('PERM-SEED-VABO-VIS', 'ROL', 'VALIDADOR_ABONO', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', TRUE, 'TOTAL', 'ACTIVO'),
    ('PERM-SEED-VABO-LIS', 'ROL', 'VALIDADOR_ABONO', 'VENTAS_CONTADO', 'VER_LISTADO', TRUE, 'TOTAL', 'ACTIVO'),
    ('PERM-SEED-VABO-DET', 'ROL', 'VALIDADOR_ABONO', 'VENTAS_CONTADO', 'VER_DETALLE', TRUE, 'TOTAL', 'ACTIVO'),
    ('PERM-SEED-VABO-CON', 'ROL', 'VALIDADOR_ABONO', 'VENTAS_CONTADO', 'CONFIRMAR_ABONO', TRUE, 'TOTAL', 'ACTIVO'),
    -- PROGRAMADOR: alcance de su proveedor
    ('PERM-SEED-PROG-VIS', 'ROL', 'PROGRAMADOR', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-PROG-LIS', 'ROL', 'PROGRAMADOR', 'VENTAS_CONTADO', 'VER_LISTADO', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-PROG-DET', 'ROL', 'PROGRAMADOR', 'VENTAS_CONTADO', 'VER_DETALLE', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-PROG-PRO', 'ROL', 'PROGRAMADOR', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', TRUE, 'PROVEEDOR', 'ACTIVO'),
    -- DESPACHADOR: alcance de su proveedor (5 recursos pedidos)
    ('PERM-SEED-DESP-VIS', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-DESP-LIS', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VER_LISTADO', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-DESP-DET', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VER_DETALLE', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-DESP-PRO', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', TRUE, 'PROVEEDOR', 'ACTIVO'),
    ('PERM-SEED-DESP-CON', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'CONFIRMAR_ENTREGA', TRUE, 'PROVEEDOR', 'ACTIVO')
ON CONFLICT (id_permiso) DO UPDATE
SET permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;

-- Normalización DESPACHADOR: la migración 20260919_despacho_en_ventas.sql
-- ya otorgó estos mismos 5 recursos (+EXPORTAR) en alcance PROPIO. Sin
-- este UPDATE quedarían dos filas por recurso (PROPIO + PROVEEDOR) y el
-- alcance efectivo dependería de cómo la app desempate. Se unifica a
-- PROVEEDOR según el modelo de canales. EXPORTAR se deja intacto.
-- SEGURO: solo convierte PROPIO->PROVEEDOR en filas ACTIVAS. La versión
-- anterior (alcance <> 'PROVEEDOR') habría degradado un eventual TOTAL a
-- PROVEEDOR y tocado filas INACTIVAS; por eso se restringe a
-- alcance='PROPIO' AND estado='ACTIVO'. Idempotente: el re-run no halla
-- filas PROPIO y actualiza 0.
UPDATE seg_permisos
SET alcance = 'PROVEEDOR'
WHERE tipo_sujeto = 'ROL'
  AND id_sujeto = 'DESPACHADOR'
  AND modulo = 'VENTAS_CONTADO'
  AND recurso IN ('VISUALIZAR_MODULO', 'VER_LISTADO', 'VER_DETALLE',
                  'PROGRAMAR_ENTREGA', 'CONFIRMAR_ENTREGA')
  AND alcance = 'PROPIO'
  AND estado = 'ACTIVO';
