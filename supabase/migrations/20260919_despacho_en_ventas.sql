-- =====================================================================
-- SEGUIMIENTO 360 — Despacho dentro de Ventas (pestaña DESPACHO)
-- DECISIÓN DEL DUEÑO: Despacho NO es módulo aparte; vive en
-- VENTAS_CONTADO como pestaña junto a REGISTRADAS/ABONOS/ENTREGAS.
-- El rol DESPACHADOR se conserva y opera dicha pestaña.
-- 1) MOD-DESP pasa a INACTIVO (desaparece del menú).
-- 2) El rol DESPACHADOR recibe en VENTAS_CONTADO los recursos
--    VISUALIZAR_MODULO, VER_LISTADO, VER_DETALLE, PROGRAMAR_ENTREGA,
--    CONFIRMAR_ENTREGA y EXPORTAR (alcance PROPIO). Los recursos se
--    crean antes si no existen.
-- Idempotente: seguro de ejecutar más de una vez.
-- =====================================================================

-- 1. Recursos de VENTAS_CONTADO necesarios para la pestaña (crear si faltan).
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-VTA-01', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-VTA-02', 'VENTAS_CONTADO', 'VER_LISTADO', 'Ver ventas', 'ACCION', 20, 'ACTIVO'),
    ('RES-VTA-03', 'VENTAS_CONTADO', 'VER_DETALLE', 'Ver detalle de venta', 'ACCION', 30, 'ACTIVO'),
    ('RES-VTA-07', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', 'Gestionar entregas', 'ACCION', 70, 'ACTIVO'),
    ('RES-VTA-08', 'VENTAS_CONTADO', 'CONFIRMAR_ENTREGA', 'Confirmar entregas', 'ACCION', 80, 'ACTIVO'),
    ('RES-VTA-10', 'VENTAS_CONTADO', 'EXPORTAR', 'Exportar ventas', 'ACCION', 100, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    estado = 'ACTIVO';

-- 2. El módulo standalone deja de ofrecerse en el menú.
UPDATE app_modulos SET estado = 'INACTIVO' WHERE codigo = 'DESPACHO';

-- 3. El rol DESPACHADOR opera la pestaña Despacho dentro de Ventas.
INSERT INTO seg_permisos (id_permiso, tipo_sujeto, id_sujeto, modulo, recurso, permitido, alcance, estado)
VALUES
    ('PERM-VTA-DESPACHADOR-VIS', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VISUALIZAR_MODULO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-VTA-DESPACHADOR-LIS', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VER_LISTADO', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-VTA-DESPACHADOR-DET', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'VER_DETALLE', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-VTA-DESPACHADOR-PRO', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-VTA-DESPACHADOR-CON', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'CONFIRMAR_ENTREGA', TRUE, 'PROPIO', 'ACTIVO'),
    ('PERM-VTA-DESPACHADOR-EXP', 'ROL', 'DESPACHADOR', 'VENTAS_CONTADO', 'EXPORTAR', TRUE, 'PROPIO', 'ACTIVO')
ON CONFLICT (id_permiso) DO UPDATE SET
    permitido = EXCLUDED.permitido,
    alcance = EXCLUDED.alcance,
    estado = EXCLUDED.estado;
