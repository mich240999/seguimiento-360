-- =====================================================================
-- CÁLIDDA 360 / SEGUIMIENTO 360 — DATOS SEMILLA INICIALES (SEED DATA)
-- Compatible con Supabase (PostgreSQL 15+)
-- =====================================================================

-- 1. Roles del Sistema
INSERT INTO seg_roles (id_rol, codigo, nombre, descripcion, nivel, estado, sistema, usuario_creacion)
VALUES 
    ('ROL-SUPERADMIN', 'SUPERADMIN', 'Superadministrador', 'Control total de la plataforma y configuración técnica', 100, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-ADMIN', 'ADMIN', 'Administrador General', 'Gestión de usuarios, auditoría, catálogos y módulos', 90, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-COORD-VENTAS', 'COORDINADOR_VENTAS', 'Coordinador de Ventas', 'Supervisión de pedidos, confirmación de abonos y asignaciones', 70, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-GESTOR-ENTREGA', 'GESTOR_ENTREGA', 'Gestor de Entregas', 'Programación, despacho y validación de evidencias de entrega', 60, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-PROVEEDOR', 'PROVEEDOR', 'Contratista / Proveedor', 'Consulta de listas de precios y gestión de pedidos asignados', 40, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-VENDEDOR', 'VENDEDOR', 'Asesor Comercial / Vendedor', 'Registro de ventas contado y seguimiento de cartera', 30, 'ACTIVO', TRUE, 'SISTEMA'),
    ('ROL-AUDITOR', 'AUDITOR', 'Auditor de Seguridad', 'Solo lectura de bitácoras, accesos y operaciones del sistema', 20, 'ACTIVO', TRUE, 'SISTEMA')
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- 2. Parámetros del Sistema
INSERT INTO sys_parametros (clave, valor, descripcion, tipo, editable, estado)
VALUES
    ('NOMBRE_APLICACION', 'Seguimiento 360', 'Nombre comercial visible de la plataforma', 'TEXTO', TRUE, 'ACTIVO'),
    ('VERSION_APLICACION', '2.5.0', 'Versión actual del sistema', 'TEXTO', FALSE, 'ACTIVO'),
    ('EMPRESA_TITULAR', 'Cálidda - Gas Natural de Lima y Callao', 'Razón social del titular del sistema', 'TEXTO', TRUE, 'ACTIVO'),
    ('MONEDA_DEFECTO', 'PEN', 'Moneda predeterminada para precios y ventas (PEN/USD)', 'TEXTO', TRUE, 'ACTIVO'),
    ('EXPIRACION_SESION_MINUTOS', '480', 'Tiempo de expiración de sesión por inactividad (8 horas)', 'NUMERO', TRUE, 'ACTIVO'),
    ('PERMITIR_REGISTRO_MULTIPLE_ITEMS', 'TRUE', 'Permite agregar múltiples gasodomésticos por solicitud', 'BOOLEANO', TRUE, 'ACTIVO'),
    ('ALERTA_ENTREGA_DIAS_LIMITE', '3', 'Días máximos para entrega antes de pasar a estado crítico', 'NUMERO', TRUE, 'ACTIVO')
ON CONFLICT (clave) DO NOTHING;

-- 3. Módulos del Sistema
INSERT INTO app_modulos (id_modulo, codigo, nombre, descripcion, icono, grupo_menu, orden, tipo_vista, estado)
VALUES
    ('MOD-SALES', 'VENTAS_CONTADO', 'Ventas y Seguimiento 360', 'Bandeja de pedidos, abonos, seguimiento y evidencias de entrega', 'fas fa-truck-ramp-box', 'OPERACIONES', 10, 'VENTAS', 'ACTIVO'),
    ('MOD-MP', 'MATERIALES_PRECIOS', 'Materiales y Precios', 'Catálogo maestro, gasodomésticos, listas de precios y solicitudes', 'fas fa-tags', 'OPERACIONES', 20, 'MATERIALES', 'ACTIVO'),
    ('MOD-PROV', 'PROVEEDORES', 'Proveedores y Sedes', 'Directorio de contratistas, canales de venta y cobertura', 'fas fa-handshake', 'GESTION', 30, 'PROVEEDORES', 'ACTIVO'),
    ('MOD-ADM-USR', 'ADMIN_USUARIOS', 'Usuarios y Seguridad', 'Gestión de cuentas, perfiles, asignación de roles y estados', 'fas fa-users-gear', 'ADMINISTRACION', 40, 'ADMINISTRACION', 'ACTIVO'),
    ('MOD-ADM-PERM', 'ADMIN_PERMISOS', 'Matriz de Permisos', 'Configuración de permisos por módulo, rol y alcances de visibilidad', 'fas fa-shield-halved', 'ADMINISTRACION', 50, 'ADMINISTRACION', 'ACTIVO'),
    ('MOD-ADM-CAT', 'ADMIN_CONFIG_APP', 'Configuración y Catálogos', 'Parámetros del sistema, catálogos maestros y recursos gráficos', 'fas fa-sliders', 'ADMINISTRACION', 60, 'ADMINISTRACION', 'ACTIVO'),
    ('MOD-ADM-AUD', 'ADMIN_AUDITORIA', 'Bitácora y Auditoría', 'Registro de accesos, trazabilidad de eventos y sesiones activas', 'fas fa-clock-rotate-left', 'ADMINISTRACION', 70, 'ADMINISTRACION', 'ACTIVO')
ON CONFLICT (codigo) DO NOTHING;

-- 4. Estructura Organizacional Inicial (Oficinas y Grupos)
INSERT INTO mae_oficinas (id_oficina, nombre, descripcion, estado)
VALUES
    ('OFI-LIMA-NORTE', 'Oficina Lima Norte', 'Sede Los Olivos, Comas, Independencia, SMP', 'ACTIVO'),
    ('OFI-LIMA-SUR', 'Oficina Lima Sur', 'Sede Villa El Salvador, SJM, VMT, Chorrillos', 'ACTIVO'),
    ('OFI-LIMA-CENTRO', 'Oficina Lima Centro', 'Sede Cercado, Breña, La Victoria, San Miguel', 'ACTIVO'),
    ('OFI-CALLAO', 'Oficina Callao', 'Sede Callao, Bellavista, Ventanilla', 'ACTIVO')
ON CONFLICT (id_oficina) DO NOTHING;

INSERT INTO mae_grupos (id_grupo, id_oficina, nombre, descripcion, estado)
VALUES
    ('GRP-NORTE-01', 'OFI-LIMA-NORTE', 'Grupo Ventas Hogar Norte A', 'Comercialización residencial', 'ACTIVO'),
    ('GRP-SUR-01', 'OFI-LIMA-SUR', 'Grupo Ventas Hogar Sur A', 'Comercialización residencial', 'ACTIVO'),
    ('GRP-CENTRO-01', 'OFI-LIMA-CENTRO', 'Grupo Ventas Centro', 'Comercialización residencial', 'ACTIVO')
ON CONFLICT (id_grupo) DO NOTHING;

-- 5. Proveedor Inicial
INSERT INTO mae_proveedores (id_proveedor, razon_social, nombre_comercial, codigo_sap, ruc, alcance_catalogo, estado)
VALUES
    ('PRV-CALIDDA-DIRECTO', 'CÁLIDDA OPERACIONES PROPIAS S.A.C.', 'Cálidda Directo', 'SAP-10001', '20508565434', 'TOTAL', 'ACTIVO'),
    ('PRV-CONTRATISTA-01', 'SERVICIOS INTEGRALES DE GAS PERÚ S.A.', 'SIGAS PERÚ', 'SAP-20045', '20601234567', 'TOTAL', 'ACTIVO')
ON CONFLICT (id_proveedor) DO NOTHING;

-- 6. Usuario Administrador Inicial
INSERT INTO seg_usuarios (id_usuario, correo, nombre, telefono, rol, id_proveedor, id_oficina, estado, tipo_documento, numero_documento)
VALUES
    ('USR-MICH', 'mich240999@gmail.com', 'Michael (Superadministrador)', '+51 999 999 999', 'SUPERADMIN', 'PRV-CALIDDA-DIRECTO', 'OFI-LIMA-CENTRO', 'ACTIVO', 'DNI', '70000001'),
    ('USR-SUPERADMIN', 'admin@calidda.com.pe', 'Administrador Cálidda 360', '+51 999 888 777', 'SUPERADMIN', 'PRV-CALIDDA-DIRECTO', 'OFI-LIMA-CENTRO', 'ACTIVO', 'DNI', '00000001'),
    ('USR-DEMO', 'usuario.demo@calidda.com.pe', 'Asesor Comercial Demo', '+51 987 654 321', 'VENDEDOR', 'PRV-CONTRATISTA-01', 'OFI-LIMA-NORTE', 'ACTIVO', 'DNI', '10203040')
ON CONFLICT (correo) DO NOTHING;

-- 7. Catálogos de Materiales (Negocios, Productos, Tipos, Marcas y Materiales Base)
INSERT INTO mae_negocios (id_negocio, codigo_negocio, nombre, descripcion, estado)
VALUES
    ('NEG-HOGAR', 'HOGAR', 'Operaciones Residenciales Hogar', 'Venta y financiamiento para viviendas', 'ACTIVO'),
    ('NEG-PYME', 'PYME', 'Comercial Pymes', 'Equipos para pequeños comercios y restaurantes', 'ACTIVO')
ON CONFLICT (codigo_negocio) DO NOTHING;

INSERT INTO mae_productos_principales (id_producto, id_negocio, codigo_producto, nombre, descripcion, estado)
VALUES
    ('PROD-COCINAS', 'NEG-HOGAR', 'COCINAS', 'Cocinas y Estufas a Gas', 'Línea de cocción residencial', 'ACTIVO'),
    ('PROD-TERMAS', 'NEG-HOGAR', 'TERMAS', 'Calentadores de Agua (Termas)', 'Línea de agua caliente', 'ACTIVO'),
    ('PROD-SECADORAS', 'NEG-HOGAR', 'SECADORAS', 'Secadoras a Gas', 'Línea de secado de ropa', 'ACTIVO')
ON CONFLICT (id_producto) DO NOTHING;

INSERT INTO mae_marcas (id_marca, codigo_marca, nombre, descripcion, estado)
VALUES
    ('MAR-MABE', 'MABE', 'Mabe', 'Gasodomésticos Mabe Perú', 'ACTIVO'),
    ('MAR-INDURAMA', 'INDURAMA', 'Indurama', 'Línea blanca y cocción Indurama', 'ACTIVO'),
    ('MAR-BOSCH', 'BOSCH', 'Bosch', 'Calentadores y termas Bosch', 'ACTIVO'),
    ('MAR-SOLE', 'SOLE', 'Sole', 'Termas y gasodomésticos Sole', 'ACTIVO')
ON CONFLICT (codigo_marca) DO NOTHING;

INSERT INTO mae_tipos_material (id_tipo_material, codigo_tipo, nombre, descripcion, estado)
VALUES
    ('TIP-COCINA-4H', 'COC-4H', 'Cocina 4 Hornillas', 'Cocina estándar de pie', 'ACTIVO'),
    ('TIP-TERMA-10L', 'TER-10L', 'Terma de Paso 10 Litros', 'Calentador continuo tiro natural', 'ACTIVO'),
    ('TIP-TERMA-5.5L', 'TER-5.5L', 'Terma de Paso 5.5 Litros', 'Calentador tiro natural compacto', 'ACTIVO')
ON CONFLICT (codigo_tipo) DO NOTHING;

INSERT INTO mae_materiales (id_material, codigo_material, codigo_sap, id_producto, id_tipo_material, id_marca, nombre_material, descripcion_material, es_gasodomestico, estado)
VALUES
    ('MAT-COC-001', 'MAB-COC-EM50', 'SAP-101122', 'PROD-COCINAS', 'TIP-COCINA-4H', 'MAR-MABE', 'Cocina Mabe 4 Hornillas Inox', 'Cocina de pie 4 quemadores encendido eléctrico inox', TRUE, 'ACTIVO'),
    ('MAT-TER-001', 'BOS-TER-10LT', 'SAP-102233', 'PROD-TERMAS', 'TIP-TERMA-10L', 'MAR-BOSCH', 'Calentador Bosch Therm 4200 10L GN', 'Calentador a gas natural modulante tiro natural', TRUE, 'ACTIVO'),
    ('MAT-TER-002', 'SOL-TER-06LT', 'SAP-102244', 'PROD-TERMAS', 'TIP-TERMA-5.5L', 'MAR-SOLE', 'Calentador Sole 5.5L GN Tiro Natural', 'Calentador compacto alta eficiencia gas natural', TRUE, 'ACTIVO')
ON CONFLICT (codigo_material) DO NOTHING;

-- 8. Lista de Precios Oficial Base
INSERT INTO pre_listas_precios (id_lista_precio, codigo_lista, nombre, id_proveedor, fecha_inicio, moneda, estado)
VALUES
    ('LP-2026-OFICIAL', 'LP-OFICIAL-2026', 'Lista Oficial Gasodomésticos Cálidda 2026', 'PRV-CALIDDA-DIRECTO', '2026-01-01', 'PEN', 'ACTIVA')
ON CONFLICT (codigo_lista) DO NOTHING;

INSERT INTO pre_lista_precio_detalle (id_detalle_precio, codigo_precio, id_lista_precio, id_material, precio_base, moneda, estado)
VALUES
    ('DET-PRE-001', 'PRC-001', 'LP-2026-OFICIAL', 'MAT-COC-001', 899.00, 'PEN', 'ACTIVO'),
    ('DET-PRE-002', 'PRC-002', 'LP-2026-OFICIAL', 'MAT-TER-001', 1150.00, 'PEN', 'ACTIVO'),
    ('DET-PRE-003', 'PRC-003', 'LP-2026-OFICIAL', 'MAT-TER-002', 680.00, 'PEN', 'ACTIVO')
ON CONFLICT (id_detalle_precio) DO NOTHING;

-- 9. Venta Contado de Demostración
INSERT INTO vta_ventas_contado (
    id_venta, codigo_venta, fecha_registro, tipo_venta, es_gasodomestico,
    id_usuario, correo_usuario, nombre_usuario, rol_usuario,
    id_proveedor, razon_social_proveedor, id_oficina, nombre_oficina,
    numero_solicitud_sap, codigo_suministro, tipo_documento_cliente, numero_documento_cliente,
    nombres_cliente, apellidos_cliente, telefono_contacto, distrito, direccion_instalacion,
    tipo_pago, numero_operacion_bancaria, banco_abono, fecha_abono, monto_abono, monto_total_venta,
    estado_abono, estado_entrega, estado_general
)
VALUES (
    'VTA-2026-0001', 'PED-360-1001', CURRENT_TIMESTAMP - INTERVAL '2 days', 'CONTADO', TRUE,
    'USR-DEMO', 'usuario.demo@calidda.com.pe', 'Asesor Comercial Demo', 'VENDEDOR',
    'PRV-CONTRATISTA-01', 'SIGAS PERÚ', 'OFI-LIMA-NORTE', 'Oficina Lima Norte',
    'SAP-908123', 'SUM-7845129', 'DNI', '45892147',
    'Carlos Alberto', 'Mendoza Quispe', '984512368', 'Los Olivos', 'Av. Las Palmeras 3450 Mz. C Lote 12',
    'TRANSFERENCIA', 'OP-BCP-9871234', 'BCP', CURRENT_DATE - 2, 899.00, 899.00,
    'ABONO_CONFIRMADO', 'PROGRAMADA', 'EN_PROCESO'
)
ON CONFLICT (codigo_venta) DO NOTHING;

INSERT INTO vta_ventas_contado_detalle (
    id_detalle_venta, id_venta, linea, id_material, codigo_material,
    codigo_sap, descripcion_material, cantidad, precio_unitario, precio_total
)
VALUES (
    'DET-VTA-001', 'VTA-2026-0001', 1, 'MAT-COC-001', 'MAB-COC-EM50',
    'SAP-101122', 'Cocina Mabe 4 Hornillas Inox', 1, 899.00, 899.00
)
ON CONFLICT (id_detalle_venta) DO NOTHING;

INSERT INTO vta_gestion_entrega (
    id_gestion_entrega, id_venta, id_proveedor, estado_entrega, fecha_programada_entrega
)
VALUES (
    'ENT-2026-0001', 'VTA-2026-0001', 'PRV-CONTRATISTA-01', 'PROGRAMADA', CURRENT_DATE + 1
)
ON CONFLICT (id_gestion_entrega) DO NOTHING;
