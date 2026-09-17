-- =====================================================================
-- SEGUIMIENTO 360 — Módulo Despacho de Entregas (DESPACHO) + rol DESPACHADOR
-- Bandeja operativa de SOLO despacho: ventas PROGRAMADA y EN_RUTA con
-- alcance PROPIO por proveedor. Acciones: tomar despacho (→EN_RUTA) y
-- confirmar entrega (→ENTREGADA con evidencia).
-- Se ubica en OPERACIONES (orden 18), después del Calendario de Entregas.
-- Idempotente: seguro de ejecutar más de una vez.
-- =====================================================================

-- 1. Rol Despachador (nivel 50, no protegido por sistema)
INSERT INTO seg_roles (id_rol, codigo, nombre, descripcion, nivel, estado, sistema, usuario_creacion)
VALUES
    ('ROL-DESPACHADOR', 'DESPACHADOR', 'Despachador de Entregas', 'Toma despachos programados y confirma entregas con evidencia', 50, 'ACTIVO', FALSE, 'SISTEMA')
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    nivel = EXCLUDED.nivel,
    estado = EXCLUDED.estado,
    sistema = EXCLUDED.sistema;

-- 2. Registro del módulo
INSERT INTO app_modulos (id_modulo, codigo, nombre, descripcion, icono, grupo_menu, orden, tipo_vista, estado)
VALUES
    ('MOD-DESP', 'DESPACHO', 'Despacho de Entregas', 'Bandeja de despacho: ventas programadas y en ruta del proveedor propio', 'fas fa-truck-fast', 'OPERACIONES', 18, 'DESPACHO', 'ACTIVO')
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    grupo_menu = EXCLUDED.grupo_menu,
    orden = EXCLUDED.orden,
    tipo_vista = EXCLUDED.tipo_vista,
    estado = EXCLUDED.estado;

-- 3. Recursos del módulo (visibles en la Matriz de Permisos)
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-DESP-01', 'DESPACHO', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-DESP-02', 'DESPACHO', 'VER_DESPACHO', 'Ver despachos propios', 'ACCION', 20, 'ACTIVO'),
    ('RES-DESP-03', 'DESPACHO', 'GESTIONAR_DESPACHO', 'Tomar despachos y confirmar entregas', 'ACCION', 30, 'ACTIVO'),
    ('RES-DESP-04', 'DESPACHO', 'EXPORTAR', 'Exportar despacho', 'ACCION', 40, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    estado = EXCLUDED.estado;

-- 4. Permisos base del DESPACHADOR (alcance PROPIO: solo su proveedor)
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
VALUES
    ('PERM-DESP-DESPACHADOR-VIS', 'ROL', 'DESPACHADOR', 'DESPACHO', 'VISUALIZAR_MODULO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-DESP-DESPACHADOR-VER', 'ROL', 'DESPACHADOR', 'DESPACHO', 'VER_DESPACHO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-DESP-DESPACHADOR-GES', 'ROL', 'DESPACHADOR', 'DESPACHO', 'GESTIONAR_DESPACHO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-DESP-DESPACHADOR-EXP', 'ROL', 'DESPACHADOR', 'DESPACHO', 'EXPORTAR', TRUE, 'PROPIO', 'ACTIVO')
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;

-- 5. Herencia: los roles que gestionan entregas en VENTAS_CONTADO también
-- despachan. Solo alcanza a sujetos con PROGRAMAR_ENTREGA o
-- CONFIRMAR_ENTREGA (patrón calendario de entregas). No otorga nada nuevo
-- a roles sin acceso a entregas.
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
SELECT DISTINCT ON (p.tipo_sujeto, p.id_sujeto, CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_DESPACHO'
        WHEN 'PROGRAMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'CONFIRMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
    END)
    'PERM-DESP-' || p.id_sujeto || '-' ||
    CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_DESPACHO'
        WHEN 'PROGRAMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'CONFIRMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
        ELSE NULL
    END,
    p.tipo_sujeto,
    p.id_sujeto,
    'DESPACHO',
    CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_DESPACHO'
        WHEN 'PROGRAMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'CONFIRMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
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
  AND p.recurso IN ('VISUALIZAR_MODULO', 'VER_LISTADO', 'PROGRAMAR_ENTREGA', 'CONFIRMAR_ENTREGA', 'EXPORTAR')
  AND EXISTS (
    SELECT 1 FROM seg_permisos q
    WHERE q.modulo = 'VENTAS_CONTADO'
      AND q.estado = 'ACTIVO'
      AND q.permitido = TRUE
      AND q.tipo_sujeto = p.tipo_sujeto
      AND q.id_sujeto = p.id_sujeto
      AND q.recurso IN ('PROGRAMAR_ENTREGA', 'CONFIRMAR_ENTREGA')
  )
  AND CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_DESPACHO'
        WHEN 'PROGRAMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'CONFIRMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
      END IS NOT NULL
  AND LENGTH('PERM-DESP-' || p.id_sujeto || '-' || p.recurso) <= 50
ORDER BY p.tipo_sujeto, p.id_sujeto, CASE p.recurso
        WHEN 'VISUALIZAR_MODULO' THEN 'VISUALIZAR_MODULO'
        WHEN 'VER_LISTADO' THEN 'VER_DESPACHO'
        WHEN 'PROGRAMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'CONFIRMAR_ENTREGA' THEN 'GESTIONAR_DESPACHO'
        WHEN 'EXPORTAR' THEN 'EXPORTAR'
    END, p.recurso
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;

-- 6. Gestionar implica ver: segunda pasada que otorga VER_DESPACHO a
-- quienes programan o confirman entregas en ventas.
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
SELECT DISTINCT ON (p.tipo_sujeto, p.id_sujeto)
    'PERM-DESP-' || p.id_sujeto || '-VER_DESPACHO',
    p.tipo_sujeto,
    p.id_sujeto,
    'DESPACHO',
    'VER_DESPACHO',
    p.permitido,
    p.alcance,
    p.estado
FROM seg_permisos p
WHERE p.modulo = 'VENTAS_CONTADO'
  AND p.estado = 'ACTIVO'
  AND p.permitido = TRUE
  AND p.recurso IN ('PROGRAMAR_ENTREGA', 'CONFIRMAR_ENTREGA')
  AND LENGTH('PERM-DESP-' || p.id_sujeto || '-VER_DESPACHO') <= 50
ORDER BY p.tipo_sujeto, p.id_sujeto, p.recurso
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;
