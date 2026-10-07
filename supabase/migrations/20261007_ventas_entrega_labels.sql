-- =====================================================================
-- SEGUIMIENTO 360 — Etiquetas claras de entrega en VENTAS_CONTADO
-- Las matrices de permisos (por rol y por usuario) muestran el nombre del
-- recurso: "Programar entrega" y "Confirmar entrega (despacho)" para que
-- sean ubicables. El despacho vive como pestana de VENTAS_CONTADO, no como
-- modulo aparte. Idempotente: seguro de ejecutar mas de una vez.
-- =====================================================================

-- 1. Recursos de entrega de VENTAS_CONTADO (crear si faltan, renombrar si existen).
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-VTA-07', 'VENTAS_CONTADO', 'PROGRAMAR_ENTREGA', 'Programar entrega', 'ACCION', 70, 'ACTIVO'),
    ('RES-VTA-08', 'VENTAS_CONTADO', 'CONFIRMAR_ENTREGA', 'Confirmar entrega (despacho)', 'ACCION', 80, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    estado = 'ACTIVO';

-- 2. Recursos del modulo DESPACHO (solo visibles si el modulo esta ACTIVO;
--    en produccion esta INACTIVO porque el despacho es pestana de Ventas).
--    No se cambia el estado del modulo.
INSERT INTO seg_recursos (id_recurso, modulo, codigo, nombre, tipo, orden, estado)
VALUES
    ('RES-DESP-01', 'DESPACHO', 'VISUALIZAR_MODULO', 'Visualizar módulo', 'MODULO', 10, 'ACTIVO'),
    ('RES-DESP-02', 'DESPACHO', 'VER_DESPACHO', 'Ver despachos', 'ACCION', 20, 'ACTIVO'),
    ('RES-DESP-03', 'DESPACHO', 'GESTIONAR_DESPACHO', 'Despachar: tomar y confirmar entregas', 'ACCION', 30, 'ACTIVO'),
    ('RES-DESP-04', 'DESPACHO', 'EXPORTAR', 'Exportar despacho', 'ACCION', 40, 'ACTIVO')
ON CONFLICT (modulo, codigo) DO NOTHING;
