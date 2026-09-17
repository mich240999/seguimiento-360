-- =====================================================================
-- SEGUIMIENTO 360 — Módulo Calendario de Entregas (CALENDARIO_ENTREGAS)
-- Entregas programadas por día para el personal de reparto.
-- Se ubica en OPERACIONES (orden 15), después de Ventas.
-- Idempotente: seguro de ejecutar más de una vez.
-- =====================================================================

-- 1. Registro del módulo
INSERT INTO app_modulos (id_modulo, codigo, nombre, descripcion, icono, grupo_menu, orden, tipo_vista, estado)
VALUES
    ('MOD-CAL-ENT', 'CALENDARIO_ENTREGAS', 'Calendario de Entregas', 'Entregas programadas por día para el personal de reparto', 'fas fa-calendar-days', 'OPERACIONES', 15, 'CALENDARIO', 'ACTIVO')
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    grupo_menu = EXCLUDED.grupo_menu,
    orden = EXCLUDED.orden,
    tipo_vista = EXCLUDED.tipo_vista,
    estado = EXCLUDED.estado;

-- 2. Recursos del módulo (visibles en la Matriz de Permisos)
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-CALENT-01', 'CALENDARIO_ENTREGAS', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-CALENT-02', 'CALENDARIO_ENTREGAS', 'VER_CALENDARIO', 'Ver calendario de entregas', 'ACCION', 20, 'ACTIVO'),
    ('RES-CALENT-03', 'CALENDARIO_ENTREGAS', 'EXPORTAR', 'Exportar calendario', 'ACCION', 30, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    estado = EXCLUDED.estado;

-- 3. Permisos: hereda la visibilidad de VENTAS_CONTADO.
-- Quien puede ver Ventas, puede ver el Calendario. No otorga nada nuevo
-- a roles que no tenían acceso a ventas.
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
SELECT
    'PERM-CALENT-' || p.id_sujeto || '-' || p.recurso,
    p.tipo_sujeto,
    p.id_sujeto,
    'CALENDARIO_ENTREGAS',
    CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_CALENDARIO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
        ELSE NULL
    END,
    p.permitido,
    p.alcance,
    p.estado
FROM seg_permisos p
WHERE p.modulo = 'VENTAS_CONTADO'
  AND p.estado = 'ACTIVO'
  AND p.permitido = TRUE
  AND p.recurso IN ('VISUALIZAR_MODULO', 'VER_LISTADO', 'EXPORTAR')
  AND CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_CALENDARIO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
      END IS NOT NULL
  AND LENGTH('PERM-CALENT-' || p.id_sujeto || '-' || p.recurso) <= 50
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;
