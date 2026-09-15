-- =====================================================================
-- SEGUIMIENTO 360 — Módulo Dashboard de Ventas (DASHBOARD_VENTAS)
-- Tablero de solo lectura: ventas, abonos y entregas con filtros.
-- Se ubica primero en OPERACIONES (orden 5), entre la marca y Ventas.
-- Idempotente: seguro de ejecutar más de una vez.
-- =====================================================================

-- 1. Registro del módulo
INSERT INTO app_modulos (id_modulo, codigo, nombre, descripcion, icono, grupo_menu, orden, tipo_vista, estado)
VALUES
    ('MOD-DASH-VTA', 'DASHBOARD_VENTAS', 'Dashboard de Ventas', 'Tablero de ventas, abonos y entregas con filtros interactivos', 'fas fa-chart-line', 'OPERACIONES', 5, 'DASHBOARD', 'ACTIVO')
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
    ('RES-DASHVTA-01', 'DASHBOARD_VENTAS', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-DASHVTA-02', 'DASHBOARD_VENTAS', 'VER_RESUMEN', 'Ver indicadores y gráficos', 'ACCION', 20, 'ACTIVO'),
    ('RES-DASHVTA-03', 'DASHBOARD_VENTAS', 'EXPORTAR', 'Exportar dashboard', 'ACCION', 30, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    estado = EXCLUDED.estado;

-- 3. Permisos: hereda la visibilidad de VENTAS_CONTADO.
-- Quien puede ver Ventas, puede ver el Dashboard. No otorga nada nuevo
-- a roles que no tenían acceso a ventas.
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
SELECT
    'PERM-DASHVTA-' || p.id_sujeto || '-' || p.recurso,
    p.tipo_sujeto,
    p.id_sujeto,
    'DASHBOARD_VENTAS',
    CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_RESUMEN'
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
        WHEN 'VER_LISTADO' THEN 'VER_RESUMEN'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
      END IS NOT NULL
  AND LENGTH('PERM-DASHVTA-' || p.id_sujeto || '-' || p.recurso) <= 50
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;
