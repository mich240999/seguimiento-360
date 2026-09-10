-- =====================================================================
-- CÁLIDDA 360 / SEGUIMIENTO 360 — SUPABASE POSTGRESQL SCHEMA COMPLETO
-- Versión compatible con Supabase (PostgreSQL 15+)
-- =====================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función de actualización automática de fecha_actualizacion
CREATE OR REPLACE FUNCTION set_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SECCIÓN 1: CONFIGURACIÓN Y CATÁLOGOS DEL SISTEMA
-- =====================================================================

CREATE TABLE IF NOT EXISTS sys_parametros (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'TEXTO',
    editable BOOLEAN DEFAULT TRUE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_modulos (
    id_modulo VARCHAR(50) PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(100),
    grupo_menu VARCHAR(50) DEFAULT 'OPERACIONES',
    orden INT DEFAULT 1,
    tipo_vista VARCHAR(50) DEFAULT 'ESTANDAR',
    base_alias VARCHAR(50) DEFAULT 'OPERATION',
    hoja_datos VARCHAR(100),
    campo_clave VARCHAR(50),
    campo_estado VARCHAR(50),
    campo_usuario VARCHAR(50),
    campo_proveedor VARCHAR(50),
    campo_grupo VARCHAR(50),
    administrable BOOLEAN DEFAULT TRUE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_campos (
    id_campo VARCHAR(50) PRIMARY KEY,
    modulo VARCHAR(50) REFERENCES app_modulos(codigo) ON DELETE CASCADE,
    campo VARCHAR(100) NOT NULL,
    etiqueta VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'TEXTO',
    obligatorio BOOLEAN DEFAULT FALSE,
    visible_tabla BOOLEAN DEFAULT TRUE,
    visible_formulario BOOLEAN DEFAULT TRUE,
    editable BOOLEAN DEFAULT TRUE,
    buscable BOOLEAN DEFAULT TRUE,
    catalogo VARCHAR(50),
    orden INT DEFAULT 1,
    ancho VARCHAR(20),
    ayuda TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_acciones (
    id_accion VARCHAR(50) PRIMARY KEY,
    modulo VARCHAR(50) REFERENCES app_modulos(codigo) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'BOTON',
    operacion_rpc VARCHAR(100),
    confirmacion BOOLEAN DEFAULT FALSE,
    orden INT DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_catalogos (
    id_catalogo VARCHAR(50) PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_catalogo_valores (
    id_valor VARCHAR(50) PRIMARY KEY,
    catalogo VARCHAR(50) REFERENCES app_catalogos(codigo) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    orden INT DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(catalogo, codigo)
);

CREATE TABLE IF NOT EXISTS adm_recursos_visuales (
    id_recurso VARCHAR(50) PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'IMAGEN',
    id_archivo TEXT,
    url_publica TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- SECCIÓN 2: ESTRUCTURA ORGANIZACIONAL Y PROVEEDORES
-- =====================================================================

CREATE TABLE IF NOT EXISTS mae_proveedores (
    id_proveedor VARCHAR(50) PRIMARY KEY,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    nombre VARCHAR(200),
    codigo_sap VARCHAR(50),
    ruc VARCHAR(20),
    descripcion TEXT,
    alcance_catalogo VARCHAR(50) DEFAULT 'TOTAL',
    codigo_canales_venta TEXT,
    codigo_grupos_vendedores TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    usuario_creacion VARCHAR(150),
    usuario_modificacion VARCHAR(150),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_oficinas (
    id_oficina VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_grupos (
    id_grupo VARCHAR(50) PRIMARY KEY,
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS rel_proveedor_oficinas (
    id_relacion VARCHAR(50) PRIMARY KEY,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE CASCADE,
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE CASCADE,
    ids_grupo TEXT,
    alcance_grupos VARCHAR(50) DEFAULT 'TODOS',
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

-- =====================================================================
-- SECCIÓN 3: SEGURIDAD, ROLES, PERMISOS Y SESIONES
-- =====================================================================

CREATE TABLE IF NOT EXISTS seg_roles (
    id_rol VARCHAR(50) PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    nivel INT DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    sistema BOOLEAN DEFAULT FALSE,
    usuario_creacion VARCHAR(150),
    usuario_modificacion VARCHAR(150),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seg_usuarios (
    id_usuario VARCHAR(50) PRIMARY KEY,
    correo VARCHAR(200) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(50),
    rol VARCHAR(50) REFERENCES seg_roles(codigo) ON DELETE SET NULL,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL,
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE SET NULL,
    id_grupo VARCHAR(50) REFERENCES mae_grupos(id_grupo) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    tipo_documento VARCHAR(20) DEFAULT 'DNI',
    numero_documento VARCHAR(30),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS seg_recursos (
    id_recurso VARCHAR(50) PRIMARY KEY,
    modulo VARCHAR(50) NOT NULL,
    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'ACCION',
    padre VARCHAR(100),
    orden INT DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(modulo, codigo)
);

CREATE TABLE IF NOT EXISTS seg_permisos (
    id_permiso VARCHAR(50) PRIMARY KEY,
    tipo_sujeto VARCHAR(20) DEFAULT 'ROL', -- ROL o USUARIO
    id_sujeto VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    recurso VARCHAR(100) NOT NULL,
    permitido BOOLEAN DEFAULT TRUE,
    alcance VARCHAR(50) DEFAULT 'PROPIO', -- TOTAL, PROVEEDOR, OFICINA, GRUPO, PROPIO
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS seg_sesiones (
    id_sesion VARCHAR(100) PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES seg_usuarios(id_usuario) ON DELETE CASCADE,
    correo VARCHAR(200) NOT NULL,
    rol VARCHAR(50),
    fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ultima_actividad TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMPTZ,
    estado VARCHAR(20) DEFAULT 'ACTIVA', -- ACTIVA, CERRADA, EXPIRADA
    modulo_actual VARCHAR(50),
    origen VARCHAR(100),
    user_agent TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seg_auditoria_accesos (
    id_auditoria_acceso BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario VARCHAR(50),
    correo VARCHAR(200),
    rol VARCHAR(50),
    modulo VARCHAR(50),
    accion VARCHAR(100),
    resultado VARCHAR(50),
    motivo TEXT,
    origen VARCHAR(100),
    id_sesion VARCHAR(100),
    detalle JSONB
);

CREATE TABLE IF NOT EXISTS seg_auditoria_eventos (
    id_evento BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario VARCHAR(50),
    correo VARCHAR(200),
    rol VARCHAR(50),
    modulo VARCHAR(50),
    accion VARCHAR(100),
    entidad VARCHAR(100),
    id_entidad VARCHAR(100),
    resultado VARCHAR(50),
    detalle JSONB
);

CREATE TABLE IF NOT EXISTS seg_auditoria_permisos (
    id_auditoria BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario VARCHAR(50),
    correo VARCHAR(200),
    rol_objetivo VARCHAR(50),
    modulo VARCHAR(50),
    recurso VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    alcance VARCHAR(50),
    motivo TEXT
);

-- =====================================================================
-- SECCIÓN 4: CATÁLOGO MAESTRO DE MATERIALES Y PRECIOS
-- =====================================================================

CREATE TABLE IF NOT EXISTS mae_negocios (
    id_negocio VARCHAR(50) PRIMARY KEY,
    codigo_negocio VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_productos_principales (
    id_producto VARCHAR(50) PRIMARY KEY,
    id_negocio VARCHAR(50) REFERENCES mae_negocios(id_negocio) ON DELETE CASCADE,
    codigo_producto VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_tipos_material (
    id_tipo_material VARCHAR(50) PRIMARY KEY,
    codigo_tipo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_subtipos_material (
    id_subtipo_material VARCHAR(50) PRIMARY KEY,
    id_producto VARCHAR(50) REFERENCES mae_productos_principales(id_producto) ON DELETE CASCADE,
    id_tipo_material VARCHAR(50) REFERENCES mae_tipos_material(id_tipo_material) ON DELETE CASCADE,
    codigo_subtipo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_marcas (
    id_marca VARCHAR(50) PRIMARY KEY,
    codigo_marca VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mae_materiales (
    id_material VARCHAR(50) PRIMARY KEY,
    codigo_material VARCHAR(50) UNIQUE NOT NULL,
    codigo_sap VARCHAR(50),
    id_producto VARCHAR(50) REFERENCES mae_productos_principales(id_producto) ON DELETE SET NULL,
    id_tipo_material VARCHAR(50) REFERENCES mae_tipos_material(id_tipo_material) ON DELETE SET NULL,
    id_subtipo_material VARCHAR(50) REFERENCES mae_subtipos_material(id_subtipo_material) ON DELETE SET NULL,
    id_marca VARCHAR(50) REFERENCES mae_marcas(id_marca) ON DELETE SET NULL,
    nombre_material VARCHAR(200) NOT NULL,
    descripcion_material TEXT,
    unidad_medida VARCHAR(20) DEFAULT 'UND',
    es_gasodomestico BOOLEAN DEFAULT FALSE,
    permite_combo BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS rel_negocio_material (
    id_relacion VARCHAR(50) PRIMARY KEY,
    id_negocio VARCHAR(50) REFERENCES mae_negocios(id_negocio) ON DELETE CASCADE,
    id_material VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS rel_proveedor_material (
    id_relacion VARCHAR(50) PRIMARY KEY,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE CASCADE,
    id_material VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE CASCADE,
    codigo_material_proveedor VARCHAR(50),
    codigo_sap_proveedor VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS rel_material_componentes (
    id_componente VARCHAR(50) PRIMARY KEY,
    id_material_padre VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE CASCADE,
    id_material_componente VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE CASCADE,
    descripcion_componente TEXT,
    tipo_componente VARCHAR(50) DEFAULT 'ACCESORIO',
    cantidad NUMERIC(10, 2) DEFAULT 1,
    incluido_en_precio BOOLEAN DEFAULT TRUE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS pre_listas_precios (
    id_lista_precio VARCHAR(50) PRIMARY KEY,
    codigo_lista VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE CASCADE,
    id_negocio VARCHAR(50) REFERENCES mae_negocios(id_negocio) ON DELETE SET NULL,
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE SET NULL,
    id_grupo VARCHAR(50) REFERENCES mae_grupos(id_grupo) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    moneda VARCHAR(10) DEFAULT 'PEN',
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS pre_lista_precio_detalle (
    id_detalle_precio VARCHAR(50) PRIMARY KEY,
    codigo_precio VARCHAR(50),
    id_lista_precio VARCHAR(50) REFERENCES pre_listas_precios(id_lista_precio) ON DELETE CASCADE,
    id_material VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE CASCADE,
    precio_base NUMERIC(12, 2) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'PEN',
    tiene_combo BOOLEAN DEFAULT FALSE,
    detalle_combo TEXT,
    descripcion_combo TEXT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS pre_solicitudes_lista_precio (
    id_solicitud VARCHAR(50) PRIMARY KEY,
    codigo_solicitud VARCHAR(50) UNIQUE NOT NULL,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE CASCADE,
    id_negocio VARCHAR(50) REFERENCES mae_negocios(id_negocio) ON DELETE SET NULL,
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE SET NULL,
    id_grupo VARCHAR(50) REFERENCES mae_grupos(id_grupo) ON DELETE SET NULL,
    alcance VARCHAR(50) DEFAULT 'TOTAL',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    moneda VARCHAR(10) DEFAULT 'PEN',
    estado VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, PUBLICADA
    usuario_solicitante VARCHAR(150),
    usuario_revisor VARCHAR(150),
    motivo_rechazo TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS pre_solicitudes_lista_precio_detalle (
    id_detalle_solicitud VARCHAR(50) PRIMARY KEY,
    id_solicitud VARCHAR(50) REFERENCES pre_solicitudes_lista_precio(id_solicitud) ON DELETE CASCADE,
    numero_fila INT,
    codigo_sap VARCHAR(50),
    codigo_material VARCHAR(50),
    producto_principal VARCHAR(100),
    tipo_material VARCHAR(100),
    subtipo_material VARCHAR(100),
    marca VARCHAR(100),
    nombre_material VARCHAR(200),
    precio_propuesto NUMERIC(12, 2) NOT NULL,
    tiene_combo BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'VALIDO'
);

CREATE TABLE IF NOT EXISTS pre_solicitudes_lista_precio_historial (
    id_historial BIGSERIAL PRIMARY KEY,
    id_solicitud VARCHAR(50) REFERENCES pre_solicitudes_lista_precio(id_solicitud) ON DELETE CASCADE,
    fecha_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario VARCHAR(50),
    correo VARCHAR(200),
    rol VARCHAR(50),
    accion VARCHAR(100),
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    comentario TEXT
);

-- =====================================================================
-- SECCIÓN 5: VENTAS AL CONTADO Y GESTIÓN DE ENTREGAS 360
-- =====================================================================

CREATE TABLE IF NOT EXISTS vta_ventas_contado (
    id_venta VARCHAR(50) PRIMARY KEY,
    codigo_venta VARCHAR(50) UNIQUE NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tipo_venta VARCHAR(50) DEFAULT 'CONTADO',
    es_gasodomestico BOOLEAN DEFAULT TRUE,
    id_usuario VARCHAR(50) REFERENCES seg_usuarios(id_usuario) ON DELETE SET NULL,
    correo_usuario VARCHAR(200),
    nombre_usuario VARCHAR(200),
    rol_usuario VARCHAR(50),
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL,
    razon_social_proveedor VARCHAR(200),
    id_oficina VARCHAR(50) REFERENCES mae_oficinas(id_oficina) ON DELETE SET NULL,
    nombre_oficina VARCHAR(150),
    id_grupo VARCHAR(50) REFERENCES mae_grupos(id_grupo) ON DELETE SET NULL,
    nombre_grupo VARCHAR(150),
    
    -- Datos del cliente y suministro
    numero_solicitud_sap VARCHAR(50),
    codigo_suministro VARCHAR(50),
    tipo_documento_cliente VARCHAR(20) DEFAULT 'DNI',
    numero_documento_cliente VARCHAR(30),
    nombres_cliente VARCHAR(150),
    apellidos_cliente VARCHAR(150),
    telefono_contacto VARCHAR(50),
    correo_cliente VARCHAR(150),
    departamento VARCHAR(50) DEFAULT 'LIMA',
    provincia VARCHAR(50) DEFAULT 'LIMA',
    distrito VARCHAR(100),
    direccion_instalacion TEXT,
    referencia_direccion TEXT,
    
    -- Aspectos comerciales y abono
    tipo_pago VARCHAR(50) DEFAULT 'DEPOSITO',
    numero_operacion_bancaria VARCHAR(100),
    banco_abono VARCHAR(100),
    fecha_abono DATE,
    monto_abono NUMERIC(12, 2) DEFAULT 0,
    monto_total_venta NUMERIC(12, 2) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'PEN',
    
    -- Estados y Workflow
    estado_abono VARCHAR(30) DEFAULT 'PENDIENTE_CONFIRMACION', 
    -- PENDIENTE_CONFIRMACION, ABONO_CONFIRMADO, ABONO_OBSERVADO, NO_APLICA
    estado_entrega VARCHAR(30) DEFAULT 'REGISTRADA', 
    -- REGISTRADA, PROGRAMADA, EN_RUTA, ENTREGADA, RECHAZADA, OBSERVADA, ANULADA
    estado_general VARCHAR(30) DEFAULT 'EN_PROCESO',
    
    -- Auditoría
    observaciones TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario_actualizacion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS vta_ventas_contado_detalle (
    id_detalle_venta VARCHAR(50) PRIMARY KEY,
    id_venta VARCHAR(50) REFERENCES vta_ventas_contado(id_venta) ON DELETE CASCADE,
    linea INT DEFAULT 1,
    id_tipo_material VARCHAR(50),
    tipo_material VARCHAR(100),
    id_material VARCHAR(50) REFERENCES mae_materiales(id_material) ON DELETE SET NULL,
    codigo_material VARCHAR(50),
    codigo_sap VARCHAR(50),
    descripcion_material TEXT,
    cantidad NUMERIC(10, 2) DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    precio_total NUMERIC(12, 2) NOT NULL,
    tiene_combo BOOLEAN DEFAULT FALSE,
    detalle_combo TEXT,
    estado_material VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vta_gestion_entrega (
    id_gestion_entrega VARCHAR(50) PRIMARY KEY,
    id_venta VARCHAR(50) REFERENCES vta_ventas_contado(id_venta) ON DELETE CASCADE,
    id_proveedor VARCHAR(50) REFERENCES mae_proveedores(id_proveedor) ON DELETE SET NULL,
    estado_entrega VARCHAR(30) DEFAULT 'PROGRAMADA',
    motivo_observacion VARCHAR(100),
    detalle_observacion TEXT,
    fecha_programada_entrega DATE,
    fecha_real_entrega TIMESTAMPTZ,
    nombre_receptor VARCHAR(150),
    dni_receptor VARCHAR(30),
    parentesco_receptor VARCHAR(50),
    telefono_receptor VARCHAR(50),
    comentarios_transportista TEXT,
    usuario_registro VARCHAR(150),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vta_evidencias_entrega (
    id_evidencia VARCHAR(50) PRIMARY KEY,
    id_gestion_entrega VARCHAR(50) REFERENCES vta_gestion_entrega(id_gestion_entrega) ON DELETE CASCADE,
    id_venta VARCHAR(50) REFERENCES vta_ventas_contado(id_venta) ON DELETE CASCADE,
    id_proveedor VARCHAR(50),
    tipo_evidencia VARCHAR(50) DEFAULT 'BOLETA_ENTREGA', 
    -- BOLETA_ENTREGA, EVIDENCIA_RECEPCION, FOTO_PREDIO, FOTO_PRODUCTO, GUIA_REMISION
    id_archivo TEXT,
    url_archivo TEXT NOT NULL,
    nombre_archivo VARCHAR(200),
    mime_archivo VARCHAR(100),
    tamano_bytes BIGINT,
    usuario_subida VARCHAR(150),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- SECCIÓN 6: ÍNDICES DE ALTO RENDIMIENTO
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_vta_ventas_estado ON vta_ventas_contado(estado_entrega, estado_abono);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_prov ON vta_ventas_contado(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_usr ON vta_ventas_contado(id_usuario);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_fecha ON vta_ventas_contado(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_vta_ventas_suministro ON vta_ventas_contado(codigo_suministro);
CREATE INDEX IF NOT EXISTS idx_vta_detalle_venta ON vta_ventas_contado_detalle(id_venta);
CREATE INDEX IF NOT EXISTS idx_vta_evidencias_venta ON vta_evidencias_entrega(id_venta);

CREATE INDEX IF NOT EXISTS idx_precios_material ON pre_lista_precio_detalle(id_material);
CREATE INDEX IF NOT EXISTS idx_precios_lista ON pre_lista_precio_detalle(id_lista_precio);
CREATE INDEX IF NOT EXISTS idx_seg_permisos_sujeto ON seg_permisos(id_sujeto, modulo);
CREATE INDEX IF NOT EXISTS idx_seg_sesiones_usr ON seg_sesiones(id_usuario, estado);
CREATE INDEX IF NOT EXISTS idx_auditoria_accesos_fecha ON seg_auditoria_accesos(fecha_hora DESC);

-- =====================================================================
-- SECCIÓN 7: TRIGGERS DE ACTUALIZACIÓN
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sys_parametros_act') THEN
        CREATE TRIGGER trg_sys_parametros_act BEFORE UPDATE ON sys_parametros FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_modulos_act') THEN
        CREATE TRIGGER trg_app_modulos_act BEFORE UPDATE ON app_modulos FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mae_proveedores_act') THEN
        CREATE TRIGGER trg_mae_proveedores_act BEFORE UPDATE ON mae_proveedores FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seg_usuarios_act') THEN
        CREATE TRIGGER trg_seg_usuarios_act BEFORE UPDATE ON seg_usuarios FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vta_ventas_act') THEN
        CREATE TRIGGER trg_vta_ventas_act BEFORE UPDATE ON vta_ventas_contado FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
    END IF;
END $$;

-- =====================================================================
-- SECCIÓN 8: POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE sys_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_catalogo_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mae_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mae_oficinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mae_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seg_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE seg_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seg_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mae_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_listas_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_lista_precio_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE vta_ventas_contado ENABLE ROW LEVEL SECURITY;
ALTER TABLE vta_ventas_contado_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE vta_gestion_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE vta_evidencias_entrega ENABLE ROW LEVEL SECURITY;

-- Políticas por defecto para lectura y escritura desde la aplicación (Anon + Authenticated)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'sys_parametros', 'app_modulos', 'app_campos', 'app_catalogos', 'app_catalogo_valores',
            'mae_proveedores', 'mae_oficinas', 'mae_grupos', 'seg_usuarios', 'seg_roles',
            'seg_permisos', 'mae_materiales', 'pre_listas_precios', 'pre_lista_precio_detalle',
            'vta_ventas_contado', 'vta_ventas_contado_detalle', 'vta_gestion_entrega', 'vta_evidencias_entrega'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_policy_all ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_policy_all ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- =====================================================================
-- SECCIÓN 9: BUCKET DE ALMACENAMIENTO PARA SUPABASE STORAGE
-- =====================================================================
-- Inserción de configuración para los buckets de evidencia y recursos
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('evidencias', 'evidencias', true),
    ('recursos', 'recursos', true),
    ('importaciones', 'importaciones', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Evidencias public read" ON storage.objects FOR SELECT USING (bucket_id = 'evidencias');
CREATE POLICY "Evidencias authenticated insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "Recursos public read" ON storage.objects FOR SELECT USING (bucket_id = 'recursos');
