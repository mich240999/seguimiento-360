/**
 * CÁLIDDA 360 — GS_330_MOD_MaterialsPrices
 * Versión actualizada PASO 28O — rendimiento de Materiales/Precios y prevalidación explícita de precios.
 * Archivo completo: reemplazar íntegramente el contenido del archivo homónimo.
 */

/**
 * SGT360 — Módulo Materiales y Precios
 *
 * Responsabilidad:
 * Administra materiales universales asociados a negocio y precios por proveedor,
 * oficina/grupo/vigencia. La asociación proveedor-material nace del propio precio.
 *
 * Alcance Paso 25A:
 * - Material universal asociado a negocio.
 * - El proveedor se define en el precio/lista; Materiales no requiere relación previa proveedor-material.
 * - Precio por proveedor + negocio + oficina + grupo opcional + vigencia.
 * - Solicitudes de lista cargadas por proveedor, revisión y aprobación/rechazo.
 * - Publicación controlada preparada, pero dependiente de permiso explícito.
 * - Moneda fija PEN/S/.
 * - No considera FEE proveedor, FEE Calidda ni cuotas/plazos.
 * - Paso 25K: el combo se registra por lista/precio, no por maestro/carga de materiales.
 * - Paso 25O: códigos visibles cortos alfanuméricos por maestro.
 * - Paso 26B: precios generales por material cuando no se selecciona proveedor,
 *   precios específicos por proveedor, resolución por prioridad y validación de vigencia.
 * - Paso 27M: optimización de carga con caché granular y guardado rápido de precio individual.
 * - Paso 27N: guardado inmediato de precios individuales y carga masiva interna de precios.
 */

const MP_MODULO_SGT360 = Object.freeze({
  CODIGO: "MATERIALES_PRECIOS",
  MONEDA: "PEN",
  MAX_FILAS_IMPORTACION: 5000,
  HOJAS: Object.freeze({
    NEGOCIOS: "MAE_NEGOCIOS",
    PRODUCTOS: "MAE_PRODUCTOS_PRINCIPALES",
    TIPOS: "MAE_TIPOS_MATERIAL",
    SUBTIPOS: "MAE_SUBTIPOS_MATERIAL",
    MARCAS: "MAE_MARCAS",
    MATERIALES: "MAE_MATERIALES",
    REL_NEGOCIO_MATERIAL: "REL_NEGOCIO_MATERIAL",
    REL_PROVEEDOR_MATERIAL: "REL_PROVEEDOR_MATERIAL",
    REL_MATERIAL_COMPONENTES: "REL_MATERIAL_COMPONENTES",
    LISTAS: "PRE_LISTAS_PRECIOS",
    LISTA_DETALLE: "PRE_LISTA_PRECIO_DETALLE",
    SOLICITUDES: "PRE_SOLICITUDES_LISTA_PRECIO",
    SOLICITUD_DETALLE: "PRE_SOLICITUDES_LISTA_PRECIO_DETALLE",
    SOLICITUD_HISTORIAL: "PRE_SOLICITUDES_LISTA_PRECIO_HISTORIAL"
  }),
  CABECERAS: Object.freeze({
    MAE_NEGOCIOS: Object.freeze([
      "ID_NEGOCIO", "CODIGO_NEGOCIO", "NOMBRE", "DESCRIPCION", "ESTADO",
      "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    MAE_PRODUCTOS_PRINCIPALES: Object.freeze([
      "ID_PRODUCTO", "ID_NEGOCIO", "CODIGO_PRODUCTO", "NOMBRE", "DESCRIPCION",
      "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    MAE_TIPOS_MATERIAL: Object.freeze([
      "ID_TIPO_MATERIAL", "CODIGO_TIPO", "NOMBRE", "DESCRIPCION", "ESTADO",
      "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    MAE_SUBTIPOS_MATERIAL: Object.freeze([
      "ID_SUBTIPO_MATERIAL", "ID_PRODUCTO", "ID_TIPO_MATERIAL", "CODIGO_SUBTIPO",
      "NOMBRE", "DESCRIPCION", "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION",
      "ID_USUARIO_ACTUALIZACION"
    ]),
    MAE_MARCAS: Object.freeze([
      "ID_MARCA", "CODIGO_MARCA", "NOMBRE", "DESCRIPCION", "ESTADO",
      "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    MAE_MATERIALES: Object.freeze([
      "ID_MATERIAL", "CODIGO_MATERIAL", "CODIGO_SAP", "ID_PRODUCTO",
      "ID_TIPO_MATERIAL", "ID_SUBTIPO_MATERIAL", "ID_MARCA", "NOMBRE_MATERIAL",
      "DESCRIPCION_MATERIAL", "UNIDAD_MEDIDA", "ES_COMBO", "ESTADO",
      "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    REL_NEGOCIO_MATERIAL: Object.freeze([
      "ID_RELACION", "ID_NEGOCIO", "ID_MATERIAL", "ESTADO", "FECHA_CREACION",
      "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    REL_PROVEEDOR_MATERIAL: Object.freeze([
      "ID_RELACION", "ID_PROVEEDOR", "ID_MATERIAL", "CODIGO_MATERIAL_PROVEEDOR",
      "CODIGO_SAP_PROVEEDOR", "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION",
      "ID_USUARIO_ACTUALIZACION"
    ]),
    REL_MATERIAL_COMPONENTES: Object.freeze([
      "ID_COMPONENTE", "ID_MATERIAL_PADRE", "ID_MATERIAL_COMPONENTE",
      "DESCRIPCION_COMPONENTE", "TIPO_COMPONENTE", "CANTIDAD", "INCLUIDO_EN_PRECIO",
      "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    PRE_LISTAS_PRECIOS: Object.freeze([
      "ID_LISTA_PRECIO", "CODIGO_LISTA", "NOMBRE", "ID_PROVEEDOR", "ID_NEGOCIO",
      "ID_OFICINA", "ID_GRUPO", "FECHA_INICIO", "FECHA_FIN", "MONEDA", "ESTADO",
      "PRIORIDAD", "ALCANCE", "ORIGEN", "ORIGEN_CARGA", "ID_SOLICITUD_ORIGEN", "FECHA_CREACION",
      "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    PRE_LISTA_PRECIO_DETALLE: Object.freeze([
      "ID_DETALLE_PRECIO", "CODIGO_PRECIO", "ID_LISTA_PRECIO", "ID_MATERIAL", "PRECIO_BASE", "MONEDA",
      "TIENE_COMBO", "DETALLE_COMBO", "DESCRIPCION_COMERCIAL", "COMENTARIO_COMERCIAL", "ESTADO", "FECHA_CREACION",
      "FECHA_ACTUALIZACION", "ID_USUARIO_ACTUALIZACION"
    ]),
    PRE_SOLICITUDES_LISTA_PRECIO: Object.freeze([
      "ID_SOLICITUD", "CODIGO_SOLICITUD", "ID_PROVEEDOR", "ID_NEGOCIO", "ID_OFICINA",
      "ID_GRUPO", "ALCANCE", "FECHA_INICIO", "FECHA_FIN", "MONEDA", "ESTADO", "ORIGEN_CARGA", "NOMBRE_ARCHIVO",
      "ID_ARCHIVO_ORIGINAL", "URL_ARCHIVO_ORIGINAL", "TOTAL_FILAS", "TOTAL_ERRORES",
      "TOTAL_ADVERTENCIAS", "COMENTARIO_PROVEEDOR", "COMENTARIO_REVISOR",
      "ID_USUARIO_CARGA", "FECHA_CARGA", "ID_USUARIO_REVISION", "FECHA_INICIO_REVISION",
      "FECHA_REVISION", "ID_USUARIO_APROBACION", "FECHA_APROBACION",
      "ID_LISTA_PRECIO_PUBLICADA", "FECHA_PUBLICACION", "FECHA_CREACION", "FECHA_ACTUALIZACION"
    ]),
    PRE_SOLICITUDES_LISTA_PRECIO_DETALLE: Object.freeze([
      "ID_DETALLE_SOLICITUD", "ID_SOLICITUD", "NUMERO_FILA", "CODIGO_SAP",
      "CODIGO_MATERIAL", "PRODUCTO_PRINCIPAL", "TIPO_MATERIAL", "SUBTIPO_MATERIAL",
      "MARCA", "DESCRIPCION_MATERIAL", "CODIGO_OFICINAS", "IDS_OFICINAS",
      "CODIGO_GRUPO", "ID_GRUPO", "ES_COMBO", "COMPONENTES_INCLUIDOS",
      "PRECIO_BASE", "COMENTARIO_COMERCIAL", "ESTADO_FILA", "ACCION_SUGERIDA",
      "ERRORES", "ADVERTENCIAS", "OBSERVACION_REVISOR", "ID_MATERIAL_DETECTADO"
    ]),
    PRE_SOLICITUDES_LISTA_PRECIO_HISTORIAL: Object.freeze([
      "ID_HISTORIAL", "ID_SOLICITUD", "FECHA_HORA", "ID_USUARIO", "CORREO", "ROL",
      "ACCION", "ESTADO_ANTERIOR", "ESTADO_NUEVO", "COMENTARIO"
    ])
  }),
  ESTADOS_SOLICITUD: Object.freeze({
    BORRADOR: "BORRADOR",
    CARGADO: "CARGADO",
    OBSERVADO_SISTEMA: "OBSERVADO_POR_SISTEMA",
    PENDIENTE_REVISION: "PENDIENTE_REVISION",
    EN_REVISION: "EN_REVISION",
    OBSERVADO_REVISOR: "OBSERVADO_POR_REVISOR",
    RECHAZADO: "RECHAZADO",
    APROBADO: "APROBADO",
    PUBLICADO: "PUBLICADO",
    ANULADO: "ANULADO",
    REEMPLAZADO: "REEMPLAZADO"
  }),
  PLANTILLA: Object.freeze([
    "CODIGO_SAP_MATERIAL",
    "CODIGO_MATERIAL",
    "CODIGO_OFICINA",
    "CODIGO_GRUPO",
    "PRECIO",
    "COMBO",
    "OBSERVACION"
  ])
});

const PROPIEDAD_CACHE_VERSION_MP_SGT360 = "SGT360_MP_CACHE_VERSION";
const PROPIEDAD_CACHE_VERSION_MP_PRECIOS_SGT360 = "SGT360_MP_PRICE_CACHE_VERSION";


const MP_CARGA_MATERIALES_XLSX = Object.freeze({
  VERSION: "28G",
  HOJA_CARGA: "CARGA_MATERIALES",
  HOJA_DICCIONARIOS: "DICCIONARIOS",
  HOJA_PREVIEW_TECNICA: "__SGT360_VALIDADO",
  MIME_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  MIME_GOOGLE_SHEETS: "application/vnd.google-apps.spreadsheet",
  MAX_BYTES: 5 * 1024 * 1024,
  TTL_PREVIEW_SEGUNDOS: 900,
  PREFIJO_CACHE: "SGT360_MP_MATERIAL_PREVIEW_",
  PREFIJO_TEMPORAL: "TMP_SGT360_MATERIAL_IMPORT_",
  CABECERAS: Object.freeze([
    "CODIGO_SAP",
    "CODIGO_MATERIAL",
    "RUTA_TIPIFICACION",
    "COD_MARCA",
    "DESCRIPCION_MATERIAL",
    "NOMBRE_MATERIAL",
    "UNIDAD_MEDIDA",
    "ESTADO"
  ]),
  REQUERIDAS: Object.freeze([
    "CODIGO_SAP",
    "CODIGO_MATERIAL",
    "RUTA_TIPIFICACION",
    "COD_MARCA",
    "DESCRIPCION_MATERIAL",
    "NOMBRE_MATERIAL",
    "UNIDAD_MEDIDA",
    "ESTADO"
  ])
});


const MP_PLANTILLA_MATERIALES_CACHE_PASO_28G = Object.freeze({
  VERSION: "28G",
  NOMBRE_ARCHIVO: "Plantilla_Materiales_Calidda360_v6.xlsx",
  PREFIJO_PROPIEDAD: "SGT360_MP_TEMPLATE_XLSX_28G_",
  TTL_BLOQUEO_MS: 30000,
  TTL_REUSO_RAPIDO_SEGUNDOS: 300
});


/**
 * PASO 28N — plantilla XLSX de carga masiva de precios.
 *
 * CODIGO_MATERIAL es la única llave visible del material en esta plantilla.
 * CODIGO_OFICINA y CODIGO_GRUPO existen, pero sus valores son opcionales:
 * - ambos vacíos  -> GENERAL
 * - oficina       -> OFICINA
 * - oficina+grupo -> GRUPO
 */
const MP_CARGA_PRECIOS_XLSX_PASO_28N = Object.freeze({
  VERSION: "28O",
  HOJA_CARGA: "CARGA_PRECIOS",
  HOJA_DICCIONARIOS: "DICCIONARIOS",
  HOJA_PREVIEW_TECNICA: "__SGT360_PRECIOS_VALIDADO",
  MIME_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  MAX_BYTES: 5 * 1024 * 1024,
  TTL_PREVIEW_SEGUNDOS: 900,
  PREFIJO_CACHE_PREVIEW: "SGT360_MP_PRICE_PREVIEW_",
  CABECERAS: Object.freeze([
    "CODIGO_MATERIAL",
    "CODIGO_PROVEEDOR",
    "NEGOCIO",
    "CODIGO_OFICINA",
    "CODIGO_GRUPO",
    "PRECIO",
    "FECHA_INICIO",
    "FECHA_FIN",
    "DETALLE_COMBO",
    "COMENTARIO_COMERCIAL"
  ]),
  REQUERIDAS: Object.freeze([
    "CODIGO_MATERIAL",
    "CODIGO_PROVEEDOR",
    "NEGOCIO",
    "CODIGO_OFICINA",
    "CODIGO_GRUPO",
    "PRECIO",
    "FECHA_INICIO",
    "FECHA_FIN",
    "DETALLE_COMBO",
    "COMENTARIO_COMERCIAL"
  ])
});

const MP_PLANTILLA_PRECIOS_CACHE_PASO_28N = Object.freeze({
  VERSION: "28O",
  NOMBRE_ARCHIVO: "Plantilla_Carga_Masiva_Precios_v3.xlsx",
  PREFIJO_PROPIEDAD: "SGT360_MP_TEMPLATE_XLSX_PRICE_28N_",
  TTL_BLOQUEO_MS: 30000,
  TTL_REUSO_RAPIDO_SEGUNDOS: 300
});


const MP_GUARDADO_MATERIAL_RAPIDO_PASO_28I = Object.freeze({
  VERSION: "28I",
  CLAVE_CACHE_ARBOL: "SGT360_MP_TREE_SAVE_V1",
  TTL_ARBOL_SEGUNDOS: 600
});


const MP_ARBOL_TIPIFICACION_PASO_28D = Object.freeze({
  PRODUCTOS: Object.freeze([
    Object.freeze({ codigo: "PRODUCTO", nombre: "Producto" }),
    Object.freeze({ codigo: "SERVICIO", nombre: "Servicio" }),
    Object.freeze({ codigo: "TRABAJO", nombre: "Trabajo" })
  ]),
  TIPOS: Object.freeze([
    Object.freeze({ producto: "PRODUCTO", codigo: "COCINA", nombre: "Cocina" }),
    Object.freeze({ producto: "PRODUCTO", codigo: "EQUIPO", nombre: "Equipo" }),
    Object.freeze({ producto: "PRODUCTO", codigo: "HORNO", nombre: "Horno" }),
    Object.freeze({ producto: "PRODUCTO", codigo: "SECADORA", nombre: "Secadora" }),
    Object.freeze({ producto: "PRODUCTO", codigo: "TERMA", nombre: "Terma" }),
    Object.freeze({ producto: "TRABAJO", codigo: "TRABAJO", nombre: "Trabajo" })
  ]),
  SUBTIPOS: Object.freeze([
    Object.freeze({ producto: "PRODUCTO", tipo: "COCINA", codigo: "CILINDRO", nombre: "Cilindro" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "COCINA", codigo: "COCINA", nombre: "Cocina" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "COCINA", codigo: "COCINETA", nombre: "Cocineta" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "COCINA", codigo: "ENCIMERA", nombre: "Encimera" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "COCINA", codigo: "QUEMADOR", nombre: "Quemador" }),

    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "ASPIRADORA", nombre: "Aspiradora" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "BATIDORA", nombre: "Batidora" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "BOMBA_PROFESIONAL", nombre: "Bomba Profesional" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "CAFETERA", nombre: "Cafetera" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "CAMPANA", nombre: "Campana" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "ELECTRO", nombre: "Electro" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "EXPRIMIDOR", nombre: "Exprimidor" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "EXTRACTOR", nombre: "Extractor" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "FREIDORA_DE_AIRE", nombre: "Freidora De Aire" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "HERVIDOR", nombre: "Hervidor" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "HORNO_MICROONDAS", nombre: "Horno Microondas" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "LAVADORA", nombre: "Lavadora" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "LICUADORA", nombre: "Licuadora" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "OLLA_ARROCERA", nombre: "Olla Arrocera" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "SANDWICHERA", nombre: "Sandwichera" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "VENTILADOR", nombre: "Ventilador" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "EQUIPO", codigo: "WAFLERA", nombre: "Waflera" }),

    Object.freeze({ producto: "PRODUCTO", tipo: "HORNO", codigo: "HORNO", nombre: "Horno" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "SECADORA", codigo: "SECADORA", nombre: "Secadora" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "TERMA", codigo: "TERMA", nombre: "Terma" }),
    Object.freeze({ producto: "PRODUCTO", tipo: "TERMA", codigo: "TERMOTANQUE", nombre: "Termotanque" }),

    Object.freeze({ producto: "TRABAJO", tipo: "TRABAJO", codigo: "DUCTERIA", nombre: "Ductería" }),
    Object.freeze({ producto: "TRABAJO", tipo: "TRABAJO", codigo: "PUNTO_ADICIONAL", nombre: "Punto Adicional" })
  ])
});


function obtenerVersionCacheMaterialesPrecios_() {
  const buster = String(
    PropertiesService.getScriptProperties().getProperty(PROPIEDAD_CACHE_VERSION_MP_SGT360) || "0"
  );
  return [obtenerRevisionDatosMotor_(), buster].join("|");
}

function marcarVersionCacheMaterialesPrecios_() {
  const version = [new Date().toISOString(), Utilities.getUuid().slice(0, 8)].join("|");
  PropertiesService.getScriptProperties().setProperty(PROPIEDAD_CACHE_VERSION_MP_SGT360, version);
  return version;
}

function obtenerVersionCachePreciosMateriales_() {
  const buster = String(
    PropertiesService.getScriptProperties().getProperty(PROPIEDAD_CACHE_VERSION_MP_PRECIOS_SGT360) || "0"
  );
  return [obtenerRevisionDatosMotor_(), buster].join("|");
}

function marcarVersionCachePreciosMateriales_() {
  const version = [new Date().toISOString(), Utilities.getUuid().slice(0, 8)].join("|");
  PropertiesService.getScriptProperties().setProperty(PROPIEDAD_CACHE_VERSION_MP_PRECIOS_SGT360, version);
  return version;
}

function obtenerClaveCachePaginaMaterialesPrecios_(grupo, usuario, filtros, version) {
  usuario = usuario || obtenerUsuarioActual();
  const alcance = [
    String(usuario.idUsuario || usuario.correo || "GENERAL").trim(),
    String(usuario.rol || "").trim(),
    String(usuario.idProveedor || "").trim(),
    String(usuario.idOficina || "").trim(),
    String(usuario.idGrupo || "").trim(),
    JSON.stringify(filtros || {})
  ].join("|");
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, alcance)
    .map(function(byte) { return (byte + 256).toString(16).slice(-2); }).join("");
  return construirClaveCacheMotor_(grupo || "MP_PAGE", [version || obtenerVersionCacheMaterialesPrecios_(), digest].join("_"));
}

/** Migración incremental e idempotente del Paso 25A. */
function actualizarModuloMaterialesPreciosPaso25A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    sincronizarModuloMaterialesPrecios_();
    sincronizarRecursosMaterialesPrecios_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    return diagnosticarModuloMaterialesPreciosPaso25A();
  } finally {
    bloqueo.releaseLock();
  }
}


/** Migración incremental e idempotente del Paso 25B. */
function actualizarModuloMaterialesPreciosPaso25B() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    asegurarColumnasCatalogosAppPaso25B_();
    sincronizarModuloMaterialesPrecios_();
    sincronizarRecursosMaterialesPrecios_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    return diagnosticarModuloMaterialesPreciosPaso25B();
  } finally {
    bloqueo.releaseLock();
  }
}

/** Migración incremental e idempotente del Paso 25D. */
function actualizarModuloMaterialesPreciosPaso25D() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    asegurarColumnasCatalogosAppPaso25B_();
    sincronizarModuloMaterialesPrecios_();
    sincronizarRecursosMaterialesPrecios_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    const diagnostico = diagnosticarModuloMaterialesPreciosPaso25B();
    diagnostico.paso = "25D";
    diagnostico.cambios = [
      "Carga individual de precio",
      "Grupo dependiente de oficina en formularios",
      "Resumen predeterminado y carga inicial optimizada",
      "Ayuda de uso para materiales combo"
    ];
    diagnostico.mensaje = "Paso 25D aplicado: ajustes de flujo y permiso de carga individual de precio.";
    return diagnostico;
  } finally {
    bloqueo.releaseLock();
  }
}

/** Migración incremental e idempotente del Paso 25E. */
function actualizarModuloMaterialesPreciosPaso25E() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    asegurarColumnasCatalogosAppPaso25B_();
    sincronizarModuloMaterialesPrecios_();
    sincronizarRecursosMaterialesPrecios_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    const diagnostico = diagnosticarModuloMaterialesPreciosPaso25B();
    diagnostico.paso = "25E";
    diagnostico.cambios = [
      "Encabezados visuales alineados entre Resumen, Materiales, Precios y Listas",
      "Plantilla de listas movida al apartado Listas",
      "Carga masiva de materiales incorporada en Materiales",
      "Plantilla CSV exclusiva para materiales"
    ];
    diagnostico.mensaje = "Paso 25E aplicado: ajustes visuales y carga masiva de materiales.";
    return diagnostico;
  } finally {
    bloqueo.releaseLock();
  }
}

/** Migración incremental e idempotente del Paso 25K. */
function actualizarModuloMaterialesPreciosPaso25K() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    asegurarColumnasCatalogosAppPaso25B_();
    sincronizarModuloMaterialesPrecios_();
    sincronizarRecursosMaterialesPrecios_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    invalidarCacheMotor_("SECURITY");
    SpreadsheetApp.flush();
    const diagnostico = diagnosticarModuloMaterialesPreciosPaso25B();
    diagnostico.paso = "25K";
    diagnostico.cambios = [
      "Combo retirado del maestro y carga masiva de materiales",
      "Combo habilitado por fila en listas y carga individual de precios",
      "Detalle de combo guardado en el detalle oficial de precio",
      "Plantilla de precios actualizada con TIENE_COMBO y DETALLE_COMBO"
    ];
    diagnostico.mensaje = "Paso 25K aplicado: combo se gestiona por lista/precio y no por material.";
    return diagnostico;
  } finally {
    bloqueo.releaseLock();
  }
}


/**
 * Paso 27L — Normaliza estructura de precios individuales sin reinstalar el motor.
 * Agrega código corto visible al detalle de precio y separa origen de precios
 * individuales frente a listas oficiales.
 */
function actualizarModuloMaterialesPreciosPaso27L() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    const normalizacion = normalizarCodigosPreciosPaso27L_();
    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27L",
      mensaje: "Estructura de precios validada. Los precios individuales quedan separados de listas oficiales.",
      normalizacion: normalizacion
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Paso 27L — Reinicia precios/listas para volver a registrar desde cero.
 * Conserva maestros de materiales, proveedores, negocios y asociaciones.
 */
function actualizarModuloMaterialesPreciosPaso27M() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    invalidarCacheOpcionesMaterialesPrecios_();
    marcarVersionCachePreciosMateriales_();
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27M",
      mensaje: "Módulo Materiales y Precios optimizado para carga rápida y guardado rápido de precios.",
      fecha: new Date().toISOString()
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function actualizarModuloMaterialesPreciosPaso27N() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    invalidarCacheOpcionesMaterialesPrecios_();
    marcarVersionCacheMaterialesPrecios_();
    marcarVersionCachePreciosMateriales_();
    return {
      correcto: true,
      paso: "27N",
      mensaje: "Materiales y Precios preparado para guardado rápido y carga masiva interna de precios individuales.",
      fecha: new Date().toISOString()
    };
  } finally {
    bloqueo.releaseLock();
  }
}


function reiniciarListasPreciosMaterialesPaso27L() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    const hojas = [
      MP_MODULO_SGT360.HOJAS.LISTA_DETALLE,
      MP_MODULO_SGT360.HOJAS.LISTAS,
      MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE,
      MP_MODULO_SGT360.HOJAS.SOLICITUD_HISTORIAL,
      MP_MODULO_SGT360.HOJAS.SOLICITUDES
    ];
    const resultado = {};
    hojas.forEach(function(nombreHoja) {
      resultado[nombreHoja] = limpiarDatosHojaPrecioPaso27L_(nombreHoja);
      marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja);
    });
    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("ALL");
    SpreadsheetApp.flush();
    return {
      correcto: true,
      paso: "27L",
      mensaje: "Se reiniciaron precios, listas oficiales y solicitudes de listas. Los maestros no fueron modificados.",
      hojas: resultado
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function limpiarDatosHojaPrecioPaso27L_(nombreHoja) {
  const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, false);
  if (!hoja) return { existe: false, filasEliminadas: 0 };
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();
  const filas = Math.max(0, ultimaFila - 1);
  if (filas > 0 && ultimaColumna > 0) {
    hoja.getRange(2, 1, filas, ultimaColumna).clearContent();
  }
  return { existe: true, filasEliminadas: filas };
}

function normalizarCodigosPreciosPaso27L_() {
  const usuario = typeof obtenerUsuarioActual === "function" ? obtenerUsuarioActual() : {};
  const ahora = new Date();
  const cambios = { listas: 0, precios: 0 };
  const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
  const codigosLista = construirSetCodigosPrecio_(listas, "CODIGO_LISTA");
  listas.forEach(function(lista) {
    const id = String(lista.ID_LISTA_PRECIO || "").trim();
    if (!id) return;
    const origen = esListaOficialPublicadaPrecio_(lista) ? "LISTA_OFICIAL" : "PRECIO_INDIVIDUAL";
    const prefijo = origen === "LISTA_OFICIAL" ? "L" : "P";
    const actual = String(lista.CODIGO_LISTA || "").trim();
    const requiereCodigo = !actual || actual.length > 10 || (prefijo === "P" && normalizarTexto(actual).charAt(0) !== "P");
    const update = {
      ID_LISTA_PRECIO: id,
      ORIGEN_CARGA: origen === "LISTA_OFICIAL" ? (lista.ORIGEN_CARGA || lista.ORIGEN || "LISTA_OFICIAL") : "PRECIO_INDIVIDUAL",
      ORIGEN: origen === "LISTA_OFICIAL" ? (lista.ORIGEN || "LISTA_OFICIAL") : "PRECIO_INDIVIDUAL",
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
    };
    if (requiereCodigo) {
      const nuevo = generarCodigoVisibleUnicoPrecio_(prefijo, codigosLista, 7);
      codigosLista[normalizarTexto(nuevo)] = true;
      update.CODIGO_LISTA = nuevo;
    }
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", update);
    cambios.listas++;
  });

  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE);
  const codigosPrecio = construirSetCodigosPrecio_(detalles, "CODIGO_PRECIO");
  detalles.forEach(function(detalle) {
    const id = String(detalle.ID_DETALLE_PRECIO || "").trim();
    if (!id) return;
    const actual = String(detalle.CODIGO_PRECIO || "").trim();
    if (!actual || actual.length > 10) {
      const nuevo = generarCodigoVisibleUnicoPrecio_("P", codigosPrecio, 7);
      codigosPrecio[normalizarTexto(nuevo)] = true;
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", {
        ID_DETALLE_PRECIO: id,
        CODIGO_PRECIO: nuevo,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
      });
      cambios.precios++;
    }
  });
  return cambios;
}

/** Diagnóstico técnico del Paso 25B. */
function diagnosticarModuloMaterialesPreciosPaso25B() {
  const base = diagnosticarModuloMaterialesPreciosPaso25A();
  base.paso = "25B";
  base.pestanas = ["Resumen", "Materiales", "Precios", "Listas"];
  base.catalogosApp = [
    "MP_NEGOCIOS",
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL",
    "MP_MARCAS",
    "MP_UNIDADES_MEDIDA",
    "MP_ESTADOS_MATERIAL",
    "MP_TIPOS_LISTA_PRECIO",
    "MP_ESTADOS_SOLICITUD_PRECIO"
  ];
  base.alcanceGeneral = "Oficina y grupo vacíos se interpretan como lista general del proveedor y negocio.";
  base.mensaje = "Paso 25B aplicado: catálogos desde Configuración, pestañas simplificadas, carga en modal y soporte de listas generales.";
  return base;
}
/** Diagnóstico técnico del módulo Materiales y Precios. */
function diagnosticarModuloMaterialesPreciosPaso25A() {
  const hojas = Object.keys(MP_MODULO_SGT360.HOJAS).map(function(clave) {
    const nombre = MP_MODULO_SGT360.HOJAS[clave];
    const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombre, false);
    if (!hoja) return { hoja: nombre, existe: false, registros: 0 };
    return { hoja: nombre, existe: true, registros: Math.max(hoja.getLastRow() - 1, 0) };
  });
  const modulo = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS).filter(function(item) {
    return normalizarTexto(item.CODIGO) === MP_MODULO_SGT360.CODIGO;
  })[0] || null;
  const recursos = leerTablaMotor_(MOTOR_SGT360.BASES.SECURITY, CONFIG.HOJAS.RECURSOS_SEGURIDAD).filter(function(item) {
    return normalizarTexto(item.MODULO) === MP_MODULO_SGT360.CODIGO &&
      normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  });
  return {
    correcto: Boolean(modulo) && hojas.every(function(item) { return item.existe; }) && recursos.length > 0,
    paso: "25A",
    modulo: MP_MODULO_SGT360.CODIGO,
    moneda: MP_MODULO_SGT360.MONEDA,
    hojas: hojas,
    recursosActivos: recursos.length,
    instaladorEjecutado: false,
    mensaje: "Materiales y Precios quedó preparado. Asigna permisos desde Roles y permisos antes de publicarlo a usuarios."
  };
}

/** @private */
function asegurarEstructuraMaterialesPrecios_() {
  Object.keys(MP_MODULO_SGT360.HOJAS).forEach(function(clave) {
    const nombreHoja = MP_MODULO_SGT360.HOJAS[clave];
    const cabeceras = MP_MODULO_SGT360.CABECERAS[nombreHoja];
    asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, cabeceras || []);
  });
}

/** @private */
function sincronizarModuloMaterialesPrecios_() {
  const actuales = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS);
  const existente = actuales.find(function(item) {
    return normalizarTexto(item.CODIGO) === MP_MODULO_SGT360.CODIGO;
  });
  const ahora = new Date();
  const objeto = {
    ID_MODULO: existente ? existente.ID_MODULO : generarIdMotor_("MOD"),
    CODIGO: MP_MODULO_SGT360.CODIGO,
    NOMBRE: "Materiales y Precios",
    DESCRIPCION: "Materiales universales, listas de precios y solicitudes de proveedor.",
    ICONO: "inventory_2",
    GRUPO_MENU: "Comercial",
    ORDEN: 300,
    TIPO_VISTA: "ESPECIALIZADA",
    BASE_ALIAS: MOTOR_SGT360.BASES.OPERATION,
    HOJA_DATOS: MP_MODULO_SGT360.HOJAS.MATERIALES,
    CAMPO_CLAVE: "ID_MATERIAL",
    CAMPO_ESTADO: "ESTADO",
    CAMPO_USUARIO: "",
    CAMPO_PROVEEDOR: "ID_PROVEEDOR",
    CAMPO_GRUPO: "ID_GRUPO",
    ADMINISTRABLE: false,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.MODULOS, "ID_MODULO", objeto);
}

/** @private */
function sincronizarRecursosMaterialesPrecios_() {
  sincronizarRecursosModuloMotor_(MP_MODULO_SGT360.CODIGO, [{
    codigo: "VISUALIZAR_MODULO", nombre: "Acceder a Materiales y Precios", tipo: "MODULO", padre: "", orden: 10
  }, {
    codigo: "VER_RESUMEN", nombre: "Ver resumen del módulo", tipo: "ACCION", orden: 20
  }, {
    codigo: "VER_MATERIALES", nombre: "Ver materiales", tipo: "ACCION", orden: 30
  }, {
    codigo: "CREAR_MATERIAL", nombre: "Crear materiales", tipo: "ACCION", orden: 40
  }, {
    codigo: "EDITAR_MATERIAL", nombre: "Editar materiales", tipo: "ACCION", orden: 50
  }, {
    codigo: "CAMBIAR_ESTADO_MATERIAL", nombre: "Activar o inactivar materiales", tipo: "ACCION", orden: 60
  }, {
    codigo: "VER_CATALOGOS", nombre: "Ver catálogos de materiales", tipo: "ACCION", orden: 70
  }, {
    codigo: "EDITAR_CATALOGOS", nombre: "Editar catálogos de materiales", tipo: "ACCION", orden: 80
  }, {
    codigo: "VER_PRECIOS", nombre: "Ver precios", tipo: "ACCION", orden: 85
  }, {
    codigo: "CREAR_PRECIO_INDIVIDUAL", nombre: "Cargar precio individual", tipo: "ACCION", orden: 88
  }, {
    codigo: "VER_LISTAS_OFICIALES", nombre: "Ver listas oficiales", tipo: "ACCION", orden: 90
  }, {
    codigo: "CREAR_LISTA_OFICIAL", nombre: "Crear listas oficiales", tipo: "ACCION", orden: 100
  }, {
    codigo: "EDITAR_LISTA_OFICIAL", nombre: "Editar listas oficiales", tipo: "ACCION", orden: 110
  }, {
    codigo: "DESCARGAR_LISTA_OFICIAL", nombre: "Descargar listas oficiales", tipo: "ACCION", orden: 120
  }, {
    codigo: "VER_MIS_LISTAS_PRECIO", nombre: "Proveedor: ver mis listas", tipo: "ACCION", orden: 130
  }, {
    codigo: "DESCARGAR_PLANTILLA_PRECIO", nombre: "Proveedor: descargar plantilla", tipo: "ACCION", orden: 140
  }, {
    codigo: "CARGAR_LISTA_PRECIO", nombre: "Cargar lista de precios", tipo: "ACCION", orden: 150
  }, {
    codigo: "CARGAR_LISTA_PRECIO_ADMIN", nombre: "Administrador: cargar lista para proveedor", tipo: "ACCION", orden: 155
  }, {
    codigo: "SELECCIONAR_PROVEEDOR_LISTA", nombre: "Seleccionar proveedor en carga de lista", tipo: "ACCION", orden: 156
  }, {
    codigo: "ENVIAR_LISTA_REVISION", nombre: "Enviar lista a revisión", tipo: "ACCION", orden: 160
  }, {
    codigo: "VER_OBSERVACIONES_LISTA", nombre: "Proveedor: ver observaciones", tipo: "ACCION", orden: 170
  }, {
    codigo: "DESCARGAR_LISTA_APROBADA", nombre: "Proveedor: descargar lista aprobada", tipo: "ACCION", orden: 180
  }, {
    codigo: "VER_SOLICITUDES_PRECIO", nombre: "Revisor: ver solicitudes", tipo: "ACCION", orden: 190
  }, {
    codigo: "VER_DETALLE_SOLICITUD_PRECIO", nombre: "Revisor: ver detalle de solicitud", tipo: "ACCION", orden: 200
  }, {
    codigo: "TOMAR_REVISION_PRECIO", nombre: "Revisor: tomar revisión", tipo: "ACCION", orden: 210
  }, {
    codigo: "OBSERVAR_LISTA_PRECIO", nombre: "Revisor: observar lista", tipo: "ACCION", orden: 220
  }, {
    codigo: "APROBAR_LISTA_PRECIO", nombre: "Revisor: aprobar lista", tipo: "ACCION", orden: 230
  }, {
    codigo: "RECHAZAR_LISTA_PRECIO", nombre: "Revisor: rechazar lista", tipo: "ACCION", orden: 240
  }, {
    codigo: "PUBLICAR_LISTA_PRECIO", nombre: "Publicar lista aprobada", tipo: "ACCION", orden: 250
  }, {
    codigo: "DESCARGAR_SOLICITUD_PRECIO", nombre: "Descargar solicitudes y observaciones", tipo: "ACCION", orden: 260
  }, {
    codigo: "DESCARGAR_CONSOLIDADO_PENDIENTES", nombre: "Descargar consolidado de pendientes", tipo: "ACCION", orden: 270
  }, {
    codigo: "REASIGNAR_REVISION_PRECIO", nombre: "Reasignar revisión", tipo: "ACCION", orden: 280
  }, {
    codigo: "ANULAR_SOLICITUD_PRECIO", nombre: "Anular solicitud", tipo: "ACCION", orden: 290
  }]);
}

/** @private */
function sembrarCatalogosInicialesMaterialesPrecios_() {
  asegurarColumnasCatalogosAppPaso25B_();
  asegurarCatalogoAppPrecio_("MP_NEGOCIOS", "Materiales y precios - Negocios", "Negocios disponibles para materiales y listas de precios.");
  asegurarCatalogoAppPrecio_("MP_PRODUCTOS_PRINCIPALES", "Materiales y precios - Productos principales", "Jerarquía general del material: Producto, Servicio o Trabajo.");
  asegurarCatalogoAppPrecio_("MP_TIPOS_MATERIAL", "Materiales y precios - Tipos de material", "Clasificación dependiente del producto principal.");
  asegurarCatalogoAppPrecio_("MP_SUBTIPOS_MATERIAL", "Materiales y precios - Subtipos de material", "Clasificación específica dependiente del tipo.");
  asegurarCatalogoAppPrecio_("MP_MARCAS", "Materiales y precios - Marcas", "Marcas comerciales.");
  asegurarCatalogoAppPrecio_("MP_UNIDADES_MEDIDA", "Materiales y precios - Unidades de medida", "Unidades para materiales.");
  asegurarCatalogoAppPrecio_("MP_ESTADOS_MATERIAL", "Materiales y precios - Estados de material", "Estados operativos de materiales.");
  asegurarCatalogoAppPrecio_("MP_TIPOS_LISTA_PRECIO", "Materiales y precios - Tipos de lista", "Alcances de listas de precio.");
  asegurarCatalogoAppPrecio_("MP_ESTADOS_SOLICITUD_PRECIO", "Materiales y precios - Estados de solicitud", "Estados de revisión de listas.");

  asegurarValorCatalogoAppPrecio_(
    "MP_NEGOCIOS",
    "GASODOMESTICOS",
    "Gasodomésticos",
    10,
    "",
    "",
    { negocio: "GASODOMESTICOS" }
  );

  MP_ARBOL_TIPIFICACION_PASO_28D.PRODUCTOS.forEach(function(item, index) {
    asegurarValorCatalogoAppPrecio_(
      "MP_PRODUCTOS_PRINCIPALES",
      item.codigo,
      item.nombre,
      (index + 1) * 10,
      "MP_NEGOCIOS",
      "GASODOMESTICOS",
      { negocio: "GASODOMESTICOS", nivel: "PRODUCTO_PRINCIPAL" }
    );
  });

  MP_ARBOL_TIPIFICACION_PASO_28D.TIPOS.forEach(function(item, index) {
    asegurarValorCatalogoAppPrecio_(
      "MP_TIPOS_MATERIAL",
      item.codigo,
      item.nombre,
      (index + 1) * 10,
      "MP_PRODUCTOS_PRINCIPALES",
      item.producto,
      { productoPrincipal: item.producto, nivel: "TIPO_MATERIAL" }
    );
  });

  MP_ARBOL_TIPIFICACION_PASO_28D.SUBTIPOS.forEach(function(item, index) {
    asegurarValorCatalogoAppPrecio_(
      "MP_SUBTIPOS_MATERIAL",
      item.codigo,
      item.nombre,
      (index + 1) * 10,
      "MP_TIPOS_MATERIAL",
      item.tipo,
      {
        productoPrincipal: item.producto,
        tipoMaterial: item.tipo,
        nivel: "SUBTIPO_MATERIAL"
      }
    );
  });

  asegurarValorCatalogoAppPrecio_("MP_MARCAS", "SIN_MARCA", "Sin marca", 10, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_UNIDADES_MEDIDA", "UN", "Unidad", 10, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_ESTADOS_MATERIAL", "ACTIVO", "Activo", 10, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_ESTADOS_MATERIAL", "INACTIVO", "Inactivo", 20, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_TIPOS_LISTA_PRECIO", "GENERAL", "General", 10, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_TIPOS_LISTA_PRECIO", "OFICINA", "Oficina", 20, "", "", {});
  asegurarValorCatalogoAppPrecio_("MP_TIPOS_LISTA_PRECIO", "GRUPO", "Grupo", 30, "", "", {});
  Object.keys(MP_MODULO_SGT360.ESTADOS_SOLICITUD).forEach(function(clave, index) {
    const codigo = MP_MODULO_SGT360.ESTADOS_SOLICITUD[clave];
    asegurarValorCatalogoAppPrecio_("MP_ESTADOS_SOLICITUD_PRECIO", codigo, codigo.replace(/_/g, " "), (index + 1) * 10, "", "", {});
  });
}

/** Resumen del módulo. Optimizado con caché corta para mejorar la experiencia de carga. */

function esListaOficialPublicadaPrecio_(lista) {
  lista = lista || {};
  const origen = normalizarTexto(lista.origenCarga || lista.ORIGEN_CARGA || lista.origen || lista.ORIGEN || "");
  const idSolicitud = String(lista.idSolicitudOrigen || lista.ID_SOLICITUD_ORIGEN || lista.idSolicitud || lista.ID_SOLICITUD || "").trim();
  const origenOficial = ["SOLICITUD_PROVEEDOR", "LISTA_PROVEEDOR", "PUBLICACION_LISTA", "CARGA_LISTA", "LISTA_OFICIAL"].indexOf(origen) !== -1;
  return Boolean(idSolicitud) || origenOficial;
}

function esListaPrecioIndividual_(lista) {
  lista = lista || {};
  if (esListaOficialPublicadaPrecio_(lista)) return false;
  const origen = normalizarTexto(lista.origenCarga || lista.ORIGEN_CARGA || lista.origen || lista.ORIGEN || "");
  const nombre = normalizarTexto(lista.nombre || lista.NOMBRE || "");
  return origen === "" || origen === "MANUAL" || origen === "CARGA_INDIVIDUAL" || origen === "PRECIO_INDIVIDUAL" ||
    nombre.indexOf("PRECIO INDIVIDUAL") === 0 || nombre.indexOf("PRECIO MATERIAL") === 0 ||
    nombre.indexOf("LISTA GENERAL POR MATERIAL") === 0;
}

function filtrarListasOficialesNoIndividualesPrecio_(registros) {
  return (Array.isArray(registros) ? registros : []).filter(function(item) {
    return esListaOficialPublicadaPrecio_(item);
  });
}

function obtenerResumenMaterialesPreciosModulo() {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("VER_RESUMEN", usuario);
  const alcanceGlobal = esAccesoGlobalMaterialesPrecios_(usuario);
  const idProveedor = String(usuario.idProveedor || "").trim();
  const claveCache = construirClaveCacheMotor_(
    "MP_SUMMARY_V4",
    [obtenerVersionCacheMaterialesPrecios_(), obtenerVersionCachePreciosMateriales_(), alcanceGlobal ? "ALL" : idProveedor || "PROPIO"].join("_")
  );
  const cacheado = obtenerCacheJsonMotor_(claveCache);
  if (cacheado && cacheado.correcto === true) return cacheado;

  let materiales = contarRegistrosHojaPrecioRapido_(MP_MODULO_SGT360.HOJAS.MATERIALES);
  let materialesActivos = contarEstadoHojaPrecioRapido_(MP_MODULO_SGT360.HOJAS.MATERIALES, CONFIG.ESTADOS.ACTIVO);
  let listasVisibles = filtrarListasOficialesNoIndividualesPrecio_(construirVistaListasPreciosCache_());
  let listasOficiales = listasVisibles.length;
  let listasActivas = listasVisibles.filter(function(item) {
    return normalizarTexto(item.estado || item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  }).length;
  let preciosActivos = construirVistaPreciosDetalleUsuario_(usuario).filter(function(item) {
    return normalizarTexto(item.estado || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  }).length;

  if (!alcanceGlobal) {
    const vistaMateriales = filtrarMaterialesPorAlcancePrecios_(construirVistaMaterialesPreciosCache_(), usuario);
    materiales = vistaMateriales.length;
    materialesActivos = vistaMateriales.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).length;
    listasVisibles = filtrarListasOficialesNoIndividualesPrecio_(filtrarListasPreciosPorAlcance_(construirVistaListasPreciosCache_(), usuario));
    listasOficiales = listasVisibles.length;
    listasActivas = listasVisibles.filter(function(item) {
      return item.estado === CONFIG.ESTADOS.ACTIVO;
    }).length;
  }

  const resumen = {
    correcto: true,
    generadoEn: new Date().toISOString(),
    alcance: alcanceGlobal ? "GLOBAL" : "PROVEEDOR",
    materiales: materiales,
    materialesActivos: materialesActivos,
    listasOficiales: listasOficiales,
    listasActivas: listasActivas,
    preciosActivos: preciosActivos,
    solicitudesPendientes: contarSolicitudesPendientesPrecioRapido_(usuario),
    solicitudesAprobadas: contarSolicitudesEstadoPrecioRapido_(usuario, MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO),
    moneda: MP_MODULO_SGT360.MONEDA
  };
  guardarCacheJsonMotor_(claveCache, resumen, 120);
  return resumen;
}
function contarRegistrosHojaPrecioRapido_(nombreHoja) {
  const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, false);
  if (!hoja) return 0;
  return Math.max(0, hoja.getLastRow() - 1);
}

function contarEstadoHojaPrecioRapido_(nombreHoja, estadoObjetivo) {
  const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, false);
  if (!hoja || hoja.getLastRow() < 2 || hoja.getLastColumn() < 1) return 0;
  const cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
  const mapa = crearMapaCabeceras(cabeceras);
  if (typeof mapa.ESTADO !== "number") return 0;
  const valores = hoja.getRange(2, mapa.ESTADO + 1, hoja.getLastRow() - 1, 1).getDisplayValues();
  const estado = normalizarTexto(estadoObjetivo);
  return valores.filter(function(fila) { return normalizarTexto(fila[0]) === estado; }).length;
}

function contarSolicitudesPendientesPrecioRapido_(usuario) {
  const pendientes = ["CARGADO", "OBSERVADO_POR_SISTEMA", "PENDIENTE_REVISION", "EN_REVISION", "OBSERVADO_POR_REVISOR"];
  return contarSolicitudesPorEstadosPrecioRapido_(usuario, pendientes);
}

function contarSolicitudesEstadoPrecioRapido_(usuario, estado) {
  return contarSolicitudesPorEstadosPrecioRapido_(usuario, [estado]);
}

function contarSolicitudesPorEstadosPrecioRapido_(usuario, estados) {
  const hoja = obtenerHojaMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, false);
  if (!hoja || hoja.getLastRow() < 2 || hoja.getLastColumn() < 1) return 0;
  const puedeVerTodas = tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario);
  const proveedorUsuario = String(usuario.idProveedor || "").trim();
  if (!puedeVerTodas && !proveedorUsuario) return 0;
  const cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
  const mapa = crearMapaCabeceras(cabeceras);
  if (typeof mapa.ESTADO !== "number") return 0;
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getDisplayValues();
  const estadosObjetivo = (estados || []).map(normalizarTexto);
  return datos.filter(function(fila) {
    const estado = normalizarTexto(fila[mapa.ESTADO]);
    if (estadosObjetivo.indexOf(estado) === -1) return false;
    if (puedeVerTodas) return true;
    return typeof mapa.ID_PROVEEDOR === "number" && String(fila[mapa.ID_PROVEEDOR] || "").trim() === proveedorUsuario;
  }).length;
}

/** Opciones para formularios del módulo. Usa caché corta para mejorar la respuesta de modales. */
function obtenerOpcionesMaterialesPreciosModulo(forzarActualizacion) {
  const usuario = obtenerUsuarioActual();
  if (!["VER_MATERIALES", "CREAR_MATERIAL", "EDITAR_MATERIAL", "VER_PRECIOS", "VER_LISTAS_OFICIALES", "CARGAR_LISTA_PRECIO", "CARGAR_LISTA_PRECIO_ADMIN", "VER_SOLICITUDES_PRECIO", "VER_CATALOGOS"].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  })) {
    throw new Error("No tienes permiso para consultar opciones de Materiales y Precios.");
  }
  const base = obtenerOpcionesBaseMaterialesPreciosCache_(Boolean(forzarActualizacion));
  const salida = JSON.parse(JSON.stringify(base || {}));
  salida.proveedorUsuario = String(usuario.idProveedor || "").trim();
  salida.puedeSeleccionarProveedor = tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", usuario) || tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", usuario) || tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario);
  if (salida.proveedorUsuario && !salida.puedeSeleccionarProveedor) {
    salida.proveedores = (salida.proveedores || []).filter(function(item) {
      return String(item.id || "").trim() === salida.proveedorUsuario;
    });
  }
  return salida;
}

function obtenerRevisionOpcionesMaterialesPreciosPaso28O_() {
  const propiedades = PropertiesService.getScriptProperties();
  return String(
    propiedades.getProperty("SGT360_MP_OPTIONS_REVISION_V1") ||
    "1"
  ).trim();
}

function marcarRevisionOpcionesMaterialesPreciosPaso28O_() {
  const revision = [
    new Date().toISOString(),
    Utilities.getUuid().slice(0, 8)
  ].join("|");

  PropertiesService.getScriptProperties().setProperty(
    "SGT360_MP_OPTIONS_REVISION_V1",
    revision
  );

  return revision;
}

function obtenerOpcionesBaseMaterialesPreciosCache_(forzarActualizacion) {
  const claveCache = construirClaveCacheMotor_(
    "MP_OPTIONS_BASE_V11",
    obtenerRevisionOpcionesMaterialesPreciosPaso28O_()
  );

  if (!forzarActualizacion) {
    const cacheado = obtenerCacheJsonMotor_(claveCache);
    if (cacheado) return cacheado;
  }

  const codigosCatalogo = [
    "MP_NEGOCIOS",
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL",
    "MP_MARCAS",
    "MP_UNIDADES_MEDIDA",
    "MP_ESTADOS_MATERIAL",
    "MP_TIPOS_LISTA_PRECIO",
    "MP_ESTADOS_SOLICITUD_PRECIO"
  ];

  const catalogos = listarValoresCatalogosAppPrecioEnBloque_(codigosCatalogo);

  const opciones = {
    negocios: catalogos.MP_NEGOCIOS || [],
    productos: ordenarOpcionesCatalogoAlfabeticamente_(catalogos.MP_PRODUCTOS_PRINCIPALES || []),
    tipos: ordenarOpcionesCatalogoAlfabeticamente_(catalogos.MP_TIPOS_MATERIAL || []),
    subtipos: ordenarOpcionesCatalogoAlfabeticamente_(catalogos.MP_SUBTIPOS_MATERIAL || []),
    marcas: ordenarOpcionesCatalogoAlfabeticamente_(catalogos.MP_MARCAS || []),
    unidades: ordenarOpcionesCatalogoAlfabeticamente_(catalogos.MP_UNIDADES_MEDIDA || []),
    estadosMaterial: catalogos.MP_ESTADOS_MATERIAL || [],
    tiposLista: catalogos.MP_TIPOS_LISTA_PRECIO || [],
    estadosSolicitud: catalogos.MP_ESTADOS_SOLICITUD_PRECIO || [],
    proveedores: obtenerProveedoresActivosOpciones_(),
    oficinas: obtenerOficinasActivasOpciones_(),
    grupos: obtenerGruposActivosOpciones_(),
    materiales: [],
    moneda: MP_MODULO_SGT360.MONEDA
  };

  // La clave incluye la revisión global, por lo que un cambio de datos genera
  // automáticamente otra entrada. Podemos conservarla más tiempo sin arriesgar
  // que los formularios lean catálogos obsoletos.
  guardarCacheJsonMotor_(claveCache, opciones, 300);
  return opciones;
}

function invalidarCacheOpcionesMaterialesPrecios_() {
  try {
    marcarVersionCacheMaterialesPrecios_();
    marcarRevisionOpcionesMaterialesPreciosPaso28O_();
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V5");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V6");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V7");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V8");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V9");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V10");
    eliminarCacheMotor_("SGT360_MP_OPTIONS_BASE_V11");
    eliminarCacheMotor_(MP_GUARDADO_MATERIAL_RAPIDO_PASO_28I.CLAVE_CACHE_ARBOL);
    eliminarCacheMotor_("SGT360_MP_VISTA_MATERIALES_V1");
    eliminarCacheMotor_("SGT360_MP_VISTA_LISTAS_V1");
    eliminarCacheMotor_("SGT360_MP_VISTA_LISTAS_V2");
    eliminarCacheMotor_("SGT360_MP_VISTA_LISTAS_V3");
  } catch (error) {}
}

/** Limpia caché del módulo desde el botón Actualizar sin reinstalar estructuras. */
function limpiarCacheMaterialesPreciosModulo() {
  const usuario = obtenerUsuarioActual();
  if (!["VISUALIZAR_MODULO", "VER_RESUMEN", "VER_MATERIALES", "VER_PRECIOS", "VER_LISTAS_OFICIALES", "VER_MIS_LISTAS_PRECIO"].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  })) {
    throw new Error("No tienes permiso para actualizar Materiales y Precios.");
  }
  invalidarCacheOpcionesMaterialesPrecios_();
  marcarVersionCachePreciosMateriales_();
  return {
    correcto: true,
    revision: obtenerRevisionDatosMotor_(),
    mensaje: "Caché de Materiales y Precios limpiada."
  };
}

/** Lista materiales universales. */
function listarMaterialesPrecioModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("VER_MATERIALES", usuario);
  filtros = filtros || {};
  const filtrosCache = {
    texto: String(filtros.texto || ""),
    estado: normalizarTexto(filtros.estado || "TODOS"),
    idNegocio: String(filtros.idNegocio || "").trim(),
    pagina: Number(filtros.pagina || 1),
    tamano: Number(filtros.tamano || 30)
  };
  const claveCache = obtenerClaveCachePaginaMaterialesPrecios_("MP_LISTA_MATERIALES_PAG_V1", usuario, filtrosCache, obtenerVersionCacheMaterialesPrecios_());
  if (!filtros.forzarActualizacion) {
    const cacheado = obtenerCacheJsonMotor_(claveCache);
    if (cacheado && cacheado.correcto === true) return cacheado;
  }

  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  const idNegocio = String(filtros.idNegocio || "").trim();
  const relNegocios = idNegocio ? leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL) : [];
  let registros = filtrarMaterialesPorAlcancePrecios_(construirVistaMaterialesPreciosCache_(), usuario);
  if (idNegocio) {
    const materialesNegocio = {};
    relNegocios.forEach(function(rel) {
      if (String(rel.ID_NEGOCIO || "").trim() === idNegocio && normalizarTexto(rel.ESTADO) === CONFIG.ESTADOS.ACTIVO) {
        materialesNegocio[String(rel.ID_MATERIAL || "").trim()] = true;
      }
    });
    registros = registros.filter(function(item) { return materialesNegocio[item.idMaterial]; });
  }
  if (estado && estado !== "TODOS") registros = registros.filter(function(item) { return item.estado === estado; });
  if (texto) {
    registros = registros.filter(function(item) {
      return [item.codigoMaterial, item.codigoSap, item.nombreMaterial, item.descripcionMaterial, item.producto, item.tipo, item.subtipo, item.marca].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  registros.sort(function(a, b) {
    return compararTextoMotor_(a.producto, b.producto) || compararTextoMotor_(a.descripcionMaterial, b.descripcionMaterial);
  });
  const resultado = paginarConResumenPrecios_(registros, filtros, {
    total: registros.length,
    activos: registros.filter(function(item) { return item.estado === CONFIG.ESTADOS.ACTIVO; }).length,
    combos: registros.filter(function(item) { return item.esCombo === true; }).length
  });
  resultado.correcto = true;
  resultado.cacheServidor = false;
  guardarCacheJsonMotor_(claveCache, resultado, 300);
  return resultado;
}

/** Lista materiales para selectores de precio individual sin cargar todos los catálogos del módulo. */
function listarMaterialesSelectPreciosModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  if (!["VER_MATERIALES", "VER_PRECIOS", "CREAR_PRECIO_INDIVIDUAL", "CREAR_LISTA_OFICIAL", "EDITAR_LISTA_OFICIAL"].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  })) {
    throw new Error("No tienes permiso para consultar materiales.");
  }
  filtros = filtros || {};
  const texto = normalizarTexto(filtros.texto || "");
  const limite = Math.max(20, Math.min(Number(filtros.limite) || 150, 300));
  if (!texto || texto.length < 2) {
    return { correcto: true, registros: [], totalFiltrado: 0, limite: limite, mensaje: "Escribe al menos 2 caracteres para buscar materiales." };
  }
  const filtrosCache = { texto: texto, limite: limite };
  const claveCache = obtenerClaveCachePaginaMaterialesPrecios_("MP_SELECT_MATERIALES_V1", usuario, filtrosCache, obtenerVersionCacheMaterialesPrecios_());
  if (!filtros.forzarActualizacion) {
    const cacheado = obtenerCacheJsonMotor_(claveCache);
    if (cacheado && cacheado.correcto === true) return cacheado;
  }
  let registros = filtrarMaterialesPorAlcancePrecios_(construirVistaMaterialesPreciosCache_(), usuario).filter(function(item) {
    return item.estado === CONFIG.ESTADOS.ACTIVO;
  });
  registros = registros.filter(function(item) {
    return [item.codigoMaterial, item.codigoSap, item.descripcionMaterial, item.nombreMaterial, item.producto, item.tipo, item.subtipo, item.marca].some(function(valor) {
      return normalizarTexto(valor).indexOf(texto) !== -1;
    });
  });
  registros.sort(function(a, b) {
    return compararTextoMotor_(a.descripcionMaterial, b.descripcionMaterial) || compararTextoMotor_(a.codigoMaterial, b.codigoMaterial);
  });
  const resultado = {
    correcto: true,
    registros: registros.slice(0, limite).map(function(item) {
      return {
        id: item.idMaterial,
        codigo: item.codigoMaterial,
        nombre: [item.codigoMaterial || item.codigoSap || "", item.descripcionMaterial || item.nombreMaterial || ""].filter(Boolean).join(" — ")
      };
    }),
    totalFiltrado: registros.length,
    limite: limite
  };
  guardarCacheJsonMotor_(claveCache, resultado, 300);
  return resultado;
}

/** Exporta materiales con filtros para evitar archivos pesados. */
function exportarMaterialesModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("VER_MATERIALES", usuario);
  filtros = filtros || {};
  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "ACTIVO");
  const idNegocio = String(filtros.idNegocio || "").trim();
  if (!texto && (!estado || estado === "TODOS") && !idNegocio) {
    throw new Error("Aplica al menos un filtro antes de descargar materiales.");
  }
  const relNegocios = idNegocio ? leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL) : [];
  let registros = filtrarMaterialesPorAlcancePrecios_(construirVistaMaterialesPreciosCache_(), usuario);
  if (idNegocio) {
    const materialesNegocio = {};
    relNegocios.forEach(function(rel) {
      if (String(rel.ID_NEGOCIO || "").trim() === idNegocio && normalizarTexto(rel.ESTADO) === CONFIG.ESTADOS.ACTIVO) {
        materialesNegocio[String(rel.ID_MATERIAL || "").trim()] = true;
      }
    });
    registros = registros.filter(function(item) { return materialesNegocio[item.idMaterial]; });
  }
  if (estado && estado !== "TODOS") registros = registros.filter(function(item) { return item.estado === estado; });
  if (texto) {
    registros = registros.filter(function(item) {
      return [item.codigoMaterial, item.codigoSap, item.nombreMaterial, item.descripcionMaterial, item.producto, item.tipo, item.subtipo, item.marca].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  const cabeceras = ["CODIGO_MATERIAL", "CODIGO_SAP", "PRODUCTO_PRINCIPAL", "TIPO_MATERIAL", "SUBTIPO_MATERIAL", "MARCA", "NOMBRE_MATERIAL", "DESCRIPCION_MATERIAL", "UNIDAD_MEDIDA", "ESTADO", "FECHA_ACTUALIZACION"];
  const filas = registros.map(function(item) {
    return [item.codigoMaterial || "", item.codigoSap || "", item.producto || "", item.tipo || "", item.subtipo || "", item.marca || "", item.nombreMaterial || "", item.descripcionMaterial || "", item.unidadMedida || "", item.estado || "", item.fechaActualizacion || ""];
  });
  return {
    correcto: true,
    nombreArchivo: "Materiales_" + Utilities.formatDate(new Date(), MOTOR_SGT360.ZONA_HORARIA, "yyyyMMdd_HHmm") + ".csv",
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(cabeceras, filas, { separador: "," }),
    totalMateriales: filas.length
  };
}


/** @private */
function ordenarOpcionesCatalogoAlfabeticamente_(opciones) {
  return (Array.isArray(opciones) ? opciones : []).slice().sort(function(a, b) {
    return compararTextoMotor_(
      String(a && (a.nombre || a.codigo || a.id) || ""),
      String(b && (b.nombre || b.codigo || b.id) || "")
    );
  });
}

/** @private */
function validarRelacionArbolOpcionesMaterialPrecio_(producto, tipo, subtipo) {
  if (!producto || !tipo || !subtipo) {
    throw new Error("La clasificación Producto principal → Tipo → Subtipo está incompleta.");
  }

  const codigoProducto = normalizarTexto(producto.id || producto.codigo || "");
  const codigoTipo = normalizarTexto(tipo.id || tipo.codigo || "");
  const codigoSubtipo = normalizarTexto(subtipo.id || subtipo.codigo || "");

  if (!codigoProducto || !codigoTipo || !codigoSubtipo) {
    throw new Error("La clasificación contiene códigos vacíos.");
  }

  const clavePadreTipo = normalizarTexto(tipo.clavePadre || "");
  const valorPadreTipo = normalizarTexto(tipo.valorPadre || "");
  if (
    clavePadreTipo !== "MP_PRODUCTOS_PRINCIPALES" ||
    valorPadreTipo !== codigoProducto
  ) {
    throw new Error(
      "El tipo " + (tipo.nombre || codigoTipo) +
      " no pertenece al producto principal " + (producto.nombre || codigoProducto) + "."
    );
  }

  const clavePadreSubtipo = normalizarTexto(subtipo.clavePadre || "");
  const valorPadreSubtipo = normalizarTexto(subtipo.valorPadre || "");
  if (
    clavePadreSubtipo !== "MP_TIPOS_MATERIAL" ||
    valorPadreSubtipo !== codigoTipo
  ) {
    throw new Error(
      "El subtipo " + (subtipo.nombre || codigoSubtipo) +
      " no pertenece al tipo " + (tipo.nombre || codigoTipo) + "."
    );
  }

  const productoMetadataSubtipo = normalizarTexto(
    subtipo.metadata && (
      subtipo.metadata.productoPrincipal ||
      subtipo.metadata.producto ||
      subtipo.metadata.PRODUCTO_PRINCIPAL
    ) || ""
  );
  if (
    productoMetadataSubtipo &&
    productoMetadataSubtipo !== codigoProducto
  ) {
    throw new Error(
      "El subtipo " + (subtipo.nombre || codigoSubtipo) +
      " no pertenece al producto principal seleccionado."
    );
  }

  return true;
}

/** @private */
function validarArbolTipificacionMaterialPrecio_(idProducto, idTipo, idSubtipo, catalogos) {
  const grupos = catalogos || listarValoresCatalogosAppPrecioEnBloque_([
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL"
  ]);

  const productoBuscado = normalizarTexto(idProducto || "");
  const tipoBuscado = normalizarTexto(idTipo || "");
  const subtipoBuscado = normalizarTexto(idSubtipo || "");

  const producto = (grupos.MP_PRODUCTOS_PRINCIPALES || []).find(function(item) {
    return normalizarTexto(item.id || item.codigo || "") === productoBuscado;
  }) || null;
  const tipo = (grupos.MP_TIPOS_MATERIAL || []).find(function(item) {
    return normalizarTexto(item.id || item.codigo || "") === tipoBuscado;
  }) || null;
  const subtipo = (grupos.MP_SUBTIPOS_MATERIAL || []).find(function(item) {
    return normalizarTexto(item.id || item.codigo || "") === subtipoBuscado;
  }) || null;

  if (!producto) throw new Error("El producto principal seleccionado no existe o está inactivo.");
  if (!tipo) throw new Error("El tipo seleccionado no existe o está inactivo.");
  if (!subtipo) throw new Error("El subtipo seleccionado no existe o está inactivo.");

  validarRelacionArbolOpcionesMaterialPrecio_(producto, tipo, subtipo);

  return {
    producto: producto,
    tipo: tipo,
    subtipo: subtipo
  };
}

/** Crea o actualiza material universal y sus relaciones de negocio/proveedor. */
function obtenerCatalogosArbolGuardadoMaterialRapido_() {
  const clave = MP_GUARDADO_MATERIAL_RAPIDO_PASO_28I.CLAVE_CACHE_ARBOL;
  const cacheado = obtenerCacheJsonMotor_(clave);
  if (cacheado) return cacheado;

  const grupos = listarValoresCatalogosAppPrecioEnBloque_([
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL"
  ]);

  guardarCacheJsonMotor_(
    clave,
    grupos,
    MP_GUARDADO_MATERIAL_RAPIDO_PASO_28I.TTL_ARBOL_SEGUNDOS
  );

  return grupos;
}

/** @private */
function buscarEstadoGuardadoMaterialRapido_(idMaterial, codigoMaterial, codigoSap) {
  const idBuscado = String(idMaterial || "").trim();
  const codigoBuscado = normalizarTexto(codigoMaterial || "");
  const sapBuscado = normalizarTexto(codigoSap || "");
  const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES);

  let existente = null;
  let duplicado = null;

  for (let i = 0; i < materiales.length; i++) {
    const item = materiales[i] || {};
    const idActual = String(item.ID_MATERIAL || "").trim();

    if (idBuscado && idActual === idBuscado) {
      existente = item;
      continue;
    }

    if (
      (codigoBuscado && normalizarTexto(item.CODIGO_MATERIAL || "") === codigoBuscado) ||
      (
        sapBuscado &&
        sapBuscado !== "EN CREACION" &&
        normalizarTexto(item.CODIGO_SAP || "") === sapBuscado
      )
    ) {
      duplicado = item;
      break;
    }
  }

  return {
    existente: existente,
    duplicado: duplicado
  };
}

/** Crea o actualiza material universal y su relación de negocio. Paso 28J: sin proveedor en Materiales. */
function guardarMaterialPrecioModulo(datos) {
  datos = datos || {};
  const usuario = obtenerUsuarioActual();
  const idMaterial = String(datos.idMaterial || "").trim();

  exigirPermisoMaterialesPrecios_(
    idMaterial ? "EDITAR_MATERIAL" : "CREAR_MATERIAL",
    usuario
  );

  // La estructura se instala/migra fuera del guardado transaccional. Recorrer todas
  // las hojas en cada clic era uno de los principales costos del guardado individual.
  const ahora = new Date();
  const codigoMaterial = limpiarTextoMotor_(
    datos.codigoMaterial || generarCodigoMaterialUnicoPrecio_(),
    80
  );
  const codigoSap = limpiarTextoMotor_(datos.codigoSap || "", 80);
  const descripcion = limpiarTextoMotor_(
    datos.descripcionMaterial || datos.nombreMaterial || "",
    500
  );
  const idNegocio = String(datos.idNegocio || "").trim();

  if (!descripcion) throw new Error("La descripción del material es obligatoria.");
  if (!idNegocio) throw new Error("Selecciona el negocio del material.");
  if (!String(datos.idProducto || "").trim()) throw new Error("Selecciona el producto principal.");
  if (!String(datos.idTipoMaterial || "").trim()) throw new Error("Selecciona el tipo de material.");
  if (!String(datos.idSubtipoMaterial || "").trim()) throw new Error("Selecciona el subtipo de material.");

  const catalogosArbol = obtenerCatalogosArbolGuardadoMaterialRapido_();
  const tipificacion = validarArbolTipificacionMaterialPrecio_(
    datos.idProducto,
    datos.idTipoMaterial,
    datos.idSubtipoMaterial,
    catalogosArbol
  );

  // Una sola lectura de MAE_MATERIALES resuelve edición y duplicados.
  const estadoActual = buscarEstadoGuardadoMaterialRapido_(
    idMaterial,
    codigoMaterial,
    codigoSap
  );
  const existente = estadoActual.existente;

  if (idMaterial && !existente) {
    throw new Error("No se encontró el material que intentas modificar. Actualiza el listado e inténtalo nuevamente.");
  }
  if (estadoActual.duplicado) {
    throw new Error("Ya existe otro material con el mismo código interno o SAP.");
  }

  const objeto = {
    ID_MATERIAL: existente ? existente.ID_MATERIAL : generarIdMotor_("MAT"),
    CODIGO_MATERIAL: codigoMaterial,
    CODIGO_SAP: codigoSap,
    ID_PRODUCTO: tipificacion.producto.id,
    ID_TIPO_MATERIAL: tipificacion.tipo.id,
    ID_SUBTIPO_MATERIAL: tipificacion.subtipo.id,
    ID_MARCA: String(datos.idMarca || "").trim(),
    NOMBRE_MATERIAL: limpiarTextoMotor_(datos.nombreMaterial || descripcion, 240),
    DESCRIPCION_MATERIAL: descripcion,
    UNIDAD_MEDIDA: limpiarTextoMotor_(datos.unidadMedida || "UN", 20),
    ES_COMBO: "NO",
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };

  if (!existente) objeto.FECHA_CREACION = ahora;

  guardarObjetoMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    MP_MODULO_SGT360.HOJAS.MATERIALES,
    "ID_MATERIAL",
    objeto
  );

  asegurarRelacionNegocioMaterialPrecio_(
    idNegocio,
    objeto.ID_MATERIAL,
    usuario
  );


  registrarCambioMotor_(
    MP_MODULO_SGT360.CODIGO,
    existente ? "EDITAR_MATERIAL" : "CREAR_MATERIAL",
    "MATERIAL",
    objeto.ID_MATERIAL,
    {
      codigoMaterial: objeto.CODIGO_MATERIAL,
      codigoSap: objeto.CODIGO_SAP
    }
  );

  // Un material nuevo no cambia Producto/Tipo/Subtipo/Marca/Unidad. Por ello no
  // se elimina la caché de opciones. Solo se versionan las vistas afectadas.
  marcarVersionCacheMaterialesPrecios_();
  marcarVersionCachePreciosMateriales_();

  return {
    correcto: true,
    idMaterial: objeto.ID_MATERIAL,
    codigoMaterial: objeto.CODIGO_MATERIAL,
    codigoSap: objeto.CODIGO_SAP,
    idNegocio: idNegocio,
    idProducto: objeto.ID_PRODUCTO,
    idTipoMaterial: objeto.ID_TIPO_MATERIAL,
    idSubtipoMaterial: objeto.ID_SUBTIPO_MATERIAL,
    idMarca: objeto.ID_MARCA,
    nombreMaterial: objeto.NOMBRE_MATERIAL,
    descripcionMaterial: objeto.DESCRIPCION_MATERIAL,
    unidadMedida: objeto.UNIDAD_MEDIDA,
    estado: objeto.ESTADO,
    creado: !existente,
    revision: obtenerRevisionDatosMotor_(),
    mensaje: existente ? "Material actualizado correctamente." : "Material creado correctamente."
  };
}

/** Cambia estado del material. */
function cambiarEstadoMaterialPrecioModulo(idMaterial, estado) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("CAMBIAR_ESTADO_MATERIAL", usuario);
  const material = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", idMaterial);
  if (!material) throw new Error("No se encontró el material.");
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", {
    ID_MATERIAL: material.ID_MATERIAL,
    ESTADO: normalizarTexto(estado || CONFIG.ESTADOS.INACTIVO),
    FECHA_ACTUALIZACION: new Date(),
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  });
  invalidarCacheOpcionesMaterialesPrecios_();
  return { correcto: true, idMaterial: material.ID_MATERIAL, estado: normalizarTexto(estado || CONFIG.ESTADOS.INACTIVO) };
}


/** Lista proveedores habilitados e inactivos asociados a un material. */
function listarProveedoresMaterialPrecioModulo(idMaterial) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("VER_MATERIALES", usuario);
  asegurarEstructuraMaterialesPrecios_();
  idMaterial = String(idMaterial || "").trim();
  if (!idMaterial) throw new Error("Selecciona el material.");
  const material = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", idMaterial);
  if (!material) throw new Error("No se encontró el material.");
  if (!materialEsVisibleParaUsuarioPrecio_(idMaterial, usuario)) {
    throw new Error("No tienes acceso al material solicitado.");
  }

  const proveedoresMaestro = leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES, { usarValoresMostrados: true });
  const proveedoresPorId = {};
  proveedoresMaestro.forEach(function(item) {
    const id = String(item.ID_PROVEEDOR || "").trim();
    if (!id) return;
    proveedoresPorId[id] = {
      id: id,
      codigo: String(item.CODIGO_SAP || item.RUC || item.ID_PROVEEDOR || "").trim(),
      nombre: String(item.NOMBRE_COMERCIAL || item.RAZON_SOCIAL || item.NOMBRE || id).trim(),
      estado: normalizarTexto(item.ESTADO || "")
    };
  });

  const relaciones = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL).filter(function(item) {
    return String(item.ID_MATERIAL || "").trim() === idMaterial;
  }).map(function(item) {
    const proveedor = proveedoresPorId[String(item.ID_PROVEEDOR || "").trim()] || {};
    return {
      idRelacion: String(item.ID_RELACION || "").trim(),
      idProveedor: String(item.ID_PROVEEDOR || "").trim(),
      proveedor: proveedor.nombre || String(item.ID_PROVEEDOR || "").trim(),
      codigoProveedor: proveedor.codigo || String(item.CODIGO_SAP_PROVEEDOR || item.CODIGO_MATERIAL_PROVEEDOR || "").trim(),
      estado: normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO),
      fechaActualizacion: normalizarFechaSalidaPrecio_(item.FECHA_ACTUALIZACION || item.FECHA_CREACION || "")
    };
  }).sort(function(a, b) {
    return compararTextoMotor_(a.proveedor, b.proveedor);
  });

  const proveedoresActivosRelacion = {};
  relaciones.forEach(function(item) {
    if (item.estado === CONFIG.ESTADOS.ACTIVO) proveedoresActivosRelacion[item.idProveedor] = true;
  });
  const puedeEditar = tienePermisoMaterialesPrecios_("EDITAR_MATERIAL", usuario);
  const disponibles = puedeEditar ? Object.keys(proveedoresPorId).map(function(id) { return proveedoresPorId[id]; }).filter(function(item) {
    return item.estado === CONFIG.ESTADOS.ACTIVO && !proveedoresActivosRelacion[item.id];
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); }) : [];

  return {
    correcto: true,
    material: {
      idMaterial: String(material.ID_MATERIAL || "").trim(),
      codigoMaterial: String(material.CODIGO_MATERIAL || "").trim(),
      codigoSap: String(material.CODIGO_SAP || "").trim(),
      descripcionMaterial: String(material.DESCRIPCION_MATERIAL || material.NOMBRE_MATERIAL || "").trim()
    },
    proveedoresAsociados: relaciones,
    proveedoresDisponibles: disponibles
  };
}

/** Asocia o reactiva un proveedor para un material. */
function asociarProveedorMaterialPrecioModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("EDITAR_MATERIAL", usuario);
  asegurarEstructuraMaterialesPrecios_();
  datos = datos || {};
  const idMaterial = String(datos.idMaterial || "").trim();
  const idProveedor = String(datos.idProveedor || usuario.idProveedor || "").trim();
  if (!idMaterial) throw new Error("Selecciona el material.");
  if (!idProveedor) throw new Error("Selecciona el proveedor.");
  const material = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", idMaterial);
  if (!material) throw new Error("No se encontró el material.");
  const proveedor = obtenerProveedorActivoPorIdMaterialPrecio_(idProveedor);
  if (!proveedor) throw new Error("El proveedor no existe o no está activo.");

  const relacion = asegurarRelacionProveedorMaterialPrecio_(
    idProveedor,
    idMaterial,
    datos.codigoMaterialProveedor || "",
    datos.codigoSapProveedor || material.CODIGO_SAP || "",
    usuario
  );
  registrarCambioMotor_(MP_MODULO_SGT360.CODIGO, "ASOCIAR_PROVEEDOR_MATERIAL", "MATERIAL", idMaterial, { idProveedor: idProveedor });
  invalidarCacheOpcionesMaterialesPrecios_();
  return {
    correcto: true,
    idMaterial: idMaterial,
    mensaje: "Proveedor asociado al material.",
    proveedorAsociado: {
      idRelacion: relacion.idRelacion,
      idProveedor: idProveedor,
      proveedor: String(proveedor.NOMBRE_COMERCIAL || proveedor.RAZON_SOCIAL || proveedor.NOMBRE || idProveedor).trim(),
      codigoProveedor: String(proveedor.CODIGO_SAP || proveedor.RUC || proveedor.ID_PROVEEDOR || "").trim(),
      estado: CONFIG.ESTADOS.ACTIVO,
      fechaActualizacion: normalizarFechaSalidaPrecio_(new Date())
    }
  };
}

/** Deshabilita la relación proveedor-material sin borrar histórico. */
function desasociarProveedorMaterialPrecioModulo(idRelacion) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("EDITAR_MATERIAL", usuario);
  asegurarEstructuraMaterialesPrecios_();
  idRelacion = String(idRelacion || "").trim();
  if (!idRelacion) throw new Error("No se indicó la relación.");
  const relacion = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", idRelacion);
  if (!relacion) throw new Error("No se encontró la relación proveedor-material.");
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", {
    ID_RELACION: idRelacion,
    ESTADO: CONFIG.ESTADOS.INACTIVO,
    FECHA_ACTUALIZACION: new Date(),
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  });
  registrarCambioMotor_(MP_MODULO_SGT360.CODIGO, "DESASOCIAR_PROVEEDOR_MATERIAL", "MATERIAL", relacion.ID_MATERIAL, { idProveedor: relacion.ID_PROVEEDOR });
  invalidarCacheOpcionesMaterialesPrecios_();
  return listarProveedoresMaterialPrecioModulo(relacion.ID_MATERIAL);
}

/** Reactiva una relación proveedor-material existente. */
function reactivarProveedorMaterialPrecioModulo(idRelacion) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("EDITAR_MATERIAL", usuario);
  asegurarEstructuraMaterialesPrecios_();
  idRelacion = String(idRelacion || "").trim();
  if (!idRelacion) throw new Error("No se indicó la relación.");
  const relacion = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", idRelacion);
  if (!relacion) throw new Error("No se encontró la relación proveedor-material.");
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", {
    ID_RELACION: idRelacion,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: new Date(),
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  });
  registrarCambioMotor_(MP_MODULO_SGT360.CODIGO, "REACTIVAR_PROVEEDOR_MATERIAL", "MATERIAL", relacion.ID_MATERIAL, { idProveedor: relacion.ID_PROVEEDOR });
  invalidarCacheOpcionesMaterialesPrecios_();
  return listarProveedoresMaterialPrecioModulo(relacion.ID_MATERIAL);
}

/** Guarda un valor de catálogo del módulo en Configuración de la aplicación > Catálogos. */
function guardarCatalogoMaterialesPreciosModulo(tipoCatalogo, datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("EDITAR_CATALOGOS", usuario);
  datos = datos || {};

  const tipo = normalizarTexto(tipoCatalogo);
  const mapa = {
    NEGOCIO: "MP_NEGOCIOS",
    PRODUCTO: "MP_PRODUCTOS_PRINCIPALES",
    TIPO: "MP_TIPOS_MATERIAL",
    SUBTIPO: "MP_SUBTIPOS_MATERIAL",
    MARCA: "MP_MARCAS",
    UNIDAD: "MP_UNIDADES_MEDIDA",
    ESTADO_MATERIAL: "MP_ESTADOS_MATERIAL",
    TIPO_LISTA: "MP_TIPOS_LISTA_PRECIO",
    ESTADO_SOLICITUD: "MP_ESTADOS_SOLICITUD_PRECIO"
  };
  const catalogo = mapa[tipo];
  if (!catalogo) throw new Error("Catálogo no soportado: " + tipoCatalogo);

  asegurarColumnasCatalogosAppPaso25B_();

  let clavePadre = normalizarTexto(datos.clavePadre || "");
  let valorPadre = normalizarTexto(datos.valorPadre || "");
  let metadata = datos.metadata && typeof datos.metadata === "object" ?
    Object.assign({}, datos.metadata) : {};

  if (tipo === "PRODUCTO") {
    clavePadre = "MP_NEGOCIOS";
    valorPadre = normalizarTexto(datos.idNegocio || valorPadre || "GASODOMESTICOS");
    metadata.negocio = valorPadre;
    metadata.nivel = "PRODUCTO_PRINCIPAL";
  }

  if (tipo === "TIPO") {
    valorPadre = normalizarTexto(
      datos.idProducto || datos.idProductoPrincipal || valorPadre
    );
    if (!valorPadre) {
      throw new Error("Selecciona el Producto principal al que pertenecerá el Tipo.");
    }

    const producto = listarValoresCatalogoAppPrecio_("MP_PRODUCTOS_PRINCIPALES").find(function(item) {
      return normalizarTexto(item.id || item.codigo || "") === valorPadre;
    });
    if (!producto) {
      throw new Error("El Producto principal seleccionado no existe o está inactivo.");
    }

    clavePadre = "MP_PRODUCTOS_PRINCIPALES";
    metadata.productoPrincipal = valorPadre;
    metadata.nivel = "TIPO_MATERIAL";
  }

  if (tipo === "SUBTIPO") {
    const idTipo = normalizarTexto(
      datos.idTipo || datos.idTipoMaterial || valorPadre
    );
    if (!idTipo) {
      throw new Error("Selecciona el Tipo al que pertenecerá el Subtipo.");
    }

    const grupos = listarValoresCatalogosAppPrecioEnBloque_([
      "MP_TIPOS_MATERIAL"
    ]);
    const tipoPadre = (grupos.MP_TIPOS_MATERIAL || []).find(function(item) {
      return normalizarTexto(item.id || item.codigo || "") === idTipo;
    }) || null;

    if (!tipoPadre) {
      throw new Error("El Tipo seleccionado no existe o está inactivo.");
    }

    clavePadre = "MP_TIPOS_MATERIAL";
    valorPadre = idTipo;
    metadata.productoPrincipal = normalizarTexto(tipoPadre.valorPadre || "");
    metadata.tipoMaterial = idTipo;
    metadata.nivel = "SUBTIPO_MATERIAL";
  }

  asegurarValorCatalogoAppPrecio_(
    catalogo,
    datos.codigo,
    datos.nombre,
    datos.orden,
    clavePadre,
    valorPadre,
    metadata
  );

  invalidarCacheOpcionesMaterialesPrecios_();

  return listarValoresCatalogoAppPrecio_(catalogo).find(function(item) {
    return item.codigo === normalizarTexto(datos.codigo);
  });
}


/** Lista listas oficiales de precios. */
function listarListasOficialesPreciosModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("VER_LISTAS_OFICIALES", usuario);
  filtros = filtros || {};
  const filtrosCache = {
    texto: String(filtros.texto || ""),
    estado: normalizarTexto(filtros.estado || "TODOS"),
    idNegocio: String(filtros.idNegocio || "").trim(),
    pagina: Number(filtros.pagina || 1),
    tamano: Number(filtros.tamano || 30)
  };
  const claveCache = obtenerClaveCachePaginaMaterialesPrecios_("MP_LISTA_PRECIOS_PAG_V1", usuario, filtrosCache, obtenerVersionCachePreciosMateriales_());
  if (!filtros.forzarActualizacion) {
    const cacheado = obtenerCacheJsonMotor_(claveCache);
    if (cacheado && cacheado.correcto === true) return cacheado;
  }

  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  const idNegocio = String(filtros.idNegocio || "").trim();
  let registros = construirVistaPreciosDetalleUsuario_(usuario);
  if (estado && estado !== "TODOS") {
    registros = registros.filter(function(item) { return item.estado === estado; });
  }
  if (idNegocio) registros = registros.filter(function(item) { return String(item.idNegocio || "").trim() === idNegocio; });
  if (texto) {
    registros = registros.filter(function(item) {
      return [
        item.proveedor, item.negocio, item.alcanceDescripcion, item.codigoSap,
        item.codigoMaterial, item.nombreCortoMaterial, item.detalleCombo, item.codigoPrecio
      ].some(function(valor) { return normalizarTexto(valor).indexOf(texto) !== -1; });
    });
  }
  registros.sort(function(a, b) {
    return compararTextoMotor_(b.fechaInicio, a.fechaInicio) ||
      compararTextoMotor_(a.proveedor, b.proveedor) ||
      compararTextoMotor_(a.nombreCortoMaterial, b.nombreCortoMaterial);
  });
  const resultado = paginarConResumenPrecios_(registros, filtros, { total: registros.length });
  resultado.correcto = true;
  resultado.cacheServidor = false;
  guardarCacheJsonMotor_(claveCache, resultado, 300);
  return resultado;
}

function construirVistaListasPreciosLigeraPaso28O_() {
  const claveCache = construirClaveCacheMotor_(
    "MP_VISTA_LISTAS_LIGERA_V1",
    obtenerVersionCachePreciosMateriales_()
  );

  const cacheado = obtenerCacheJsonMotor_(claveCache);
  if (cacheado) return cacheado;

  const proveedores = mapearOpcionesPorId_(obtenerProveedoresActivosOpciones_());
  const negocios = mapearOpcionesPorId_(listarValoresCatalogoAppPrecio_("MP_NEGOCIOS"));
  const oficinas = mapearOpcionesPorId_(obtenerOficinasActivasOpciones_());
  const grupos = mapearOpcionesPorId_(obtenerGruposActivosOpciones_());

  const vista = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS).map(function(item) {
    const id = String(item.ID_LISTA_PRECIO || "").trim();
    const origenCarga = String(item.ORIGEN_CARGA || item.ORIGEN || "").trim();
    const origen = String(item.ORIGEN || "").trim();
    const nombre = String(item.NOMBRE || "").trim();

    const salida = {
      idListaPrecio: id,
      codigoLista: String(item.CODIGO_LISTA || "").trim(),
      nombre: nombre,
      idProveedor: String(item.ID_PROVEEDOR || "").trim(),
      proveedor: obtenerEtiquetaProveedorListaPrecio_(item.ID_PROVEEDOR, proveedores),
      tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(item.ID_PROVEEDOR),
      idNegocio: String(item.ID_NEGOCIO || "").trim(),
      negocio: obtenerNombreOpcion_(negocios, item.ID_NEGOCIO),
      idOficina: String(item.ID_OFICINA || "").trim(),
      oficina: obtenerNombreOpcion_(oficinas, item.ID_OFICINA),
      idGrupo: String(item.ID_GRUPO || "").trim(),
      grupo: obtenerNombreOpcion_(grupos, item.ID_GRUPO),
      alcance: String(
        item.ALCANCE ||
        determinarAlcanceListaPrecio_({
          idOficina: item.ID_OFICINA,
          idGrupo: item.ID_GRUPO
        })
      ).trim(),
      origenCarga: origenCarga,
      fechaInicio: normalizarFechaSalidaPrecio_(item.FECHA_INICIO),
      fechaFin: normalizarFechaSalidaPrecio_(item.FECHA_FIN),
      moneda: String(item.MONEDA || MP_MODULO_SGT360.MONEDA).trim(),
      estado: normalizarTexto(item.ESTADO),
      prioridad: Number(item.PRIORIDAD) || 0,
      origen: origen,
      materiales: 0
    };

    salida.esListaOficial = esListaOficialPublicadaPrecio_(
      Object.assign({}, item, salida)
    );
    salida.esPrecioIndividual = esListaPrecioIndividual_(
      Object.assign({}, item, salida)
    );

    return salida;
  });

  guardarCacheJsonMotor_(claveCache, vista, 180);
  return vista;
}

function construirVistaPreciosDetalleUsuario_(usuario) {
  const actor = usuario || obtenerUsuarioActual();

  const claveUsuario = [
    String(actor.idUsuario || actor.correo || "GENERAL").trim(),
    String(actor.idProveedor || "").trim(),
    normalizarTexto(actor.rol || "")
  ].join("_");

  const claveCache = construirClaveCacheMotor_(
    "MP_VISTA_PRECIOS_USUARIO_V1",
    [
      claveUsuario,
      obtenerVersionCachePreciosMateriales_(),
      obtenerVersionCacheMaterialesPrecios_()
    ].join("|")
  );

  const cacheado = obtenerCacheJsonMotor_(claveCache);
  if (cacheado) return cacheado;

  const listas = filtrarListasPreciosPorAlcance_(
    construirVistaListasPreciosLigeraPaso28O_(),
    actor
  );

  const listasPorId = {};
  listas.forEach(function(lista) {
    listasPorId[String(lista.idListaPrecio || "").trim()] = lista;
  });

  const materialesPorId = {};
  construirVistaMaterialesPreciosCache_().forEach(function(material) {
    materialesPorId[String(material.idMaterial || "").trim()] = material;
  });

  // PASO 28O: PRE_LISTA_PRECIO_DETALLE se lee una sola vez.
  // La versión anterior la leía al construir la vista de listas y otra vez aquí.
  const vista = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE)
    .filter(function(detalle) {
      const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()];
      return Boolean(lista) &&
        detallePrecioVisibleParaUsuario_(detalle, lista, actor);
    })
    .map(function(detalle) {
      const lista =
        listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()] ||
        {};
      const material =
        materialesPorId[String(detalle.ID_MATERIAL || "").trim()] ||
        {};
      return mapearDetallePrecioOficial_(detalle, lista, material);
    });

  // Si el conjunto supera el límite de CacheService, guardarCacheJsonMotor_
  // simplemente devuelve false; el flujo funcional continúa normalmente.
  guardarCacheJsonMotor_(claveCache, vista, 180);

  return vista;
}


function convertirNumeroPrecioMateriales_(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
  if (valor === null || valor === undefined) return NaN;
  let texto = String(valor).trim();
  if (!texto) return NaN;
  texto = texto.replace(/[^0-9,.-]/g, "");
  if (!texto) return NaN;
  const tieneComa = texto.indexOf(",") !== -1;
  const tienePunto = texto.indexOf(".") !== -1;
  if (tieneComa && tienePunto) {
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (tieneComa) {
    texto = texto.replace(",", ".");
  }
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : NaN;
}

function obtenerMontoDetallePrecioMateriales_(detalle) {
  detalle = detalle || {};
  const campos = [
    "PRECIO_BASE", "PRECIO", "MONTO_PRECIO", "PRECIO_UNITARIO", "PRECIO_LISTA",
    "PRECIO_MATERIAL", "MONTO", "VALOR", "IMPORTE", "PRECIO_VIGENTE"
  ];
  for (let i = 0; i < campos.length; i++) {
    const clave = campos[i];
    if (detalle[clave] !== null && detalle[clave] !== undefined && String(detalle[clave]).trim() !== "") {
      const numero = convertirNumeroPrecioMateriales_(detalle[clave]);
      if (Number.isFinite(numero)) return numero;
    }
  }
  return 0;
}

function limpiarDetalleComboMateriales_(valor) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  if (!texto) return "";
  const normalizado = normalizarTexto(texto);
  if (["SI", "S", "YES", "TRUE", "1", "NO", "N", "FALSE", "0"].indexOf(normalizado) !== -1) return "";
  return texto;
}

function obtenerDetalleComboPrecioMateriales_(detalle) {
  detalle = detalle || {};
  const campos = ["DETALLE_COMBO", "COMPONENTES_INCLUIDOS", "DESCRIPCION_COMBO", "DETALLE_DEL_COMBO", "COMBO_DETALLE"];
  for (let i = 0; i < campos.length; i++) {
    const texto = limpiarDetalleComboMateriales_(detalle[campos[i]]);
    if (texto) return texto;
  }
  return "";
}

function mapearDetallePrecioOficial_(detalle, lista, material) {
  detalle = detalle || {};
  lista = lista || {};
  material = material || {};
  const estadoLista = normalizarTexto(lista.estado || CONFIG.ESTADOS.ACTIVO);
  const estadoPrecio = normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO);
  const activo = estadoLista === CONFIG.ESTADOS.ACTIVO && estadoPrecio === CONFIG.ESTADOS.ACTIVO;
  const detalleCombo = obtenerDetalleComboPrecioMateriales_(detalle);
  const tieneCombo = Boolean(detalleCombo);
  const precioBase = obtenerMontoDetallePrecioMateriales_(detalle);
  const monedaPrecio = String(detalle.MONEDA || MP_MODULO_SGT360.MONEDA).trim();
  const fechaInicio = normalizarFechaEntradaPrecio_(lista.fechaInicio || lista.FECHA_INICIO);
  const fechaFin = normalizarFechaEntradaPrecio_(lista.fechaFin || lista.FECHA_FIN);
  return {
    idPrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    codigoPrecio: String(detalle.CODIGO_PRECIO || "").trim(),
    idListaPrecio: String(lista.idListaPrecio || lista.ID_LISTA_PRECIO || "").trim(),
    codigoLista: String(lista.codigoLista || lista.CODIGO_LISTA || "").trim(),
    idProveedor: String(lista.idProveedor || lista.ID_PROVEEDOR || "").trim(),
    proveedor: String(lista.proveedor || "Proveedor no definido").trim(),
    tipoPrecio: String(lista.tipoPrecio || obtenerTipoAlcanceProveedorPrecio_(lista.idProveedor || lista.ID_PROVEEDOR)).trim(),
    idNegocio: String(lista.idNegocio || lista.ID_NEGOCIO || "").trim(),
    negocio: String(lista.negocio || "").trim(),
    idOficina: String(lista.idOficina || lista.ID_OFICINA || "").trim(),
    oficina: String(lista.oficina || "").trim(),
    idGrupo: String(lista.idGrupo || lista.ID_GRUPO || "").trim(),
    grupo: String(lista.grupo || "").trim(),
    alcance: String(lista.alcance || determinarAlcanceListaPrecio_(lista)).trim(),
    alcanceDescripcion: mpEtiquetaAlcanceExportacion_(lista),
    idMaterial: String(detalle.ID_MATERIAL || material.idMaterial || "").trim(),
    codigoSap: String(material.codigoSap || "").trim(),
    codigoMaterial: String(material.codigoMaterial || "").trim(),
    nombreCortoMaterial: String(material.nombreMaterial || material.descripcionMaterial || material.codigoMaterial || "").trim(),
    descripcionMaterial: String(material.descripcionMaterial || material.nombreMaterial || "").trim(),
    combo: detalleCombo,
    tieneCombo: tieneCombo ? "SI" : "",
    detalleCombo: detalleCombo,
    precioBase: precioBase,
    precio: precioBase,
    montoPrecio: precioBase,
    moneda: monedaPrecio,
    precioFormateado: (monedaPrecio === "PEN" || !monedaPrecio ? "S/" : monedaPrecio) + " " + precioBase.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    fechaInicio: fechaInicio,
    fechaFin: fechaFin,
    vigencia: [fechaInicio, fechaFin].filter(Boolean).join(" / "),
    estado: activo ? CONFIG.ESTADOS.ACTIVO : (estadoPrecio || estadoLista || CONFIG.ESTADOS.INACTIVO),
    estadoLista: estadoLista,
    estadoPrecio: estadoPrecio,
    comentarioComercial: String(detalle.COMENTARIO_COMERCIAL || "").trim()
  };
}

/** Guarda cabecera oficial de lista de precios. */
function guardarListaOficialPrecioModulo(datos) {
  const usuario = obtenerUsuarioActual();
  datos = datos || {};
  const idLista = String(datos.idListaPrecio || "").trim();
  if (!datos._omitirPermisoInterno) {
    exigirPermisoMaterialesPrecios_(idLista ? "EDITAR_LISTA_OFICIAL" : "CREAR_LISTA_OFICIAL", usuario);
  }
  const idProveedorResuelto = resolverProveedorPrecioCabecera_(datos, usuario);
  const datosValidados = Object.assign({}, datos, {
    idProveedor: idProveedorResuelto,
    _proveedorResuelto: true
  });
  validarCabeceraListaPrecio_(datosValidados);
  const ahora = new Date();
  const existente = idLista ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", idLista) : null;
  const nombrePredeterminado = "Lista de precios";
  const objeto = {
    ID_LISTA_PRECIO: existente ? existente.ID_LISTA_PRECIO : generarIdMotor_("LPR"),
    CODIGO_LISTA: limpiarTextoMotor_(datos.codigoLista || generarCodigoListaPrecio_(datosValidados), 120),
    NOMBRE: limpiarTextoMotor_(datos.nombre || nombrePredeterminado, 200),
    ID_PROVEEDOR: idProveedorResuelto,
    ID_NEGOCIO: String(datos.idNegocio || "").trim(),
    ID_OFICINA: String(datos.idOficina || "").trim(),
    ID_GRUPO: String(datos.idGrupo || "").trim(),
    ALCANCE: determinarAlcanceListaPrecio_(datos),
    FECHA_INICIO: normalizarFechaEntradaPrecio_(datos.fechaInicio),
    FECHA_FIN: normalizarFechaEntradaPrecio_(datos.fechaFin),
    MONEDA: MP_MODULO_SGT360.MONEDA,
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    PRIORIDAD: Number(datos.prioridad) || obtenerPrioridadAlcanceListaPrecio_(datos),
    ORIGEN: limpiarTextoMotor_(datos.origen || "MANUAL", 80),
    ORIGEN_CARGA: limpiarTextoMotor_(datos.origenCarga || datos.origen || determinarOrigenCargaListaPrecio_(usuario, idProveedorResuelto), 80),
    ID_SOLICITUD_ORIGEN: String(datos.idSolicitudOrigen || "").trim(),
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", objeto);
  invalidarCacheOpcionesMaterialesPrecios_();
  return {
    correcto: true,
    idListaPrecio: objeto.ID_LISTA_PRECIO,
    creado: !existente,
    tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(objeto.ID_PROVEEDOR)
  };
}

/** Guarda precio de material en una lista oficial. */
function actualizarVigenciaListaPrecioIndividual_(idListaPrecio, datosValidados, fechaInicio, fechaFin) {
  const id = String(idListaPrecio || "").trim();
  if (!id) return null;
  const existente = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", id);
  if (!existente) return null;
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", {
    ID_LISTA_PRECIO: id,
    ID_PROVEEDOR: String(datosValidados.idProveedor || existente.ID_PROVEEDOR || "").trim(),
    ID_NEGOCIO: String(datosValidados.idNegocio || existente.ID_NEGOCIO || "").trim(),
    ID_OFICINA: String(datosValidados.idOficina || existente.ID_OFICINA || "").trim(),
    ID_GRUPO: String(datosValidados.idGrupo || existente.ID_GRUPO || "").trim(),
    ALCANCE: determinarAlcanceListaPrecio_(datosValidados),
    FECHA_INICIO: normalizarFechaEntradaPrecio_(fechaInicio),
    FECHA_FIN: normalizarFechaEntradaPrecio_(fechaFin),
    ORIGEN: "CARGA_INDIVIDUAL",
    ORIGEN_CARGA: "CARGA_INDIVIDUAL",
    FECHA_ACTUALIZACION: ahora
  });
  return buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", id);
}

function guardarDetalleListaPrecioModulo(datos) {
  const usuario = obtenerUsuarioActual();
  datos = datos || {};
  if (!datos._omitirPermisoInterno) {
    exigirPermisoMaterialesPrecios_("EDITAR_LISTA_OFICIAL", usuario);
  }
  const idLista = String(datos.idListaPrecio || "").trim();
  const idMaterial = String(datos.idMaterial || "").trim();
  const idDetalleSolicitado = String(datos.idDetallePrecio || datos.ID_DETALLE_PRECIO || "").trim();
  const precio = Number(datos.precioBase);
  const lista = idLista ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", idLista) : null;
  if (!lista) throw new Error("Lista no válida.");
  if (!idMaterial || !buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", idMaterial)) throw new Error("Material no válido.");
  if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio base inválido.");
  if (!String(lista.ID_PROVEEDOR || "").trim()) throw new Error("La lista de precios no tiene proveedor definido.");

  let existente = null;
  if (idDetalleSolicitado) {
    existente = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", idDetalleSolicitado);
    if (!existente) throw new Error("No se encontró el precio que intentas modificar.");
  } else {
    existente = buscarDetallePrecioExistente_(idLista, idMaterial);
  }

  const detalleDestino = buscarDetallePrecioExistente_(idLista, idMaterial);
  if (idDetalleSolicitado && detalleDestino &&
      String(detalleDestino.ID_DETALLE_PRECIO || "").trim() !== idDetalleSolicitado) {
    throw new Error("Ya existe otro precio para este material en el alcance y vigencia seleccionados. Modifica ese registro o elige otro alcance.");
  }

  validarCruceVigenciaPrecioMaterial_(lista, idMaterial, existente ? existente.ID_DETALLE_PRECIO : "", idDetalleSolicitado || "");
  const ahora = new Date();
  const detalleCombo = limpiarTextoMotor_(datos.detalleCombo || datos.componentesIncluidos || "", 1000);
  const objeto = {
    ID_DETALLE_PRECIO: existente ? existente.ID_DETALLE_PRECIO : generarIdMotor_("DPR"),
    CODIGO_PRECIO: existente ? (existente.CODIGO_PRECIO || generarCodigoPrecioDetalle_()) : generarCodigoPrecioDetalle_(),
    ID_LISTA_PRECIO: idLista,
    ID_MATERIAL: idMaterial,
    PRECIO_BASE: precio,
    MONEDA: MP_MODULO_SGT360.MONEDA,
    TIENE_COMBO: detalleCombo ? "SI" : "",
    DETALLE_COMBO: detalleCombo,
    DESCRIPCION_COMERCIAL: limpiarTextoMotor_(datos.descripcionComercial || "", 500),
    COMENTARIO_COMERCIAL: limpiarTextoMotor_(datos.comentarioComercial || "", 500),
    ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO),
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", objeto);
  invalidarCacheOpcionesMaterialesPrecios_();
  return {
    correcto: true,
    idDetallePrecio: objeto.ID_DETALLE_PRECIO,
    idListaPrecio: idLista,
    creado: !existente,
    tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(lista.ID_PROVEEDOR)
  };
}


function validarRelacionProveedorMaterialParaPrecioRapido_(relaciones, idProveedor, idMaterial) {
  const proveedor = String(idProveedor || "").trim();
  const material = String(idMaterial || "").trim();
  const relacionesActivas = (relaciones || []).filter(function(relacion) {
    return String(relacion.ID_MATERIAL || "").trim() === material &&
      normalizarTexto(relacion.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  });
  if (proveedor) {
    const existe = relacionesActivas.some(function(relacion) {
      return String(relacion.ID_PROVEEDOR || "").trim() === proveedor;
    });
    if (!existe) throw new Error("El proveedor seleccionado no está asociado al material. Primero enlázalo desde Materiales.");
    return true;
  }
  if (!relacionesActivas.length) {
    throw new Error("El material no tiene proveedores asociados. Para registrar un precio general, primero enlaza al menos un proveedor al material.");
  }
  return true;
}

function validarCruceVigenciaPrecioMaterialRapido_(listas, detalles, listaActual, idMaterial, idDetalleActual) {
  listaActual = listaActual || {};
  const idListaActual = String(listaActual.ID_LISTA_PRECIO || listaActual.idListaPrecio || "").trim();
  const proveedorActual = String(listaActual.ID_PROVEEDOR || listaActual.idProveedor || "").trim();
  const negocioActual = String(listaActual.ID_NEGOCIO || listaActual.idNegocio || "").trim();
  const oficinaActual = String(listaActual.ID_OFICINA || listaActual.idOficina || "").trim();
  const grupoActual = String(listaActual.ID_GRUPO || listaActual.idGrupo || "").trim();
  const inicioActual = convertirFechaPrecio_(listaActual.FECHA_INICIO || listaActual.fechaInicio);
  const finActual = convertirFechaPrecio_(listaActual.FECHA_FIN || listaActual.fechaFin);
  if (!inicioActual || !finActual) return true;
  const listasPorId = mapearPorIdPrecio_(listas || [], "ID_LISTA_PRECIO");
  const detalleActual = String(idDetalleActual || "").trim();
  const cruza = (detalles || []).some(function(detalle) {
    if (String(detalle.ID_MATERIAL || "").trim() !== String(idMaterial || "").trim()) return false;
    const idDetalleComparado = String(detalle.ID_DETALLE_PRECIO || "").trim();
    if (detalleActual && idDetalleComparado === detalleActual) return false;
    if (normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
    const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()] || {};
    if (!lista.ID_LISTA_PRECIO || String(lista.ID_LISTA_PRECIO || "").trim() === idListaActual) return false;
    if (normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
    if (String(lista.ID_PROVEEDOR || "").trim() !== proveedorActual) return false;
    if (String(lista.ID_NEGOCIO || "").trim() !== negocioActual) return false;
    if (String(lista.ID_OFICINA || "").trim() !== oficinaActual) return false;
    if (String(lista.ID_GRUPO || "").trim() !== grupoActual) return false;
    return fechasSeCruzanPrecio_(inicioActual, finActual, convertirFechaPrecio_(lista.FECHA_INICIO), convertirFechaPrecio_(lista.FECHA_FIN));
  });
  if (cruza) {
    throw new Error("Ya existe un precio vigente que se cruza para este material, negocio, proveedor y alcance comercial. Modifica el registro existente o cambia la vigencia.");
  }
  return true;
}

function construirObjetoListaPrecioIndividualRapida_(datos, usuario, listaExistente) {
  const ahora = new Date();
  const alcance = determinarAlcanceListaPrecio_(datos);
  const existente = listaExistente || null;
  const objeto = {
    ID_LISTA_PRECIO: existente ? existente.ID_LISTA_PRECIO : generarIdMotor_("LPR"),
    CODIGO_LISTA: existente ? (existente.CODIGO_LISTA || generarCodigoListaPrecio_({ origenCarga: "PRECIO_INDIVIDUAL" })) : generarCodigoListaPrecio_({ origenCarga: "PRECIO_INDIVIDUAL" }),
    NOMBRE: limpiarTextoMotor_(existente ? (existente.NOMBRE || "Precio material " + alcance) : "Precio material " + alcance, 200),
    ID_PROVEEDOR: String(datos.idProveedor || "").trim(),
    ID_NEGOCIO: String(datos.idNegocio || "").trim(),
    ID_OFICINA: String(datos.idOficina || "").trim(),
    ID_GRUPO: String(datos.idGrupo || "").trim(),
    FECHA_INICIO: normalizarFechaEntradaPrecio_(datos.fechaInicio),
    FECHA_FIN: normalizarFechaEntradaPrecio_(datos.fechaFin),
    MONEDA: MP_MODULO_SGT360.MONEDA,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    PRIORIDAD: obtenerPrioridadAlcanceListaPrecio_(datos),
    ALCANCE: alcance,
    ORIGEN: "PRECIO_INDIVIDUAL",
    ORIGEN_CARGA: "PRECIO_INDIVIDUAL",
    ID_SOLICITUD_ORIGEN: "",
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  return Object.assign({}, existente || {}, objeto);
}

function construirListaPrecioIndividualRapida_(datos, usuario, listaExistente) {
  const objeto = construirObjetoListaPrecioIndividualRapida_(datos, usuario, listaExistente);
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", objeto);
  return objeto;
}

function construirDetallePrecioRapido_(datos, usuario, detalleExistente) {
  const ahora = new Date();
  const detalleCombo = limpiarTextoMotor_(datos.detalleCombo || datos.componentesIncluidos || "", 1000);
  const objeto = {
    ID_DETALLE_PRECIO: detalleExistente ? detalleExistente.ID_DETALLE_PRECIO : generarIdMotor_("DPR"),
    CODIGO_PRECIO: detalleExistente ? (detalleExistente.CODIGO_PRECIO || generarCodigoPrecioDetalle_()) : generarCodigoPrecioDetalle_(),
    ID_LISTA_PRECIO: String(datos.idListaPrecio || "").trim(),
    ID_MATERIAL: String(datos.idMaterial || "").trim(),
    PRECIO_BASE: Number(datos.precioBase),
    MONEDA: MP_MODULO_SGT360.MONEDA,
    TIENE_COMBO: detalleCombo ? "SI" : "",
    DETALLE_COMBO: detalleCombo,
    DESCRIPCION_COMERCIAL: limpiarTextoMotor_(datos.descripcionComercial || "", 500),
    COMENTARIO_COMERCIAL: limpiarTextoMotor_(datos.comentarioComercial || "", 500),
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!detalleExistente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", objeto);
  return Object.assign({}, detalleExistente || {}, objeto);
}

function resolverNombresListaPrecioRapida_(lista) {
  const proveedores = mapearOpcionesPorId_(obtenerProveedoresActivosOpciones_());
  const negocios = mapearOpcionesPorId_(listarValoresCatalogoAppPrecio_("MP_NEGOCIOS"));
  const oficinas = mapearOpcionesPorId_(obtenerOficinasActivasOpciones_());
  const grupos = mapearOpcionesPorId_(obtenerGruposActivosOpciones_());
  const copia = Object.assign({}, lista || {});
  copia.proveedor = obtenerEtiquetaProveedorListaPrecio_(copia.ID_PROVEEDOR, proveedores);
  copia.negocio = obtenerNombreOpcion_(negocios, copia.ID_NEGOCIO);
  copia.oficina = obtenerNombreOpcion_(oficinas, copia.ID_OFICINA);
  copia.grupo = obtenerNombreOpcion_(grupos, copia.ID_GRUPO);
  copia.tipoPrecio = obtenerTipoAlcanceProveedorPrecio_(copia.ID_PROVEEDOR);
  return copia;
}

/** Guarda un precio individual creando o reutilizando una cabecera técnica por alcance y vigencia. */
function guardarPrecioIndividualMaterialesPreciosModulo(datos) {
  const usuario = obtenerUsuarioActual();
  if (!tienePermisoMaterialesPrecios_("CREAR_PRECIO_INDIVIDUAL", usuario) &&
      !tienePermisoMaterialesPrecios_("CREAR_LISTA_OFICIAL", usuario) &&
      !tienePermisoMaterialesPrecios_("EDITAR_LISTA_OFICIAL", usuario)) {
    exigirPermisoMaterialesPrecios_("CREAR_PRECIO_INDIVIDUAL", usuario);
  }

  datos = datos || {};
  const idMaterial = String(datos.idMaterial || "").trim();
  const idNegocio = String(datos.idNegocio || "").trim();
  const idGrupoEntrada = String(datos.idGrupo || "").trim();
  const precio = convertirNumeroPrecioMateriales_(datos.precioBase);
  const fechaInicio = normalizarFechaEntradaPrecio_(datos.fechaInicio);
  const fechaFin = normalizarFechaEntradaPrecio_(datos.fechaFin);
  const fechaInicioDate = convertirFechaPrecio_(fechaInicio);
  const fechaFinDate = convertirFechaPrecio_(fechaFin);
  const idProveedor = resolverProveedorPrecioCabecera_(datos, usuario);
  if (!idProveedor) throw new Error("Selecciona el proveedor del precio.");
  if (!obtenerProveedorActivoPorIdMaterialPrecio_(idProveedor)) throw new Error("El proveedor seleccionado no existe o está inactivo.");
  const idDetalleEditar = String(datos.idDetallePrecio || datos.idPrecio || datos.ID_DETALLE_PRECIO || "").trim();

  if (!idNegocio) throw new Error("Selecciona el negocio del precio.");
  if (!idMaterial) throw new Error("Selecciona el material al que se aplicará el precio.");
  if (!Number.isFinite(precio) || precio < 0) throw new Error("El precio base debe ser un número válido mayor o igual a cero.");
  if (!fechaInicioDate) throw new Error("La fecha de inicio es obligatoria.");
  if (!fechaFinDate) throw new Error("La fecha de fin es obligatoria.");
  if (fechaFinDate.getTime() < fechaInicioDate.getTime()) throw new Error("La fecha fin no puede ser menor que la fecha inicio.");

  const oficinasRecibidas = normalizarIdsOficinasPrecio_(datos.idOficina || datos.ID_OFICINA || datos.idsOficinas || datos.idOficinas || datos.oficinas);
  if (oficinasRecibidas.length > 1) throw new Error("Registra un precio por canal de venta. Selecciona una sola oficina por operación.");
  const idOficina = String(oficinasRecibidas[0] || "").trim();
  if (idGrupoEntrada && !idOficina) throw new Error("Para registrar precio por grupo debes seleccionar una oficina de ventas.");
  const idGrupo = idOficina ? idGrupoEntrada : "";

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES);
    const material = materiales.find(function(item) { return String(item.ID_MATERIAL || "").trim() === idMaterial; });
    if (!material || normalizarTexto(material.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) {
      throw new Error("Selecciona un material activo válido.");
    }


    const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
    const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE);
    const detalleExistente = idDetalleEditar ? detalles.find(function(item) {
      return String(item.ID_DETALLE_PRECIO || "").trim() === idDetalleEditar;
    }) : null;
    if (idDetalleEditar && !detalleExistente) throw new Error("No se encontró el precio que intentas modificar.");

    let listaExistente = null;
    if (detalleExistente) {
      listaExistente = listas.find(function(item) {
        return String(item.ID_LISTA_PRECIO || "").trim() === String(detalleExistente.ID_LISTA_PRECIO || "").trim();
      }) || null;
      if (listaExistente && !coincideAlcanceListaPrecio_(listaExistente, idProveedor, idNegocio, idOficina, idGrupo)) {
        listaExistente = null;
      }
    }
    if (!listaExistente) {
      listaExistente = listas.find(function(item) {
        return String(item.ID_PROVEEDOR || "").trim() === idProveedor &&
          String(item.ID_NEGOCIO || "").trim() === idNegocio &&
          String(item.ID_OFICINA || "").trim() === idOficina &&
          String(item.ID_GRUPO || "").trim() === idGrupo &&
          normalizarFechaEntradaPrecio_(item.FECHA_INICIO) === fechaInicio &&
          normalizarFechaEntradaPrecio_(item.FECHA_FIN) === fechaFin &&
          normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO &&
          esListaPrecioIndividual_(item);
      }) || null;
    }

    const datosNormalizados = Object.assign({}, datos, {
      idProveedor: idProveedor,
      idNegocio: idNegocio,
      idOficina: idOficina,
      idGrupo: idGrupo,
      idMaterial: idMaterial,
      precioBase: precio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      _proveedorResuelto: true
    });
    validarCabeceraListaPrecio_(datosNormalizados);

    const listaProspectiva = construirObjetoListaPrecioIndividualRapida_(datosNormalizados, usuario, listaExistente);
    validarCruceVigenciaPrecioMaterialRapido_(listas, detalles, listaProspectiva, idMaterial, detalleExistente ? detalleExistente.ID_DETALLE_PRECIO : "");
    const listaTecnica = construirListaPrecioIndividualRapida_(datosNormalizados, usuario, listaExistente);

    const detalleDestinoMismaLista = detalles.find(function(item) {
      return String(item.ID_LISTA_PRECIO || "").trim() === String(listaTecnica.ID_LISTA_PRECIO || "").trim() &&
        String(item.ID_MATERIAL || "").trim() === idMaterial &&
        normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
    }) || null;
    if (idDetalleEditar && detalleDestinoMismaLista && String(detalleDestinoMismaLista.ID_DETALLE_PRECIO || "").trim() !== idDetalleEditar) {
      throw new Error("Ya existe otro precio para este material en el alcance y vigencia seleccionados. Modifica ese registro o elige otro alcance.");
    }

    asegurarRelacionNegocioMaterialPrecio_(idNegocio, idMaterial, usuario);
    const detalleFinal = construirDetallePrecioRapido_(Object.assign({}, datosNormalizados, {
      idListaPrecio: listaTecnica.ID_LISTA_PRECIO,
      descripcionComercial: datos.descripcionComercial || material.DESCRIPCION_MATERIAL || material.NOMBRE_MATERIAL || ""
    }), usuario, detalleExistente || detalleDestinoMismaLista || null);

    marcarVersionCachePreciosMateriales_();
    const precioVista = construirVistaPrecioIndividualLigera_(detalleFinal, listaTecnica, material, datosNormalizados);
    return {
      correcto: true,
      idListaPrecio: listaTecnica.ID_LISTA_PRECIO,
      idDetallePrecio: detalleFinal.ID_DETALLE_PRECIO,
      listaCreada: !listaExistente,
      detalleCreado: !(detalleExistente || detalleDestinoMismaLista),
      tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(idProveedor),
      precioVista: precioVista,
      mensaje: (detalleExistente || detalleDestinoMismaLista) ? "Se actualizó el precio del material." : "Se registró el precio del material."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function construirVistaPrecioIndividualLigera_(detalle, lista, material, datos) {
  detalle = detalle || {};
  lista = lista || {};
  material = material || {};
  datos = datos || {};
  const idProveedor = String(lista.ID_PROVEEDOR || datos.idProveedor || "").trim();
  const idNegocio = String(lista.ID_NEGOCIO || datos.idNegocio || "").trim();
  const idOficina = String(lista.ID_OFICINA || datos.idOficina || "").trim();
  const idGrupo = String(lista.ID_GRUPO || datos.idGrupo || "").trim();
  return {
    idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    idPrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    codigoPrecio: String(detalle.CODIGO_PRECIO || "").trim(),
    idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
    codigoLista: String(lista.CODIGO_LISTA || "").trim(),
    idProveedor: idProveedor,
    proveedor: String(datos._labelProveedor || "").trim() || obtenerEtiquetaProveedorListaPrecio_(idProveedor, {}),
    tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(idProveedor),
    idNegocio: idNegocio,
    negocio: String(datos._labelNegocio || idNegocio || "").trim(),
    idOficina: idOficina,
    oficina: String(datos._labelOficina || idOficina || "").trim(),
    idGrupo: idGrupo,
    grupo: String(datos._labelGrupo || idGrupo || "").trim(),
    alcance: String(lista.ALCANCE || determinarAlcanceListaPrecio_({ idOficina: idOficina, idGrupo: idGrupo })).trim(),
    alcanceDescripcion: describirAlcancePrecio_({ oficina: String(datos._labelOficina || idOficina || "").trim(), grupo: String(datos._labelGrupo || idGrupo || "").trim(), alcance: lista.ALCANCE }),
    idMaterial: String(material.ID_MATERIAL || datos.idMaterial || "").trim(),
    codigoMaterial: String(material.CODIGO_MATERIAL || "").trim(),
    codigoSap: String(material.CODIGO_SAP || "").trim(),
    nombreCortoMaterial: String(material.NOMBRE_MATERIAL || material.DESCRIPCION_MATERIAL || "").trim(),
    descripcionMaterial: String(material.DESCRIPCION_MATERIAL || material.NOMBRE_MATERIAL || "").trim(),
    precioBase: Number(detalle.PRECIO_BASE || datos.precioBase || 0),
    precio: Number(detalle.PRECIO_BASE || datos.precioBase || 0),
    montoPrecio: Number(detalle.PRECIO_BASE || datos.precioBase || 0),
    moneda: String(detalle.MONEDA || lista.MONEDA || MP_MODULO_SGT360.MONEDA).trim(),
    detalleCombo: String(detalle.DETALLE_COMBO || datos.detalleCombo || "").trim(),
    combo: String(detalle.DETALLE_COMBO || datos.detalleCombo || "").trim(),
    comentarioComercial: String(detalle.COMENTARIO_COMERCIAL || datos.comentarioComercial || "").trim(),
    fechaInicio: normalizarFechaEntradaPrecio_(lista.FECHA_INICIO || datos.fechaInicio),
    fechaFin: normalizarFechaEntradaPrecio_(lista.FECHA_FIN || datos.fechaFin),
    estado: normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO),
    origenCarga: "PRECIO_INDIVIDUAL",
    esPrecioIndividual: true
  };
}


function describirAlcancePrecio_(row) {
  row = row || {};
  const alcance = normalizarTexto(row.alcance || "");
  const oficina = String(row.oficina || row.ID_OFICINA || row.idOficina || "").trim();
  const grupo = String(row.grupo || row.ID_GRUPO || row.idGrupo || "").trim();
  if (alcance === "GRUPO" || grupo) return "Grupo: " + (oficina || "—") + " / " + (grupo || "—");
  if (alcance === "OFICINA" || oficina) return "Oficina: " + oficina;
  return "General";
}

function coincideAlcanceListaPrecio_(lista, idProveedor, idNegocio, idOficina, idGrupo) {
  lista = lista || {};
  return String(lista.ID_PROVEEDOR || lista.idProveedor || "").trim() === String(idProveedor || "").trim() &&
    String(lista.ID_NEGOCIO || lista.idNegocio || "").trim() === String(idNegocio || "").trim() &&
    String(lista.ID_OFICINA || lista.idOficina || "").trim() === String(idOficina || "").trim() &&
    String(lista.ID_GRUPO || lista.idGrupo || "").trim() === String(idGrupo || "").trim();
}

function guardarPrecioIndividualUnAlcance_(datosValidados, material, precio, usuario, idDetalleEditar) {
  validarCabeceraListaPrecio_(datosValidados);
  const idProveedor = String(datosValidados.idProveedor || "").trim();
  const idNegocio = String(datosValidados.idNegocio || "").trim();
  const idOficina = String(datosValidados.idOficina || "").trim();
  const idGrupo = String(datosValidados.idGrupo || "").trim();
  const idMaterial = String(datosValidados.idMaterial || "").trim();
  const fechaInicio = normalizarFechaEntradaPrecio_(datosValidados.fechaInicio);
  const fechaFin = normalizarFechaEntradaPrecio_(datosValidados.fechaFin);
  const alcance = determinarAlcanceListaPrecio_(datosValidados);
  const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
  let lista = null;
  let resultadoLista = null;

  if (idDetalleEditar) {
    const detalleEditar = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE, "ID_DETALLE_PRECIO", idDetalleEditar);
    const listaEditar = detalleEditar ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", detalleEditar.ID_LISTA_PRECIO) : null;
    if (listaEditar && coincideAlcanceListaPrecio_(listaEditar, idProveedor, idNegocio, idOficina, idGrupo)) {
      resultadoLista = guardarListaOficialPrecioModulo({
        idListaPrecio: String(listaEditar.ID_LISTA_PRECIO || "").trim(),
        codigoLista: String(listaEditar.CODIGO_LISTA || "").trim(),
        idProveedor: idProveedor,
        idNegocio: idNegocio,
        idOficina: idOficina,
        idGrupo: idGrupo,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        nombre: String(listaEditar.NOMBRE || "Precio individual " + alcance).trim(),
        estado: normalizarTexto(listaEditar.ESTADO || CONFIG.ESTADOS.ACTIVO),
        origen: "PRECIO_INDIVIDUAL",
        origenCarga: "PRECIO_INDIVIDUAL",
        _omitirPermisoInterno: true
      });
      lista = actualizarVigenciaListaPrecioIndividual_(resultadoLista.idListaPrecio, datosValidados, fechaInicio, fechaFin) ||
        buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", resultadoLista.idListaPrecio) || listaEditar;
    }
  }

  if (!lista) {
    lista = listas.find(function(item) {
      return String(item.ID_PROVEEDOR || "").trim() === idProveedor &&
        String(item.ID_NEGOCIO || "").trim() === idNegocio &&
        String(item.ID_OFICINA || "").trim() === idOficina &&
        String(item.ID_GRUPO || "").trim() === idGrupo &&
        normalizarFechaEntradaPrecio_(item.FECHA_INICIO) === fechaInicio &&
        normalizarFechaEntradaPrecio_(item.FECHA_FIN) === fechaFin &&
        normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO &&
        esListaPrecioIndividual_(item);
    });
  }

  if (!resultadoLista) {
    if (!lista) {
      resultadoLista = guardarListaOficialPrecioModulo({
        idProveedor: idProveedor,
        idNegocio: idNegocio,
        idOficina: idOficina,
        idGrupo: idGrupo,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        nombre: "Precio material " + alcance,
        estado: CONFIG.ESTADOS.ACTIVO,
        origen: "PRECIO_INDIVIDUAL",
        origenCarga: "PRECIO_INDIVIDUAL",
        _omitirPermisoInterno: true
      });
      lista = { ID_LISTA_PRECIO: resultadoLista.idListaPrecio };
    } else {
      resultadoLista = {
        correcto: true,
        idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
        creado: false
      };
    }
  }

  asegurarRelacionNegocioMaterialPrecio_(idNegocio, idMaterial, usuario);

  const detalle = guardarDetalleListaPrecioModulo({
    idDetallePrecio: idDetalleEditar || "",
    idListaPrecio: resultadoLista.idListaPrecio,
    idMaterial: idMaterial,
    precioBase: precio,
    descripcionComercial: datosValidados.descripcionComercial || material.DESCRIPCION_MATERIAL || material.NOMBRE_MATERIAL || "",
    detalleCombo: datosValidados.detalleCombo || "",
    comentarioComercial: datosValidados.comentarioComercial || "",
    estado: CONFIG.ESTADOS.ACTIVO,
    _omitirPermisoInterno: true
  });

  return {
    correcto: true,
    idListaPrecio: resultadoLista.idListaPrecio,
    idDetallePrecio: detalle.idDetallePrecio,
    listaCreada: resultadoLista.creado === true,
    detalleCreado: detalle.creado === true,
    alcance: alcance,
    idOficina: idOficina,
    idGrupo: idGrupo
  };
}

function normalizarIdsOficinasPrecio_(entrada) {
  let valores = [];

  if (Array.isArray(entrada)) {
    entrada.forEach(function(item) {
      valores = valores.concat(normalizarIdsOficinasPrecio_(item));
    });
  } else if (entrada && typeof entrada === "object") {
    const idObjeto = entrada.id || entrada.ID_OFICINA || entrada.idOficina || entrada.value || "";
    if (idObjeto) valores.push(String(idObjeto));
  } else {
    const texto = String(entrada === null || entrada === undefined ? "" : entrada).trim();
    if (texto) {
      if (/^\s*\[/.test(texto)) {
        try {
          const parsed = JSON.parse(texto);
          return normalizarIdsOficinasPrecio_(parsed);
        } catch (errorJson) {
          // Si no era JSON válido, se procesa como texto separado.
        }
      }
      valores = texto.split(/[;,|,\n\r\t]+/);
    }
  }

  const salida = [];
  const vistos = {};
  valores.forEach(function(valor) {
    const id = String(valor || "").trim();
    if (id && !vistos[id]) {
      vistos[id] = true;
      salida.push(id);
    }
  });
  return salida;
}


function obtenerMapaOficinasPrecio_() {
  const mapa = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.OFICINAS, { usarValoresMostrados: true }).forEach(function(item) {
    if (normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    const id = String(item.ID_OFICINA || "").trim();
    if (!id) return;
    [id, item.CODIGO_OFICINA, item.CODIGO, item.CODIGO_SAP, item.NOMBRE, item.NOMBRE_OFICINA].forEach(function(valor) {
      const clave = normalizarTexto(valor);
      if (clave) mapa[clave] = id;
    });
  });
  return mapa;
}

function obtenerMapaGruposPrecio_() {
  const mapa = {};
  leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.GRUPOS, { usarValoresMostrados: true }).forEach(function(item) {
    if (normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    const id = String(item.ID_GRUPO || "").trim();
    if (!id) return;
    const dato = { id: id, idOficina: String(item.ID_OFICINA || "").trim() };
    [id, item.CODIGO_GRUPO, item.CODIGO, item.NOMBRE, item.NOMBRE_GRUPO].forEach(function(valor) {
      const clave = normalizarTexto(valor);
      if (clave) mapa[clave] = dato;
    });
  });
  return mapa;
}

function resolverIdsOficinasCargaPrecio_(valor, datosCabecera, mapaOficinas) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  const valorOrigen = texto || String(datosCabecera && (datosCabecera.idOficina || datosCabecera.ID_OFICINA) || "").trim();
  if (!valorOrigen) return [""];
  const partes = normalizarIdsOficinasPrecio_(valorOrigen);
  const salida = [];
  partes.forEach(function(parte) {
    const id = mapaOficinas[normalizarTexto(parte)] || String(parte || "").trim();
    if (id && salida.indexOf(id) === -1) salida.push(id);
  });
  return salida.length ? [salida[0]] : [""];
}

function resolverGrupoCargaPrecio_(valor, mapaGrupos) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  if (!texto) return { id: "", idOficina: "" };
  return mapaGrupos[normalizarTexto(texto)] || { id: texto, idOficina: "" };
}

function normalizarFilaPrecioMasivo_(objeto) {
  objeto = objeto || {};
  return {
    codigoSap: limpiarTextoMotor_(objeto.CODIGO_SAP_MATERIAL || objeto.CODIGO_SAP || objeto.SAP || "", 80),
    codigoMaterial: limpiarTextoMotor_(objeto.CODIGO_MATERIAL || objeto.MATERIAL || "", 80),
    producto: limpiarTextoMotor_(objeto.PRODUCTO_PRINCIPAL || objeto.PRODUCTO || "", 160),
    tipo: limpiarTextoMotor_(objeto.TIPO_MATERIAL || objeto.TIPO || "", 160),
    subtipo: limpiarTextoMotor_(objeto.SUBTIPO_MATERIAL || objeto.SUBTIPO || "", 160),
    marca: limpiarTextoMotor_(objeto.MARCA || "", 160),
    descripcion: limpiarTextoMotor_(objeto.DESCRIPCION_MATERIAL || objeto.NOMBRE_MATERIAL || objeto.DESCRIPCION || "", 500),
    codigoOficinas: limpiarTextoMotor_(objeto.CODIGO_OFICINA || objeto.CODIGO_OFICINAS || objeto.OFICINA || objeto.OFICINAS || "", 160),
    codigoGrupo: limpiarTextoMotor_(objeto.CODIGO_GRUPO || objeto.GRUPO || "", 160),
    precio: Number(String(objeto.PRECIO || objeto.PRECIO_BASE || objeto.MONTO || "").replace(/[^0-9.,-]/g, "").replace(/,/g, ".")),
    combo: limpiarTextoMotor_(objeto.COMBO || objeto.DETALLE_COMBO || objeto.COMPONENTES_INCLUIDOS || "", 1000),
    comentario: limpiarTextoMotor_(objeto.OBSERVACION || objeto.COMENTARIO_COMERCIAL || objeto.COMENTARIO || "", 1000)
  };
}

/** Entrega plantilla CSV para cargar listas de precios. */
function obtenerPlantillaListaPreciosModulo() {
  const usuario = obtenerUsuarioActual();
  if (!tienePermisoMaterialesPrecios_("DESCARGAR_PLANTILLA_PRECIO", usuario) && !tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO", usuario)) {
    exigirPermisoMaterialesPrecios_("DESCARGAR_PLANTILLA_PRECIO", usuario);
  }
  return {
    correcto: true,
    nombreArchivo: "Plantilla_Precios_Gasodomesticos_v2.csv",
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(MP_MODULO_SGT360.PLANTILLA, [], { separador: "," })
  };
}


/**
 * PASO 28N — obtiene la plantilla XLSX para carga masiva interna de precios.
 *
 * Hoja 1: CARGA_PRECIOS
 * Hoja 2: DICCIONARIOS
 *
 * La plantilla se almacena en Drive y se reutiliza mientras los diccionarios
 * funcionales no hayan cambiado. El caché se separa por alcance de proveedor
 * para no exponer proveedores que el usuario no puede seleccionar.
 */
function obtenerBlobPlantillaPreciosCacheRapidaPaso28O_(alcanceCache) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave = obtenerClavePropiedadPlantillaPreciosPaso28N_(alcanceCache);
  const texto = String(propiedades.getProperty(clave) || "").trim();

  if (!texto) return null;

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    return null;
  }

  if (
    !datos ||
    String(datos.version || "") !== MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.VERSION ||
    !String(datos.fileId || "").trim() ||
    !datos.creadoEn
  ) {
    return null;
  }

  const creado = new Date(datos.creadoEn);
  if (
    Number.isNaN(creado.getTime()) ||
    Date.now() - creado.getTime() >
      MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.TTL_REUSO_RAPIDO_SEGUNDOS * 1000
  ) {
    return null;
  }

  try {
    const archivo = DriveApp.getFileById(String(datos.fileId).trim());
    const blob = archivo.getBlob();

    if (!blob || !blob.getBytes().length) return null;

    return {
      blob: blob.setName(
        MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO
      ),
      fileId: archivo.getId(),
      resumen: datos.resumen || {},
      cacheHit: true,
      cacheRapida: true
    };
  } catch (error) {
    return null;
  }
}

function obtenerPlantillaPreciosIndividualesModulo() {
  const inicio = Date.now();
  const usuario = obtenerUsuarioActual();

  if (
    !tienePermisoMaterialesPrecios_("CREAR_PRECIO_INDIVIDUAL", usuario) &&
    !tienePermisoMaterialesPrecios_("DESCARGAR_PLANTILLA_PRECIO", usuario)
  ) {
    exigirPermisoMaterialesPrecios_("CREAR_PRECIO_INDIVIDUAL", usuario);
  }

  validarAutorizacionCargaMaterialesPaso28B_();

  const alcanceCache =
    resolverAlcanceCachePlantillaPreciosPaso28O_(usuario);

  // PASO 28O: durante 5 minutos reutiliza directamente el XLSX de Drive.
  // Así no lee MAE_MATERIALES, proveedores, oficinas y grupos solo para
  // descubrir que la plantilla ya existía.
  let cache =
    obtenerBlobPlantillaPreciosCacheRapidaPaso28O_(alcanceCache);

  let diccionarios = null;
  let huella = "";

  if (!cache) {
    diccionarios =
      obtenerDiccionariosPlantillaPreciosPaso28N_(usuario);

    huella =
      obtenerHuellaPlantillaPreciosPaso28N_(diccionarios);

    cache =
      obtenerBlobPlantillaPreciosCachePaso28N_(
        alcanceCache,
        huella
      );
  }

  if (!cache) {
    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.TTL_BLOQUEO_MS);

    try {
      cache =
        obtenerBlobPlantillaPreciosCachePaso28N_(
          alcanceCache,
          huella
        );

      if (!cache) {
        if (!diccionarios) {
          diccionarios =
            obtenerDiccionariosPlantillaPreciosPaso28N_(usuario);
          huella =
            obtenerHuellaPlantillaPreciosPaso28N_(diccionarios);
        }

        const generado =
          generarBlobPlantillaPreciosPaso28N_(diccionarios);
        cache = guardarBlobPlantillaPreciosCachePaso28N_(
          alcanceCache,
          huella,
          generado.blob,
          generado.resumen
        );
        cache.cacheHit = false;
      }
    } finally {
      bloqueo.releaseLock();
    }
  }

  const bytes = cache.blob.getBytes();

  if (!bytes || !bytes.length) {
    throw new Error("La plantilla XLSX de precios está vacía.");
  }

  return {
    correcto: true,
    nombreArchivo: MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO,
    mimeType: MP_CARGA_PRECIOS_XLSX_PASO_28N.MIME_XLSX,
    contenidoBase64: Utilities.base64Encode(bytes),
    tamanoBytes: bytes.length,
    cacheHit: cache.cacheHit !== false,
    resumenDiccionarios: cache.resumen || {},
    duracionMs: Date.now() - inicio,
    version: MP_CARGA_PRECIOS_XLSX_PASO_28N.VERSION,
    mensaje: cache.cacheHit === false ?
      "Plantilla XLSX de precios actualizada y almacenada para próximas descargas." :
      "Plantilla XLSX de precios recuperada desde caché."
  };
}

/** @private */
function resolverAlcanceCachePlantillaPreciosPaso28O_(usuario) {
  const actor = usuario || obtenerUsuarioActual();

  const puedeSeleccionarProveedor =
    tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", actor) ||
    tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", actor) ||
    tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", actor);

  const proveedorUsuario = String(actor.idProveedor || "").trim();

  return puedeSeleccionarProveedor ?
    "GLOBAL" :
    (
      "PROV_" +
      normalizarClaveMotor_(proveedorUsuario || "SIN_PROVEEDOR")
    );
}

function obtenerDiccionariosPlantillaPreciosPaso28N_(usuario) {
  const actor = usuario || obtenerUsuarioActual();

  const puedeSeleccionarProveedor =
    tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", actor) ||
    tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", actor) ||
    tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", actor);

  const proveedorUsuario = String(actor.idProveedor || "").trim();

  // PASO 28O: no se invoca obtenerOpcionesMaterialesPreciosModulo().
  // Esa función también carga Producto/Tipo/Subtipo/Marca/Unidades, que no
  // participan en la plantilla de precios.
  let proveedores = obtenerProveedoresActivosOpciones_();

  if (proveedorUsuario && !puedeSeleccionarProveedor) {
    proveedores = proveedores.filter(function(item) {
      return String(item.id || "").trim() === proveedorUsuario;
    });
  }

  const negocios = listarValoresCatalogoAppPrecio_("MP_NEGOCIOS");
  const oficinas = obtenerOficinasActivasOpciones_();
  const gruposBase = obtenerGruposActivosOpciones_();

  const materiales = leerTablaPrecio_(
    MP_MODULO_SGT360.HOJAS.MATERIALES
  ).filter(function(item) {
    return normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) ===
      CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    return {
      codigo: String(item.CODIGO_MATERIAL || "").trim(),
      nombre: String(item.NOMBRE_MATERIAL || "").trim(),
      descripcion: String(item.DESCRIPCION_MATERIAL || "").trim()
    };
  }).filter(function(item) {
    return Boolean(item.codigo);
  }).sort(function(a, b) {
    return compararTextoMotor_(a.codigo, b.codigo);
  });

  const mapaOficinas = {};
  oficinas.forEach(function(item) {
    const id = String(item.id || "").trim();
    if (id) mapaOficinas[id] = item;
  });

  const grupos = gruposBase.map(function(item) {
    const oficina =
      mapaOficinas[String(item.idOficina || "").trim()] ||
      {};

    return {
      id: String(item.id || "").trim(),
      codigo: String(item.codigo || item.id || "").trim(),
      nombre: String(item.nombre || "").trim(),
      idOficina: String(item.idOficina || "").trim(),
      codigoOficina: String(oficina.codigo || oficina.id || "").trim(),
      nombreOficina: String(oficina.nombre || "").trim()
    };
  });

  return {
    alcanceCache: resolverAlcanceCachePlantillaPreciosPaso28O_(actor),
    materiales: materiales,
    proveedores: proveedores,
    negocios: negocios,
    oficinas: oficinas,
    grupos: grupos
  };
}

/** @private */
function obtenerHuellaPlantillaPreciosPaso28N_(diccionarios) {
  function compactar(lista, campos) {
    return (Array.isArray(lista) ? lista : []).map(function(item) {
      return campos.map(function(campo) {
        return normalizarTexto(item[campo] || "");
      });
    });
  }

  const material = JSON.stringify({
    version: MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.VERSION,
    alcance: String(diccionarios.alcanceCache || ""),
    materiales: compactar(diccionarios.materiales, ["codigo", "nombre", "descripcion"]),
    proveedores: compactar(diccionarios.proveedores, ["id", "codigo", "nombre"]),
    negocios: compactar(diccionarios.negocios, ["id", "codigo", "nombre"]),
    oficinas: compactar(diccionarios.oficinas, ["id", "codigo", "nombre"]),
    grupos: compactar(diccionarios.grupos, ["id", "codigo", "nombre", "idOficina", "codigoOficina"])
  });

  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    material,
    Utilities.Charset.UTF_8
  ).map(function(byte) {
    return (byte + 256).toString(16).slice(-2);
  }).join("").toUpperCase();
}

/** @private */
function obtenerClavePropiedadPlantillaPreciosPaso28N_(alcanceCache) {
  return (
    MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.PREFIJO_PROPIEDAD +
    normalizarClaveMotor_(alcanceCache || "GLOBAL").slice(0, 100)
  );
}

/** @private */
function obtenerBlobPlantillaPreciosCachePaso28N_(alcanceCache, huella) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave = obtenerClavePropiedadPlantillaPreciosPaso28N_(alcanceCache);
  const texto = String(propiedades.getProperty(clave) || "").trim();

  if (!texto) return null;

  let datos;

  try {
    datos = JSON.parse(texto);
  } catch (error) {
    propiedades.deleteProperty(clave);
    return null;
  }

  if (
    !datos ||
    String(datos.version || "") !== MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.VERSION ||
    String(datos.huella || "") !== String(huella || "") ||
    !String(datos.fileId || "").trim()
  ) {
    return null;
  }

  try {
    const archivo = DriveApp.getFileById(String(datos.fileId).trim());
    const blob = archivo.getBlob();

    if (!blob || !blob.getBytes().length) return null;

    return {
      blob: blob.setName(MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO),
      fileId: archivo.getId(),
      resumen: datos.resumen || {},
      cacheHit: true
    };
  } catch (error) {
    propiedades.deleteProperty(clave);
    return null;
  }
}

/** @private */
function guardarBlobPlantillaPreciosCachePaso28N_(alcanceCache, huella, blob, resumen) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave = obtenerClavePropiedadPlantillaPreciosPaso28N_(alcanceCache);

  let anterior = null;

  try {
    anterior = JSON.parse(String(propiedades.getProperty(clave) || "null"));
  } catch (error) {
    anterior = null;
  }

  const archivo = DriveApp.createFile(
    blob.copyBlob().setName(MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO)
  );

  propiedades.setProperty(clave, JSON.stringify({
    version: MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.VERSION,
    huella: String(huella || ""),
    fileId: archivo.getId(),
    resumen: resumen || {},
    creadoEn: new Date().toISOString()
  }));

  if (
    anterior &&
    anterior.fileId &&
    String(anterior.fileId) !== archivo.getId()
  ) {
    try {
      DriveApp.getFileById(String(anterior.fileId)).setTrashed(true);
    } catch (errorAnterior) {
      console.warn(
        "No se pudo eliminar la versión anterior de la plantilla de precios: %s",
        errorAnterior.message
      );
    }
  }

  return {
    blob: archivo.getBlob().setName(MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO),
    fileId: archivo.getId(),
    resumen: resumen || {},
    cacheHit: false
  };
}

/** @private */
function generarBlobPlantillaPreciosPaso28N_(diccionarios) {
  const libro = SpreadsheetApp.create(
    "TMP_Plantilla_Precios_" + Utilities.getUuid().slice(0, 8)
  );

  try {
    const carga = libro.getSheets()[0];
    carga.setName(MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_CARGA);

    const diccionario = libro.insertSheet(
      MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_DICCIONARIOS
    );

    const rangos = configurarHojaDiccionariosPreciosPaso28N_(
      diccionario,
      diccionarios
    );

    configurarHojaCargaPreciosPaso28N_(carga);

    configurarValidacionesHojaCargaPreciosPaso28N_(carga, {
      materiales: rangos.materiales,
      proveedores: rangos.proveedores,
      negocios: rangos.negocios,
      oficinas: rangos.oficinas,
      grupos: rangos.grupos
    });

    SpreadsheetApp.flush();

    const blob = exportarSpreadsheetComoXlsx_(
      libro.getId(),
      MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO
    );

    if (!blob || !blob.getBytes().length) {
      throw new Error("Google Drive generó una plantilla XLSX de precios vacía.");
    }

    return {
      blob: blob.setName(MP_PLANTILLA_PRECIOS_CACHE_PASO_28N.NOMBRE_ARCHIVO),
      resumen: {
        materiales: diccionarios.materiales.length,
        proveedores: diccionarios.proveedores.length,
        negocios: diccionarios.negocios.length,
        oficinas: diccionarios.oficinas.length,
        grupos: diccionarios.grupos.length
      }
    };
  } finally {
    try {
      DriveApp.getFileById(libro.getId()).setTrashed(true);
    } catch (error) {
      console.warn(
        "No se pudo eliminar la plantilla temporal de precios: %s",
        error.message
      );
    }
  }
}

/** @private */
function configurarHojaCargaPreciosPaso28N_(hoja) {
  const cabeceras = MP_CARGA_PRECIOS_XLSX_PASO_28N.CABECERAS;
  const filas = MP_MODULO_SGT360.MAX_FILAS_IMPORTACION;

  hoja.clear();
  hoja.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]);
  hoja.setFrozenRows(1);
  hoja.getRange(1, 1, 1, cabeceras.length).setFontWeight("bold");

  // Códigos y textos.
  hoja.getRange(2, 1, filas, 5).setNumberFormat("@");
  hoja.getRange(2, 9, filas, 2).setNumberFormat("@");

  // Precio y fechas.
  hoja.getRange(2, 6, filas, 1).setNumberFormat('"S/" #,##0.00');
  hoja.getRange(2, 7, filas, 2).setNumberFormat("dd/mm/yyyy");

  hoja.getRange(1, 1, 1, cabeceras.length).setNotes([[
    "Obligatorio. Usa el CODIGO_MATERIAL interno de Cálidda 360. CODIGO_SAP_MATERIAL ya no forma parte de esta plantilla.",
    "Proveedor que oferta el material. Puede dejarse vacío únicamente si se seleccionó un Proveedor predeterminado en el modal.",
    "Negocio del precio. Puede dejarse vacío únicamente si se seleccionó un Negocio predeterminado en el modal.",
    "Opcional. Si queda vacío junto con CODIGO_GRUPO, el precio será GENERAL.",
    "Opcional. Requiere CODIGO_OFICINA y debe pertenecer a esa oficina.",
    "Precio base en PEN/S/. Obligatorio.",
    "Fecha de inicio de vigencia. Obligatoria.",
    "Fecha de fin de vigencia. Obligatoria.",
    "Opcional. Detalle del combo o componentes incluidos.",
    "Opcional. Comentario comercial del precio."
  ]]);

  const anchos = [145, 150, 150, 150, 165, 120, 120, 120, 300, 300];

  anchos.forEach(function(ancho, indice) {
    hoja.setColumnWidth(indice + 1, ancho);
  });

  hoja.getRange(2, 9, filas, 2).setWrap(true);
}

/** @private */
function escribirBloqueDiccionarioPreciosPaso28N_(hoja, columnaInicial, titulo, cabeceras, filas) {
  cabeceras = Array.isArray(cabeceras) ? cabeceras : [];
  filas = Array.isArray(filas) ? filas : [];

  const ancho = Math.max(cabeceras.length, 1);

  hoja.getRange(1, columnaInicial, 1, ancho).merge();
  hoja.getRange(1, columnaInicial)
    .setValue(titulo)
    .setFontWeight("bold");

  hoja.getRange(2, columnaInicial, 1, ancho)
    .setValues([cabeceras])
    .setFontWeight("bold");

  if (filas.length) {
    hoja.getRange(3, columnaInicial, filas.length, ancho).setValues(filas);
  }

  return hoja.getRange(
    3,
    columnaInicial,
    Math.max(filas.length, 1),
    1
  );
}

/** @private */
function configurarHojaDiccionariosPreciosPaso28N_(hoja, diccionarios) {
  hoja.clear();
  hoja.setFrozenRows(2);

  const materiales = (diccionarios.materiales || []).map(function(item) {
    return [
      String(item.codigo || "").trim(),
      String(item.nombre || "").trim(),
      String(item.descripcion || "").trim()
    ];
  });

  const proveedores = (diccionarios.proveedores || []).map(function(item) {
    return [
      String(item.codigo || item.id || "").trim(),
      String(item.nombre || "").trim()
    ];
  });

  const negocios = (diccionarios.negocios || []).map(function(item) {
    return [
      String(item.codigo || item.id || "").trim(),
      String(item.nombre || "").trim()
    ];
  });

  const oficinas = (diccionarios.oficinas || []).map(function(item) {
    return [
      String(item.codigo || item.id || "").trim(),
      String(item.nombre || "").trim()
    ];
  });

  const grupos = (diccionarios.grupos || []).map(function(item) {
    return [
      String(item.codigo || item.id || "").trim(),
      String(item.nombre || "").trim(),
      String(item.codigoOficina || "").trim(),
      String(item.nombreOficina || "").trim()
    ];
  });

  const rangoMateriales = escribirBloqueDiccionarioPreciosPaso28N_(
    hoja,
    1,
    "MATERIALES",
    ["CODIGO_MATERIAL", "NOMBRE_MATERIAL", "DESCRIPCION_MATERIAL"],
    materiales
  );

  const rangoProveedores = escribirBloqueDiccionarioPreciosPaso28N_(
    hoja,
    5,
    "PROVEEDORES",
    ["CODIGO_PROVEEDOR", "PROVEEDOR"],
    proveedores
  );

  const rangoNegocios = escribirBloqueDiccionarioPreciosPaso28N_(
    hoja,
    8,
    "NEGOCIOS",
    ["NEGOCIO", "DESCRIPCION"],
    negocios
  );

  const rangoOficinas = escribirBloqueDiccionarioPreciosPaso28N_(
    hoja,
    11,
    "OFICINAS DE VENTAS",
    ["CODIGO_OFICINA", "OFICINA"],
    oficinas
  );

  const rangoGrupos = escribirBloqueDiccionarioPreciosPaso28N_(
    hoja,
    14,
    "GRUPOS DE VENDEDORES",
    ["CODIGO_GRUPO", "GRUPO", "CODIGO_OFICINA", "OFICINA"],
    grupos
  );

  const filaInfo = Math.max(
    materiales.length,
    proveedores.length,
    negocios.length,
    oficinas.length,
    grupos.length,
    1
  ) + 5;

  hoja.getRange(filaInfo, 1, 8, 2).setValues([
    ["REGLA", "DESCRIPCION"],
    ["MATERIAL", "Usa únicamente CODIGO_MATERIAL. CODIGO_SAP_MATERIAL fue retirado de la carga masiva."],
    ["PROVEEDOR", "Obligatorio por fila o mediante Proveedor predeterminado del modal."],
    ["NEGOCIO", "Obligatorio por fila o mediante Negocio predeterminado del modal."],
    ["GENERAL", "CODIGO_OFICINA y CODIGO_GRUPO vacíos."],
    ["OFICINA", "Informa CODIGO_OFICINA y deja CODIGO_GRUPO vacío."],
    ["GRUPO", "Informa CODIGO_OFICINA y CODIGO_GRUPO. El grupo debe pertenecer a la oficina."],
    ["VIGENCIA", "No se permiten vigencias superpuestas para material + proveedor + negocio + oficina + grupo."]
  ]);

  hoja.getRange(filaInfo, 1, 1, 2).setFontWeight("bold");

  const anchos = {
    1: 150, 2: 220, 3: 320,
    5: 160, 6: 260,
    8: 150, 9: 220,
    11: 160, 12: 240,
    14: 160, 15: 240, 16: 160, 17: 240
  };

  Object.keys(anchos).forEach(function(columna) {
    hoja.setColumnWidth(Number(columna), anchos[columna]);
  });

  return {
    materiales: rangoMateriales,
    proveedores: rangoProveedores,
    negocios: rangoNegocios,
    oficinas: rangoOficinas,
    grupos: rangoGrupos
  };
}

/** @private */
function configurarValidacionesHojaCargaPreciosPaso28N_(hoja, rangos) {
  const filas = MP_MODULO_SGT360.MAX_FILAS_IMPORTACION;

  function aplicar(columna, rango, ayuda) {
    if (!rango) return;

    const constructor = SpreadsheetApp.newDataValidation()
      .requireValueInRange(rango, true)
      .setAllowInvalid(false);

    if (ayuda) constructor.setHelpText(ayuda);

    hoja.getRange(2, columna, filas, 1)
      .setDataValidation(constructor.build());
  }

  aplicar(
    1,
    rangos.materiales,
    "Selecciona un CODIGO_MATERIAL vigente."
  );

  aplicar(
    2,
    rangos.proveedores,
    "Selecciona el proveedor. Puede quedar vacío si usarás el Proveedor predeterminado del modal."
  );

  aplicar(
    3,
    rangos.negocios,
    "Selecciona el negocio. Puede quedar vacío si usarás el Negocio predeterminado del modal."
  );

  aplicar(
    4,
    rangos.oficinas,
    "Opcional. Déjalo vacío para un precio General."
  );

  aplicar(
    5,
    rangos.grupos,
    "Opcional. Si informas un grupo, también debes informar su oficina."
  );
}

/**
 * Precalienta manualmente la plantilla de precios.
 * Útil después de publicar una versión para que el primer usuario no espere
 * la creación/exportación inicial.
 */
function prepararCachePlantillaPreciosPaso28N() {
  const usuario = obtenerUsuarioActual();
  validarAutorizacionCargaMaterialesPaso28B_();

  const diccionarios = obtenerDiccionariosPlantillaPreciosPaso28N_(usuario);
  const huella = obtenerHuellaPlantillaPreciosPaso28N_(diccionarios);
  const alcanceCache = String(diccionarios.alcanceCache || "GLOBAL").trim();

  const existente = obtenerBlobPlantillaPreciosCachePaso28N_(alcanceCache, huella);

  if (existente) {
    return {
      correcto: true,
      cacheHit: true,
      alcanceCache: alcanceCache,
      resumen: existente.resumen || {},
      mensaje: "La plantilla de precios vigente ya estaba preparada en caché."
    };
  }

  const generado = generarBlobPlantillaPreciosPaso28N_(diccionarios);
  const guardado = guardarBlobPlantillaPreciosCachePaso28N_(
    alcanceCache,
    huella,
    generado.blob,
    generado.resumen
  );

  return {
    correcto: true,
    cacheHit: false,
    alcanceCache: alcanceCache,
    fileId: guardado.fileId,
    resumen: guardado.resumen || {},
    mensaje: "Plantilla XLSX de precios preparada para descargas rápidas."
  };
}

/**
 * PASO 28N — carga precios individuales de manera masiva desde XLSX.
 *
 * La hoja obligatoria es CARGA_PRECIOS.
 * CODIGO_MATERIAL identifica el material; CODIGO_SAP_MATERIAL no se utiliza.
 */
function cargarPreciosIndividualesMasivoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("CREAR_PRECIO_INDIVIDUAL", usuario);
  datos = datos || {};

  const modo = normalizarTexto(datos.modo || "PREVALIDAR");

  if (modo === "CONFIRMAR") {
    return confirmarCargaPreciosMasivoPaso28O_(datos, usuario);
  }

  return prevalidarPreciosMasivoPaso28O_(datos, usuario);
}

function prevalidarPreciosMasivoPaso28O_(datos, usuario) {
  const inicioProceso = Date.now();

  validarAutorizacionCargaMaterialesPaso28B_();

  const nombreArchivo =
    limpiarTextoMotor_(datos.nombreArchivo || "", 200);
  const archivoBase64 =
    String(datos.archivoBase64 || "").trim();

  if (!archivoBase64) {
    throw new Error("No se recibió el archivo XLSX de precios.");
  }

  const bytes = Utilities.base64Decode(archivoBase64);

  if (!bytes.length) {
    throw new Error("El archivo XLSX de precios está vacío.");
  }

  if (bytes.length > MP_CARGA_PRECIOS_XLSX_PASO_28N.MAX_BYTES) {
    throw new Error(
      "El archivo de precios supera el máximo permitido de 5 MB."
    );
  }

  const revisionInicial = obtenerRevisionDatosMotor_();

  const archivoTemporal = importarXlsxComoSpreadsheetTemporal_(
    bytes,
    nombreArchivo || "Carga_Precios.xlsx"
  );

  try {
    const libro =
      abrirSpreadsheetConReintento_(archivoTemporal.id);

    const parseado =
      leerCargaPreciosXlsxPaso28N_(libro);

    if (
      parseado.filas.length >
      MP_MODULO_SGT360.MAX_FILAS_IMPORTACION
    ) {
      throw new Error(
        "La plantilla supera el máximo de " +
        MP_MODULO_SGT360.MAX_FILAS_IMPORTACION +
        " filas."
      );
    }

    if (!parseado.filas.length) {
      throw new Error(
        "La hoja CARGA_PRECIOS no contiene filas para validar."
      );
    }

    const analisis =
      analizarCargaPreciosMasivoPaso28O_(
        parseado.filas,
        datos,
        usuario
      );

    const revisionFinal = obtenerRevisionDatosMotor_();

    if (
      String(revisionInicial || "") !==
      String(revisionFinal || "")
    ) {
      throw new Error(
        "Los datos cambiaron mientras se validaba el archivo. " +
        "Vuelve a prevalidar para trabajar con información vigente."
      );
    }

    let tokenPreview = "";

    if (analisis.errores === 0) {
      escribirPreviewTecnicoPreciosPaso28O_(
        libro,
        analisis
      );

      tokenPreview =
        generarTokenPreviewPreciosPaso28O_();

      CacheService.getScriptCache().put(
        obtenerClavePreviewPreciosPaso28O_(tokenPreview),
        JSON.stringify({
          idArchivoTemporal: archivoTemporal.id,
          idUsuario: String(usuario.idUsuario || "").trim(),
          nombreArchivo: nombreArchivo,
          revisionDatos: revisionFinal,
          creadoEn: new Date().toISOString(),
          totalFilas: analisis.totalFilas,
          creados: analisis.creados,
          actualizados: analisis.actualizados
        }),
        MP_CARGA_PRECIOS_XLSX_PASO_28N.TTL_PREVIEW_SEGUNDOS
      );
    } else {
      try {
        DriveApp.getFileById(
          String(archivoTemporal.id)
        ).setTrashed(true);
      } catch (errorLimpieza) {
        console.warn(errorLimpieza.message);
      }
    }

    return {
      correcto: analisis.errores === 0,
      soloValidacion: true,
      puedeConfirmar:
        analisis.errores === 0 &&
        analisis.totalFilas > 0,
      tokenPreview: tokenPreview,
      totalFilas: analisis.totalFilas,
      creados: analisis.creados,
      actualizados: analisis.actualizados,
      errores: analisis.errores,
      observaciones:
        analisis.filasResultado
          .filter(function(item) {
            return item.estado === "ERROR";
          })
          .slice(0, 100),
      detalleValidacion:
        analisis.filasResultado.slice(0, 150),
      duracionMs: Date.now() - inicioProceso,
      version: "28O",
      mensaje: analisis.errores ?
        "La prevalidación encontró errores. Corrige el XLSX y vuelve a validar. No se grabó ningún precio." :
        "Prevalidación correcta. Revisa el resumen y confirma para grabar los precios."
    };
  } catch (error) {
    try {
      DriveApp.getFileById(
        String(archivoTemporal.id)
      ).setTrashed(true);
    } catch (errorLimpieza) {
      console.warn(errorLimpieza.message);
    }

    throw error;
  }
}

function confirmarCargaPreciosMasivoPaso28O_(datos, usuario) {
  validarAutorizacionCargaMaterialesPaso28B_();

  const tokenPreview =
    String(datos.tokenPreview || "").trim();

  if (!tokenPreview) {
    throw new Error(
      "La prevalidación de precios no está disponible. " +
      "Vuelve a seleccionar y validar el archivo."
    );
  }

  const claveCache =
    obtenerClavePreviewPreciosPaso28O_(tokenPreview);

  const cache = CacheService.getScriptCache();
  const texto = cache.get(claveCache);

  if (!texto) {
    throw new Error(
      "La prevalidación de precios venció. " +
      "Vuelve a validar el archivo antes de confirmar."
    );
  }

  let contexto = null;

  try {
    contexto = JSON.parse(texto);
  } catch (error) {
    contexto = null;
  }

  if (
    !contexto ||
    !String(contexto.idArchivoTemporal || "").trim()
  ) {
    throw new Error(
      "El contexto de prevalidación de precios no es válido."
    );
  }

  if (
    String(contexto.idUsuario || "").trim() !==
    String(usuario.idUsuario || "").trim()
  ) {
    throw new Error(
      "La prevalidación de precios pertenece a otro usuario."
    );
  }

  if (
    String(contexto.revisionDatos || "") !==
    String(obtenerRevisionDatosMotor_() || "")
  ) {
    throw new Error(
      "Los materiales, precios o datos maestros cambiaron después de la prevalidación. " +
      "Vuelve a validar el archivo antes de confirmar."
    );
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const libro = abrirSpreadsheetConReintento_(
      String(contexto.idArchivoTemporal)
    );

    const preview =
      leerPreviewTecnicoPreciosPaso28O_(libro);

    if (
      !preview.objetosListas.length &&
      !preview.objetosDetalles.length
    ) {
      throw new Error(
        "No se encontró el detalle técnico validado. " +
        "Vuelve a prevalidar el archivo."
      );
    }

    if (preview.objetosListas.length) {
      guardarObjetosMotorMasivoPrecio_(
        MP_MODULO_SGT360.HOJAS.LISTAS,
        "ID_LISTA_PRECIO",
        preview.objetosListas
      );
    }

    if (preview.objetosDetalles.length) {
      guardarObjetosMotorMasivoPrecio_(
        MP_MODULO_SGT360.HOJAS.LISTA_DETALLE,
        "ID_DETALLE_PRECIO",
        preview.objetosDetalles
      );
    }

    if (
      preview.objetosListas.length ||
      preview.objetosDetalles.length
    ) {
      marcarVersionCachePreciosMateriales_();
      marcarVersionCacheMaterialesPrecios_();
    }

    cache.remove(claveCache);

    try {
      DriveApp.getFileById(
        String(contexto.idArchivoTemporal)
      ).setTrashed(true);
    } catch (errorLimpieza) {
      console.warn(errorLimpieza.message);
    }

    return {
      correcto: true,
      confirmado: true,
      totalFilas: Number(contexto.totalFilas) || 0,
      creados: Number(contexto.creados) || 0,
      actualizados: Number(contexto.actualizados) || 0,
      errores: 0,
      version: "28O",
      mensaje:
        "Carga confirmada. Los precios validados fueron grabados correctamente."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function analizarCargaPreciosMasivoPaso28O_(
  filas,
  datos,
  usuario
) {
  // No se ejecuta asegurarEstructuraMaterialesPrecios_().
  // La estructura se valida durante instalación/migración, no por cada archivo.
  const materiales =
    leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES);

  const listas =
    leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);

  const detalles =
    leerTablaPrecio_(
      MP_MODULO_SGT360.HOJAS.LISTA_DETALLE
    );

  const indiceMateriales =
    construirMapaMaterialesPrecioMasivo_(materiales);

  const proveedoresActivos =
    obtenerProveedoresActivosOpciones_();

  const mapaProveedores =
    construirMapaOpcionesPrecioMasivo_(proveedoresActivos);

  const idsProveedoresActivos = {};

  proveedoresActivos.forEach(function(item) {
    idsProveedoresActivos[
      String(item.id || "").trim()
    ] = true;
  });

  const mapaNegocios =
    construirMapaOpcionesPrecioMasivo_(
      listarValoresCatalogoAppPrecio_("MP_NEGOCIOS")
    );

  const mapaOficinas = obtenerMapaOficinasPrecio_();
  const mapaGrupos = obtenerMapaGruposPrecio_();

  const proveedorCabecera =
    resolverProveedorPrecioCabecera_(datos, usuario);

  const negocioCabecera =
    String(datos.idNegocio || "").trim();

  const proveedorUsuario =
    String(usuario.idProveedor || "").trim();

  const puedeSeleccionarProveedor =
    esAccesoGlobalMaterialesPrecios_(usuario) ||
    tienePermisoMaterialesPrecios_(
      "SELECCIONAR_PROVEEDOR_LISTA",
      usuario
    ) ||
    tienePermisoMaterialesPrecios_(
      "CARGAR_LISTA_PRECIO_ADMIN",
      usuario
    );

  const listasIndividualesPorClave = {};
  const detallesPorListaMaterial = {};

  listas.forEach(function(lista) {
    if (
      normalizarTexto(
        lista.ESTADO || CONFIG.ESTADOS.ACTIVO
      ) === CONFIG.ESTADOS.ACTIVO &&
      esListaPrecioIndividual_(lista)
    ) {
      listasIndividualesPorClave[
        claveListaPrecioIndividual_(lista)
      ] = lista;
    }
  });

  detalles.forEach(function(detalle) {
    const clave =
      String(detalle.ID_LISTA_PRECIO || "").trim() +
      "|" +
      String(detalle.ID_MATERIAL || "").trim();

    if (clave !== "|") {
      detallesPorListaMaterial[clave] = detalle;
    }
  });

  const objetosListas = [];
  const objetosDetalles = [];
  const filasResultado = [];
  const vistosPorAlcance = {};

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  (filas || []).forEach(function(registro) {
    const filaNumero =
      Number(registro.numeroFila) || 0;

    const objeto = registro.objeto || {};

    const normalizada =
      normalizarFilaPrecioIndividualMasivo_(
        objeto,
        datos
      );

    const erroresFila = [];

    const resolucionMaterial =
      resolverMaterialPrecioMasivoPorCodigoInternoPaso28N_(
        normalizada,
        indiceMateriales
      );

    const material = resolucionMaterial.material;

    erroresFila.push.apply(
      erroresFila,
      resolucionMaterial.errores || []
    );

    const idProveedor =
      resolverIdOpcionPrecioMasivo_(
        normalizada.codigoProveedor,
        mapaProveedores,
        proveedorCabecera
      );

    const idNegocio =
      resolverIdOpcionPrecioMasivo_(
        normalizada.negocio,
        mapaNegocios,
        negocioCabecera
      );

    const oficinas =
      resolverIdsOficinasCargaPrecio_(
        normalizada.codigoOficina,
        datos,
        mapaOficinas
      );

    const idOficina =
      String(oficinas[0] || "").trim();

    const grupoDestino =
      resolverGrupoCargaPrecio_(
        normalizada.codigoGrupo ||
        String(datos.idGrupo || ""),
        mapaGrupos
      );

    const idGrupo = idOficina ?
      String(grupoDestino.id || "").trim() :
      "";

    const fechaInicio =
      normalizarFechaEntradaPrecio_(
        normalizada.fechaInicio ||
        datos.fechaInicio
      );

    const fechaFin =
      normalizarFechaEntradaPrecio_(
        normalizada.fechaFin ||
        datos.fechaFin
      );

    const fechaInicioDate =
      convertirFechaPrecio_(fechaInicio);

    const fechaFinDate =
      convertirFechaPrecio_(fechaFin);

    const precio =
      convertirNumeroPrecioMateriales_(
        normalizada.precio
      );

    if (!idProveedor) {
      erroresFila.push(
        "Proveedor obligatorio o no reconocido"
      );
    }

    if (
      idProveedor &&
      !idsProveedoresActivos[idProveedor]
    ) {
      erroresFila.push(
        "Proveedor no existe o está inactivo"
      );
    }

    if (
      proveedorUsuario &&
      idProveedor &&
      idProveedor !== proveedorUsuario &&
      !puedeSeleccionarProveedor
    ) {
      erroresFila.push(
        "El proveedor de la fila no corresponde al proveedor asignado al usuario"
      );
    }

    if (!idNegocio) {
      erroresFila.push(
        "Negocio obligatorio o no reconocido"
      );
    }

    if (
      normalizada.codigoOficina &&
      !idOficina
    ) {
      erroresFila.push("Oficina no reconocida");
    }

    if (
      (
        normalizada.codigoGrupo ||
        String(datos.idGrupo || "").trim()
      ) &&
      !idOficina
    ) {
      erroresFila.push(
        "Para usar grupo debes indicar una oficina de ventas"
      );
    }

    if (
      idGrupo &&
      grupoDestino.idOficina &&
      idOficina &&
      grupoDestino.idOficina !== idOficina
    ) {
      erroresFila.push(
        "El grupo no pertenece a la oficina indicada"
      );
    }

    if (
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      erroresFila.push("Precio inválido");
    }

    if (!fechaInicioDate) {
      erroresFila.push(
        "Fecha inicio obligatoria o inválida"
      );
    }

    if (!fechaFinDate) {
      erroresFila.push(
        "Fecha fin obligatoria o inválida"
      );
    }

    if (
      fechaInicioDate &&
      fechaFinDate &&
      fechaFinDate.getTime() <
        fechaInicioDate.getTime()
    ) {
      erroresFila.push(
        "Fecha fin menor que fecha inicio"
      );
    }

    if (
      !erroresFila.length &&
      material
    ) {
      const claveAlcance = [
        material.ID_MATERIAL,
        idProveedor,
        idNegocio,
        idOficina,
        idGrupo
      ].join("|");

      const previas =
        vistosPorAlcance[claveAlcance] ||
        [];

      const conflictoArchivo =
        previas.find(function(previa) {
          return fechasSeCruzanPrecio_(
            fechaInicioDate,
            fechaFinDate,
            previa.inicio,
            previa.fin
          );
        });

      if (conflictoArchivo) {
        const exacta =
          conflictoArchivo.fechaInicio ===
            fechaInicio &&
          conflictoArchivo.fechaFin ===
            fechaFin;

        erroresFila.push(
          exacta ?
            "Precio duplicado dentro del archivo para el mismo material, proveedor y alcance" :
            "Vigencia superpuesta dentro del archivo para el mismo material, proveedor y alcance"
        );
      } else {
        previas.push({
          inicio: fechaInicioDate,
          fin: fechaFinDate,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          fila: filaNumero
        });

        vistosPorAlcance[claveAlcance] =
          previas;
      }
    }

    if (erroresFila.length) {
      errores++;

      filasResultado.push({
        fila: filaNumero,
        codigoMaterial:
          normalizada.codigoMaterial || "",
        estado: "ERROR",
        accion: "NO CARGAR",
        detalle: erroresFila.join(" | ")
      });

      return;
    }

    const datosPrecio = {
      idProveedor: idProveedor,
      idNegocio: idNegocio,
      idOficina: idOficina,
      idGrupo: idGrupo,
      idMaterial:
        String(material.ID_MATERIAL || "").trim(),
      precioBase: precio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      detalleCombo:
        normalizada.detalleCombo,
      comentarioComercial:
        normalizada.comentarioComercial,
      descripcionComercial:
        material.DESCRIPCION_MATERIAL ||
        material.NOMBRE_MATERIAL ||
        "",
      _proveedorResuelto: true
    };

    const listaProspectiva =
      construirObjetoListaPrecioIndividualRapida_(
        datosPrecio,
        usuario,
        null
      );

    const claveLista =
      claveListaPrecioIndividual_(
        listaProspectiva
      );

    let lista =
      listasIndividualesPorClave[claveLista] ||
      null;

    if (lista) {
      listaProspectiva.ID_LISTA_PRECIO =
        lista.ID_LISTA_PRECIO;
    }

    try {
      validarCruceVigenciaPrecioMaterialRapido_(
        listas.concat(objetosListas),
        detalles.concat(objetosDetalles),
        lista || listaProspectiva,
        datosPrecio.idMaterial,
        ""
      );
    } catch (errorCruce) {
      errores++;

      filasResultado.push({
        fila: filaNumero,
        codigoMaterial:
          normalizada.codigoMaterial || "",
        estado: "ERROR",
        accion: "NO CARGAR",
        detalle:
          errorCruce && errorCruce.message ?
            errorCruce.message :
            String(errorCruce)
      });

      return;
    }

    const listaFinal =
      construirObjetoListaPrecioIndividualRapida_(
        datosPrecio,
        usuario,
        lista
      );

    listasIndividualesPorClave[claveLista] =
      listaFinal;

    if (!lista) {
      objetosListas.push(listaFinal);
    }

    const claveDetalle =
      listaFinal.ID_LISTA_PRECIO +
      "|" +
      datosPrecio.idMaterial;

    const detalleExistente =
      detallesPorListaMaterial[claveDetalle] ||
      null;

    const detalleFinal =
      construirObjetoDetallePrecioIndividualRapido_(
        datosPrecio,
        usuario,
        detalleExistente
      );

    detalleFinal.ID_LISTA_PRECIO =
      listaFinal.ID_LISTA_PRECIO;

    detallesPorListaMaterial[claveDetalle] =
      detalleFinal;

    objetosDetalles.push(detalleFinal);

    if (detalleExistente) {
      actualizados++;
    } else {
      creados++;
    }

    filasResultado.push({
      fila: filaNumero,
      codigoMaterial:
        normalizada.codigoMaterial || "",
      estado: "OK",
      accion:
        detalleExistente ?
          "ACTUALIZAR" :
          "CREAR",
      detalle:
        detalleExistente ?
          "Se actualizará el precio existente con la misma vigencia." :
          "Se creará un nuevo precio."
    });
  });

  return {
    totalFilas: (filas || []).length,
    creados: creados,
    actualizados: actualizados,
    errores: errores,
    filasResultado: filasResultado,
    objetosListas: objetosListas,
    objetosDetalles: objetosDetalles
  };
}

function escribirPreviewTecnicoPreciosPaso28O_(
  libro,
  analisis
) {
  let hoja =
    libro.getSheetByName(
      MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_PREVIEW_TECNICA
    );

  if (!hoja) {
    hoja = libro.insertSheet(
      MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_PREVIEW_TECNICA
    );
  }

  hoja.clear();

  const filas = [
    ["TIPO", "JSON"]
  ];

  (analisis.objetosListas || []).forEach(function(item) {
    filas.push([
      "LISTA",
      JSON.stringify(item)
    ]);
  });

  (analisis.objetosDetalles || []).forEach(function(item) {
    filas.push([
      "DETALLE",
      JSON.stringify(item)
    ]);
  });

  hoja.getRange(
    1,
    1,
    filas.length,
    2
  ).setValues(filas);

  try {
    hoja.hideSheet();
  } catch (error) {}

  SpreadsheetApp.flush();
}

function leerPreviewTecnicoPreciosPaso28O_(libro) {
  const hoja =
    libro.getSheetByName(
      MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_PREVIEW_TECNICA
    );

  if (
    !hoja ||
    hoja.getLastRow() < 2
  ) {
    return {
      objetosListas: [],
      objetosDetalles: []
    };
  }

  const datos =
    hoja.getRange(
      2,
      1,
      hoja.getLastRow() - 1,
      2
    ).getDisplayValues();

  const salida = {
    objetosListas: [],
    objetosDetalles: []
  };

  datos.forEach(function(fila) {
    const tipo =
      normalizarTexto(fila[0] || "");

    const texto =
      String(fila[1] || "").trim();

    if (!tipo || !texto) return;

    let objeto;
    try {
      objeto = JSON.parse(texto);
    } catch (error) {
      objeto = null;
    }

    if (!objeto) return;

    rehidratarFechasObjetoPrecioPreviewPaso28O_(objeto);

    if (tipo === "LISTA") {
      salida.objetosListas.push(objeto);
    } else if (tipo === "DETALLE") {
      salida.objetosDetalles.push(objeto);
    }
  });

  return salida;
}

function rehidratarFechasObjetoPrecioPreviewPaso28O_(objeto) {
  [
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION"
  ].forEach(function(campo) {
    if (!objeto[campo]) return;

    const fecha = new Date(objeto[campo]);

    if (!Number.isNaN(fecha.getTime())) {
      objeto[campo] = fecha;
    }
  });

  return objeto;
}

function generarTokenPreviewPreciosPaso28O_() {
  return Utilities.getUuid().replace(/-/g, "");
}

function obtenerClavePreviewPreciosPaso28O_(token) {
  return (
    MP_CARGA_PRECIOS_XLSX_PASO_28N.PREFIJO_CACHE_PREVIEW +
    String(token || "").trim()
  );
}

/** @private */
function leerCargaPreciosXlsxPaso28N_(libro) {
  const hoja = libro.getSheetByName(
    MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_CARGA
  );

  if (!hoja) {
    throw new Error(
      "El archivo no contiene la hoja " +
      MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_CARGA +
      ". Descarga nuevamente la plantilla oficial."
    );
  }

  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 1 || ultimaColumna < 1) {
    throw new Error("La hoja CARGA_PRECIOS no contiene cabeceras.");
  }

  const cabeceras = hoja
    .getRange(1, 1, 1, ultimaColumna)
    .getDisplayValues()[0];

  const mapa = crearMapaCabeceras(cabeceras);

  validarCabeceras(
    mapa,
    MP_CARGA_PRECIOS_XLSX_PASO_28N.REQUERIDAS,
    MP_CARGA_PRECIOS_XLSX_PASO_28N.HOJA_CARGA
  );

  if (ultimaFila < 2) {
    return {
      cabeceras: cabeceras,
      filas: []
    };
  }

  const datos = hoja
    .getRange(2, 1, ultimaFila - 1, ultimaColumna)
    .getDisplayValues();

  const filas = [];

  datos.forEach(function(fila, indice) {
    if (esFilaVaciaMotor_(fila)) return;

    filas.push({
      numeroFila: indice + 2,
      objeto: filaAObjetoDesdeMapaPrecio_(cabeceras, fila)
    });
  });

  return {
    cabeceras: cabeceras,
    filas: filas
  };
}

/** @private */
function resolverMaterialPrecioMasivoPorCodigoInternoPaso28N_(
  normalizada,
  indiceMateriales
) {
  normalizada = normalizada || {};
  indiceMateriales =
    indiceMateriales ||
    { porId: {}, porCodigoMaterial: {}, porCodigoSap: {} };

  const codigoOriginal =
    String(normalizada.codigoMaterial || "").trim();

  const codigo =
    normalizarTexto(codigoOriginal);

  const errores = [];

  if (!codigo) {
    errores.push(
      "CODIGO_MATERIAL es obligatorio para identificar el material"
    );

    return {
      material: null,
      errores: errores
    };
  }

  const material =
    indiceMateriales.porCodigoMaterial[codigo] ||
    indiceMateriales.porId[codigo] ||
    null;

  if (!material) {
    errores.push(
      "Código interno de material no reconocido: " +
      codigoOriginal
    );
  }

  return {
    material: errores.length ? null : material,
    errores: errores
  };
}

function normalizarFilaPrecioIndividualMasivo_(objeto, datosCabecera) {
  objeto = objeto || {};
  datosCabecera = datosCabecera || {};
  return {
    codigoSap: limpiarTextoMotor_(objeto.CODIGO_SAP_MATERIAL || objeto.CODIGO_SAP || objeto.SAP || "", 80),
    codigoMaterial: limpiarTextoMotor_(objeto.CODIGO_MATERIAL || objeto.MATERIAL || "", 80),
    codigoProveedor: limpiarTextoMotor_(objeto.CODIGO_PROVEEDOR || objeto.CODIGO_SAP_PROVEEDOR || objeto.PROVEEDOR || objeto.ID_PROVEEDOR || "", 120),
    negocio: limpiarTextoMotor_(objeto.NEGOCIO || objeto.CODIGO_NEGOCIO || objeto.ID_NEGOCIO || datosCabecera.idNegocio || "", 160),
    codigoOficina: limpiarTextoMotor_(objeto.CODIGO_OFICINA || objeto.OFICINA || objeto.ID_OFICINA || "", 160),
    codigoGrupo: limpiarTextoMotor_(objeto.CODIGO_GRUPO || objeto.GRUPO || objeto.ID_GRUPO || "", 160),
    precio: objeto.PRECIO || objeto.PRECIO_BASE || objeto.MONTO || "",
    fechaInicio: limpiarTextoMotor_(objeto.FECHA_INICIO || objeto.INICIO || datosCabecera.fechaInicio || "", 40),
    fechaFin: limpiarTextoMotor_(objeto.FECHA_FIN || objeto.FIN || datosCabecera.fechaFin || "", 40),
    detalleCombo: limpiarTextoMotor_(objeto.DETALLE_COMBO || objeto.COMBO || objeto.COMPONENTES_INCLUIDOS || "", 1000),
    comentarioComercial: limpiarTextoMotor_(objeto.COMENTARIO_COMERCIAL || objeto.OBSERVACION || objeto.COMENTARIO || "", 1000)
  };
}

function construirMapaMaterialesPrecioMasivo_(materiales) {
  const indice = { porId: {}, porCodigoMaterial: {}, porCodigoSap: {} };
  (materiales || []).forEach(function(material) {
    if (normalizarTexto(material.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    const id = String(material.ID_MATERIAL || "").trim();
    const codigo = normalizarTexto(material.CODIGO_MATERIAL || "");
    const sap = normalizarTexto(material.CODIGO_SAP || "");
    if (id) indice.porId[normalizarTexto(id)] = material;
    if (codigo && !indice.porCodigoMaterial[codigo]) indice.porCodigoMaterial[codigo] = material;
    if (sap && sap !== "EN CREACION" && !indice.porCodigoSap[sap]) indice.porCodigoSap[sap] = material;
  });
  return indice;
}

function resolverMaterialPrecioMasivo_(normalizada, indiceMateriales) {
  normalizada = normalizada || {};
  indiceMateriales = indiceMateriales || { porId: {}, porCodigoMaterial: {}, porCodigoSap: {} };
  const codigoOriginal = String(normalizada.codigoMaterial || "").trim();
  const sapOriginal = String(normalizada.codigoSap || "").trim();
  const codigo = normalizarTexto(codigoOriginal);
  const sap = normalizarTexto(sapOriginal);
  const usaSap = Boolean(sap && sap !== "EN CREACION");
  const errores = [];

  const porCodigo = codigo ?
    (indiceMateriales.porCodigoMaterial[codigo] || indiceMateriales.porId[codigo] || null) : null;
  const porSap = usaSap ? (indiceMateriales.porCodigoSap[sap] || null) : null;

  if (!codigo && !usaSap) {
    errores.push("Indica CODIGO_MATERIAL o CODIGO_SAP_MATERIAL para identificar el material");
  }
  if (codigo && !porCodigo) {
    errores.push("Código interno de material no reconocido: " + codigoOriginal);
  }
  if (usaSap && !porSap) {
    errores.push("Código SAP de material no reconocido: " + sapOriginal);
  }
  if (porCodigo && porSap && String(porCodigo.ID_MATERIAL || "").trim() !== String(porSap.ID_MATERIAL || "").trim()) {
    errores.push("CODIGO_MATERIAL y CODIGO_SAP_MATERIAL corresponden a materiales diferentes");
  }

  return {
    material: errores.length ? null : (porCodigo || porSap || null),
    errores: errores
  };
}

function construirMapaOpcionesPrecioMasivo_(opciones) {
  const mapa = {};
  (opciones || []).forEach(function(item) {
    [
      item.id, item.ID,
      item.codigo, item.CODIGO,
      item.codigoSap, item.CODIGO_SAP,
      item.ruc, item.RUC,
      item.nombre, item.NOMBRE,
      item.razonSocial, item.RAZON_SOCIAL,
      item.nombreComercial, item.NOMBRE_COMERCIAL
    ].forEach(function(valor) {
      const clave = normalizarTexto(valor);
      if (clave && !mapa[clave]) mapa[clave] = String(item.id || item.ID || "").trim();
    });
  });
  return mapa;
}

function resolverIdOpcionPrecioMasivo_(valor, mapa, predeterminado) {
  const texto = String(valor || "").trim();
  if (!texto) return String(predeterminado || "").trim();
  return String((mapa || {})[normalizarTexto(texto)] || "").trim();
}

function claveListaPrecioIndividual_(lista) {
  lista = lista || {};
  return [
    String(lista.ID_PROVEEDOR || lista.idProveedor || "").trim(),
    String(lista.ID_NEGOCIO || lista.idNegocio || "").trim(),
    String(lista.ID_OFICINA || lista.idOficina || "").trim(),
    String(lista.ID_GRUPO || lista.idGrupo || "").trim(),
    normalizarFechaEntradaPrecio_(lista.FECHA_INICIO || lista.fechaInicio),
    normalizarFechaEntradaPrecio_(lista.FECHA_FIN || lista.fechaFin),
    "PRECIO_INDIVIDUAL"
  ].join("|");
}

function construirObjetoDetallePrecioIndividualRapido_(datos, usuario, detalleExistente) {
  const ahora = new Date();
  const detalleCombo = limpiarTextoMotor_(datos.detalleCombo || datos.componentesIncluidos || "", 1000);
  const objeto = {
    ID_DETALLE_PRECIO: detalleExistente ? detalleExistente.ID_DETALLE_PRECIO : generarIdMotor_("DPR"),
    CODIGO_PRECIO: detalleExistente ? (detalleExistente.CODIGO_PRECIO || generarCodigoPrecioDetalle_()) : generarCodigoPrecioDetalle_(),
    ID_LISTA_PRECIO: String(datos.idListaPrecio || "").trim(),
    ID_MATERIAL: String(datos.idMaterial || "").trim(),
    PRECIO_BASE: Number(datos.precioBase),
    MONEDA: MP_MODULO_SGT360.MONEDA,
    TIENE_COMBO: detalleCombo ? "SI" : "",
    DETALLE_COMBO: detalleCombo,
    DESCRIPCION_COMERCIAL: limpiarTextoMotor_(datos.descripcionComercial || "", 500),
    COMENTARIO_COMERCIAL: limpiarTextoMotor_(datos.comentarioComercial || "", 500),
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!detalleExistente) objeto.FECHA_CREACION = ahora;
  return Object.assign({}, detalleExistente || {}, objeto);
}

function guardarObjetosMotorMasivoPrecio_(nombreHoja, campoClave, objetos) {
  const registros = (objetos || []).filter(function(item) { return item && typeof item === "object"; });
  if (!registros.length) return { creados: 0, actualizados: 0 };
  const contexto = obtenerContextoTablaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, [campoClave]);
  const indiceClave = contexto.mapa[normalizarClaveMotor_(campoClave)];
  const ultimaFila = contexto.hoja.getLastRow();
  const existentes = ultimaFila > 1 ? contexto.hoja.getRange(2, 1, ultimaFila - 1, contexto.numeroColumnas).getValues() : [];
  const filaPorClave = {};
  existentes.forEach(function(fila, index) {
    const clave = String(fila[indiceClave] || "").trim();
    if (clave) filaPorClave[clave] = index;
  });
  const nuevas = [];
  let actualizados = 0;
  registros.forEach(function(objeto) {
    const clave = String(obtenerValorObjetoMotor_(objeto, campoClave) || "").trim();
    if (!clave) throw new Error("No se puede cargar en " + nombreHoja + " porque falta " + campoClave + ".");
    if (typeof filaPorClave[clave] === "number") {
      const idx = filaPorClave[clave];
      existentes[idx] = objetoAFilaMotor_(contexto.cabeceras, objeto, existentes[idx]);
      actualizados++;
    } else {
      filaPorClave[clave] = existentes.length + nuevas.length;
      nuevas.push(objetoAFilaMotor_(contexto.cabeceras, objeto));
    }
  });
  if (existentes.length && actualizados) contexto.hoja.getRange(2, 1, existentes.length, contexto.numeroColumnas).setValues(existentes);
  if (nuevas.length) contexto.hoja.getRange(contexto.hoja.getLastRow() + 1, 1, nuevas.length, contexto.numeroColumnas).setValues(nuevas);
  marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja);
  return { creados: nuevas.length, actualizados: actualizados };
}



/** Entrega plantilla CSV para cargar materiales universales. */

/**
 * Paso 28B — Ejecutar manualmente una sola vez desde el editor.
 *
 * Fuerza la autorización de los tres servicios utilizados por la nueva plantilla:
 * Sheets, Drive y solicitudes externas. En especial corrige instalaciones en las
 * que el usuario concedió permisos granulares de forma parcial.
 */
function autorizarServiciosCargaMaterialesPaso28C() {
  const alcances = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ];

  // Si falta consentimiento, Apps Script detiene esta ejecución y muestra
  // la pantalla de autorización antes de continuar.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, alcances);

  let archivoTemporalId = "";
  const diagnostico = {
    hojas: false,
    drive: false,
    urlFetch: false
  };

  try {
    // IMPORTANTE: no toca ninguna base configurada de Cálidda 360.
    // Crea un libro temporal únicamente para comprobar el servicio Sheets.
    const libroTemporal = SpreadsheetApp.create(
      "SGT360_AUTORIZACION_TEMP_" +
      Utilities.formatDate(new Date(), "America/Lima", "yyyyMMdd_HHmmss")
    );

    archivoTemporalId = libroTemporal.getId();

    libroTemporal
      .getSheets()[0]
      .getRange("A1")
      .setValue("AUTORIZACION_OK");

    SpreadsheetApp.flush();
    diagnostico.hojas = Boolean(archivoTemporalId);

    // Prueba Drive sobre el mismo archivo temporal.
    const archivoTemporal = DriveApp.getFileById(archivoTemporalId);
    diagnostico.drive = Boolean(archivoTemporal && archivoTemporal.getId());

    // Prueba solicitudes externas sin depender de ninguna API privada.
    const respuesta = UrlFetchApp.fetch(
      "https://www.googleapis.com/generate_204",
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

    diagnostico.urlFetch = respuesta.getResponseCode() < 400;

    return {
      correcto:
        diagnostico.hojas &&
        diagnostico.drive &&
        diagnostico.urlFetch,
      paso: "28C",
      servicios: diagnostico,
      mensaje:
        "Los servicios de Sheets, Drive y UrlFetch están autorizados. " +
        "Ahora ejecuta diagnosticarBasesSGT360Paso28C()."
    };
  } finally {
    // El archivo es únicamente técnico. Si Drive ya quedó autorizado,
    // se envía a la papelera para no dejar residuos.
    if (archivoTemporalId) {
      try {
        DriveApp.getFileById(archivoTemporalId).setTrashed(true);
      } catch (errorLimpieza) {
        console.warn(
          "No se pudo eliminar el archivo temporal de autorización: %s",
          errorLimpieza.message
        );
      }
    }
  }
}

/**
 * Alias de compatibilidad del Paso 28B.
 * Puede seguir ejecutándose, pero ya utiliza el diagnóstico seguro del Paso 28C.
 */
function autorizarServiciosCargaMaterialesPaso28B() {
  return autorizarServiciosCargaMaterialesPaso28C();
}

/**
 * Paso 28C — Diagnóstico de las tres bases sin crear, sembrar ni modificar datos.
 *
 * Permite distinguir:
 * - alcance OAuth faltante;
 * - ID incorrecto;
 * - archivo eliminado;
 * - archivo que no es Google Sheets;
 * - cuenta ejecutora sin acceso al archivo.
 */
function diagnosticarBasesSGT360Paso28C() {
  const propiedades = PropertiesService.getScriptProperties();
  const configId = String(
    propiedades.getProperty(PROPIEDADES_MOTOR_SGT360.DB_CONFIG_ID) || ""
  ).trim();

  const definiciones = [
    {
      alias: "CONFIG",
      propiedad: PROPIEDADES_MOTOR_SGT360.DB_CONFIG_ID,
      id: configId
    },
    {
      alias: "SECURITY",
      propiedad: PROPIEDADES_MOTOR_SGT360.DB_SECURITY_ID,
      id: String(
        propiedades.getProperty(PROPIEDADES_MOTOR_SGT360.DB_SECURITY_ID) ||
        configId
      ).trim()
    },
    {
      alias: "OPERATION",
      propiedad: PROPIEDADES_MOTOR_SGT360.DB_OPERATION_ID,
      id: String(
        propiedades.getProperty(PROPIEDADES_MOTOR_SGT360.DB_OPERATION_ID) ||
        configId
      ).trim()
    }
  ];

  const resultados = definiciones.map(function(definicion) {
    const resultado = {
      alias: definicion.alias,
      propiedad: definicion.propiedad,
      id: definicion.id,
      driveAccesible: false,
      sheetsAccesible: false,
      nombreArchivo: "",
      nombreLibro: "",
      mimeType: "",
      errorDrive: "",
      errorSheets: ""
    };

    if (!definicion.id) {
      resultado.errorDrive = "ID no configurado.";
      resultado.errorSheets = "ID no configurado.";
      return resultado;
    }

    try {
      const archivo = DriveApp.getFileById(definicion.id);
      resultado.driveAccesible = true;
      resultado.nombreArchivo = archivo.getName();
      resultado.mimeType = archivo.getMimeType();
    } catch (errorDrive) {
      resultado.errorDrive = String(
        errorDrive && errorDrive.message
          ? errorDrive.message
          : errorDrive
      );
    }

    try {
      const libro = SpreadsheetApp.openById(definicion.id);
      resultado.sheetsAccesible = true;
      resultado.nombreLibro = libro.getName();
    } catch (errorSheets) {
      resultado.errorSheets = String(
        errorSheets && errorSheets.message
          ? errorSheets.message
          : errorSheets
      );
    }

    return resultado;
  });

  const correcto = resultados.every(function(item) {
    return item.driveAccesible === true && item.sheetsAccesible === true;
  });

  const salida = {
    correcto: correcto,
    paso: "28C",
    bases: resultados,
    mensaje: correcto
      ? "Las tres bases son accesibles con la cuenta ejecutora."
      : "Existe al menos una base inaccesible. Revisa el detalle por alias."
  };

  console.log(JSON.stringify(salida, null, 2));
  Logger.log(JSON.stringify(salida, null, 2));

  return salida;
}

/** @private */
function validarAutorizacionCargaMaterialesPaso28B_() {
  const alcances = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ];

  const info = ScriptApp.getAuthorizationInfo(
    ScriptApp.AuthMode.FULL,
    alcances
  );

  if (
    info.getAuthorizationStatus() !==
    ScriptApp.AuthorizationStatus.NOT_REQUIRED
  ) {
    throw new Error(
      "Faltan permisos de Google para generar o leer archivos XLSX. " +
      "Ejecuta una sola vez autorizarServiciosCargaMaterialesPaso28C() " +
      "desde el editor de Apps Script con la cuenta que implementa Cálidda 360."
    );
  }

  return true;
}

/** @private */
function obtenerDiccionariosPlantillaMaterialesRapido_(idNegocio) {
  const catalogos = listarValoresCatalogosAppPrecioEnBloque_([
    "MP_NEGOCIOS",
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL",
    "MP_MARCAS",
    "MP_UNIDADES_MEDIDA",
    "MP_ESTADOS_MATERIAL"
  ]);

  const negocio = normalizarTexto(idNegocio || "");
  const negocios = (catalogos.MP_NEGOCIOS || []).filter(function(item) {
    return normalizarTexto(item.id || item.codigo || "") === negocio;
  });

  if (!negocios.length) {
    throw new Error("El negocio seleccionado no existe o está inactivo.");
  }

  const productos = (catalogos.MP_PRODUCTOS_PRINCIPALES || []).filter(function(item) {
    const padre = normalizarTexto(item.valorPadre || "");
    const negocioMetadata = normalizarTexto(
      item.metadata && item.metadata.negocio || ""
    );

    return (
      (!padre && !negocioMetadata) ||
      padre === negocio ||
      negocioMetadata === negocio
    );
  });

  return {
    negocios: negocios,
    productos: productos,
    tipos: catalogos.MP_TIPOS_MATERIAL || [],
    subtipos: catalogos.MP_SUBTIPOS_MATERIAL || [],
    marcas: catalogos.MP_MARCAS || [],
    unidades: catalogos.MP_UNIDADES_MEDIDA || [],
    estados: catalogos.MP_ESTADOS_MATERIAL || []
  };
}

/** @private */
function configurarHojaDiccionariosMaterialesXlsxRapida_(hoja, idNegocio, diccionarios) {
  const productos = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.productos || []);
  const tipos = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.tipos || []);
  const subtipos = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.subtipos || []);
  const marcas = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.marcas || []);
  const unidades = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.unidades || []);
  const estados = ordenarOpcionesCatalogoAlfabeticamente_(diccionarios.estados || []);

  const arbolCompleto = [];
  const rutasValidas = [];

  productos.forEach(function(producto) {
    const codigoProducto = normalizarTexto(producto.id || producto.codigo || "");
    const nombreProducto = String(producto.nombre || codigoProducto).trim();

    const tiposProducto = tipos.filter(function(tipo) {
      return (
        normalizarTexto(tipo.clavePadre || "") === "MP_PRODUCTOS_PRINCIPALES" &&
        normalizarTexto(tipo.valorPadre || "") === codigoProducto
      );
    });

    if (!tiposProducto.length) {
      arbolCompleto.push([
        codigoProducto,
        nombreProducto,
        "",
        "",
        "",
        ""
      ]);
      return;
    }

    tiposProducto.forEach(function(tipo) {
      const codigoTipo = normalizarTexto(tipo.id || tipo.codigo || "");
      const nombreTipo = String(tipo.nombre || codigoTipo).trim();

      const subtiposTipo = subtipos.filter(function(subtipo) {
        const coincideTipo =
          normalizarTexto(subtipo.clavePadre || "") === "MP_TIPOS_MATERIAL" &&
          normalizarTexto(subtipo.valorPadre || "") === codigoTipo;

        const productoMetadata = normalizarTexto(
          subtipo.metadata && subtipo.metadata.productoPrincipal || ""
        );

        return coincideTipo &&
          (!productoMetadata || productoMetadata === codigoProducto);
      });

      if (!subtiposTipo.length) {
        arbolCompleto.push([
          codigoProducto,
          nombreProducto,
          codigoTipo,
          nombreTipo,
          "",
          ""
        ]);
        return;
      }

      subtiposTipo.forEach(function(subtipo) {
        const codigoSubtipo = normalizarTexto(subtipo.id || subtipo.codigo || "");
        const nombreSubtipo = String(subtipo.nombre || codigoSubtipo).trim();
        const rutaCodigo = [
          codigoProducto,
          codigoTipo,
          codigoSubtipo
        ].join(" > ");

        const filaArbol = [
          codigoProducto,
          nombreProducto,
          codigoTipo,
          nombreTipo,
          codigoSubtipo,
          nombreSubtipo
        ];

        arbolCompleto.push(filaArbol);

        rutasValidas.push([
          rutaCodigo,
          codigoProducto,
          nombreProducto,
          codigoTipo,
          nombreTipo,
          codigoSubtipo,
          nombreSubtipo
        ]);
      });
    });
  });

  rutasValidas.sort(function(a, b) {
    return compararTextoMotor_(a[0], b[0]);
  });

  arbolCompleto.sort(function(a, b) {
    return compararTextoMotor_(
      [a[1], a[3], a[5]].filter(Boolean).join(" > "),
      [b[1], b[3], b[5]].filter(Boolean).join(" > ")
    );
  });

  if (!rutasValidas.length) {
    throw new Error(
      "El negocio seleccionado no tiene rutas completas de tipificación. " +
      "Debe existir al menos una relación Producto principal → Tipo → Subtipo."
    );
  }

  const totalFilas = Math.max(
    rutasValidas.length,
    arbolCompleto.length,
    marcas.length,
    unidades.length,
    estados.length,
    1
  ) + 3;

  const totalColumnas = 23;
  const matriz = Array.from({ length: totalFilas }, function() {
    return new Array(totalColumnas).fill("");
  });

  // A:G — única fuente válida para la carga masiva.
  matriz[0][0] = "RUTAS VÁLIDAS PARA CARGA";
  [
    "RUTA_TIPIFICACION",
    "COD_PRODUCTO",
    "PRODUCTO",
    "COD_TIPO",
    "TIPO",
    "COD_SUBTIPO",
    "SUBTIPO"
  ].forEach(function(valor, indice) {
    matriz[1][indice] = valor;
  });

  rutasValidas.forEach(function(fila, indiceFila) {
    fila.forEach(function(valor, indiceColumna) {
      matriz[indiceFila + 2][indiceColumna] = valor;
    });
  });

  // I:N — árbol completo, incluyendo ramas todavía sin hijos.
  matriz[0][8] = "ÁRBOL COMPLETO";
  [
    "COD_PRODUCTO",
    "PRODUCTO",
    "COD_TIPO",
    "TIPO",
    "COD_SUBTIPO",
    "SUBTIPO"
  ].forEach(function(valor, indice) {
    matriz[1][8 + indice] = valor;
  });

  arbolCompleto.forEach(function(fila, indiceFila) {
    fila.forEach(function(valor, indiceColumna) {
      matriz[indiceFila + 2][8 + indiceColumna] = valor;
    });
  });

  // P:Q — marcas.
  matriz[0][15] = "MARCAS";
  matriz[1][15] = "CODIGO";
  matriz[1][16] = "DESCRIPCION";
  marcas.forEach(function(item, indice) {
    matriz[indice + 2][15] = String(item.codigo || item.id || "").trim();
    matriz[indice + 2][16] = String(item.nombre || "").trim();
  });

  // S:T — unidades.
  matriz[0][18] = "UNIDADES";
  matriz[1][18] = "CODIGO";
  matriz[1][19] = "DESCRIPCION";
  unidades.forEach(function(item, indice) {
    matriz[indice + 2][18] = String(item.codigo || item.id || "").trim();
    matriz[indice + 2][19] = String(item.nombre || "").trim();
  });

  // V:W — estados.
  matriz[0][21] = "ESTADOS";
  matriz[1][21] = "CODIGO";
  matriz[1][22] = "DESCRIPCION";
  estados.forEach(function(item, indice) {
    matriz[indice + 2][21] = String(item.codigo || item.id || "").trim();
    matriz[indice + 2][22] = String(item.nombre || "").trim();
  });

  hoja.clear();
  hoja.getRange(1, 1, totalFilas, totalColumnas).setValues(matriz);
  hoja.setFrozenRows(2);
  hoja.getRange(1, 1, 2, totalColumnas).setFontWeight("bold");

  const anchos = {
    1: 260, 2: 125, 3: 170, 4: 115, 5: 170, 6: 135, 7: 200,
    9: 125, 10: 170, 11: 115, 12: 170, 13: 135, 14: 200,
    16: 125, 17: 190,
    19: 115, 20: 170,
    22: 115, 23: 160
  };

  Object.keys(anchos).forEach(function(columna) {
    hoja.setColumnWidth(Number(columna), anchos[columna]);
  });

  const filaInfo = totalFilas + 2;
  hoja.getRange(filaInfo, 1, 7, 2).setValues([
    ["NEGOCIO DE LA PLANTILLA", idNegocio],
    ["MODO DE CARGA", "Selecciona una RUTA_TIPIFICACION completa en la hoja CARGA_MATERIALES."],
    ["JERARQUÍA", "Producto principal → Tipo → Subtipo."],
    ["RUTA VÁLIDA", "Solo aparecen combinaciones que tienen los tres niveles relacionados."],
    ["RAMAS INCOMPLETAS", "Se muestran en ÁRBOL COMPLETO, pero no pueden utilizarse hasta tener Subtipo."],
    ["CÓDIGOS", "La aplicación resuelve internamente Producto, Tipo y Subtipo desde la ruta seleccionada."],
    ["ALTAS", "Si falta una clasificación, créala primero desde Configuración > Catálogos."]
  ]);
  hoja.getRange(filaInfo, 1, 7, 1).setFontWeight("bold");

  return {
    rutas: hoja.getRange(3, 1, Math.max(1, rutasValidas.length), 1),
    marcas: hoja.getRange(3, 16, Math.max(1, marcas.length), 1),
    unidades: hoja.getRange(3, 19, Math.max(1, unidades.length), 1),
    estados: hoja.getRange(3, 22, Math.max(1, estados.length), 1),
    totalRutas: rutasValidas.length
  };
}


/**
 * Entrega la plantilla XLSX de materiales con diccionarios vigentes.
 * Paso 28G:
 * - reutiliza un XLSX ya generado cuando el árbol/catálogos no cambiaron;
 * - evita crear y exportar un Spreadsheet en cada clic;
 * - conserva una única copia técnica por negocio en Drive;
 * - el primer clic después de un cambio de catálogo reconstruye el caché.
 */
function obtenerBlobPlantillaMaterialesCacheRapidaPaso28O_(idNegocio) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave =
    obtenerClavePropiedadPlantillaMaterialesPaso28G_(idNegocio);
  const texto = String(propiedades.getProperty(clave) || "").trim();

  if (!texto) return null;

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    return null;
  }

  if (
    !datos ||
    String(datos.version || "") !== MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.VERSION ||
    !String(datos.fileId || "").trim() ||
    !datos.creadoEn
  ) {
    return null;
  }

  const creado = new Date(datos.creadoEn);

  if (
    Number.isNaN(creado.getTime()) ||
    Date.now() - creado.getTime() >
      MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.TTL_REUSO_RAPIDO_SEGUNDOS * 1000
  ) {
    return null;
  }

  try {
    const archivo =
      DriveApp.getFileById(String(datos.fileId).trim());
    const blob = archivo.getBlob();

    if (!blob || !blob.getBytes().length) return null;

    return {
      blob: blob.setName(
        MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO
      ),
      fileId: archivo.getId(),
      totalRutas: Number(datos.totalRutas) || 0,
      cacheHit: true,
      cacheRapida: true
    };
  } catch (error) {
    return null;
  }
}

function obtenerPlantillaMaterialesModulo(datos) {
  const inicio = Date.now();
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("CREAR_MATERIAL", usuario);
  datos = datos || {};

  validarAutorizacionCargaMaterialesPaso28B_();

  const idNegocio = normalizarTexto(datos.idNegocio || "");
  if (!idNegocio) {
    throw new Error("Selecciona el negocio antes de descargar la plantilla de materiales.");
  }

  // PASO 28O: primero intenta reutilización directa por 5 minutos.
  // La versión anterior siempre leía APP_CATALOGO_VALORES antes de comprobar
  // que el XLSX almacenado seguía disponible.
  let cache =
    obtenerBlobPlantillaMaterialesCacheRapidaPaso28O_(idNegocio);

  let diccionarios = null;
  let huella = "";

  if (!cache) {
    diccionarios =
      obtenerDiccionariosPlantillaMaterialesRapido_(idNegocio);

    huella =
      obtenerHuellaPlantillaMaterialesPaso28G_(
        idNegocio,
        diccionarios
      );

    cache =
      obtenerBlobPlantillaMaterialesCachePaso28G_(
        idNegocio,
        huella
      );
  }

  if (!cache) {
    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.TTL_BLOQUEO_MS);

    try {
      // Otro usuario pudo haber generado la misma plantilla mientras se esperaba el lock.
      cache =
        obtenerBlobPlantillaMaterialesCachePaso28G_(
          idNegocio,
          huella
        );

      if (!cache) {
        if (!diccionarios) {
          diccionarios =
            obtenerDiccionariosPlantillaMaterialesRapido_(idNegocio);

          huella =
            obtenerHuellaPlantillaMaterialesPaso28G_(
              idNegocio,
              diccionarios
            );
        }

        const generado =
          generarBlobPlantillaMaterialesPaso28G_(
            idNegocio,
            diccionarios
          );
        cache = guardarBlobPlantillaMaterialesCachePaso28G_(
          idNegocio,
          huella,
          generado.blob,
          generado.totalRutas
        );
        cache.cacheHit = false;
      }
    } finally {
      bloqueo.releaseLock();
    }
  }

  const bytes = cache.blob.getBytes();
  if (!bytes || !bytes.length) {
    throw new Error("La plantilla XLSX almacenada no contiene datos.");
  }

  return {
    correcto: true,
    nombreArchivo: MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO,
    mimeType: MP_CARGA_MATERIALES_XLSX.MIME_XLSX,
    contenidoBase64: Utilities.base64Encode(bytes),
    tamanoBytes: bytes.length,
    negocio: idNegocio,
    totalRutasTipificacion: Number(cache.totalRutas) || 0,
    cacheHit: cache.cacheHit !== false,
    duracionMs: Date.now() - inicio,
    version: "28G",
    mensaje: cache.cacheHit === false ?
      "Plantilla XLSX actualizada y almacenada para próximas descargas." :
      "Plantilla XLSX recuperada desde caché."
  };
}

/** @private */
function obtenerClavePropiedadPlantillaMaterialesPaso28G_(idNegocio) {
  return (
    MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.PREFIJO_PROPIEDAD +
    normalizarClaveMotor_(idNegocio || "NEGOCIO").slice(0, 80)
  );
}

/** @private */
function obtenerHuellaPlantillaMaterialesPaso28G_(idNegocio, diccionarios) {
  function compactar(opciones) {
    return (Array.isArray(opciones) ? opciones : []).map(function(item) {
      return [
        normalizarTexto(item.id || item.codigo || ""),
        String(item.nombre || "").trim(),
        normalizarTexto(item.clavePadre || ""),
        normalizarTexto(item.valorPadre || ""),
        item.metadata && typeof item.metadata === "object" ? item.metadata : {}
      ];
    });
  }

  const material = JSON.stringify({
    version: MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.VERSION,
    negocio: normalizarTexto(idNegocio || ""),
    productos: compactar(diccionarios.productos),
    tipos: compactar(diccionarios.tipos),
    subtipos: compactar(diccionarios.subtipos),
    marcas: compactar(diccionarios.marcas),
    unidades: compactar(diccionarios.unidades),
    estados: compactar(diccionarios.estados)
  });

  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    material,
    Utilities.Charset.UTF_8
  ).map(function(byte) {
    return (byte + 256).toString(16).slice(-2);
  }).join("").toUpperCase();
}

/** @private */
function obtenerBlobPlantillaMaterialesCachePaso28G_(idNegocio, huella) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave = obtenerClavePropiedadPlantillaMaterialesPaso28G_(idNegocio);
  const texto = String(propiedades.getProperty(clave) || "").trim();
  if (!texto) return null;

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    propiedades.deleteProperty(clave);
    return null;
  }

  if (
    !datos ||
    String(datos.version || "") !== MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.VERSION ||
    String(datos.huella || "") !== String(huella || "") ||
    !String(datos.fileId || "").trim()
  ) {
    return null;
  }

  try {
    const archivo = DriveApp.getFileById(String(datos.fileId).trim());
    const blob = archivo.getBlob();
    if (!blob || !blob.getBytes().length) return null;

    return {
      blob: blob.setName(MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO),
      fileId: archivo.getId(),
      totalRutas: Number(datos.totalRutas) || 0,
      cacheHit: true
    };
  } catch (error) {
    propiedades.deleteProperty(clave);
    return null;
  }
}

/** @private */
function guardarBlobPlantillaMaterialesCachePaso28G_(idNegocio, huella, blob, totalRutas) {
  const propiedades = PropertiesService.getScriptProperties();
  const clave = obtenerClavePropiedadPlantillaMaterialesPaso28G_(idNegocio);
  let anterior = null;

  try {
    anterior = JSON.parse(String(propiedades.getProperty(clave) || "null"));
  } catch (error) {
    anterior = null;
  }

  const archivo = DriveApp.createFile(
    blob.copyBlob().setName(MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO)
  );

  propiedades.setProperty(clave, JSON.stringify({
    version: MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.VERSION,
    huella: String(huella || ""),
    fileId: archivo.getId(),
    totalRutas: Number(totalRutas) || 0,
    creadoEn: new Date().toISOString()
  }));

  if (
    anterior &&
    anterior.fileId &&
    String(anterior.fileId) !== archivo.getId()
  ) {
    try {
      DriveApp.getFileById(String(anterior.fileId)).setTrashed(true);
    } catch (errorAnterior) {
      console.warn(
        "No se pudo eliminar la versión anterior de la plantilla cacheada: %s",
        errorAnterior.message
      );
    }
  }

  return {
    blob: archivo.getBlob().setName(MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO),
    fileId: archivo.getId(),
    totalRutas: Number(totalRutas) || 0,
    cacheHit: false
  };
}

/** @private */
function generarBlobPlantillaMaterialesPaso28G_(idNegocio, diccionarios) {
  const libro = SpreadsheetApp.create(
    "TMP_Plantilla_Materiales_" + Utilities.getUuid().slice(0, 8)
  );

  try {
    const carga = libro.getSheets()[0];
    carga.setName(MP_CARGA_MATERIALES_XLSX.HOJA_CARGA);

    const diccionario = libro.insertSheet(
      MP_CARGA_MATERIALES_XLSX.HOJA_DICCIONARIOS
    );

    const rangos = configurarHojaDiccionariosMaterialesXlsxRapida_(
      diccionario,
      idNegocio,
      diccionarios
    );

    configurarHojaCargaMaterialesXlsx_(carga);
    configurarValidacionesHojaCargaMaterialesXlsx_(carga, {
      rutas: rangos.rutas,
      marcas: rangos.marcas,
      unidades: rangos.unidades,
      estados: rangos.estados
    });

    SpreadsheetApp.flush();

    const blob = exportarSpreadsheetComoXlsx_(libro.getId());
    if (!blob || !blob.getBytes().length) {
      throw new Error("Google Drive generó una plantilla XLSX vacía.");
    }

    return {
      blob: blob.setName(MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO),
      totalRutas: Number(rangos.totalRutas) || 0
    };
  } finally {
    try {
      DriveApp.getFileById(libro.getId()).setTrashed(true);
    } catch (error) {
      console.warn("No se pudo eliminar la plantilla temporal: %s", error.message);
    }
  }
}

/**
 * Precalienta manualmente la plantilla para que el primer usuario no espere
 * la creación/exportación del XLSX. Puede ejecutarse desde el editor.
 */
function prepararCachePlantillaMaterialesPaso28G(idNegocio) {
  validarAutorizacionCargaMaterialesPaso28B_();
  const negocio = normalizarTexto(idNegocio || "GASODOMESTICOS");
  const diccionarios = obtenerDiccionariosPlantillaMaterialesRapido_(negocio);
  const huella = obtenerHuellaPlantillaMaterialesPaso28G_(negocio, diccionarios);

  const existente = obtenerBlobPlantillaMaterialesCachePaso28G_(negocio, huella);
  if (existente) {
    return {
      correcto: true,
      negocio: negocio,
      cacheHit: true,
      totalRutasTipificacion: existente.totalRutas,
      mensaje: "La plantilla vigente ya estaba preparada en caché."
    };
  }

  const generado = generarBlobPlantillaMaterialesPaso28G_(negocio, diccionarios);
  const guardado = guardarBlobPlantillaMaterialesCachePaso28G_(
    negocio,
    huella,
    generado.blob,
    generado.totalRutas
  );

  return {
    correcto: true,
    negocio: negocio,
    cacheHit: false,
    fileId: guardado.fileId,
    totalRutasTipificacion: guardado.totalRutas,
    mensaje: "Plantilla XLSX preparada. Las próximas descargas reutilizarán este archivo."
  };
}

/** Carga materiales universales desde CSV. No crea precios. */
function cargarMaterialesMasivoModulo(datos) {
  return prevalidarMaterialesMasivoModulo(datos);
}

/** Crea solicitud desde CSV cargado por proveedor o responsable interno. */
function crearSolicitudListaPrecioModulo(datos) {
  const usuario = obtenerUsuarioActual();
  if (!tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO", usuario) && !tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", usuario)) {
    exigirPermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO", usuario);
  }
  datos = datos || {};
  asegurarEstructuraMaterialesPrecios_();
  validarCabeceraListaPrecio_(datos);
  const proveedorUsuario = String(usuario.idProveedor || "").trim();
  if (!proveedorUsuario) {
    throw new Error("La carga de listas queda reservada para usuarios proveedor. Para carga interna usa la carga masiva de la pestaña Precios.");
  }
  const idProveedor = resolverProveedorPrecioCabecera_(datos, usuario);
  if (!idProveedor) {
    throw new Error("Selecciona el proveedor de la lista de precios.");
  }
  if (proveedorUsuario && idProveedor && idProveedor !== proveedorUsuario && !tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", usuario) && !tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", usuario) && !tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario)) {
    throw new Error("Solo puedes cargar listas para tu proveedor asignado.");
  }
  if (!proveedorUsuario && idProveedor && !tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", usuario) && !tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", usuario) && !tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario)) {
    throw new Error("Solo un usuario proveedor o un administrador autorizado puede cargar listas.");
  }
  const contenido = String(datos.contenidoCsv || "");
  if (!contenido.trim()) throw new Error("El archivo no contiene datos.");
  const parseado = parsearCsvPrecio_(contenido);
  if (parseado.filas.length > MP_MODULO_SGT360.MAX_FILAS_IMPORTACION) {
    throw new Error("La plantilla supera el máximo de " + MP_MODULO_SGT360.MAX_FILAS_IMPORTACION + " filas.");
  }
  const validacion = validarFilasSolicitudPrecio_(parseado.cabeceras, parseado.filas, Object.assign({}, datos, { idProveedor: idProveedor }));
  const estado = validacion.errores > 0 ? MP_MODULO_SGT360.ESTADOS_SOLICITUD.OBSERVADO_SISTEMA : MP_MODULO_SGT360.ESTADOS_SOLICITUD.PENDIENTE_REVISION;
  const ahora = new Date();
  const idSolicitud = generarIdMotor_("SLP");
  const codigoSolicitud = generarCodigoSolicitudPrecio_(datos, idSolicitud);
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", {
    ID_SOLICITUD: idSolicitud,
    CODIGO_SOLICITUD: codigoSolicitud,
    ID_PROVEEDOR: idProveedor,
    ID_NEGOCIO: String(datos.idNegocio || "").trim(),
    ID_OFICINA: String(datos.idOficina || "").trim(),
    ID_GRUPO: String(datos.idGrupo || "").trim(),
    ALCANCE: determinarAlcanceListaPrecio_(datos),
    FECHA_INICIO: normalizarFechaEntradaPrecio_(datos.fechaInicio),
    FECHA_FIN: normalizarFechaEntradaPrecio_(datos.fechaFin),
    MONEDA: MP_MODULO_SGT360.MONEDA,
    ESTADO: estado,
    ORIGEN_CARGA: determinarOrigenCargaListaPrecio_(usuario, idProveedor),
    NOMBRE_ARCHIVO: limpiarTextoMotor_(datos.nombreArchivo || "lista_precios.csv", 240),
    ID_ARCHIVO_ORIGINAL: "",
    URL_ARCHIVO_ORIGINAL: "",
    TOTAL_FILAS: validacion.detalles.length,
    TOTAL_ERRORES: validacion.errores,
    TOTAL_ADVERTENCIAS: validacion.advertencias,
    COMENTARIO_PROVEEDOR: limpiarTextoMotor_(datos.comentarioProveedor || "", 1000),
    COMENTARIO_REVISOR: "",
    ID_USUARIO_CARGA: usuario.idUsuario || "",
    FECHA_CARGA: ahora,
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  validacion.detalles.forEach(function(detalle) {
    detalle.ID_SOLICITUD = idSolicitud;
    guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE, "ID_DETALLE_SOLICITUD", detalle);
  });
  registrarHistorialSolicitudPrecio_(idSolicitud, "CREAR_SOLICITUD", "", estado, "Solicitud creada desde plantilla.");
  registrarCambioMotor_(MP_MODULO_SGT360.CODIGO, "CREAR_SOLICITUD_PRECIO", "SOLICITUD_LISTA_PRECIO", idSolicitud, {
    codigoSolicitud: codigoSolicitud,
    filas: validacion.detalles.length,
    errores: validacion.errores,
    advertencias: validacion.advertencias
  });
  return {
    correcto: true,
    idSolicitud: idSolicitud,
    codigoSolicitud: codigoSolicitud,
    estado: estado,
    totalFilas: validacion.detalles.length,
    totalErrores: validacion.errores,
    totalAdvertencias: validacion.advertencias,
    tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(idProveedor),
    mensaje: validacion.errores > 0 ? "La solicitud fue observada por validaciones automáticas." : "La solicitud quedó pendiente de revisión."
  };
}

/** Lista solicitudes visibles para el usuario. */
function listarSolicitudesListaPrecioModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  validarAccesoSolicitudesPrecio_(usuario);
  filtros = filtros || {};
  let registros = obtenerSolicitudesVisiblesPrecios_(usuario, filtros).map(function(item) {
    return mapearSolicitudPrecio_(item);
  });
  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "TODOS");
  if (estado && estado !== "TODOS") registros = registros.filter(function(item) { return item.estado === estado; });
  if (texto) {
    registros = registros.filter(function(item) {
      return [item.codigoSolicitud, item.proveedor, item.negocio, item.oficina, item.grupo, item.estado].some(function(valor) {
        return normalizarTexto(valor).indexOf(texto) !== -1;
      });
    });
  }
  registros.sort(function(a, b) {
    return compararTextoMotor_(b.fechaCarga, a.fechaCarga);
  });
  return paginarConResumenPrecios_(registros, filtros, {
    total: registros.length,
    pendientes: registros.filter(function(item) { return esEstadoPendienteSolicitudPrecio_(item.estado); }).length,
    aprobadas: registros.filter(function(item) { return item.estado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO; }).length,
    publicadas: registros.filter(function(item) { return item.estado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO; }).length
  });
}

/** Obtiene detalle completo de una solicitud para revisión en pantalla completa. */
function obtenerDetalleSolicitudListaPrecioModulo(idSolicitud) {
  const usuario = obtenerUsuarioActual();
  const solicitud = buscarSolicitudVisiblePrecio_(idSolicitud, usuario);
  if (!solicitud) throw new Error("No se encontró la solicitud o no tienes acceso.");
  if (!tienePermisoMaterialesPrecios_("VER_DETALLE_SOLICITUD_PRECIO", usuario) && !tienePermisoMaterialesPrecios_("VER_OBSERVACIONES_LISTA", usuario)) {
    exigirPermisoMaterialesPrecios_("VER_DETALLE_SOLICITUD_PRECIO", usuario);
  }
  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE).filter(function(item) {
    return String(item.ID_SOLICITUD || "").trim() === String(idSolicitud || "").trim();
  }).map(mapearDetalleSolicitudPrecio_).sort(function(a, b) { return a.numeroFila - b.numeroFila; });
  const historial = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUD_HISTORIAL).filter(function(item) {
    return String(item.ID_SOLICITUD || "").trim() === String(idSolicitud || "").trim();
  }).map(function(item) {
    return {
      fechaHora: normalizarFechaSalidaPrecio_(item.FECHA_HORA),
      usuario: String(item.CORREO || item.ID_USUARIO || "").trim(),
      accion: normalizarTexto(item.ACCION),
      estadoAnterior: normalizarTexto(item.ESTADO_ANTERIOR),
      estadoNuevo: normalizarTexto(item.ESTADO_NUEVO),
      comentario: String(item.COMENTARIO || "").trim()
    };
  });
  return { solicitud: mapearSolicitudPrecio_(solicitud), detalles: detalles, historial: historial };
}

/** Marca una solicitud como tomada para revisión. */
function tomarRevisionSolicitudListaPrecioModulo(idSolicitud) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("TOMAR_REVISION_PRECIO", usuario);
  const solicitud = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", idSolicitud);
  if (!solicitud) throw new Error("No se encontró la solicitud.");
  const estadoAnterior = normalizarTexto(solicitud.ESTADO);
  if ([MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO, MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO, MP_MODULO_SGT360.ESTADOS_SOLICITUD.RECHAZADO, MP_MODULO_SGT360.ESTADOS_SOLICITUD.ANULADO].indexOf(estadoAnterior) !== -1) {
    throw new Error("La solicitud no puede tomarse en su estado actual.");
  }
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", {
    ID_SOLICITUD: solicitud.ID_SOLICITUD,
    ESTADO: MP_MODULO_SGT360.ESTADOS_SOLICITUD.EN_REVISION,
    ID_USUARIO_REVISION: usuario.idUsuario || "",
    FECHA_INICIO_REVISION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  registrarHistorialSolicitudPrecio_(solicitud.ID_SOLICITUD, "TOMAR_REVISION", estadoAnterior, MP_MODULO_SGT360.ESTADOS_SOLICITUD.EN_REVISION, "Solicitud tomada para revisión.");
  return { correcto: true, estado: MP_MODULO_SGT360.ESTADOS_SOLICITUD.EN_REVISION };
}

/** Observa, rechaza o aprueba solicitud. */
function resolverRevisionSolicitudListaPrecioModulo(idSolicitud, accion, comentario) {
  const usuario = obtenerUsuarioActual();
  accion = normalizarTexto(accion);
  const recurso = accion === "APROBAR" ? "APROBAR_LISTA_PRECIO" : accion === "RECHAZAR" ? "RECHAZAR_LISTA_PRECIO" : "OBSERVAR_LISTA_PRECIO";
  exigirPermisoMaterialesPrecios_(recurso, usuario);
  const solicitud = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", idSolicitud);
  if (!solicitud) throw new Error("No se encontró la solicitud.");
  const estadoAnterior = normalizarTexto(solicitud.ESTADO);
  const nuevoEstado = accion === "APROBAR" ? MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO :
    accion === "RECHAZAR" ? MP_MODULO_SGT360.ESTADOS_SOLICITUD.RECHAZADO :
    MP_MODULO_SGT360.ESTADOS_SOLICITUD.OBSERVADO_REVISOR;
  if (nuevoEstado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO && Number(solicitud.TOTAL_ERRORES || 0) > 0) {
    throw new Error("No se puede aprobar una solicitud con errores bloqueantes.");
  }
  const ahora = new Date();
  const objeto = {
    ID_SOLICITUD: solicitud.ID_SOLICITUD,
    ESTADO: nuevoEstado,
    COMENTARIO_REVISOR: limpiarTextoMotor_(comentario || "", 2000),
    ID_USUARIO_REVISION: usuario.idUsuario || solicitud.ID_USUARIO_REVISION || "",
    FECHA_REVISION: ahora,
    FECHA_ACTUALIZACION: ahora
  };
  if (nuevoEstado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO) {
    objeto.ID_USUARIO_APROBACION = usuario.idUsuario || "";
    objeto.FECHA_APROBACION = ahora;
  }
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", objeto);
  registrarHistorialSolicitudPrecio_(solicitud.ID_SOLICITUD, accion + "_SOLICITUD", estadoAnterior, nuevoEstado, comentario || "");
  return { correcto: true, estado: nuevoEstado };
}

/** Publica una solicitud aprobada como lista oficial. */
function publicarSolicitudListaPrecioModulo(idSolicitud) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("PUBLICAR_LISTA_PRECIO", usuario);
  const solicitud = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", idSolicitud);
  if (!solicitud) throw new Error("No se encontró la solicitud.");
  if (normalizarTexto(solicitud.ESTADO) !== MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO) {
    throw new Error("Solo se puede publicar una solicitud aprobada.");
  }
  if (!String(solicitud.ID_PROVEEDOR || "").trim()) {
    throw new Error("La solicitud no tiene proveedor definido.");
  }

  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE).filter(function(item) {
    return String(item.ID_SOLICITUD || "").trim() === String(idSolicitud || "").trim() && normalizarTexto(item.ESTADO_FILA) !== "ERROR";
  });
  if (!detalles.length) throw new Error("La solicitud no tiene detalles válidos para publicar.");

  const listasExistentes = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
  const listasPorAlcance = {};
  const listasPublicadas = [];

  detalles.forEach(function(detalle) {
    const oficinas = normalizarIdsOficinasPrecio_(detalle.IDS_OFICINAS || solicitud.ID_OFICINA || "");
    if (!oficinas.length) oficinas.push("");
    const idGrupoDetalle = String(detalle.ID_GRUPO || solicitud.ID_GRUPO || "").trim();

    oficinas.forEach(function(idOficinaDetalle) {
      const idOficina = String(idOficinaDetalle || "").trim();
      const idGrupo = idOficina && oficinas.length === 1 ? idGrupoDetalle : "";
      const datosAlcance = {
        idProveedor: solicitud.ID_PROVEEDOR,
        idNegocio: solicitud.ID_NEGOCIO,
        idOficina: idOficina,
        idGrupo: idGrupo,
        fechaInicio: solicitud.FECHA_INICIO,
        fechaFin: solicitud.FECHA_FIN
      };
      const claveAlcance = [datosAlcance.idProveedor, datosAlcance.idNegocio, idOficina, idGrupo, normalizarFechaEntradaPrecio_(datosAlcance.fechaInicio), normalizarFechaEntradaPrecio_(datosAlcance.fechaFin)].join("|");

      if (!listasPorAlcance[claveAlcance]) {
        const exacta = buscarListaPrecioExactaPorAlcance_(listasExistentes, datosAlcance);
        if (exacta) {
          listasPorAlcance[claveAlcance] = {
            idListaPrecio: String(exacta.ID_LISTA_PRECIO || "").trim(),
            codigoLista: String(exacta.CODIGO_LISTA || "").trim(),
            reutilizada: true
          };
        } else {
          const listaNueva = guardarListaOficialPrecioModulo({
            idProveedor: solicitud.ID_PROVEEDOR,
            idNegocio: solicitud.ID_NEGOCIO,
            idOficina: idOficina,
            idGrupo: idGrupo,
            fechaInicio: solicitud.FECHA_INICIO,
            fechaFin: solicitud.FECHA_FIN,
            nombre: "Lista publicada " + String(solicitud.CODIGO_SOLICITUD || "") + (idOficina ? " - " + idOficina : ""),
            codigoLista: generarCodigoListaPrecio_(Object.assign({}, datosAlcance, { fechaInicio: solicitud.FECHA_INICIO })),
            estado: CONFIG.ESTADOS.ACTIVO,
            origen: "SOLICITUD_PROVEEDOR",
            idSolicitudOrigen: solicitud.ID_SOLICITUD,
            _omitirPermisoInterno: true
          });
          listasPorAlcance[claveAlcance] = listaNueva;
          listasExistentes.push({
            ID_LISTA_PRECIO: listaNueva.idListaPrecio,
            ID_PROVEEDOR: solicitud.ID_PROVEEDOR,
            ID_NEGOCIO: solicitud.ID_NEGOCIO,
            ID_OFICINA: idOficina,
            ID_GRUPO: idGrupo,
            FECHA_INICIO: solicitud.FECHA_INICIO,
            FECHA_FIN: solicitud.FECHA_FIN,
            ESTADO: CONFIG.ESTADOS.ACTIVO
          });
        }
        listasPublicadas.push(listasPorAlcance[claveAlcance]);
      }

      const lista = listasPorAlcance[claveAlcance];
      const material = materialDesdeDetalleSolicitudPrecio_(detalle, solicitud, usuario);
      guardarDetalleListaPrecioModulo({
        idListaPrecio: lista.idListaPrecio,
        idMaterial: material.ID_MATERIAL,
        precioBase: Number(detalle.PRECIO_BASE || 0),
        descripcionComercial: detalle.DESCRIPCION_MATERIAL || material.DESCRIPCION_MATERIAL || "",
        tieneCombo: detalle.ES_COMBO || "",
        detalleCombo: detalle.COMPONENTES_INCLUIDOS || "",
        comentarioComercial: detalle.COMENTARIO_COMERCIAL || "",
        estado: CONFIG.ESTADOS.ACTIVO,
        _omitirPermisoInterno: true
      });
    });
  });

  const lista = listasPublicadas[0] || { idListaPrecio: "" };
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", {
    ID_SOLICITUD: solicitud.ID_SOLICITUD,
    ESTADO: MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO,
    ID_USUARIO_PUBLICACION: usuario.idUsuario || "",
    ID_LISTA_PRECIO_PUBLICADA: lista.idListaPrecio,
    FECHA_PUBLICACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  registrarHistorialSolicitudPrecio_(solicitud.ID_SOLICITUD, "PUBLICAR_SOLICITUD", MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO, MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO, "Lista oficial publicada.");
  marcarVersionCachePreciosMateriales_();
  return { correcto: true, idListaPrecio: lista.idListaPrecio, listasPublicadas: listasPublicadas.length, estado: MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO };
}

/** Exporta consolidado de solicitudes no aprobadas/publicadas. */
function exportarConsolidadoPendientesPreciosModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("DESCARGAR_CONSOLIDADO_PENDIENTES", usuario);
  filtros = filtros || {};
  const incluirRechazadas = filtros.incluirRechazadas !== false;
  const solicitudes = obtenerSolicitudesVisiblesPrecios_(usuario, filtros).map(mapearSolicitudPrecio_).filter(function(item) {
    if (item.estado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.APROBADO || item.estado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.PUBLICADO) return false;
    if (!incluirRechazadas && item.estado === MP_MODULO_SGT360.ESTADOS_SOLICITUD.RECHAZADO) return false;
    return true;
  });
  const cabeceras = ["CODIGO_SOLICITUD", "PROVEEDOR", "NEGOCIO", "OFICINA", "GRUPO", "FECHA_INICIO", "FECHA_FIN", "ESTADO", "TOTAL_FILAS", "ERRORES", "ADVERTENCIAS", "USUARIO_CARGA", "FECHA_CARGA", "RESPONSABLE_REVISION", "COMENTARIO_PROVEEDOR", "COMENTARIO_REVISOR"];
  const filas = solicitudes.map(function(item) {
    return [item.codigoSolicitud, item.proveedor, item.negocio, item.oficina, item.grupo, item.fechaInicio, item.fechaFin, item.estado, item.totalFilas, item.totalErrores, item.totalAdvertencias, item.usuarioCarga, item.fechaCarga, item.usuarioRevision, item.comentarioProveedor, item.comentarioRevisor];
  });
  return {
    correcto: true,
    nombreArchivo: "Consolidado_Listas_No_Aprobadas.csv",
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(cabeceras, filas, { separador: "," })
  };
}

/** Exporta detalle de una solicitud. */
function exportarDetalleSolicitudPreciosModulo(idSolicitud) {
  const usuario = obtenerUsuarioActual();
  if (!tienePermisoMaterialesPrecios_("DESCARGAR_SOLICITUD_PRECIO", usuario) && !tienePermisoMaterialesPrecios_("DESCARGAR_LISTA_APROBADA", usuario)) {
    exigirPermisoMaterialesPrecios_("DESCARGAR_SOLICITUD_PRECIO", usuario);
  }
  const detalle = obtenerDetalleSolicitudListaPrecioModulo(idSolicitud);
  const cabeceras = ["NUMERO_FILA", "CODIGO_SAP", "CODIGO_MATERIAL", "PRODUCTO_PRINCIPAL", "TIPO_MATERIAL", "SUBTIPO_MATERIAL", "MARCA", "DESCRIPCION_MATERIAL", "TIENE_COMBO", "DETALLE_COMBO", "PRECIO_BASE", "ESTADO_FILA", "ACCION_SUGERIDA", "ERRORES", "ADVERTENCIAS", "OBSERVACION_REVISOR"];
  const filas = detalle.detalles.map(function(item) {
    return [item.numeroFila, item.codigoSap, item.codigoMaterial, item.productoPrincipal, item.tipoMaterial, item.subtipoMaterial, item.marca, item.descripcionMaterial, item.esCombo ? "SI" : "NO", item.componentesIncluidos, item.precioBase, item.estadoFila, item.accionSugerida, item.errores.join(" | "), item.advertencias.join(" | "), item.observacionRevisor];
  });
  return {
    correcto: true,
    nombreArchivo: "Detalle_" + detalle.solicitud.codigoSolicitud + ".csv",
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(cabeceras, filas, { separador: "," })
  };
}

/** Exporta una lista oficial publicada. */
function exportarListaOficialPreciosModulo(idListaPrecio) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("DESCARGAR_LISTA_OFICIAL", usuario);
  const lista = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", idListaPrecio);
  if (!lista) throw new Error("No se encontró la lista oficial.");
  const materiales = construirVistaMaterialesPreciosCache_();
  const porId = {};
  materiales.forEach(function(item) { porId[item.idMaterial] = item; });
  const usuarioActual = usuario;
  const vistaLista = construirVistaListasPreciosCache_().find(function(item) {
    return String(item.idListaPrecio || "").trim() === String(idListaPrecio || "").trim();
  }) || { idProveedor: String(lista.ID_PROVEEDOR || "").trim() };
  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).filter(function(item) {
    return String(item.ID_LISTA_PRECIO || "").trim() === String(idListaPrecio || "").trim() && detallePrecioVisibleParaUsuario_(item, vistaLista, usuarioActual);
  });
  const cabeceras = ["TIPO_PRECIO", "CODIGO_SAP", "CODIGO_MATERIAL", "PRODUCTO_PRINCIPAL", "TIPO_MATERIAL", "SUBTIPO_MATERIAL", "MARCA", "DESCRIPCION_MATERIAL", "TIENE_COMBO", "DETALLE_COMBO", "PRECIO_BASE", "MONEDA", "COMENTARIO_COMERCIAL", "ESTADO"];
  const filas = detalles.map(function(detalle) {
    const material = porId[String(detalle.ID_MATERIAL || "").trim()] || {};
    return [obtenerTipoAlcanceProveedorPrecio_(lista.ID_PROVEEDOR), material.codigoSap || "", material.codigoMaterial || "", material.producto || "", material.tipo || "", material.subtipo || "", material.marca || "", material.descripcionMaterial || "", convertirBooleanoMotor_(detalle.TIENE_COMBO || detalle.ES_COMBO) ? "SI" : "NO", detalle.DETALLE_COMBO || detalle.COMPONENTES_INCLUIDOS || "", detalle.PRECIO_BASE || "", detalle.MONEDA || MP_MODULO_SGT360.MONEDA, detalle.COMENTARIO_COMERCIAL || "", detalle.ESTADO || ""];
  });
  return {
    correcto: true,
    nombreArchivo: "Lista_" + String(lista.CODIGO_LISTA || idListaPrecio) + ".csv",
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(cabeceras, filas, { separador: "," })
  };
}

/** Exporta precios oficiales con filtros de la vista Precios. */
function exportarPreciosOficialesModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("DESCARGAR_LISTA_OFICIAL", usuario);
  filtros = filtros || {};
  const texto = normalizarTexto(filtros.texto || "");
  const estado = normalizarTexto(filtros.estado || "ACTIVO");
  const idNegocio = String(filtros.idNegocio || "").trim();
  if (!texto && (!estado || estado === "TODOS") && !idNegocio) {
    throw new Error("Aplica al menos un filtro antes de descargar precios.");
  }
  let registros = construirVistaPreciosDetalleUsuario_(usuario);
  if (estado && estado !== "TODOS") registros = registros.filter(function(item) { return item.estado === estado; });
  if (idNegocio) registros = registros.filter(function(item) { return String(item.idNegocio || "").trim() === idNegocio; });
  if (texto) {
    registros = registros.filter(function(item) {
      return [
        item.proveedor, item.negocio, item.alcanceDescripcion, item.codigoSap,
        item.codigoMaterial, item.nombreCortoMaterial, item.detalleCombo, item.codigoLista
      ].some(function(valor) { return normalizarTexto(valor).indexOf(texto) !== -1; });
    });
  }
  const cabeceras = [
    "PROVEEDOR", "NEGOCIO", "ALCANCE", "CODIGO_SAP_MATERIAL", "CODIGO_MATERIAL", "NOMBRE_CORTO_MATERIAL",
    "COMBO", "DETALLE_COMBO", "VIGENCIA", "FECHA_INICIO", "FECHA_FIN", "PRECIO_BASE", "MONEDA", "TIPO_PRECIO", "CODIGO_LISTA"
  ];
  const filas = registros.map(function(item) {
    return [
      item.proveedor || "", item.negocio || "", item.alcanceDescripcion || "", item.codigoSap || "", item.codigoMaterial || "", item.nombreCortoMaterial || "",
      item.combo || "", item.detalleCombo || "", item.vigencia || "", item.fechaInicio || "", item.fechaFin || "", item.precioBase || 0, item.moneda || MP_MODULO_SGT360.MONEDA,
      item.tipoPrecio || "", item.codigoLista || ""
    ];
  });
  const nombre = "Precios_materiales_" + Utilities.formatDate(new Date(), MOTOR_SGT360.ZONA_HORARIA, "yyyyMMdd_HHmm") + ".csv";
  return {
    correcto: true,
    nombreArchivo: nombre,
    mimeType: "text/csv;charset=utf-8",
    contenido: construirCsvMotor_(cabeceras, filas, { separador: "," }),
    totalPrecios: filas.length
  };
}

function mpEtiquetaAlcanceExportacion_(row) {
  row = row || {};
  const alcance = normalizarTexto(row.alcance || "");
  if (alcance === "GRUPO" || row.grupo) return "GRUPO";
  if (alcance === "OFICINA" || row.oficina) return "OFICINA";
  return "GENERAL";
}


/** Migración incremental del Paso 25O: normaliza códigos visibles cortos. */
function actualizarModuloMaterialesPreciosPaso25O() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    asegurarEstructuraMaterialesPrecios_();
    const resultado = normalizarCodigosVisiblesMaterialesPreciosPaso25O_();
    invalidarCacheOpcionesMaterialesPrecios_();
    SpreadsheetApp.flush();
    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

function normalizarCodigosVisiblesMaterialesPreciosPaso25O_() {
  const usuario = obtenerUsuarioActual && typeof obtenerUsuarioActual === "function" ? obtenerUsuarioActual() : {};
  const ahora = new Date();
  const cambios = { materiales: 0, listas: 0, solicitudes: 0, detallesSolicitud: 0, relacionesProveedor: 0 };
  const mapaMateriales = {};

  const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES);
  const codigosMaterial = construirSetCodigosPrecio_(materiales, "CODIGO_MATERIAL");
  materiales.forEach(function(material) {
    const actual = String(material.CODIGO_MATERIAL || "").trim();
    if (!actual || /^MAT[-_]?TEMP[-_]?[A-Z0-9]+$/i.test(actual)) {
      const nuevo = generarCodigoVisibleUnicoPrecio_("M", codigosMaterial, 7);
      if (actual) mapaMateriales[normalizarTexto(actual)] = nuevo;
      codigosMaterial[normalizarTexto(nuevo)] = true;
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", {
        ID_MATERIAL: material.ID_MATERIAL,
        CODIGO_MATERIAL: nuevo,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
      });
      cambios.materiales++;
    }
  });

  const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
  const codigosLista = construirSetCodigosPrecio_(listas, "CODIGO_LISTA");
  listas.forEach(function(lista) {
    const actual = String(lista.CODIGO_LISTA || "").trim();
    if (!actual || /^LP[-_]/i.test(actual) || /^LPR[-_]/i.test(actual)) {
      const nuevo = generarCodigoVisibleUnicoPrecio_("L", codigosLista, 7);
      codigosLista[normalizarTexto(nuevo)] = true;
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.LISTAS, "ID_LISTA_PRECIO", {
        ID_LISTA_PRECIO: lista.ID_LISTA_PRECIO,
        CODIGO_LISTA: nuevo,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
      });
      cambios.listas++;
    }
  });

  const solicitudes = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES);
  const codigosSolicitud = construirSetCodigosPrecio_(solicitudes, "CODIGO_SOLICITUD");
  solicitudes.forEach(function(solicitud) {
    const actual = String(solicitud.CODIGO_SOLICITUD || "").trim();
    if (!actual || /^SLP[-_]/i.test(actual)) {
      const nuevo = generarCodigoVisibleUnicoPrecio_("S", codigosSolicitud, 7);
      codigosSolicitud[normalizarTexto(nuevo)] = true;
      guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUDES, "ID_SOLICITUD", {
        ID_SOLICITUD: solicitud.ID_SOLICITUD,
        CODIGO_SOLICITUD: nuevo,
        FECHA_ACTUALIZACION: ahora
      });
      cambios.solicitudes++;
    }
  });

  if (Object.keys(mapaMateriales).length) {
    leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE).forEach(function(detalle) {
      const actual = normalizarTexto(detalle.CODIGO_MATERIAL || "");
      const nuevo = mapaMateriales[actual];
      if (nuevo) {
        guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE, "ID_DETALLE_SOLICITUD", {
          ID_DETALLE_SOLICITUD: detalle.ID_DETALLE_SOLICITUD,
          CODIGO_MATERIAL: nuevo
        });
        cambios.detallesSolicitud++;
      }
    });
    leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL).forEach(function(relacion) {
      const actual = normalizarTexto(relacion.CODIGO_MATERIAL_PROVEEDOR || "");
      const nuevo = mapaMateriales[actual];
      if (nuevo) {
        guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", {
          ID_RELACION: relacion.ID_RELACION,
          CODIGO_MATERIAL_PROVEEDOR: nuevo,
          FECHA_ACTUALIZACION: ahora,
          ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
        });
        cambios.relacionesProveedor++;
      }
    });
  }

  return {
    correcto: true,
    paso: "25O",
    mensaje: "Códigos visibles normalizados a formato corto alfanumérico.",
    formato: {
      material: "M + 6 caracteres, ejemplo M8D0B4",
      listaPrecio: "L + 6 caracteres, ejemplo L8D0B4",
      solicitudLista: "S + 6 caracteres, ejemplo S8D0B4"
    },
    cambios: cambios
  };
}

/* =========================
 * Internas: seguridad
 * ========================= */

function tienePermisoMaterialesPrecios_(recurso, usuario) {
  return tienePermisoMotor_(MP_MODULO_SGT360.CODIGO, recurso, usuario || obtenerUsuarioActual());
}

function exigirPermisoMaterialesPrecios_(recurso, usuario) {
  exigirPermisoMotor_(MP_MODULO_SGT360.CODIGO, recurso, usuario || obtenerUsuarioActual());
}

function validarAccesoSolicitudesPrecio_(usuario) {
  if (["VER_SOLICITUDES_PRECIO", "VER_MIS_LISTAS_PRECIO", "VER_OBSERVACIONES_LISTA"].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  })) return true;
  exigirPermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario);
  return true;
}

/* =========================
 * Internas: tablas y mapas
 * ========================= */

function leerTablaPrecio_(nombreHoja) {
  asegurarHojaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, MP_MODULO_SGT360.CABECERAS[nombreHoja] || []);
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja, { usarValoresMostrados: true });
}

function buscarPorCampoPrecio_(nombreHoja, campo, valor) {
  const buscado = String(valor || "").trim();
  if (!buscado) return null;
  return leerTablaPrecio_(nombreHoja).find(function(item) {
    return String(item[normalizarClaveMotor_(campo)] || "").trim() === buscado;
  }) || null;
}

function mapearPorIdPrecio_(registros, campoId) {
  const salida = {};
  registros.forEach(function(item) {
    salida[String(item[normalizarClaveMotor_(campoId)] || "").trim()] = item;
  });
  return salida;
}

function mapearCatalogoOpciones_(registros, campoId, campoCodigo, campoNombre) {
  return registros.filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    return {
      id: String(item[normalizarClaveMotor_(campoId)] || "").trim(),
      codigo: String(item[normalizarClaveMotor_(campoCodigo)] || "").trim(),
      nombre: String(item[normalizarClaveMotor_(campoNombre)] || "").trim()
    };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
}

function mapearProductosOpciones_() {
  const negocios = mapearPorIdPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.NEGOCIOS), "ID_NEGOCIO");
  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.PRODUCTOS).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    const negocio = negocios[String(item.ID_NEGOCIO || "").trim()] || {};
    return { id: String(item.ID_PRODUCTO || "").trim(), codigo: String(item.CODIGO_PRODUCTO || "").trim(), nombre: String(item.NOMBRE || "").trim(), idNegocio: String(item.ID_NEGOCIO || "").trim(), negocio: String(negocio.NOMBRE || "").trim() };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
}

function mapearSubtiposOpciones_() {
  const productos = mapearPorIdPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.PRODUCTOS), "ID_PRODUCTO");
  const tipos = mapearPorIdPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.TIPOS), "ID_TIPO_MATERIAL");
  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SUBTIPOS).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    const producto = productos[String(item.ID_PRODUCTO || "").trim()] || {};
    const tipo = tipos[String(item.ID_TIPO_MATERIAL || "").trim()] || {};
    return { id: String(item.ID_SUBTIPO_MATERIAL || "").trim(), codigo: String(item.CODIGO_SUBTIPO || "").trim(), nombre: String(item.NOMBRE || "").trim(), idProducto: String(item.ID_PRODUCTO || "").trim(), producto: String(producto.NOMBRE || "").trim(), idTipoMaterial: String(item.ID_TIPO_MATERIAL || "").trim(), tipo: String(tipo.NOMBRE || "").trim() };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
}

function obtenerProveedoresActivosOpciones_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES, { usarValoresMostrados: true }).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    return { id: String(item.ID_PROVEEDOR || "").trim(), codigo: String(item.CODIGO_SAP || item.ID_PROVEEDOR || "").trim(), nombre: String(item.NOMBRE_COMERCIAL || item.RAZON_SOCIAL || item.NOMBRE || "").trim() };
  }).sort(function(a, b) { return compararTextoMotor_(a.nombre, b.nombre); });
}

function obtenerOficinasActivasOpciones_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.OFICINAS, { usarValoresMostrados: true }).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    const id = String(item.ID_OFICINA || "").trim();
    const codigo = String(item.CODIGO_OFICINA || item.CODIGO || item.CODIGO_SAP || id || "").trim();
    return { id: id, codigo: codigo, nombre: String(item.NOMBRE || item.NOMBRE_OFICINA || "").trim() };
  }).filter(function(item) { return item.id; }).sort(function(a, b) { return compararTextoMotor_(a.nombre || a.codigo, b.nombre || b.codigo); });
}

function obtenerGruposActivosOpciones_() {
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.GRUPOS, { usarValoresMostrados: true }).filter(function(item) {
    return normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }).map(function(item) {
    const id = String(item.ID_GRUPO || "").trim();
    const codigo = String(item.CODIGO_GRUPO || item.CODIGO || id || "").trim();
    return { id: id, codigo: codigo, idOficina: String(item.ID_OFICINA || "").trim(), nombre: String(item.NOMBRE || item.NOMBRE_GRUPO || "").trim() };
  }).filter(function(item) { return item.id; }).sort(function(a, b) { return compararTextoMotor_(a.nombre || a.codigo, b.nombre || b.codigo); });
}


function esAccesoGlobalMaterialesPrecios_(usuario) {
  usuario = usuario || {};
  if (!String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim()) return true;
  return [
    "CREAR_MATERIAL",
    "EDITAR_MATERIAL",
    "CAMBIAR_ESTADO_MATERIAL",
    "CREAR_LISTA_OFICIAL",
    "EDITAR_LISTA_OFICIAL",
    "VER_SOLICITUDES_PRECIO",
    "CARGAR_LISTA_PRECIO_ADMIN"
  ].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  });
}

function filtrarMaterialesPorAlcancePrecios_(registros, usuario) {
  const lista = Array.isArray(registros) ? registros : [];
  // Paso 28J: el maestro de materiales ya no se restringe por una relación previa
  // proveedor-material. El proveedor podrá ofertar un material al registrar su precio.
  return lista;
}

function materialEsVisibleParaUsuarioPrecio_(idMaterial, usuario) {
  const id = String(idMaterial || "").trim();
  if (!id) return false;
  const material = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", id);
  return Boolean(material && normalizarTexto(material.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO);
}

function filtrarListasPreciosPorAlcance_(registros, usuario) {
  const lista = Array.isArray(registros) ? registros : [];
  const idProveedor = String(usuario && (usuario.idProveedor || usuario.ID_PROVEEDOR) || "").trim();
  if (esAccesoGlobalMaterialesPrecios_(usuario)) return lista;
  if (!idProveedor) return [];

  const conteoPorLista = {};
  leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).forEach(function(detalle) {
    if (normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return;
    const idLista = String(detalle.ID_LISTA_PRECIO || "").trim();
    if (idLista) conteoPorLista[idLista] = (conteoPorLista[idLista] || 0) + 1;
  });

  return lista.filter(function(item) {
    return String(item.idProveedor || item.ID_PROVEEDOR || "").trim() === idProveedor;
  }).map(function(item) {
    const copia = Object.assign({}, item);
    const idLista = String(copia.idListaPrecio || copia.ID_LISTA_PRECIO || "").trim();
    copia.materiales = conteoPorLista[idLista] || 0;
    return copia;
  });
}

function construirVistaMaterialesPreciosCache_() {
  const claveCache = construirClaveCacheMotor_("MP_VISTA_MATERIALES_V2", obtenerVersionCacheMaterialesPrecios_());
  const cacheado = obtenerCacheJsonMotor_(claveCache);
  if (cacheado) return cacheado;
  const vista = construirVistaMaterialesPrecios_();
  guardarCacheJsonMotor_(claveCache, vista, 120);
  return vista;
}

function construirVistaListasPreciosCache_() {
  const claveCache = construirClaveCacheMotor_("MP_VISTA_LISTAS_V3", obtenerVersionCachePreciosMateriales_());
  const cacheado = obtenerCacheJsonMotor_(claveCache);
  if (cacheado) return cacheado;
  const vista = construirVistaListasPrecios_();
  guardarCacheJsonMotor_(claveCache, vista, 120);
  return vista;
}

function construirVistaMaterialesPrecios_() {
  const catalogos = listarValoresCatalogosAppPrecioEnBloque_([
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL",
    "MP_MARCAS"
  ]);

  const productos = mapearOpcionesPorId_(catalogos.MP_PRODUCTOS_PRINCIPALES || []);
  const tipos = mapearOpcionesPorId_(catalogos.MP_TIPOS_MATERIAL || []);
  const subtipos = mapearOpcionesPorId_(catalogos.MP_SUBTIPOS_MATERIAL || []);
  const marcas = mapearOpcionesPorId_(catalogos.MP_MARCAS || []);

  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES).map(function(item) {
    const producto = productos[String(item.ID_PRODUCTO || "").trim()] || {};
    const tipo = tipos[String(item.ID_TIPO_MATERIAL || "").trim()] || {};
    const subtipo = subtipos[String(item.ID_SUBTIPO_MATERIAL || "").trim()] || {};
    const marca = marcas[String(item.ID_MARCA || "").trim()] || {};

    return {
      idMaterial: String(item.ID_MATERIAL || "").trim(),
      codigoMaterial: String(item.CODIGO_MATERIAL || "").trim(),
      codigoSap: String(item.CODIGO_SAP || "").trim(),
      idProducto: String(item.ID_PRODUCTO || "").trim(),
      producto: String(producto.nombre || producto.NOMBRE || item.ID_PRODUCTO || "").trim(),
      idTipoMaterial: String(item.ID_TIPO_MATERIAL || "").trim(),
      tipo: String(tipo.nombre || tipo.NOMBRE || item.ID_TIPO_MATERIAL || "").trim(),
      idSubtipoMaterial: String(item.ID_SUBTIPO_MATERIAL || "").trim(),
      subtipo: String(subtipo.nombre || subtipo.NOMBRE || item.ID_SUBTIPO_MATERIAL || "").trim(),
      idMarca: String(item.ID_MARCA || "").trim(),
      marca: String(marca.nombre || marca.NOMBRE || item.ID_MARCA || "").trim(),
      nombreMaterial: String(item.NOMBRE_MATERIAL || "").trim(),
      descripcionMaterial: String(item.DESCRIPCION_MATERIAL || "").trim(),
      unidadMedida: String(item.UNIDAD_MEDIDA || "").trim(),
      esCombo: convertirBooleanoMotor_(item.ES_COMBO),
      estado: normalizarTexto(item.ESTADO),
      fechaActualizacion: normalizarFechaSalidaPrecio_(item.FECHA_ACTUALIZACION)
    };
  });
}

function construirVistaListasPrecios_() {
  const proveedores = mapearOpcionesPorId_(obtenerProveedoresActivosOpciones_());
  const negocios = mapearOpcionesPorId_(listarValoresCatalogoAppPrecio_("MP_NEGOCIOS"));
  const oficinas = mapearOpcionesPorId_(obtenerOficinasActivasOpciones_());
  const grupos = mapearOpcionesPorId_(obtenerGruposActivosOpciones_());
  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE);
  const conteo = {};
  detalles.forEach(function(item) {
    const id = String(item.ID_LISTA_PRECIO || "").trim();
    conteo[id] = (conteo[id] || 0) + 1;
  });
  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS).map(function(item) {
    const id = String(item.ID_LISTA_PRECIO || "").trim();
    const origenCarga = String(item.ORIGEN_CARGA || item.ORIGEN || "").trim();
    const origen = String(item.ORIGEN || "").trim();
    const nombre = String(item.NOMBRE || "").trim();
    const vista = {
      idListaPrecio: id,
      codigoLista: String(item.CODIGO_LISTA || "").trim(),
      nombre: nombre,
      idProveedor: String(item.ID_PROVEEDOR || "").trim(),
      proveedor: obtenerEtiquetaProveedorListaPrecio_(item.ID_PROVEEDOR, proveedores),
      tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(item.ID_PROVEEDOR),
      idNegocio: String(item.ID_NEGOCIO || "").trim(),
      negocio: obtenerNombreOpcion_(negocios, item.ID_NEGOCIO),
      idOficina: String(item.ID_OFICINA || "").trim(),
      oficina: obtenerNombreOpcion_(oficinas, item.ID_OFICINA),
      idGrupo: String(item.ID_GRUPO || "").trim(),
      grupo: obtenerNombreOpcion_(grupos, item.ID_GRUPO),
      alcance: String(item.ALCANCE || determinarAlcanceListaPrecio_({ idOficina: item.ID_OFICINA, idGrupo: item.ID_GRUPO })).trim(),
      origenCarga: origenCarga,
      fechaInicio: normalizarFechaSalidaPrecio_(item.FECHA_INICIO),
      fechaFin: normalizarFechaSalidaPrecio_(item.FECHA_FIN),
      moneda: String(item.MONEDA || MP_MODULO_SGT360.MONEDA).trim(),
      estado: normalizarTexto(item.ESTADO),
      prioridad: Number(item.PRIORIDAD) || 0,
      origen: origen,
      materiales: conteo[id] || 0
    };
    vista.esListaOficial = esListaOficialPublicadaPrecio_(Object.assign({}, item, vista));
    vista.esPrecioIndividual = esListaPrecioIndividual_(Object.assign({}, item, vista));
    return vista;
  });
}

function mapearOpcionesPorId_(opciones) {
  const mapa = {};
  (opciones || []).forEach(function(item) { mapa[String(item.id || "").trim()] = item; });
  return mapa;
}

function obtenerNombreOpcion_(mapa, id) {
  const item = mapa[String(id || "").trim()] || {};
  return String(item.nombre || "").trim();
}

function paginarConResumenPrecios_(registros, filtros, resumen) {
  const paginado = paginarArregloMotor_(registros, filtros && filtros.pagina, filtros && filtros.tamano);
  paginado.resumen = resumen || { total: registros.length };
  return paginado;
}

/* =========================
 * Internas: catálogos
 * ========================= */

function asegurarNegocioPrecio_(codigo, nombre, descripcion) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.NEGOCIOS).find(function(item) { return normalizarTexto(item.CODIGO_NEGOCIO) === normalizarTexto(codigo); });
  if (existente) return existente;
  const ahora = new Date();
  const objeto = { ID_NEGOCIO: generarIdMotor_("NEG"), CODIGO_NEGOCIO: normalizarClaveMotor_(codigo), NOMBRE: nombre, DESCRIPCION: descripcion || "", ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: ahora, FECHA_ACTUALIZACION: ahora };
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.NEGOCIOS, "ID_NEGOCIO", objeto);
  return objeto;
}

function asegurarProductoPrincipalPrecio_(idNegocio, codigo, nombre, descripcion) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.PRODUCTOS).find(function(item) { return String(item.ID_NEGOCIO || "").trim() === String(idNegocio || "").trim() && normalizarTexto(item.CODIGO_PRODUCTO) === normalizarTexto(codigo); });
  if (existente) return existente;
  const ahora = new Date();
  const objeto = { ID_PRODUCTO: generarIdMotor_("PRD"), ID_NEGOCIO: idNegocio, CODIGO_PRODUCTO: normalizarClaveMotor_(codigo), NOMBRE: nombre, DESCRIPCION: descripcion || "", ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: ahora, FECHA_ACTUALIZACION: ahora };
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.PRODUCTOS, "ID_PRODUCTO", objeto);
  return objeto;
}

function asegurarTipoMaterialPrecio_(codigo, nombre, descripcion) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.TIPOS).find(function(item) { return normalizarTexto(item.CODIGO_TIPO) === normalizarTexto(codigo); });
  if (existente) return existente;
  const ahora = new Date();
  const objeto = { ID_TIPO_MATERIAL: generarIdMotor_("TIP"), CODIGO_TIPO: normalizarClaveMotor_(codigo), NOMBRE: nombre, DESCRIPCION: descripcion || "", ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: ahora, FECHA_ACTUALIZACION: ahora };
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.TIPOS, "ID_TIPO_MATERIAL", objeto);
  return objeto;
}

function asegurarSubtipoPrecio_(idProducto, idTipo, codigo, nombre, descripcion) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SUBTIPOS).find(function(item) { return String(item.ID_PRODUCTO || "").trim() === String(idProducto || "").trim() && String(item.ID_TIPO_MATERIAL || "").trim() === String(idTipo || "").trim() && normalizarTexto(item.CODIGO_SUBTIPO) === normalizarTexto(codigo); });
  if (existente) return existente;
  const ahora = new Date();
  const objeto = { ID_SUBTIPO_MATERIAL: generarIdMotor_("STP"), ID_PRODUCTO: idProducto, ID_TIPO_MATERIAL: idTipo, CODIGO_SUBTIPO: normalizarClaveMotor_(codigo), NOMBRE: nombre, DESCRIPCION: descripcion || "", ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: ahora, FECHA_ACTUALIZACION: ahora };
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SUBTIPOS, "ID_SUBTIPO_MATERIAL", objeto);
  return objeto;
}

function asegurarMarcaPrecio_(codigo, nombre) {
  const codigoSeguro = normalizarClaveMotor_(codigo || nombre || "SIN_MARCA") || "SIN_MARCA";
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MARCAS).find(function(item) { return normalizarTexto(item.CODIGO_MARCA) === normalizarTexto(codigoSeguro); });
  if (existente) return existente;
  const ahora = new Date();
  const objeto = { ID_MARCA: generarIdMotor_("MRC"), CODIGO_MARCA: codigoSeguro, NOMBRE: nombre || codigoSeguro, DESCRIPCION: "", ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: ahora, FECHA_ACTUALIZACION: ahora };
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.MARCAS, "ID_MARCA", objeto);
  return objeto;
}

function guardarNegocioPrecio_(datos, usuario) {
  const existente = datos.idNegocio ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.NEGOCIOS, "ID_NEGOCIO", datos.idNegocio) : null;
  const ahora = new Date();
  const objeto = { ID_NEGOCIO: existente ? existente.ID_NEGOCIO : generarIdMotor_("NEG"), CODIGO_NEGOCIO: normalizarClaveMotor_(datos.codigo || datos.nombre || "NEGOCIO"), NOMBRE: limpiarTextoMotor_(datos.nombre || "", 160), DESCRIPCION: limpiarTextoMotor_(datos.descripcion || "", 500), ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO), FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || "" };
  if (!objeto.NOMBRE) throw new Error("El nombre del negocio es obligatorio.");
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.NEGOCIOS, "ID_NEGOCIO", objeto);
  return { correcto: true, id: objeto.ID_NEGOCIO };
}
function guardarProductoPrincipalPrecio_(datos, usuario) {
  if (!String(datos.idNegocio || "").trim()) throw new Error("Selecciona el negocio del producto.");
  const existente = datos.idProducto ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.PRODUCTOS, "ID_PRODUCTO", datos.idProducto) : null;
  const ahora = new Date();
  const objeto = { ID_PRODUCTO: existente ? existente.ID_PRODUCTO : generarIdMotor_("PRD"), ID_NEGOCIO: datos.idNegocio, CODIGO_PRODUCTO: normalizarClaveMotor_(datos.codigo || datos.nombre || "PRODUCTO"), NOMBRE: limpiarTextoMotor_(datos.nombre || "", 160), DESCRIPCION: limpiarTextoMotor_(datos.descripcion || "", 500), ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO), FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || "" };
  if (!objeto.NOMBRE) throw new Error("El nombre del producto es obligatorio.");
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.PRODUCTOS, "ID_PRODUCTO", objeto);
  return { correcto: true, id: objeto.ID_PRODUCTO };
}
function guardarTipoMaterialPrecio_(datos, usuario) {
  const existente = datos.idTipoMaterial ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.TIPOS, "ID_TIPO_MATERIAL", datos.idTipoMaterial) : null;
  const ahora = new Date();
  const objeto = { ID_TIPO_MATERIAL: existente ? existente.ID_TIPO_MATERIAL : generarIdMotor_("TIP"), CODIGO_TIPO: normalizarClaveMotor_(datos.codigo || datos.nombre || "TIPO"), NOMBRE: limpiarTextoMotor_(datos.nombre || "", 160), DESCRIPCION: limpiarTextoMotor_(datos.descripcion || "", 500), ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO), FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || "" };
  if (!objeto.NOMBRE) throw new Error("El nombre del tipo es obligatorio.");
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.TIPOS, "ID_TIPO_MATERIAL", objeto);
  return { correcto: true, id: objeto.ID_TIPO_MATERIAL };
}
function guardarSubtipoMaterialPrecio_(datos, usuario) {
  if (!String(datos.idProducto || "").trim() || !String(datos.idTipoMaterial || "").trim()) throw new Error("Selecciona producto y tipo para el subtipo.");
  const existente = datos.idSubtipoMaterial ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.SUBTIPOS, "ID_SUBTIPO_MATERIAL", datos.idSubtipoMaterial) : null;
  const ahora = new Date();
  const objeto = { ID_SUBTIPO_MATERIAL: existente ? existente.ID_SUBTIPO_MATERIAL : generarIdMotor_("STP"), ID_PRODUCTO: datos.idProducto, ID_TIPO_MATERIAL: datos.idTipoMaterial, CODIGO_SUBTIPO: normalizarClaveMotor_(datos.codigo || datos.nombre || "SUBTIPO"), NOMBRE: limpiarTextoMotor_(datos.nombre || "", 160), DESCRIPCION: limpiarTextoMotor_(datos.descripcion || "", 500), ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO), FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || "" };
  if (!objeto.NOMBRE) throw new Error("El nombre del subtipo es obligatorio.");
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SUBTIPOS, "ID_SUBTIPO_MATERIAL", objeto);
  return { correcto: true, id: objeto.ID_SUBTIPO_MATERIAL };
}
function guardarMarcaPrecio_(datos, usuario) {
  const existente = datos.idMarca ? buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MARCAS, "ID_MARCA", datos.idMarca) : null;
  const ahora = new Date();
  const objeto = { ID_MARCA: existente ? existente.ID_MARCA : generarIdMotor_("MRC"), CODIGO_MARCA: normalizarClaveMotor_(datos.codigo || datos.nombre || "MARCA"), NOMBRE: limpiarTextoMotor_(datos.nombre || "", 160), DESCRIPCION: limpiarTextoMotor_(datos.descripcion || "", 500), ESTADO: normalizarTexto(datos.estado || CONFIG.ESTADOS.ACTIVO), FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || "" };
  if (!objeto.NOMBRE) throw new Error("El nombre de la marca es obligatorio.");
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.MARCAS, "ID_MARCA", objeto);
  return { correcto: true, id: objeto.ID_MARCA };
}

/* =========================
 * Internas: relaciones y precios
 * ========================= */

function asegurarRelacionNegocioMaterialPrecio_(idNegocio, idMaterial, usuario) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL).find(function(item) { return String(item.ID_NEGOCIO || "").trim() === idNegocio && String(item.ID_MATERIAL || "").trim() === idMaterial; });
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL, "ID_RELACION", {
    ID_RELACION: existente ? existente.ID_RELACION : generarIdMotor_("RNM"), ID_NEGOCIO: idNegocio, ID_MATERIAL: idMaterial, ESTADO: CONFIG.ESTADOS.ACTIVO, FECHA_CREACION: existente ? undefined : ahora, FECHA_ACTUALIZACION: ahora, ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  });
}
function asegurarRelacionProveedorMaterialPrecio_(idProveedor, idMaterial, codigoProveedor, codigoSapProveedor, usuario) {
  const existente = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL).find(function(item) { return String(item.ID_PROVEEDOR || "").trim() === idProveedor && String(item.ID_MATERIAL || "").trim() === idMaterial; });
  const ahora = new Date();
  const idRelacion = existente ? String(existente.ID_RELACION || "").trim() : generarIdMotor_("RPM");
  const objeto = {
    ID_RELACION: idRelacion,
    ID_PROVEEDOR: idProveedor,
    ID_MATERIAL: idMaterial,
    CODIGO_MATERIAL_PROVEEDOR: limpiarTextoMotor_(codigoProveedor || "", 80),
    CODIGO_SAP_PROVEEDOR: limpiarTextoMotor_(codigoSapProveedor || "", 80),
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_ACTUALIZACION: ahora,
    ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
  };
  if (!existente) objeto.FECHA_CREACION = ahora;
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL, "ID_RELACION", objeto);
  return { idRelacion: idRelacion, creado: !existente };
}

function obtenerProveedorActivoPorIdMaterialPrecio_(idProveedor) {
  const id = String(idProveedor || "").trim();
  if (!id) return null;
  return leerTablaMotor_(MOTOR_SGT360.BASES.OPERATION, CONFIG.HOJAS.PROVEEDORES, { usarValoresMostrados: true }).find(function(item) {
    return String(item.ID_PROVEEDOR || "").trim() === id && normalizarTexto(item.ESTADO) === CONFIG.ESTADOS.ACTIVO;
  }) || null;
}

function buscarDetallePrecioExistente_(idLista, idMaterial) {
  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).find(function(item) {
    return String(item.ID_LISTA_PRECIO || "").trim() === idLista && String(item.ID_MATERIAL || "").trim() === idMaterial;
  }) || null;
}

function obtenerTipoAlcanceProveedorPrecio_(idProveedor) {
  return String(idProveedor || "").trim() ? "ESPECIFICO_PROVEEDOR" : "GENERAL_MATERIAL";
}

function obtenerEtiquetaProveedorListaPrecio_(idProveedor, proveedoresPorId) {
  const id = String(idProveedor || "").trim();
  if (!id) return "Proveedor no definido";
  return obtenerNombreOpcion_(proveedoresPorId || {}, id) || id;
}

function puedeGestionarPrecioGeneralMaterial_(usuario) {
  usuario = usuario || obtenerUsuarioActual();
  if (!String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim()) return true;
  return [
    "CARGAR_LISTA_PRECIO_ADMIN",
    "SELECCIONAR_PROVEEDOR_LISTA",
    "CREAR_LISTA_OFICIAL",
    "EDITAR_LISTA_OFICIAL",
    "VER_SOLICITUDES_PRECIO"
  ].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  });
}

function resolverProveedorPrecioCabecera_(datos, usuario) {
  datos = datos || {};
  usuario = usuario || obtenerUsuarioActual();
  const proveedorUsuario = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  const proveedorSolicitado = String(datos.idProveedor || datos.ID_PROVEEDOR || "").trim();
  const puedeSeleccionar = [
    "CARGAR_LISTA_PRECIO_ADMIN",
    "SELECCIONAR_PROVEEDOR_LISTA",
    "VER_SOLICITUDES_PRECIO",
    "CREAR_LISTA_OFICIAL",
    "EDITAR_LISTA_OFICIAL"
  ].some(function(recurso) {
    return tienePermisoMaterialesPrecios_(recurso, usuario);
  });

  if (proveedorUsuario && !puedeSeleccionar) return proveedorUsuario;
  if (proveedorUsuario && proveedorSolicitado && proveedorSolicitado !== proveedorUsuario && !puedeSeleccionar) {
    throw new Error("Solo puedes gestionar precios para tu proveedor asignado.");
  }
  return proveedorSolicitado;
}

function obtenerMaterialesProveedorActivosPrecio_(idProveedor) {
  const id = String(idProveedor || "").trim();
  const salida = {};
  if (!id) return salida;
  leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL).forEach(function(relacion) {
    if (String(relacion.ID_PROVEEDOR || "").trim() === id &&
        normalizarTexto(relacion.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO) {
      const idMaterial = String(relacion.ID_MATERIAL || "").trim();
      if (idMaterial) salida[idMaterial] = true;
    }
  });
  return salida;
}

function validarRelacionProveedorMaterialParaPrecio_(idProveedor, idMaterial) {
  const proveedor = String(idProveedor || "").trim();
  const material = String(idMaterial || "").trim();
  if (!material) throw new Error("Material no válido.");
  const relacionesActivas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL).filter(function(relacion) {
    return String(relacion.ID_MATERIAL || "").trim() === material &&
      normalizarTexto(relacion.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  });
  if (proveedor) {
    const existeRelacion = relacionesActivas.some(function(relacion) {
      return String(relacion.ID_PROVEEDOR || "").trim() === proveedor;
    });
    if (!existeRelacion) {
      throw new Error("El proveedor seleccionado no está asociado al material. Primero enlázalo desde Materiales.");
    }
    return true;
  }
  if (!relacionesActivas.length) {
    throw new Error("El material no tiene proveedores asociados. Para registrar un precio general, primero enlaza al menos un proveedor al material.");
  }
  return true;
}

function validarCruceVigenciaPrecioMaterial_(listaActual, idMaterial, idDetalleActual, idDetalleSolicitado) {
  listaActual = listaActual || {};
  const idListaActual = String(listaActual.ID_LISTA_PRECIO || listaActual.idListaPrecio || "").trim();
  const proveedorActual = String(listaActual.ID_PROVEEDOR || listaActual.idProveedor || "").trim();
  const negocioActual = String(listaActual.ID_NEGOCIO || listaActual.idNegocio || "").trim();
  const oficinaActual = String(listaActual.ID_OFICINA || listaActual.idOficina || "").trim();
  const grupoActual = String(listaActual.ID_GRUPO || listaActual.idGrupo || "").trim();
  const inicioActual = convertirFechaPrecio_(listaActual.FECHA_INICIO || listaActual.fechaInicio);
  const finActual = convertirFechaPrecio_(listaActual.FECHA_FIN || listaActual.fechaFin);
  if (!inicioActual || !finActual) return true;

  const listasPorId = mapearPorIdPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS), "ID_LISTA_PRECIO");
  const detalleActual = String(idDetalleActual || "").trim();
  const detalleSolicitado = String(idDetalleSolicitado || "").trim();
  const cruces = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).filter(function(detalle) {
    if (String(detalle.ID_MATERIAL || "").trim() !== String(idMaterial || "").trim()) return false;
    const idDetalleComparado = String(detalle.ID_DETALLE_PRECIO || "").trim();
    if (detalleActual && idDetalleComparado === detalleActual) return false;
    if (detalleSolicitado && idDetalleComparado === detalleSolicitado) return false;
    if (normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
    const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()] || {};
    if (!lista.ID_LISTA_PRECIO || String(lista.ID_LISTA_PRECIO || "").trim() === idListaActual) return false;
    if (normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
    if (String(lista.ID_PROVEEDOR || "").trim() !== proveedorActual) return false;
    if (String(lista.ID_NEGOCIO || "").trim() !== negocioActual) return false;
    if (String(lista.ID_OFICINA || "").trim() !== oficinaActual) return false;
    if (String(lista.ID_GRUPO || "").trim() !== grupoActual) return false;
    return fechasSeCruzanPrecio_(inicioActual, finActual, convertirFechaPrecio_(lista.FECHA_INICIO), convertirFechaPrecio_(lista.FECHA_FIN));
  });
  if (cruces.length) {
    throw new Error("Ya existe un precio vigente que se cruza para este material, proveedor, negocio y alcance comercial (oficina/grupo/general). Si deseas modificar el mismo alcance, usa Modificar sobre el registro correspondiente o ajusta la vigencia.");
  }
  return true;
}

function fechasSeCruzanPrecio_(inicioA, finA, inicioB, finB) {
  if (!inicioA || !finA || !inicioB || !finB) return false;
  return inicioA.getTime() <= finB.getTime() && inicioB.getTime() <= finA.getTime();
}

function fechaDentroVigenciaPrecio_(fechaConsulta, inicio, fin) {
  const fecha = convertirFechaPrecio_(fechaConsulta || new Date());
  const fechaInicio = convertirFechaPrecio_(inicio);
  const fechaFin = convertirFechaPrecio_(fin);
  if (!fecha || !fechaInicio || !fechaFin) return false;
  const t = fecha.getTime();
  return fechaInicio.getTime() <= t && t <= fechaFin.getTime();
}

function detallePrecioVisibleParaUsuario_(detalle, lista, usuario) {
  usuario = usuario || obtenerUsuarioActual();
  if (esAccesoGlobalMaterialesPrecios_(usuario)) return true;
  const idProveedorUsuario = String(usuario.idProveedor || usuario.ID_PROVEEDOR || "").trim();
  if (!idProveedorUsuario) return false;
  return String(lista && (lista.idProveedor || lista.ID_PROVEEDOR) || "").trim() === idProveedorUsuario;
}

function materialCoincidePrecio_(material, filtros) {
  filtros = filtros || {};
  const idMaterial = String(filtros.idMaterial || "").trim();
  const codigoMaterial = normalizarTexto(filtros.codigoMaterial || "");
  const codigoSap = normalizarTexto(filtros.codigoSap || "");
  if (idMaterial && String(material.ID_MATERIAL || "").trim() === idMaterial) return true;
  if (codigoMaterial && normalizarTexto(material.CODIGO_MATERIAL) === codigoMaterial) return true;
  if (codigoSap && normalizarTexto(material.CODIGO_SAP) === codigoSap) return true;
  return false;
}

function calcularPrioridadPrecioCandidato_(lista, filtros) {
  filtros = filtros || {};
  const proveedorConsulta = String(filtros.idProveedor || "").trim();
  const proveedorLista = String(lista.ID_PROVEEDOR || "").trim();
  const idGrupo = String(filtros.idGrupo || "").trim();
  const idOficina = String(filtros.idOficina || "").trim();
  const idNegocio = String(filtros.idNegocio || "").trim();
  let puntos = 0;
  if (proveedorConsulta && proveedorLista === proveedorConsulta) puntos += 1000;
  if (idNegocio && String(lista.ID_NEGOCIO || "").trim() === idNegocio) puntos += 100;
  if (idOficina && String(lista.ID_OFICINA || "").trim() === idOficina) puntos += 100;
  if (idGrupo && String(lista.ID_GRUPO || "").trim() === idGrupo) puntos += 200;
  if (!String(lista.ID_OFICINA || "").trim() && !String(lista.ID_GRUPO || "").trim()) puntos += 10;
  puntos += Math.max(0, 40 - (Number(lista.PRIORIDAD) || 30));
  return puntos;
}

function listaCumpleFiltrosPrecio_(lista, filtros) {
  filtros = filtros || {};
  const idProveedor = String(filtros.idProveedor || "").trim();
  const idNegocio = String(filtros.idNegocio || "").trim();
  const idOficina = String(filtros.idOficina || "").trim();
  const idGrupo = String(filtros.idGrupo || "").trim();
  const proveedorLista = String(lista.ID_PROVEEDOR || "").trim();
  const oficinaLista = String(lista.ID_OFICINA || "").trim();
  const grupoLista = String(lista.ID_GRUPO || "").trim();

  if (normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
  if (!idProveedor || proveedorLista !== idProveedor) return false;
  if (idNegocio && String(lista.ID_NEGOCIO || "").trim() !== idNegocio) return false;

  if (idGrupo && !idOficina) return false;
  if (idOficina) {
    if (oficinaLista && oficinaLista !== idOficina) return false;
  } else if (oficinaLista) {
    return false;
  }
  if (idGrupo) {
    if (grupoLista && grupoLista !== idGrupo) return false;
  } else if (grupoLista) {
    return false;
  }

  return fechaDentroVigenciaPrecio_(filtros.fecha || new Date(), lista.FECHA_INICIO, lista.FECHA_FIN);
}

/**
 * Resuelve el precio vigente de un material respetando prioridad proveedor/escope.
 * Diseñado para formularios futuros: primero devuelve coincidencia exacta y, si no
 * existe, puede entregar fallback único para el material.
 */
function resolverPrecioMaterialesPreciosModulo(filtros) {
  const usuario = obtenerUsuarioActual();
  if (!tienePermisoMaterialesPrecios_("VER_PRECIOS", usuario) && !tienePermisoMaterialesPrecios_("VER_LISTAS_OFICIALES", usuario)) {
    exigirPermisoMaterialesPrecios_("VER_PRECIOS", usuario);
  }
  filtros = filtros || {};
  const proveedorUsuario = String(usuario.idProveedor || "").trim();
  const proveedorSolicitado = String(filtros.idProveedor || proveedorUsuario || "").trim();
  if (!proveedorSolicitado) throw new Error("Indica el proveedor para resolver el precio del material.");
  if (proveedorUsuario && proveedorSolicitado !== proveedorUsuario && !esAccesoGlobalMaterialesPrecios_(usuario)) {
    throw new Error("No puedes consultar precios de otro proveedor.");
  }
  const filtrosConsulta = Object.assign({}, filtros, { idProveedor: proveedorSolicitado });
  if (String(filtrosConsulta.idGrupo || "").trim() && !String(filtrosConsulta.idOficina || "").trim()) {
    throw new Error("Para resolver precio por grupo debes indicar la oficina de ventas.");
  }

  const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES).filter(function(material) {
    return normalizarTexto(material.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO && materialCoincidePrecio_(material, filtrosConsulta);
  });
  if (!materiales.length) throw new Error("No se encontró el material solicitado.");
  if (materiales.length > 1) throw new Error("La consulta coincide con más de un material. Usa ID_MATERIAL o un código exacto.");
  const material = materiales[0];

  const listasPorId = mapearPorIdPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS), "ID_LISTA_PRECIO");
  const candidatos = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).filter(function(detalle) {
    if (String(detalle.ID_MATERIAL || "").trim() !== String(material.ID_MATERIAL || "").trim()) return false;
    if (normalizarTexto(detalle.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) return false;
    const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()] || {};
    return listaCumpleFiltrosPrecio_(lista, filtrosConsulta) && detallePrecioVisibleParaUsuario_(detalle, lista, usuario);
  }).map(function(detalle) {
    const lista = listasPorId[String(detalle.ID_LISTA_PRECIO || "").trim()] || {};
    return { detalle: detalle, lista: lista, prioridadResolucion: calcularPrioridadPrecioCandidato_(lista, filtrosConsulta) };
  }).sort(function(a, b) {
    return b.prioridadResolucion - a.prioridadResolucion;
  });

  if (!candidatos.length) {
    return { correcto: false, encontrado: false, requiereSeleccion: false, mensaje: "No existe precio vigente para ese proveedor y alcance." };
  }

  if (candidatos.length > 1 && candidatos[0].prioridadResolucion === candidatos[1].prioridadResolucion) {
    return {
      correcto: false,
      encontrado: false,
      requiereSeleccion: true,
      totalCandidatos: candidatos.length,
      mensaje: "Se detectaron precios duplicados con la misma prioridad para el material, proveedor y alcance. Revisa la lista de precios."
    };
  }

  return mapearResultadoPrecioResuelto_(material, candidatos[0], candidatos.length, false);
}

function mapearResultadoPrecioResuelto_(material, candidato, totalCandidatos, esFallback) {
  const lista = candidato.lista || {};
  const detalle = candidato.detalle || {};
  return {
    correcto: true,
    encontrado: true,
    fallback: esFallback === true,
    totalCandidatos: totalCandidatos || 1,
    idMaterial: String(material.ID_MATERIAL || "").trim(),
    codigoMaterial: String(material.CODIGO_MATERIAL || "").trim(),
    codigoSap: String(material.CODIGO_SAP || "").trim(),
    idDetallePrecio: String(detalle.ID_DETALLE_PRECIO || "").trim(),
    idListaPrecio: String(lista.ID_LISTA_PRECIO || "").trim(),
    tipoPrecio: obtenerTipoAlcanceProveedorPrecio_(lista.ID_PROVEEDOR),
    idProveedor: String(lista.ID_PROVEEDOR || "").trim(),
    idNegocio: String(lista.ID_NEGOCIO || "").trim(),
    idOficina: String(lista.ID_OFICINA || "").trim(),
    idGrupo: String(lista.ID_GRUPO || "").trim(),
    precioBase: Number(detalle.PRECIO_BASE || 0),
    moneda: String(detalle.MONEDA || lista.MONEDA || MP_MODULO_SGT360.MONEDA).trim(),
    fechaInicio: normalizarFechaSalidaPrecio_(lista.FECHA_INICIO),
    fechaFin: normalizarFechaSalidaPrecio_(lista.FECHA_FIN),
    prioridadResolucion: candidato.prioridadResolucion || 0,
    mensaje: esFallback ? "Se usó el único precio vigente disponible para el material." : "Precio resuelto por prioridad de filtros."
  };
}

function buscarMaterialPorCodigoPrecio_(codigoMaterial, codigoSap, idExcluir) {
  const codigo = normalizarTexto(codigoMaterial);
  const sap = normalizarTexto(codigoSap);
  return leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES).find(function(item) {
    if (String(item.ID_MATERIAL || "").trim() === String(idExcluir || "").trim()) return false;
    return (codigo && normalizarTexto(item.CODIGO_MATERIAL) === codigo) || (sap && sap !== "EN CREACION" && normalizarTexto(item.CODIGO_SAP) === sap);
  }) || null;
}


function buscarListaPrecioExactaPorAlcance_(listas, datos) {
  datos = datos || {};
  const proveedor = String(datos.idProveedor || datos.ID_PROVEEDOR || "").trim();
  const negocio = String(datos.idNegocio || datos.ID_NEGOCIO || "").trim();
  const oficina = String(datos.idOficina || datos.ID_OFICINA || "").trim();
  const grupo = String(datos.idGrupo || datos.ID_GRUPO || "").trim();
  const inicio = normalizarFechaEntradaPrecio_(datos.fechaInicio || datos.FECHA_INICIO);
  const fin = normalizarFechaEntradaPrecio_(datos.fechaFin || datos.FECHA_FIN);

  return (listas || []).find(function(lista) {
    return normalizarTexto(lista.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO &&
      String(lista.ID_PROVEEDOR || "").trim() === proveedor &&
      String(lista.ID_NEGOCIO || "").trim() === negocio &&
      String(lista.ID_OFICINA || "").trim() === oficina &&
      String(lista.ID_GRUPO || "").trim() === grupo &&
      normalizarFechaEntradaPrecio_(lista.FECHA_INICIO) === inicio &&
      normalizarFechaEntradaPrecio_(lista.FECHA_FIN) === fin;
  }) || null;
}

function validarCabeceraListaPrecio_(datos) {
  const usuario = obtenerUsuarioActual();
  datos = datos || {};
  const idProveedor = datos._proveedorResuelto === true ?
    String(datos.idProveedor || datos.ID_PROVEEDOR || "").trim() :
    resolverProveedorPrecioCabecera_(datos, usuario);
  const proveedorUsuario = String(usuario.idProveedor || "").trim();

  if (!idProveedor) {
    throw new Error("Selecciona el proveedor. Todo precio debe pertenecer a un proveedor; General solo significa sin oficina ni grupo.");
  }
  if (!obtenerProveedorActivoPorIdMaterialPrecio_(idProveedor)) {
    throw new Error("El proveedor seleccionado no existe o está inactivo.");
  }
  if (proveedorUsuario && idProveedor !== proveedorUsuario &&
      !tienePermisoMaterialesPrecios_("CARGAR_LISTA_PRECIO_ADMIN", usuario) &&
      !tienePermisoMaterialesPrecios_("SELECCIONAR_PROVEEDOR_LISTA", usuario) &&
      !tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario) &&
      !tienePermisoMaterialesPrecios_("CREAR_LISTA_OFICIAL", usuario) &&
      !tienePermisoMaterialesPrecios_("EDITAR_LISTA_OFICIAL", usuario)) {
    throw new Error("Solo puedes gestionar precios para tu proveedor asignado.");
  }
  if (!String(datos.idNegocio || datos.ID_NEGOCIO || "").trim()) throw new Error("Selecciona el negocio.");
  if (String(datos.idGrupo || datos.ID_GRUPO || "").trim() && !String(datos.idOficina || datos.ID_OFICINA || "").trim()) {
    throw new Error("Para usar grupo debes seleccionar una oficina de ventas.");
  }
  const inicioTexto = normalizarFechaEntradaPrecio_(datos.fechaInicio || datos.FECHA_INICIO);
  const finTexto = normalizarFechaEntradaPrecio_(datos.fechaFin || datos.FECHA_FIN);
  if (!inicioTexto) throw new Error("La fecha de inicio es obligatoria.");
  if (!finTexto) throw new Error("La fecha de fin es obligatoria.");
  const inicio = convertirFechaPrecio_(inicioTexto);
  const fin = convertirFechaPrecio_(finTexto);
  if (inicio && fin && fin.getTime() < inicio.getTime()) throw new Error("La fecha fin no puede ser menor que la fecha inicio.");
}

/* =========================
 * Internas: solicitudes
 * ========================= */

function obtenerSolicitudesVisiblesPrecios_(usuario, filtros) {
  filtros = filtros || {};
  const solicitudes = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES);
  const proveedorUsuario = String(usuario.idProveedor || "").trim();
  const puedeVerTodas = tienePermisoMaterialesPrecios_("VER_SOLICITUDES_PRECIO", usuario);
  return solicitudes.filter(function(item) {
    if (!puedeVerTodas && proveedorUsuario) return String(item.ID_PROVEEDOR || "").trim() === proveedorUsuario;
    if (!puedeVerTodas && !proveedorUsuario) return false;
    return true;
  });
}

function buscarSolicitudVisiblePrecio_(idSolicitud, usuario) {
  return obtenerSolicitudesVisiblesPrecios_(usuario, {}).find(function(item) {
    return String(item.ID_SOLICITUD || "").trim() === String(idSolicitud || "").trim();
  }) || null;
}

function mapearSolicitudPrecio_(item) {
  const proveedores = mapearOpcionesPorId_(obtenerProveedoresActivosOpciones_());
  const negocios = mapearOpcionesPorId_(listarValoresCatalogoAppPrecio_("MP_NEGOCIOS"));
  const oficinas = mapearOpcionesPorId_(obtenerOficinasActivasOpciones_());
  const grupos = mapearOpcionesPorId_(obtenerGruposActivosOpciones_());
  return {
    idSolicitud: String(item.ID_SOLICITUD || "").trim(),
    codigoSolicitud: String(item.CODIGO_SOLICITUD || "").trim(),
    idProveedor: String(item.ID_PROVEEDOR || "").trim(),
    proveedor: obtenerNombreOpcion_(proveedores, item.ID_PROVEEDOR),
    idNegocio: String(item.ID_NEGOCIO || "").trim(),
    negocio: obtenerNombreOpcion_(negocios, item.ID_NEGOCIO),
    idOficina: String(item.ID_OFICINA || "").trim(),
    oficina: obtenerNombreOpcion_(oficinas, item.ID_OFICINA),
    idGrupo: String(item.ID_GRUPO || "").trim(),
    grupo: obtenerNombreOpcion_(grupos, item.ID_GRUPO),
    alcance: String(item.ALCANCE || determinarAlcanceListaPrecio_({ idOficina: item.ID_OFICINA, idGrupo: item.ID_GRUPO })).trim(),
    origenCarga: String(item.ORIGEN_CARGA || "").trim(),
    fechaInicio: normalizarFechaSalidaPrecio_(item.FECHA_INICIO),
    fechaFin: normalizarFechaSalidaPrecio_(item.FECHA_FIN),
    moneda: String(item.MONEDA || MP_MODULO_SGT360.MONEDA).trim(),
    estado: normalizarTexto(item.ESTADO),
    nombreArchivo: String(item.NOMBRE_ARCHIVO || "").trim(),
    totalFilas: Number(item.TOTAL_FILAS || 0),
    totalErrores: Number(item.TOTAL_ERRORES || 0),
    totalAdvertencias: Number(item.TOTAL_ADVERTENCIAS || 0),
    comentarioProveedor: String(item.COMENTARIO_PROVEEDOR || "").trim(),
    comentarioRevisor: String(item.COMENTARIO_REVISOR || "").trim(),
    usuarioCarga: String(item.ID_USUARIO_CARGA || "").trim(),
    fechaCarga: normalizarFechaSalidaPrecio_(item.FECHA_CARGA),
    usuarioRevision: String(item.ID_USUARIO_REVISION || "").trim(),
    fechaRevision: normalizarFechaSalidaPrecio_(item.FECHA_REVISION),
    idListaPrecioPublicada: String(item.ID_LISTA_PRECIO_PUBLICADA || "").trim()
  };
}

function mapearDetalleSolicitudPrecio_(item) {
  return {
    idDetalleSolicitud: String(item.ID_DETALLE_SOLICITUD || "").trim(),
    numeroFila: Number(item.NUMERO_FILA || 0),
    codigoSap: String(item.CODIGO_SAP || "").trim(),
    codigoMaterial: String(item.CODIGO_MATERIAL || "").trim(),
    productoPrincipal: String(item.PRODUCTO_PRINCIPAL || "").trim(),
    tipoMaterial: String(item.TIPO_MATERIAL || "").trim(),
    subtipoMaterial: String(item.SUBTIPO_MATERIAL || "").trim(),
    marca: String(item.MARCA || "").trim(),
    descripcionMaterial: String(item.DESCRIPCION_MATERIAL || "").trim(),
    codigoOficinas: String(item.CODIGO_OFICINAS || "").trim(),
    idsOficinas: String(item.IDS_OFICINAS || "").trim(),
    codigoGrupo: String(item.CODIGO_GRUPO || "").trim(),
    idGrupo: String(item.ID_GRUPO || "").trim(),
    esCombo: convertirBooleanoMotor_(item.TIENE_COMBO || item.ES_COMBO),
    componentesIncluidos: String(item.DETALLE_COMBO || item.COMPONENTES_INCLUIDOS || "").trim(),
    precioBase: Number(item.PRECIO_BASE || 0),
    comentarioComercial: String(item.COMENTARIO_COMERCIAL || "").trim(),
    estadoFila: normalizarTexto(item.ESTADO_FILA),
    accionSugerida: normalizarTexto(item.ACCION_SUGERIDA),
    errores: dividirMensajesPrecio_(item.ERRORES),
    advertencias: dividirMensajesPrecio_(item.ADVERTENCIAS),
    observacionRevisor: String(item.OBSERVACION_REVISOR || "").trim(),
    idMaterialDetectado: String(item.ID_MATERIAL_DETECTADO || "").trim()
  };
}

function dividirMensajesPrecio_(texto) {
  return String(texto || "").split("|").map(function(item) { return item.trim(); }).filter(Boolean);
}

function esEstadoPendienteSolicitudPrecio_(estado) {
  return ["CARGADO", "OBSERVADO_POR_SISTEMA", "PENDIENTE_REVISION", "EN_REVISION", "OBSERVADO_POR_REVISOR"].indexOf(normalizarTexto(estado)) !== -1;
}

function registrarHistorialSolicitudPrecio_(idSolicitud, accion, estadoAnterior, estadoNuevo, comentario) {
  const usuario = obtenerUsuarioActual();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.OPERATION, MP_MODULO_SGT360.HOJAS.SOLICITUD_HISTORIAL, "ID_HISTORIAL", {
    ID_HISTORIAL: generarIdMotor_("HLP"),
    ID_SOLICITUD: idSolicitud,
    FECHA_HORA: new Date(),
    ID_USUARIO: usuario.idUsuario || "",
    CORREO: usuario.correo || "",
    ROL: usuario.rol || "",
    ACCION: normalizarTexto(accion),
    ESTADO_ANTERIOR: normalizarTexto(estadoAnterior),
    ESTADO_NUEVO: normalizarTexto(estadoNuevo),
    COMENTARIO: limpiarTextoMotor_(comentario || "", 2000)
  });
}

function validarFilasSolicitudPrecio_(cabeceras, filas, datosCabecera) {
  const mapa = crearMapaCabeceras(cabeceras);
  const tieneCodigoMaterial = typeof mapa.CODIGO_MATERIAL === "number";
  const tieneCodigoSap = typeof mapa.CODIGO_SAP_MATERIAL === "number" || typeof mapa.CODIGO_SAP === "number";
  const tienePrecio = typeof mapa.PRECIO === "number" || typeof mapa.PRECIO_BASE === "number" || typeof mapa.MONTO === "number";
  const faltantes = [];
  if (!tieneCodigoMaterial && !tieneCodigoSap) faltantes.push("CODIGO_MATERIAL o CODIGO_SAP_MATERIAL");
  if (!tienePrecio) faltantes.push("PRECIO o PRECIO_BASE");
  if (faltantes.length) throw new Error("La plantilla no contiene las columnas requeridas: " + faltantes.join(", ") + ".");

  const detalles = [];
  let errores = 0;
  let advertencias = 0;
  const vistos = {};
  const idProveedorCabecera = String(datosCabecera && (datosCabecera.idProveedor || datosCabecera.ID_PROVEEDOR) || "").trim();
  const idNegocioCabecera = String(datosCabecera && (datosCabecera.idNegocio || datosCabecera.ID_NEGOCIO) || "").trim();
  const fechaInicioCabecera = normalizarFechaEntradaPrecio_(datosCabecera && (datosCabecera.fechaInicio || datosCabecera.FECHA_INICIO));
  const fechaFinCabecera = normalizarFechaEntradaPrecio_(datosCabecera && (datosCabecera.fechaFin || datosCabecera.FECHA_FIN));
  if (!idProveedorCabecera) throw new Error("La lista de precios debe tener proveedor.");

  const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES);
  const indiceMateriales = construirMapaMaterialesPrecioMasivo_(materiales);
  const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS);
  const detallesOficiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE);
  const detallesPorListaMaterial = {};
  detallesOficiales.forEach(function(detalle) {
    detallesPorListaMaterial[String(detalle.ID_LISTA_PRECIO || "").trim() + "|" + String(detalle.ID_MATERIAL || "").trim()] = detalle;
  });
  const mapaOficinas = obtenerMapaOficinasPrecio_();
  const mapaGrupos = obtenerMapaGruposPrecio_();

  filas.forEach(function(fila, indice) {
    if (esFilaVaciaMotor_(fila)) return;
    const objeto = filaAObjetoDesdeMapaPrecio_(cabeceras, fila);
    const rowErrors = [];
    const rowWarnings = [];
    const normalizada = normalizarFilaPrecioMasivo_(objeto);
    const resolucionMaterial = resolverMaterialPrecioMasivo_(normalizada, indiceMateriales);
    const materialDetectado = resolucionMaterial.material;
    rowErrors.push.apply(rowErrors, resolucionMaterial.errores || []);

    const oficinasDeclaradas = normalizarIdsOficinasPrecio_(normalizada.codigoOficinas);
    const oficinasDestino = resolverIdsOficinasCargaPrecio_(normalizada.codigoOficinas, datosCabecera, mapaOficinas);
    const idOficina = String(oficinasDestino[0] || "").trim();
    const grupoDestino = resolverGrupoCargaPrecio_(normalizada.codigoGrupo || (datosCabecera && datosCabecera.idGrupo), mapaGrupos);
    const idGrupo = idOficina ? String(grupoDestino.id || "").trim() : "";

    if (oficinasDeclaradas.length > 1) rowErrors.push("CODIGO_OFICINA debe contener una sola oficina por fila. Para otro canal usa otra fila.");
    if (normalizada.codigoOficinas && !idOficina) rowErrors.push("Oficina no válida o inactiva: " + normalizada.codigoOficinas);
    if (grupoDestino.id && !idOficina) rowErrors.push("Para asignar grupo debes indicar una oficina");
    if (grupoDestino.id && grupoDestino.idOficina && idOficina && grupoDestino.idOficina !== idOficina) rowErrors.push("El grupo no pertenece a la oficina indicada");
    if (!Number.isFinite(normalizada.precio) || normalizada.precio < 0) rowErrors.push("Precio inválido");

    let accionSugerida = "CREAR_PRECIO";
    if (materialDetectado && !rowErrors.length) {
      const idMaterial = String(materialDetectado.ID_MATERIAL || "").trim();
      const firma = [idMaterial, idProveedorCabecera, idNegocioCabecera, idOficina, idGrupo].join("|");
      if (vistos[firma]) rowErrors.push("Material, proveedor y alcance duplicados dentro del archivo");
      vistos[firma] = true;

      const datosAlcance = {
        idProveedor: idProveedorCabecera,
        idNegocio: idNegocioCabecera,
        idOficina: idOficina,
        idGrupo: idGrupo,
        fechaInicio: fechaInicioCabecera,
        fechaFin: fechaFinCabecera
      };
      const listaExacta = buscarListaPrecioExactaPorAlcance_(listas, datosAlcance);
      const listaProspectiva = listaExacta || construirObjetoListaPrecioIndividualRapida_(Object.assign({}, datosAlcance, {
        idMaterial: idMaterial,
        precioBase: normalizada.precio
      }), obtenerUsuarioActual(), null);

      try {
        validarCruceVigenciaPrecioMaterialRapido_(listas, detallesOficiales, listaProspectiva, idMaterial, "");
      } catch (errorCruce) {
        rowErrors.push(errorCruce && errorCruce.message ? errorCruce.message : String(errorCruce));
      }

      if (listaExacta && detallesPorListaMaterial[String(listaExacta.ID_LISTA_PRECIO || "").trim() + "|" + idMaterial]) {
        accionSugerida = "ACTUALIZAR_PRECIO";
      }
    }

    if (String(objeto.FEE_PRV || objeto.FEE_PROVEEDOR || objeto.FEE_CLDA || objeto.FEE_CALIDDA || "").trim()) rowWarnings.push("Columnas FEE detectadas e ignoradas en esta fase");

    errores += rowErrors.length ? 1 : 0;
    advertencias += rowWarnings.length;
    detalles.push({
      ID_DETALLE_SOLICITUD: generarIdMotor_("DSLP"),
      NUMERO_FILA: indice + 2,
      CODIGO_SAP: normalizada.codigoSap,
      CODIGO_MATERIAL: normalizada.codigoMaterial,
      PRODUCTO_PRINCIPAL: normalizada.producto,
      TIPO_MATERIAL: normalizada.tipo,
      SUBTIPO_MATERIAL: normalizada.subtipo,
      MARCA: normalizada.marca,
      DESCRIPCION_MATERIAL: normalizada.descripcion || (materialDetectado ? materialDetectado.DESCRIPCION_MATERIAL || materialDetectado.NOMBRE_MATERIAL : ""),
      CODIGO_OFICINAS: normalizada.codigoOficinas,
      IDS_OFICINAS: idOficina,
      CODIGO_GRUPO: normalizada.codigoGrupo,
      ID_GRUPO: idGrupo,
      ES_COMBO: normalizada.combo ? "SI" : "",
      COMPONENTES_INCLUIDOS: normalizada.combo,
      PRECIO_BASE: Number.isFinite(normalizada.precio) ? normalizada.precio : "",
      COMENTARIO_COMERCIAL: normalizada.comentario,
      ESTADO_FILA: rowErrors.length ? "ERROR" : (rowWarnings.length ? "ADVERTENCIA" : "OK"),
      ACCION_SUGERIDA: accionSugerida,
      ERRORES: rowErrors.join(" | "),
      ADVERTENCIAS: rowWarnings.join(" | "),
      OBSERVACION_REVISOR: "",
      ID_MATERIAL_DETECTADO: materialDetectado ? materialDetectado.ID_MATERIAL : ""
    });
  });
  return { detalles: detalles, errores: errores, advertencias: advertencias };
}
function detectarMaterialSolicitudPrecio_(codigoMaterial, codigoSap, descripcion) {
  const indice = construirMapaMaterialesPrecioMasivo_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES));
  const resolucion = resolverMaterialPrecioMasivo_({
    codigoMaterial: codigoMaterial,
    codigoSap: codigoSap
  }, indice);
  return resolucion.errores && resolucion.errores.length ? null : resolucion.material;
}

function materialDesdeDetalleSolicitudPrecio_(detalle, solicitud, usuario) {
  usuario = usuario || obtenerUsuarioActual();
  detalle = detalle || {};
  solicitud = solicitud || {};

  let material = null;
  const idDetectado = String(detalle.ID_MATERIAL_DETECTADO || "").trim();
  if (idDetectado) {
    material = buscarPorCampoPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES, "ID_MATERIAL", idDetectado);
  }

  if (!material) {
    const indice = construirMapaMaterialesPrecioMasivo_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES));
    const resolucion = resolverMaterialPrecioMasivo_({
      codigoMaterial: detalle.CODIGO_MATERIAL,
      codigoSap: detalle.CODIGO_SAP
    }, indice);
    if (resolucion.errores && resolucion.errores.length) {
      throw new Error("No se pudo identificar el material de la fila: " + resolucion.errores.join(" | "));
    }
    material = resolucion.material;
  }

  if (!material || normalizarTexto(material.ESTADO || CONFIG.ESTADOS.ACTIVO) !== CONFIG.ESTADOS.ACTIVO) {
    throw new Error("El material de la lista no existe o está inactivo. Cárgalo primero en Materiales.");
  }

  asegurarRelacionNegocioMaterialPrecio_(
    solicitud.ID_NEGOCIO,
    material.ID_MATERIAL,
    usuario
  );

  return material;
}

/* =========================
 * Internas: CSV y formato
 * ========================= */

function parsearCsvPrecio_(texto) {
  const contenido = String(texto || "").replace(/^\uFEFF/, "");
  const filas = [];
  let fila = [];
  let campo = "";
  let enComillas = false;
  for (let i = 0; i < contenido.length; i++) {
    const ch = contenido.charAt(i);
    const next = contenido.charAt(i + 1);
    if (ch === '"') {
      if (enComillas && next === '"') { campo += '"'; i++; }
      else enComillas = !enComillas;
    } else if (ch === "," && !enComillas) {
      fila.push(campo); campo = "";
    } else if ((ch === "\n" || ch === "\r") && !enComillas) {
      if (ch === "\r" && next === "\n") i++;
      fila.push(campo); campo = "";
      if (!esFilaVaciaMotor_(fila)) filas.push(fila);
      fila = [];
    } else {
      campo += ch;
    }
  }
  fila.push(campo);
  if (!esFilaVaciaMotor_(fila)) filas.push(fila);
  if (!filas.length) return { cabeceras: [], filas: [] };
  const cabeceras = filas.shift().map(function(h) { return String(h || "").trim(); });
  return { cabeceras: cabeceras, filas: filas };
}

function filaAObjetoDesdeMapaPrecio_(cabeceras, fila) {
  const obj = {};
  cabeceras.forEach(function(cabecera, i) {
    obj[normalizarClaveMotor_(cabecera)] = fila[i];
  });
  return obj;
}

function normalizarFechaEntradaPrecio_(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return "";
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? "" : Utilities.formatDate(valor, MOTOR_SGT360.ZONA_HORARIA, "yyyy-MM-dd");
  }
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dmy = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) {
    const dia = ("0" + Number(dmy[1])).slice(-2);
    const mes = ("0" + Number(dmy[2])).slice(-2);
    return dmy[3] + "-" + mes + "-" + dia;
  }
  const fecha = convertirFechaPrecio_(texto);
  if (!fecha) return "";
  return Utilities.formatDate(fecha, MOTOR_SGT360.ZONA_HORARIA, "yyyy-MM-dd");
}

function convertirFechaPrecio_(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return null;
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? null : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function normalizarFechaSalidaPrecio_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Number.isNaN(valor.getTime()) ? "" : Utilities.formatDate(valor, MOTOR_SGT360.ZONA_HORARIA, "yyyy-MM-dd HH:mm");
  }
  return String(valor || "").trim();
}

function generarCodigoTemporalMaterialPrecio_() {
  return generarCodigoMaterialUnicoPrecio_();
}

function generarCodigoMaterialUnicoPrecio_() {
  const usados = construirSetCodigosPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES), "CODIGO_MATERIAL");
  return generarCodigoVisibleUnicoPrecio_("M", usados, 7);
}

function generarCodigoSolicitudPrecio_(datos, idSolicitud) {
  const usados = construirSetCodigosPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.SOLICITUDES), "CODIGO_SOLICITUD");
  return generarCodigoVisibleUnicoPrecio_("S", usados, 7);
}

function generarCodigoListaPrecio_(datos) {
  datos = datos || {};
  const usados = construirSetCodigosPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS), "CODIGO_LISTA");
  const origen = normalizarTexto(datos.origenCarga || datos.ORIGEN_CARGA || datos.origen || datos.ORIGEN || "");
  const prefijo = (origen === "PRECIO_INDIVIDUAL" || origen === "CARGA_INDIVIDUAL") ? "P" : "L";
  return generarCodigoVisibleUnicoPrecio_(prefijo, usados, 7);
}

function generarCodigoPrecioDetalle_() {
  const usados = construirSetCodigosPrecio_(leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE), "CODIGO_PRECIO");
  return generarCodigoVisibleUnicoPrecio_("P", usados, 7);
}

function generarCodigoVisibleUnicoPrecio_(prefijo, usados, longitudTotal) {
  prefijo = normalizarTexto(prefijo || "X").replace(/[^A-Z0-9]/g, "").slice(0, 2) || "X";
  usados = usados || {};
  longitudTotal = Math.max(Number(longitudTotal) || 7, prefijo.length + 4);
  let codigo = "";
  let intentos = 0;
  do {
    codigo = generarCodigoVisibleCortoPrecio_(prefijo, longitudTotal);
    intentos++;
  } while (usados[normalizarTexto(codigo)] && intentos < 25);
  return codigo;
}

function generarCodigoVisibleCortoPrecio_(prefijo, longitudTotal) {
  const largoSufijo = Math.max(4, longitudTotal - prefijo.length);
  const tiempo = new Date().getTime().toString(36).toUpperCase();
  const uuid = Utilities.getUuid().replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const semilla = (tiempo.slice(-3) + uuid).replace(/[^A-Z0-9]/g, "");
  return (prefijo + semilla.slice(0, largoSufijo)).slice(0, longitudTotal);
}

function construirSetCodigosPrecio_(registros, campo) {
  const set = {};
  (registros || []).forEach(function(item) {
    const valor = normalizarTexto(item && item[campo] || "");
    if (valor) set[valor] = true;
  });
  return set;
}
function asegurarColumnasCatalogosAppPaso25B_() {
  asegurarHojaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS, [
    "ID_CATALOGO", "CODIGO", "NOMBRE", "DESCRIPCION", "ESTADO", "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]);
  asegurarHojaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES, [
    "ID_VALOR", "CATALOGO", "CODIGO", "NOMBRE", "ORDEN", "ESTADO", "CLAVE_PADRE", "VALOR_PADRE", "METADATA_JSON", "FECHA_CREACION", "FECHA_ACTUALIZACION"
  ]);
}

function asegurarCatalogoAppPrecio_(codigo, nombre, descripcion) {
  const catalogo = normalizarTexto(codigo).replace(/[^A-Z0-9_]/g, "_");
  const existente = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS).find(function(item) {
    return normalizarTexto(item.CODIGO) === catalogo;
  });
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGOS, "ID_CATALOGO", {
    ID_CATALOGO: existente ? existente.ID_CATALOGO : generarIdMotor_("CAT"),
    CODIGO: catalogo,
    NOMBRE: limpiarTextoMotor_(nombre || catalogo, 120),
    DESCRIPCION: limpiarTextoMotor_(descripcion || "", 500),
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    FECHA_CREACION: existente ? existente.FECHA_CREACION || ahora : ahora,
    FECHA_ACTUALIZACION: ahora
  });
}

function asegurarValorCatalogoAppPrecio_(catalogo, codigo, nombre, orden, clavePadre, valorPadre, metadata) {
  catalogo = normalizarTexto(catalogo).replace(/[^A-Z0-9_]/g, "_");
  codigo = normalizarTexto(codigo).replace(/[^A-Z0-9_]/g, "_");
  const existentes = leerTablaMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES);
  const existente = existentes.find(function(item) {
    return normalizarTexto(item.CATALOGO) === catalogo && normalizarTexto(item.CODIGO) === codigo;
  });
  const ahora = new Date();
  guardarObjetoMotor_(MOTOR_SGT360.BASES.CONFIG, CONFIG.HOJAS.CATALOGO_VALORES, "ID_VALOR", {
    ID_VALOR: existente ? existente.ID_VALOR : generarIdMotor_("VAL"),
    CATALOGO: catalogo,
    CODIGO: codigo,
    NOMBRE: limpiarTextoMotor_(nombre || codigo, 120),
    ORDEN: Number(orden) || 999,
    ESTADO: CONFIG.ESTADOS.ACTIVO,
    CLAVE_PADRE: normalizarTexto(clavePadre || ""),
    VALOR_PADRE: normalizarTexto(valorPadre || ""),
    METADATA_JSON: JSON.stringify(metadata || {}),
    FECHA_CREACION: existente ? existente.FECHA_CREACION || ahora : ahora,
    FECHA_ACTUALIZACION: ahora
  });
}

function listarValoresCatalogosAppPrecioEnBloque_(codigosCatalogo) {
  const solicitados = {};
  (Array.isArray(codigosCatalogo) ? codigosCatalogo : []).forEach(function(codigo) {
    const clave = normalizarTexto(codigo);
    if (clave) solicitados[clave] = true;
  });

  const salida = {};
  Object.keys(solicitados).forEach(function(codigo) {
    salida[codigo] = [];
  });

  if (!Object.keys(solicitados).length) return salida;

  const hoja = obtenerHojaMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.CATALOGO_VALORES,
    true
  );

  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();
  if (ultimaFila < 2 || ultimaColumna < 1) return salida;

  const datos = hoja
    .getRange(1, 1, ultimaFila, ultimaColumna)
    .getDisplayValues();

  const mapa = crearMapaCabeceras(datos[0]);
  validarCabeceras(
    mapa,
    ["CATALOGO", "CODIGO", "NOMBRE", "ORDEN", "ESTADO"],
    CONFIG.HOJAS.CATALOGO_VALORES
  );

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const catalogo = normalizarTexto(fila[mapa.CATALOGO] || "");

    if (
      !solicitados[catalogo] ||
      normalizarTexto(fila[mapa.ESTADO] || "") !== CONFIG.ESTADOS.ACTIVO
    ) {
      continue;
    }

    let metadata = {};
    if (typeof mapa.METADATA_JSON === "number") {
      try {
        metadata = fila[mapa.METADATA_JSON] ?
          JSON.parse(String(fila[mapa.METADATA_JSON])) :
          {};
      } catch (error) {
        metadata = {};
      }
    }

    salida[catalogo].push({
      id: normalizarTexto(fila[mapa.CODIGO] || ""),
      codigo: normalizarTexto(fila[mapa.CODIGO] || ""),
      nombre: String(fila[mapa.NOMBRE] || "").trim(),
      orden: Number(fila[mapa.ORDEN]) || 999,
      clavePadre: typeof mapa.CLAVE_PADRE === "number" ?
        normalizarTexto(fila[mapa.CLAVE_PADRE] || "") : "",
      valorPadre: typeof mapa.VALOR_PADRE === "number" ?
        normalizarTexto(fila[mapa.VALOR_PADRE] || "") : "",
      metadata: metadata
    });
  }

  Object.keys(salida).forEach(function(codigo) {
    salida[codigo].sort(function(a, b) {
      return a.orden - b.orden || compararTextoMotor_(a.nombre, b.nombre);
    });
  });

  return salida;
}

function listarValoresCatalogoAppPrecio_(codigoCatalogo) {
  const catalogo = normalizarTexto(codigoCatalogo);
  if (!catalogo) return [];
  const grupos = listarValoresCatalogosAppPrecioEnBloque_([catalogo]);
  return grupos[catalogo] || [];
}

function determinarAlcanceListaPrecio_(datos) {
  const idOficina = String(datos && (datos.idOficina || datos.ID_OFICINA) || "").trim();
  const idGrupo = String(datos && (datos.idGrupo || datos.ID_GRUPO) || "").trim();
  if (idGrupo) return "GRUPO";
  if (idOficina) return "OFICINA";
  return "GENERAL";
}

function obtenerPrioridadAlcanceListaPrecio_(datos) {
  const alcance = determinarAlcanceListaPrecio_(datos);
  if (alcance === "GRUPO") return 10;
  if (alcance === "OFICINA") return 20;
  return 30;
}

function determinarOrigenCargaListaPrecio_(usuario, idProveedor) {
  const proveedorUsuario = String(usuario && usuario.idProveedor || "").trim();
  if (!String(idProveedor || "").trim()) return "ADMINISTRADOR_GENERAL_MATERIAL";
  if (proveedorUsuario && proveedorUsuario === String(idProveedor || "").trim()) return "PROVEEDOR";
  return "ADMINISTRADOR";
}

function configurarHojaCargaMaterialesXlsx_(hoja) {
  const cabeceras = MP_CARGA_MATERIALES_XLSX.CABECERAS;

  hoja.clear();
  hoja.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]);
  hoja.setFrozenRows(1);
  hoja.getRange(1, 1, 1, cabeceras.length).setFontWeight("bold");

  hoja
    .getRange(
      2,
      1,
      MP_MODULO_SGT360.MAX_FILAS_IMPORTACION,
      cabeceras.length
    )
    .setNumberFormat("@");

  hoja.getRange(1, 1, 1, cabeceras.length).setNotes([[
    "Código SAP. Puede quedar vacío. También se acepta EN CREACION y se almacenará vacío.",
    "Código interno del material. Si queda vacío, Cálidda 360 lo genera durante la prevalidación.",
    "Ruta relacional obligatoria. Ejemplo: PRODUCTO > COCINA > ENCIMERA. Selecciona únicamente desde el desplegable.",
    "Código de marca. Si queda vacío se utilizará SIN_MARCA.",
    "Descripción completa del material. Campo obligatorio.",
    "Nombre corto. Si queda vacío se utilizará la descripción.",
    "Unidad de medida. Si queda vacío se utilizará UN.",
    "Estado. Si queda vacío se utilizará ACTIVO."
  ]]);

  const anchos = [115, 125, 300, 125, 330, 220, 125, 115];
  anchos.forEach(function(ancho, indice) {
    hoja.setColumnWidth(indice + 1, ancho);
  });

  hoja.getRange("C1").setNote(
    "RUTA_TIPIFICACION reemplaza los tres desplegables independientes del formato anterior. " +
    "La ruta asegura que Producto principal, Tipo y Subtipo pertenezcan al mismo árbol."
  );
}

function escribirBloqueDiccionarioMateriales_(hoja, columnaInicial, titulo, opciones) {
  opciones = Array.isArray(opciones) ? opciones : [];

  hoja.getRange(1, columnaInicial, 1, 2).merge();
  hoja.getRange(1, columnaInicial).setValue(titulo).setFontWeight("bold");
  hoja.getRange(2, columnaInicial, 1, 2).setValues([["CODIGO", "DESCRIPCION"]]);
  hoja.getRange(2, columnaInicial, 1, 2).setFontWeight("bold");

  if (opciones.length) {
    const filas = opciones.map(function(item) {
      return [
        String(item.codigo || item.id || "").trim(),
        String(item.nombre || "").trim()
      ];
    });
    hoja.getRange(3, columnaInicial, filas.length, 2).setValues(filas);
  }

  hoja.setColumnWidth(columnaInicial, 150);
  hoja.setColumnWidth(columnaInicial + 1, 220);

  const cantidad = Math.max(opciones.length, 1);
  return hoja.getRange(3, columnaInicial, cantidad, 1);
}

function configurarValidacionesHojaCargaMaterialesXlsx_(hoja, rangos) {
  const filas = MP_MODULO_SGT360.MAX_FILAS_IMPORTACION;

  function aplicar(columna, rango, ayuda) {
    if (!rango) return;

    const constructor = SpreadsheetApp.newDataValidation()
      .requireValueInRange(rango, true)
      .setAllowInvalid(false);

    if (ayuda) {
      constructor.setHelpText(ayuda);
    }

    hoja
      .getRange(2, columna, filas, 1)
      .setDataValidation(constructor.build());
  }

  aplicar(
    3,
    rangos.rutas,
    "Selecciona una ruta completa Producto principal → Tipo → Subtipo."
  );
  aplicar(
    4,
    rangos.marcas,
    "Selecciona una marca vigente. Puede dejarse vacío para usar SIN_MARCA."
  );
  aplicar(
    7,
    rangos.unidades,
    "Selecciona una unidad vigente. Puede dejarse vacío para usar UN."
  );
  aplicar(
    8,
    rangos.estados,
    "Selecciona un estado vigente. Puede dejarse vacío para usar ACTIVO."
  );
}

function configurarHojaDiccionariosMaterialesXlsx_(hoja, idNegocio) {
  hoja.setFrozenRows(2);
  hoja.getRange("A22").setValue("NEGOCIO DE LA PLANTILLA").setFontWeight("bold");
  hoja.getRange("A23").setValue(idNegocio);
  hoja.getRange("A25").setValue(
    "Usa los códigos de esta hoja. No copies IDs técnicos ni UUID."
  );
  hoja.getRange("A26").setValue(
    "Si un valor no existe, primero debe crearse/activarse en los catálogos de Cálidda 360."
  );
}

function exportarSpreadsheetComoXlsx_(spreadsheetId, nombreArchivo) {
  const nombre = String(
    nombreArchivo ||
    MP_PLANTILLA_MATERIALES_CACHE_PASO_28G.NOMBRE_ARCHIVO
  ).trim();
  let errorServicioAvanzado = null;

  // Primera opción: servicio avanzado de Drive v3, ya habilitado en appsscript.json.
  if (
    typeof Drive !== "undefined" &&
    Drive.Files &&
    typeof Drive.Files.export === "function"
  ) {
    try {
      const blobDrive = Drive.Files.export(
        spreadsheetId,
        MP_CARGA_MATERIALES_XLSX.MIME_XLSX
      );

      if (
        blobDrive &&
        typeof blobDrive.getBytes === "function" &&
        blobDrive.getBytes().length
      ) {
        return blobDrive.setName(nombre);
      }
    } catch (error) {
      errorServicioAvanzado = error;
      console.warn(
        "Drive.Files.export no pudo completar la exportación; se usará REST: %s",
        error.message
      );
    }
  }

  // Respaldo: endpoint oficial files.export.
  const url = "https://www.googleapis.com/drive/v3/files/" +
    encodeURIComponent(spreadsheetId) +
    "/export?mimeType=" +
    encodeURIComponent(MP_CARGA_MATERIALES_XLSX.MIME_XLSX);

  const respuesta = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  });

  const codigo = respuesta.getResponseCode();

  if (codigo < 200 || codigo >= 300) {
    const detalleDrive = errorServicioAvanzado ?
      " Servicio avanzado: " + limpiarTextoMotor_(errorServicioAvanzado.message, 300) + "." :
      "";

    throw new Error(
      "No se pudo generar el archivo XLSX. HTTP " + codigo + ". " +
      limpiarTextoMotor_(respuesta.getContentText(), 500) +
      detalleDrive +
      " Verifica que la cuenta implementadora haya autorizado Google Drive."
    );
  }

  const blob = respuesta.getBlob().setName(nombre);

  if (!blob.getBytes().length) {
    throw new Error("La exportación XLSX fue recibida sin contenido.");
  }

  return blob;
}

function prevalidarMaterialesMasivoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("CREAR_MATERIAL", usuario);
  datos = datos || {};

  validarAutorizacionCargaMaterialesPaso28B_();

  const idNegocio = normalizarTexto(datos.idNegocio || "");
  const nombreArchivo = limpiarTextoMotor_(datos.nombreArchivo || "", 200);
  const archivoBase64 = String(datos.archivoBase64 || "").trim();

  if (!idNegocio) {
    throw new Error("Selecciona el negocio para la carga masiva de materiales.");
  }

  if (!archivoBase64) {
    throw new Error("No se recibió el archivo XLSX.");
  }

  const bytes = Utilities.base64Decode(archivoBase64);

  if (!bytes.length) {
    throw new Error("El archivo XLSX está vacío.");
  }

  if (bytes.length > MP_CARGA_MATERIALES_XLSX.MAX_BYTES) {
    throw new Error("El archivo supera el máximo permitido de 5 MB.");
  }

  // La limpieza global de Drive deja de ejecutarse en cada carga.
  limpiarTemporalesCargaMaterialesSiCorresponde_();

  const archivoTemporal = importarXlsxComoSpreadsheetTemporal_(
    bytes,
    nombreArchivo || "Carga_Materiales.xlsx"
  );

  try {
    const libro = abrirSpreadsheetConReintento_(archivoTemporal.id);

    const analisis = analizarCargaMaterialesXlsx_(libro, {
      idNegocio: idNegocio,
      usuario: usuario,
      persistirCodigosGenerados: true
    });

    if (!analisis.totalFilas) {
      throw new Error("La plantilla no contiene materiales para validar.");
    }

    let tokenPreview = "";

    if (analisis.errores === 0) {
      // Se guarda una copia técnica ya normalizada dentro del mismo temporal.
      // La confirmación no vuelve a recorrer catálogos ni a recalcular la carga.
      escribirPreviewTecnicoMateriales_(libro, analisis.registros);

      tokenPreview = generarTokenPreviewMateriales_();
      const claveCache = obtenerClavePreviewMateriales_(tokenPreview);

      CacheService.getScriptCache().put(
        claveCache,
        JSON.stringify({
          idArchivoTemporal: archivoTemporal.id,
          idNegocio: idNegocio,
          idUsuario: String(usuario.idUsuario || "").trim(),
          nombreArchivo: nombreArchivo,
          revisionDatos: obtenerRevisionDatosMotor_(),
          creadoEn: new Date().toISOString()
        }),
        MP_CARGA_MATERIALES_XLSX.TTL_PREVIEW_SEGUNDOS
      );
    } else {
      // Una prevalidación con errores no puede confirmarse; el temporal ya no es útil.
      try {
        DriveApp.getFileById(archivoTemporal.id).setTrashed(true);
      } catch (errorLimpieza) {
        console.warn(
          "No se pudo eliminar el temporal observado: %s",
          errorLimpieza.message
        );
      }
    }

    return {
      correcto: analisis.errores === 0,
      soloValidacion: true,
      tokenPreview: tokenPreview,
      totalFilas: analisis.totalFilas,
      creados: analisis.creados,
      actualizados: analisis.actualizados,
      errores: analisis.errores,
      advertencias: analisis.advertencias,
      observaciones: analisis.observaciones.slice(0, 150),
      puedeConfirmar: analisis.errores === 0 && analisis.totalFilas > 0,
      version: "28D",
      mensaje: analisis.errores ?
        "La prevalidación encontró errores. Corrige el archivo y vuelve a cargarlo." :
        "Prevalidación correcta. Revisa el resumen y confirma para grabar."
    };
  } catch (error) {
    try {
      DriveApp.getFileById(archivoTemporal.id).setTrashed(true);
    } catch (errorLimpieza) {
      console.warn(errorLimpieza.message);
    }
    throw error;
  }
}

function confirmarCargaMaterialesMasivoModulo(datos) {
  const usuario = obtenerUsuarioActual();
  exigirPermisoMaterialesPrecios_("CREAR_MATERIAL", usuario);
  datos = datos || {};

  validarAutorizacionCargaMaterialesPaso28B_();

  const tokenPreview = String(datos.tokenPreview || "").trim();
  if (!tokenPreview) {
    throw new Error("La prevalidación ya no está disponible. Vuelve a seleccionar el archivo.");
  }

  const claveCache = obtenerClavePreviewMateriales_(tokenPreview);
  const cache = CacheService.getScriptCache();
  const texto = cache.get(claveCache);

  if (!texto) {
    throw new Error("La prevalidación venció. Vuelve a cargar el archivo antes de confirmar.");
  }

  let contexto;
  try {
    contexto = JSON.parse(texto);
  } catch (error) {
    contexto = null;
  }

  if (!contexto || !contexto.idArchivoTemporal) {
    throw new Error("El contexto de prevalidación no es válido.");
  }

  if (
    String(contexto.idUsuario || "").trim() !==
    String(usuario.idUsuario || "").trim()
  ) {
    throw new Error("La prevalidación pertenece a otro usuario.");
  }

  if (
    String(contexto.revisionDatos || "") !==
    String(obtenerRevisionDatosMotor_() || "")
  ) {
    throw new Error(
      "Los datos maestros cambiaron después de la prevalidación. " +
      "Vuelve a validar el archivo antes de confirmar."
    );
  }

  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const libro = abrirSpreadsheetConReintento_(contexto.idArchivoTemporal);
    const registros = leerPreviewTecnicoMateriales_(libro);

    if (!registros.length) {
      throw new Error(
        "No se encontró la prevalidación técnica. Vuelve a cargar el archivo."
      );
    }

    const resultado = guardarCargaMaterialesValidada_(registros, {
      idNegocio: contexto.idNegocio,
      usuario: usuario,
      nombreArchivo: contexto.nombreArchivo
    });

    cache.remove(claveCache);

    try {
      DriveApp.getFileById(contexto.idArchivoTemporal).setTrashed(true);
    } catch (errorLimpieza) {
      console.warn(
        "No se pudo eliminar el XLSX temporal: %s",
        errorLimpieza.message
      );
    }

    return resultado;
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Resuelve una ruta completa de tipificación contra los catálogos vigentes.
 * RUTA_TIPIFICACION es la fuente de verdad de la plantilla v5.
 *
 * Formato esperado:
 * PRODUCTO > COCINA > ENCIMERA
 *
 * @private
 */
function resolverRutaTipificacionCargaMaterial_(valorRuta, catalogos) {
  const rutaOriginal = limpiarTextoMotor_(valorRuta || "", 500);

  if (!rutaOriginal) {
    return {
      producto: null,
      tipo: null,
      subtipo: null,
      error: "La RUTA_TIPIFICACION es obligatoria."
    };
  }

  const partes = rutaOriginal
    .split(">")
    .map(function(parte) {
      return normalizarTexto(parte);
    })
    .filter(Boolean);

  if (partes.length !== 3) {
    return {
      producto: null,
      tipo: null,
      subtipo: null,
      error:
        "La RUTA_TIPIFICACION '" + rutaOriginal +
        "' no tiene el formato Producto principal > Tipo > Subtipo."
    };
  }

  const producto = catalogos.productos.porCodigo[partes[0]] || null;
  const tipo = catalogos.tipos.porCodigo[partes[1]] || null;
  const subtipo = catalogos.subtipos.porCodigo[partes[2]] || null;

  if (!producto) {
    return {
      producto: null,
      tipo: null,
      subtipo: null,
      error:
        "El Producto principal '" + partes[0] +
        "' de la RUTA_TIPIFICACION no existe o está inactivo."
    };
  }

  if (!tipo) {
    return {
      producto: producto,
      tipo: null,
      subtipo: null,
      error:
        "El Tipo '" + partes[1] +
        "' de la RUTA_TIPIFICACION no existe o está inactivo."
    };
  }

  if (!subtipo) {
    return {
      producto: producto,
      tipo: tipo,
      subtipo: null,
      error:
        "El Subtipo '" + partes[2] +
        "' de la RUTA_TIPIFICACION no existe o está inactivo."
    };
  }

  try {
    validarRelacionArbolOpcionesMaterialPrecio_(
      producto,
      tipo,
      subtipo
    );
  } catch (errorRelacion) {
    return {
      producto: producto,
      tipo: tipo,
      subtipo: subtipo,
      error:
        "La RUTA_TIPIFICACION '" + rutaOriginal +
        "' ya no pertenece al árbol vigente. " + errorRelacion.message
    };
  }

  return {
    producto: producto,
    tipo: tipo,
    subtipo: subtipo,
    error: "",
    rutaCanonica: [
      normalizarTexto(producto.id || producto.codigo || ""),
      normalizarTexto(tipo.id || tipo.codigo || ""),
      normalizarTexto(subtipo.id || subtipo.codigo || "")
    ].join(" > ")
  };
}

function analizarCargaMaterialesXlsx_(libro, contexto) {
  contexto = contexto || {};
  const hoja = libro.getSheetByName(MP_CARGA_MATERIALES_XLSX.HOJA_CARGA);

  if (!hoja) {
    throw new Error(
      "El archivo no contiene la hoja " + MP_CARGA_MATERIALES_XLSX.HOJA_CARGA + ". " +
      "Descarga nuevamente la plantilla oficial."
    );
  }

  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaColumna < 1) {
    throw new Error("La hoja de carga no contiene cabeceras.");
  }

  const cabeceras = hoja.getRange(1, 1, 1, ultimaColumna).getDisplayValues()[0];
  const mapa = crearMapaCabeceras(cabeceras);
  validarCabeceras(
    mapa,
    MP_CARGA_MATERIALES_XLSX.REQUERIDAS,
    MP_CARGA_MATERIALES_XLSX.HOJA_CARGA
  );

  const totalDatos = Math.max(0, ultimaFila - 1);
  if (totalDatos > MP_MODULO_SGT360.MAX_FILAS_IMPORTACION) {
    throw new Error(
      "La plantilla supera el máximo de " +
      MP_MODULO_SGT360.MAX_FILAS_IMPORTACION + " filas."
    );
  }

  if (!totalDatos) {
    return {
      totalFilas: 0,
      creados: 0,
      actualizados: 0,
      errores: 0,
      advertencias: 0,
      observaciones: [],
      registros: []
    };
  }

  const filas = hoja.getRange(2, 1, totalDatos, ultimaColumna).getDisplayValues();
  const idNegocio = normalizarTexto(contexto.idNegocio || "");
  const catalogos = construirCatalogosCargaMateriales_(idNegocio);
  const indiceMateriales = leerIndiceMaterialesCargaRapido_();

  const porCodigo = indiceMateriales.porCodigo;
  const porSap = indiceMateriales.porSap;
  const codigosUsados = indiceMateriales.codigosUsados;

  const codigosArchivo = {};
  const sapArchivo = {};
  const registros = [];
  const observaciones = [];
  let creados = 0;
  let actualizados = 0;
  let errores = 0;
  let advertencias = 0;
  let huboCodigosGenerados = false;

  filas.forEach(function(fila, indice) {
    if (esFilaVaciaMotor_(fila)) return;

    const numeroFila = indice + 2;
    const objeto = filaAObjetoDesdeMapaPrecio_(cabeceras, fila);
    const erroresFila = [];
    const advertenciasFila = [];

    const rutaTipificacion = resolverRutaTipificacionCargaMaterial_(
      objeto.RUTA_TIPIFICACION,
      catalogos
    );

    if (rutaTipificacion.error) {
      erroresFila.push(rutaTipificacion.error);
    }

    const producto = {
      opcion: rutaTipificacion.producto,
      error: ""
    };
    const tipo = {
      opcion: rutaTipificacion.tipo,
      error: ""
    };
    const subtipo = {
      opcion: rutaTipificacion.subtipo,
      error: ""
    };
    const marca = resolverOpcionCatalogoCargaMaterial_(
      catalogos.marcas,
      objeto.COD_MARCA || "SIN_MARCA",
      "marca",
      false,
      advertenciasFila
    );
    const unidad = resolverOpcionCatalogoCargaMaterial_(
      catalogos.unidades,
      objeto.UNIDAD_MEDIDA || "UN",
      "unidad de medida",
      true,
      advertenciasFila
    );
    const estado = resolverOpcionCatalogoCargaMaterial_(
      catalogos.estados,
      objeto.ESTADO || CONFIG.ESTADOS.ACTIVO,
      "estado",
      true,
      advertenciasFila
    );

    [producto, tipo, subtipo, marca, unidad, estado].forEach(function(item) {
      if (item && item.error) erroresFila.push(item.error);
    });

    if (
      producto && producto.opcion &&
      tipo && tipo.opcion &&
      subtipo && subtipo.opcion
    ) {
      try {
        validarRelacionArbolOpcionesMaterialPrecio_(
          producto.opcion,
          tipo.opcion,
          subtipo.opcion
        );
      } catch (errorArbol) {
        erroresFila.push(errorArbol.message);
      }
    }

    if (producto && producto.opcion) {
      const padre = normalizarTexto(producto.opcion.valorPadre || "");
      const negocioMetadata = normalizarTexto(
        producto.opcion.metadata && producto.opcion.metadata.negocio || ""
      );
      if (
        (padre && padre !== idNegocio) ||
        (negocioMetadata && negocioMetadata !== idNegocio)
      ) {
        erroresFila.push(
          "El producto " + producto.opcion.id +
          " no pertenece al negocio " + idNegocio + "."
        );
      }
    }

    const descripcion = limpiarTextoMotor_(
      objeto.DESCRIPCION_MATERIAL || objeto.NOMBRE_MATERIAL || "",
      500
    );
    if (!descripcion) {
      erroresFila.push("La descripción del material es obligatoria.");
    }

    let codigoMaterial = limpiarTextoMotor_(objeto.CODIGO_MATERIAL || "", 80);
    if (!codigoMaterial) {
      codigoMaterial = generarCodigoVisibleUnicoPrecio_("M", codigosUsados, 7);
      codigosUsados[normalizarTexto(codigoMaterial)] = true;
      fila[mapa.CODIGO_MATERIAL] = codigoMaterial;
      huboCodigosGenerados = true;
    }

    const codigoNormalizado = normalizarTexto(codigoMaterial);
    if (codigosArchivo[codigoNormalizado]) {
      erroresFila.push(
        "El código de material está repetido dentro del archivo (también aparece en la fila " +
        codigosArchivo[codigoNormalizado] + ")."
      );
    } else {
      codigosArchivo[codigoNormalizado] = numeroFila;
    }

    let codigoSap = limpiarTextoMotor_(objeto.CODIGO_SAP || "", 80);
    if (normalizarTexto(codigoSap) === "EN CREACION") {
      codigoSap = "";
      advertenciasFila.push("CODIGO_SAP se registrará vacío porque está EN CREACION.");
    }
    if (!codigoSap) {
      advertenciasFila.push("Material sin código SAP.");
    }

    const sapNormalizado = normalizarTexto(codigoSap);
    if (sapNormalizado) {
      if (sapArchivo[sapNormalizado]) {
        erroresFila.push(
          "El código SAP está repetido dentro del archivo (también aparece en la fila " +
          sapArchivo[sapNormalizado] + ")."
        );
      } else {
        sapArchivo[sapNormalizado] = numeroFila;
      }
    }

    const porCodigoExistente = porCodigo[codigoNormalizado] || null;
    const porSapExistente = sapNormalizado ? porSap[sapNormalizado] || null : null;

    if (
      porCodigoExistente &&
      porSapExistente &&
      String(porCodigoExistente.ID_MATERIAL || "") !==
      String(porSapExistente.ID_MATERIAL || "")
    ) {
      erroresFila.push(
        "CODIGO_MATERIAL y CODIGO_SAP corresponden a materiales distintos."
      );
    }

    const existente = porCodigoExistente || porSapExistente || null;
    const accion = existente ? "ACTUALIZAR" : "CREAR";

    if (erroresFila.length) {
      errores++;
    } else if (existente) {
      actualizados++;
    } else {
      creados++;
    }

    advertencias += advertenciasFila.length;

    const registro = {
      numeroFila: numeroFila,
      accion: accion,
      rutaTipificacion: rutaTipificacion.rutaCanonica || limpiarTextoMotor_(
        objeto.RUTA_TIPIFICACION || "",
        500
      ),
      idMaterialExistente: existente ? String(existente.ID_MATERIAL || "").trim() : "",
      codigoMaterial: codigoMaterial,
      codigoSap: codigoSap,
      idProducto: producto && producto.opcion ? producto.opcion.id : "",
      idTipoMaterial: tipo && tipo.opcion ? tipo.opcion.id : "",
      idSubtipoMaterial: subtipo && subtipo.opcion ? subtipo.opcion.id : "",
      idMarca: marca && marca.opcion ? marca.opcion.id : "SIN_MARCA",
      nombreMaterial: limpiarTextoMotor_(objeto.NOMBRE_MATERIAL || descripcion, 240),
      descripcionMaterial: descripcion,
      unidadMedida: unidad && unidad.opcion ? unidad.opcion.id : "UN",
      estado: estado && estado.opcion ? estado.opcion.id : CONFIG.ESTADOS.ACTIVO,
      errores: erroresFila,
      advertencias: advertenciasFila
    };

    registros.push(registro);
    observaciones.push({
      fila: numeroFila,
      codigoMaterial: codigoMaterial,
      codigoSap: codigoSap,
      rutaTipificacion: rutaTipificacion.rutaCanonica || limpiarTextoMotor_(
        objeto.RUTA_TIPIFICACION || "",
        500
      ),
      accion: accion,
      estado: erroresFila.length ? "ERROR" :
        (advertenciasFila.length ? "ADVERTENCIA" : "OK"),
      errores: erroresFila.join(" | "),
      advertencias: advertenciasFila.join(" | ")
    });
  });

  if (contexto.persistirCodigosGenerados && huboCodigosGenerados) {
    hoja.getRange(2, 1, filas.length, ultimaColumna).setValues(filas);
    SpreadsheetApp.flush();
  }

  return {
    totalFilas: registros.length,
    creados: creados,
    actualizados: actualizados,
    errores: errores,
    advertencias: advertencias,
    observaciones: observaciones,
    registros: registros
  };
}

function crearIndiceCatalogoCargaMaterial_(opciones) {
  const lista = Array.isArray(opciones) ? opciones : [];
  const porCodigo = {};
  const porNombre = {};

  lista.forEach(function(item) {
    const codigo = normalizarTexto(item.id || item.codigo || "");
    const nombre = normalizarTexto(item.nombre || "");

    if (codigo) porCodigo[codigo] = item;
    if (nombre && !porNombre[nombre]) porNombre[nombre] = item;
  });

  return {
    lista: lista,
    porCodigo: porCodigo,
    porNombre: porNombre
  };
}

function construirCatalogosCargaMateriales_(idNegocio) {
  const negocio = normalizarTexto(idNegocio || "");
  const catalogos = listarValoresCatalogosAppPrecioEnBloque_([
    "MP_PRODUCTOS_PRINCIPALES",
    "MP_TIPOS_MATERIAL",
    "MP_SUBTIPOS_MATERIAL",
    "MP_MARCAS",
    "MP_UNIDADES_MEDIDA",
    "MP_ESTADOS_MATERIAL"
  ]);

  const productos = (catalogos.MP_PRODUCTOS_PRINCIPALES || []).filter(function(item) {
    const padre = normalizarTexto(item.valorPadre || "");
    const negocioMetadata = normalizarTexto(
      item.metadata && item.metadata.negocio || ""
    );

    return (
      !negocio ||
      (!padre && !negocioMetadata) ||
      padre === negocio ||
      negocioMetadata === negocio
    );
  });

  return {
    productos: crearIndiceCatalogoCargaMaterial_(productos),
    tipos: crearIndiceCatalogoCargaMaterial_(catalogos.MP_TIPOS_MATERIAL || []),
    subtipos: crearIndiceCatalogoCargaMaterial_(catalogos.MP_SUBTIPOS_MATERIAL || []),
    marcas: crearIndiceCatalogoCargaMaterial_(catalogos.MP_MARCAS || []),
    unidades: crearIndiceCatalogoCargaMaterial_(catalogos.MP_UNIDADES_MEDIDA || []),
    estados: crearIndiceCatalogoCargaMaterial_(catalogos.MP_ESTADOS_MATERIAL || [])
  };
}

/**
 * Lee únicamente las tres columnas necesarias para detectar duplicados durante
 * la prevalidación. Evita cargar las 15 columnas completas de MAE_MATERIALES.
 * @private
 */
function leerIndiceMaterialesCargaRapido_() {
  const hoja = obtenerHojaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    MP_MODULO_SGT360.HOJAS.MATERIALES,
    true
  );

  const ultimaFila = hoja.getLastRow();
  const porCodigo = {};
  const porSap = {};
  const codigosUsados = {};

  if (ultimaFila < 2) {
    return {
      porCodigo: porCodigo,
      porSap: porSap,
      codigosUsados: codigosUsados
    };
  }

  // La estructura del maestro define ID_MATERIAL, CODIGO_MATERIAL y CODIGO_SAP
  // como sus tres primeras columnas. Solo esas columnas son necesarias aquí.
  const filas = hoja.getRange(2, 1, ultimaFila - 1, 3).getDisplayValues();

  filas.forEach(function(fila) {
    const item = {
      ID_MATERIAL: String(fila[0] || "").trim(),
      CODIGO_MATERIAL: String(fila[1] || "").trim(),
      CODIGO_SAP: String(fila[2] || "").trim()
    };

    const codigo = normalizarTexto(item.CODIGO_MATERIAL);
    const sap = normalizarTexto(item.CODIGO_SAP);

    if (codigo) {
      porCodigo[codigo] = item;
      codigosUsados[codigo] = true;
    }

    if (sap && sap !== "EN CREACION") {
      porSap[sap] = item;
    }
  });

  return {
    porCodigo: porCodigo,
    porSap: porSap,
    codigosUsados: codigosUsados
  };
}

function escribirPreviewTecnicoMateriales_(libro, registros) {
  const nombreHoja = MP_CARGA_MATERIALES_XLSX.HOJA_PREVIEW_TECNICA;
  const existente = libro.getSheetByName(nombreHoja);

  if (existente) {
    libro.deleteSheet(existente);
  }

  const hoja = libro.insertSheet(nombreHoja);
  const cabeceras = [
    "NUMERO_FILA",
    "ACCION",
    "ID_MATERIAL_EXISTENTE",
    "CODIGO_MATERIAL",
    "CODIGO_SAP",
    "ID_PRODUCTO",
    "ID_TIPO_MATERIAL",
    "ID_SUBTIPO_MATERIAL",
    "ID_MARCA",
    "NOMBRE_MATERIAL",
    "DESCRIPCION_MATERIAL",
    "UNIDAD_MEDIDA",
    "ESTADO"
  ];

  const filas = (Array.isArray(registros) ? registros : []).map(function(registro) {
    return [
      registro.numeroFila || "",
      registro.accion || "",
      registro.idMaterialExistente || "",
      registro.codigoMaterial || "",
      registro.codigoSap || "",
      registro.idProducto || "",
      registro.idTipoMaterial || "",
      registro.idSubtipoMaterial || "",
      registro.idMarca || "SIN_MARCA",
      registro.nombreMaterial || "",
      registro.descripcionMaterial || "",
      registro.unidadMedida || "UN",
      registro.estado || CONFIG.ESTADOS.ACTIVO
    ];
  });

  hoja.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]);

  if (filas.length) {
    hoja.getRange(2, 1, filas.length, cabeceras.length).setValues(filas);
  }

  hoja.hideSheet();
  SpreadsheetApp.flush();
  return filas.length;
}

function leerPreviewTecnicoMateriales_(libro) {
  const hoja = libro.getSheetByName(
    MP_CARGA_MATERIALES_XLSX.HOJA_PREVIEW_TECNICA
  );

  if (!hoja || hoja.getLastRow() < 2) return [];

  const datos = hoja
    .getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn())
    .getDisplayValues();

  const cabeceras = datos[0];
  const mapa = crearMapaCabeceras(cabeceras);

  validarCabeceras(
    mapa,
    [
      "NUMERO_FILA",
      "ACCION",
      "ID_MATERIAL_EXISTENTE",
      "CODIGO_MATERIAL",
      "CODIGO_SAP",
      "ID_PRODUCTO",
      "ID_TIPO_MATERIAL",
      "ID_SUBTIPO_MATERIAL",
      "ID_MARCA",
      "NOMBRE_MATERIAL",
      "DESCRIPCION_MATERIAL",
      "UNIDAD_MEDIDA",
      "ESTADO"
    ],
    MP_CARGA_MATERIALES_XLSX.HOJA_PREVIEW_TECNICA
  );

  return datos.slice(1).filter(function(fila) {
    return !esFilaVaciaMotor_(fila);
  }).map(function(fila) {
    return {
      numeroFila: Number(fila[mapa.NUMERO_FILA]) || 0,
      accion: String(fila[mapa.ACCION] || "").trim(),
      idMaterialExistente: String(fila[mapa.ID_MATERIAL_EXISTENTE] || "").trim(),
      codigoMaterial: String(fila[mapa.CODIGO_MATERIAL] || "").trim(),
      codigoSap: String(fila[mapa.CODIGO_SAP] || "").trim(),
      idProducto: String(fila[mapa.ID_PRODUCTO] || "").trim(),
      idTipoMaterial: String(fila[mapa.ID_TIPO_MATERIAL] || "").trim(),
      idSubtipoMaterial: String(fila[mapa.ID_SUBTIPO_MATERIAL] || "").trim(),
      idMarca: String(fila[mapa.ID_MARCA] || "SIN_MARCA").trim(),
      nombreMaterial: String(fila[mapa.NOMBRE_MATERIAL] || "").trim(),
      descripcionMaterial: String(fila[mapa.DESCRIPCION_MATERIAL] || "").trim(),
      unidadMedida: String(fila[mapa.UNIDAD_MEDIDA] || "UN").trim(),
      estado: String(fila[mapa.ESTADO] || CONFIG.ESTADOS.ACTIVO).trim(),
      errores: [],
      advertencias: []
    };
  });
}

function resolverOpcionCatalogoCargaMaterial_(opciones, valor, etiqueta, obligatorio, advertencias) {
  advertencias = Array.isArray(advertencias) ? advertencias : [];

  const indice = opciones && opciones.porCodigo ?
    opciones :
    crearIndiceCatalogoCargaMaterial_(opciones);

  const buscado = normalizarTexto(valor || "");

  if (!buscado) {
    return obligatorio ?
      { opcion: null, error: "El " + etiqueta + " es obligatorio." } :
      { opcion: null, error: "" };
  }

  let opcion = indice.porCodigo[buscado] || null;

  if (!opcion) {
    opcion = indice.porNombre[buscado] || null;

    if (opcion) {
      advertencias.push(
        "Se homologó " + etiqueta + " '" + valor +
        "' al código " + opcion.id + "."
      );
    }
  }

  if (!opcion) {
    return {
      opcion: null,
      error: "El " + etiqueta + " '" + valor +
        "' no existe o está inactivo en el diccionario."
    };
  }

  return { opcion: opcion, error: "" };
}

function guardarCargaMaterialesValidada_(registros, contexto) {
  contexto = contexto || {};
  const usuario = contexto.usuario || {};
  const ahora = new Date();

  const materialesGuardados = (Array.isArray(registros) ? registros : []).map(function(registro) {
    const idMaterial = registro.idMaterialExistente || generarIdMotor_("MAT");

    const material = {
      ID_MATERIAL: idMaterial,
      CODIGO_MATERIAL: registro.codigoMaterial,
      CODIGO_SAP: registro.codigoSap,
      ID_PRODUCTO: registro.idProducto,
      ID_TIPO_MATERIAL: registro.idTipoMaterial,
      ID_SUBTIPO_MATERIAL: registro.idSubtipoMaterial,
      ID_MARCA: registro.idMarca || "SIN_MARCA",
      NOMBRE_MATERIAL: registro.nombreMaterial,
      DESCRIPCION_MATERIAL: registro.descripcionMaterial,
      UNIDAD_MEDIDA: registro.unidadMedida || "UN",
      ES_COMBO: "NO",
      ESTADO: registro.estado || CONFIG.ESTADOS.ACTIVO,
      FECHA_ACTUALIZACION: ahora,
      ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
    };

    if (!registro.idMaterialExistente) {
      material.FECHA_CREACION = ahora;
    }

    return material;
  });

  // Un único upsert masivo reemplaza la búsqueda/actualización fila por fila.
  const resultadoMateriales = guardarObjetosMotorMasivoPrecio_(
    MP_MODULO_SGT360.HOJAS.MATERIALES,
    "ID_MATERIAL",
    materialesGuardados
  );

  sincronizarRelacionesCargaMateriales_(
    materialesGuardados,
    contexto.idNegocio,
    usuario,
    ahora
  );

  registrarCambioMotor_(
    MP_MODULO_SGT360.CODIGO,
    "CARGA_MASIVA_MATERIALES_XLSX",
    "MATERIAL",
    "",
    {
      archivo: limpiarTextoMotor_(contexto.nombreArchivo || "", 200),
      idNegocio: contexto.idNegocio,
      creados: resultadoMateriales.creados,
      actualizados: resultadoMateriales.actualizados,
      versionCarga: MP_CARGA_MATERIALES_XLSX.VERSION
    }
  );

  invalidarCacheOpcionesMaterialesPrecios_();
  invalidarCacheMotor_("CONFIG");
  marcarVersionCacheMaterialesPrecios_();
  marcarVersionCachePreciosMateriales_();
  SpreadsheetApp.flush();

  return {
    correcto: true,
    totalFilas: materialesGuardados.length,
    creados: resultadoMateriales.creados,
    actualizados: resultadoMateriales.actualizados,
    errores: 0,
    advertencias: 0,
    version: "28B",
    mensaje: "Carga confirmada. Los materiales y sus relaciones fueron grabados correctamente."
  };
}

function anexarObjetosMasivoPrecio_(nombreHoja, objetos) {
  objetos = Array.isArray(objetos) ? objetos : [];
  if (!objetos.length) return 0;

  const contexto = obtenerContextoTablaMotor_(
    MOTOR_SGT360.BASES.OPERATION,
    nombreHoja,
    []
  );

  const filas = objetos.map(function(objeto) {
    return objetoAFilaMotor_(contexto.cabeceras, objeto);
  });

  const filaInicio = contexto.hoja.getLastRow() + 1;
  contexto.hoja.getRange(
    filaInicio,
    1,
    filas.length,
    contexto.numeroColumnas
  ).setValues(filas);

  marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja);
  return filas.length;
}

function sincronizarRelacionesCargaMateriales_(materiales, idNegocio, usuario, ahora) {
  const relacionesNegocio = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL);
  const mapaNegocio = {};
  relacionesNegocio.forEach(function(item) {
    mapaNegocio[String(item.ID_NEGOCIO || "").trim() + "|" + String(item.ID_MATERIAL || "").trim()] = item;
  });

  const nuevasNegocio = [];
  const actualizarNegocio = [];
  (materiales || []).forEach(function(material) {
    const clave = String(idNegocio || "").trim() + "|" + String(material.ID_MATERIAL || "").trim();
    const existente = mapaNegocio[clave];
    if (!existente) {
      nuevasNegocio.push({
        ID_RELACION: generarIdMotor_("RNM"),
        ID_NEGOCIO: idNegocio,
        ID_MATERIAL: material.ID_MATERIAL,
        ESTADO: CONFIG.ESTADOS.ACTIVO,
        FECHA_CREACION: ahora,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
      });
    } else if (normalizarTexto(existente.ESTADO) !== CONFIG.ESTADOS.ACTIVO) {
      actualizarNegocio.push({
        ID_RELACION: existente.ID_RELACION,
        ESTADO: CONFIG.ESTADOS.ACTIVO,
        FECHA_ACTUALIZACION: ahora,
        ID_USUARIO_ACTUALIZACION: usuario.idUsuario || ""
      });
    }
  });

  anexarObjetosMasivoPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL, nuevasNegocio);
  if (actualizarNegocio.length) {
    guardarObjetosMotorMasivoPrecio_(MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL, "ID_RELACION", actualizarNegocio);
  }
}

function importarXlsxComoSpreadsheetTemporal_(bytes, nombreArchivo) {
  const nombreSeguro =
    MP_CARGA_MATERIALES_XLSX.PREFIJO_TEMPORAL +
    new Date().getTime() + "_" +
    limpiarTextoMotor_(nombreArchivo || "Carga.xlsx", 100);

  const blob = Utilities.newBlob(
    bytes,
    MP_CARGA_MATERIALES_XLSX.MIME_XLSX,
    nombreSeguro
  );

  let errorServicioAvanzado = null;

  // Primera opción: Drive avanzado convierte el XLSX a Google Sheets en una sola llamada.
  if (
    typeof Drive !== "undefined" &&
    Drive.Files &&
    typeof Drive.Files.create === "function"
  ) {
    try {
      const archivo = Drive.Files.create(
        {
          name: nombreSeguro,
          mimeType: MP_CARGA_MATERIALES_XLSX.MIME_GOOGLE_SHEETS
        },
        blob,
        {
          fields: "id,name,mimeType"
        }
      );

      if (archivo && archivo.id) {
        return archivo;
      }
    } catch (error) {
      errorServicioAvanzado = error;
      console.warn(
        "Drive.Files.create no pudo convertir el XLSX; se usará REST: %s",
        error.message
      );
    }
  }

  // Respaldo por REST para instalaciones donde el servicio avanzado no responda.
  const boundary = "SGT360_" + Utilities.getUuid().replace(/-/g, "");
  const metadata = {
    name: nombreSeguro,
    mimeType: MP_CARGA_MATERIALES_XLSX.MIME_GOOGLE_SHEETS
  };

  const inicio = Utilities.newBlob(
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) + "\r\n" +
    "--" + boundary + "\r\n" +
    "Content-Type: " + MP_CARGA_MATERIALES_XLSX.MIME_XLSX + "\r\n\r\n"
  ).getBytes();

  const fin = Utilities.newBlob(
    "\r\n--" + boundary + "--"
  ).getBytes();

  const payload = inicio.concat(bytes).concat(fin);

  const respuesta = UrlFetchApp.fetch(
    "https://www.googleapis.com/upload/drive/v3/files" +
      "?uploadType=multipart&fields=id,name,mimeType",
    {
      method: "post",
      contentType: "multipart/related; boundary=" + boundary,
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      },
      payload: payload,
      muteHttpExceptions: true
    }
  );

  const codigo = respuesta.getResponseCode();
  let datos = {};

  try {
    datos = JSON.parse(respuesta.getContentText() || "{}");
  } catch (error) {
    datos = {};
  }

  if (codigo < 200 || codigo >= 300 || !datos.id) {
    const detalleDrive = errorServicioAvanzado ?
      " Servicio avanzado: " +
      limpiarTextoMotor_(errorServicioAvanzado.message, 300) + "." :
      "";

    throw new Error(
      "No se pudo convertir el XLSX para validarlo. HTTP " +
      codigo + ": " +
      limpiarTextoMotor_(respuesta.getContentText(), 700) +
      detalleDrive
    );
  }

  return datos;
}

function abrirSpreadsheetConReintento_(idArchivo) {
  let ultimoError = null;

  for (let intento = 0; intento < 4; intento++) {
    try {
      return SpreadsheetApp.openById(idArchivo);
    } catch (error) {
      ultimoError = error;
      Utilities.sleep(300 * (intento + 1));
    }
  }

  throw ultimoError || new Error("No se pudo abrir el archivo convertido.");
}

function generarTokenPreviewMateriales_() {
  return Utilities.getUuid().replace(/-/g, "").toUpperCase();
}

function obtenerClavePreviewMateriales_(token) {
  const hash = sha256HexOAuthPaso13C_(String(token || ""));
  return MP_CARGA_MATERIALES_XLSX.PREFIJO_CACHE + hash.slice(0, 48);
}

function limpiarTemporalesCargaMateriales_() {
  const limite = Date.now() - (24 * 60 * 60 * 1000);
  let archivos;

  try {
    archivos = DriveApp.searchFiles(
      'title contains "' +
      MP_CARGA_MATERIALES_XLSX.PREFIJO_TEMPORAL +
      '" and trashed = false'
    );
  } catch (error) {
    console.warn("No se pudieron buscar temporales XLSX: %s", error.message);
    return;
  }

  while (archivos.hasNext()) {
    const archivo = archivos.next();

    try {
      if (archivo.getDateCreated().getTime() < limite) {
        archivo.setTrashed(true);
      }
    } catch (errorArchivo) {
      console.warn(
        "No se pudo limpiar temporal %s: %s",
        archivo.getId(),
        errorArchivo.message
      );
    }
  }
}

/**
 * Evita ejecutar DriveApp.searchFiles() en cada prevalidación.
 * Como máximo hace la limpieza una vez cada 12 horas por proyecto.
 * @private
 */
function limpiarTemporalesCargaMaterialesSiCorresponde_() {
  const propiedad = "SGT360_MP_XLSX_LAST_CLEANUP";
  const propiedades = PropertiesService.getScriptProperties();
  const ultima = Number(propiedades.getProperty(propiedad) || 0);
  const ahora = Date.now();
  const intervalo = 12 * 60 * 60 * 1000;

  if (ultima && ahora - ultima < intervalo) {
    return false;
  }

  // Se marca antes de buscar para que dos ejecuciones concurrentes no repitan
  // el escaneo completo de Drive.
  propiedades.setProperty(propiedad, String(ahora));

  try {
    limpiarTemporalesCargaMateriales_();
    return true;
  } catch (error) {
    console.warn("Limpieza diferida de temporales: %s", error.message);
    return false;
  }
}


/**
 * PASO 28E — DEPURACIÓN Y REINICIO LIMPIO DEL ÁRBOL DE TIPIFICACIÓN.
 *
 * Ejecutar manualmente UNA SOLA VEZ durante la etapa inicial.
 *
 * Reglas:
 * - MP_PRODUCTOS_PRINCIPALES queda únicamente con PRODUCTO, SERVICIO y TRABAJO.
 * - Si alguno de esos tres registros ya existe, conserva su ID_VALOR original.
 * - Cualquier otro producto principal antiguo se elimina físicamente de APP_CATALOGO_VALORES.
 * - MP_TIPOS_MATERIAL se elimina por completo y se reconstruye desde el árbol canónico.
 * - MP_SUBTIPOS_MATERIAL se elimina por completo y se reconstruye desde el árbol canónico.
 * - No queda ninguna fila INACTIVO de estos tres catálogos.
 * - No se conserva histórico dentro de APP_CATALOGO_VALORES para estos tres catálogos.
 * - Por seguridad, si existen materiales cargados se detiene para no dejar referencias huérfanas.
 */
function reiniciarArbolTipificacionPaso28E() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarColumnasCatalogosAppPaso25B_();

    const hojaMateriales = obtenerHojaMotor_(
      MOTOR_SGT360.BASES.OPERATION,
      MP_MODULO_SGT360.HOJAS.MATERIALES,
      false
    );

    if (hojaMateriales && hojaMateriales.getLastRow() > 1) {
      throw new Error(
        "Existen materiales cargados. La depuración del árbol se detuvo para evitar " +
        "referencias huérfanas. El árbol inicial debe depurarse antes de volver a cargar materiales."
      );
    }

    const hoja = obtenerHojaMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.CATALOGO_VALORES,
      true
    );

    const ultimaFila = hoja.getLastRow();
    const ultimaColumna = hoja.getLastColumn();
    const datos = ultimaFila > 0
      ? hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues()
      : [];

    if (!datos.length) {
      throw new Error("APP_CATALOGO_VALORES no contiene cabeceras.");
    }

    const cabeceras = datos[0];
    const mapa = crearMapaCabeceras(cabeceras);

    validarCabeceras(
      mapa,
      [
        "ID_VALOR",
        "CATALOGO",
        "CODIGO",
        "NOMBRE",
        "ORDEN",
        "ESTADO",
        "CLAVE_PADRE",
        "VALOR_PADRE",
        "METADATA_JSON",
        "FECHA_CREACION",
        "FECHA_ACTUALIZACION"
      ],
      CONFIG.HOJAS.CATALOGO_VALORES
    );

    const catalogosObjetivo = {
      MP_PRODUCTOS_PRINCIPALES: true,
      MP_TIPOS_MATERIAL: true,
      MP_SUBTIPOS_MATERIAL: true
    };

    const productosCanonicos = {};
    MP_ARBOL_TIPIFICACION_PASO_28D.PRODUCTOS.forEach(function(item, index) {
      productosCanonicos[normalizarTexto(item.codigo)] = {
        codigo: normalizarTexto(item.codigo),
        nombre: item.nombre,
        orden: (index + 1) * 10
      };
    });

    // Conserva únicamente una fila existente por producto canónico.
    // Prioridad: registro ACTIVO; si no existe, la primera fila encontrada.
    const productoExistentePorCodigo = {};

    datos.slice(1).forEach(function(fila) {
      const catalogo = normalizarTexto(fila[mapa.CATALOGO] || "");
      if (catalogo !== "MP_PRODUCTOS_PRINCIPALES") return;

      const codigo = normalizarTexto(fila[mapa.CODIGO] || "");
      if (!productosCanonicos[codigo]) return;

      const estado = normalizarTexto(fila[mapa.ESTADO] || "");
      const actual = productoExistentePorCodigo[codigo];

      if (
        !actual ||
        (
          estado === CONFIG.ESTADOS.ACTIVO &&
          normalizarTexto(actual[mapa.ESTADO] || "") !== CONFIG.ESTADOS.ACTIVO
        )
      ) {
        productoExistentePorCodigo[codigo] = fila.slice();
      }
    });

    const ahora = new Date();
    const filasResultado = [];

    // Conserva todos los demás catálogos sin alterarlos.
    datos.slice(1).forEach(function(fila) {
      const catalogo = normalizarTexto(fila[mapa.CATALOGO] || "");
      if (!catalogosObjetivo[catalogo]) {
        filasResultado.push(fila.slice());
      }
    });

    // Reconstruye Producto principal dejando únicamente los tres nodos raíz.
    MP_ARBOL_TIPIFICACION_PASO_28D.PRODUCTOS.forEach(function(item, index) {
      const codigo = normalizarTexto(item.codigo);
      const canonico = productosCanonicos[codigo];
      const existente = productoExistentePorCodigo[codigo];

      if (existente) {
        const fila = existente.slice();

        fila[mapa.CATALOGO] = "MP_PRODUCTOS_PRINCIPALES";
        fila[mapa.CODIGO] = codigo;
        fila[mapa.NOMBRE] = canonico.nombre;
        fila[mapa.ORDEN] = canonico.orden;
        fila[mapa.ESTADO] = CONFIG.ESTADOS.ACTIVO;
        fila[mapa.CLAVE_PADRE] = "MP_NEGOCIOS";
        fila[mapa.VALOR_PADRE] = "GASODOMESTICOS";
        fila[mapa.METADATA_JSON] = JSON.stringify({
          negocio: "GASODOMESTICOS",
          nivel: "PRODUCTO_PRINCIPAL"
        });

        if (!fila[mapa.FECHA_CREACION]) {
          fila[mapa.FECHA_CREACION] = ahora;
        }
        fila[mapa.FECHA_ACTUALIZACION] = ahora;

        filasResultado.push(fila);
        return;
      }

      filasResultado.push(
        objetoAFilaMotor_(cabeceras, {
          ID_VALOR: generarIdMotor_("VAL"),
          CATALOGO: "MP_PRODUCTOS_PRINCIPALES",
          CODIGO: codigo,
          NOMBRE: canonico.nombre,
          ORDEN: canonico.orden,
          ESTADO: CONFIG.ESTADOS.ACTIVO,
          CLAVE_PADRE: "MP_NEGOCIOS",
          VALOR_PADRE: "GASODOMESTICOS",
          METADATA_JSON: JSON.stringify({
            negocio: "GASODOMESTICOS",
            nivel: "PRODUCTO_PRINCIPAL"
          }),
          FECHA_CREACION: ahora,
          FECHA_ACTUALIZACION: ahora
        })
      );
    });

    // Tipo: reconstrucción total. No conserva IDs ni registros anteriores.
    MP_ARBOL_TIPIFICACION_PASO_28D.TIPOS.forEach(function(item, index) {
      filasResultado.push(
        objetoAFilaMotor_(cabeceras, {
          ID_VALOR: generarIdMotor_("VAL"),
          CATALOGO: "MP_TIPOS_MATERIAL",
          CODIGO: normalizarTexto(item.codigo),
          NOMBRE: item.nombre,
          ORDEN: (index + 1) * 10,
          ESTADO: CONFIG.ESTADOS.ACTIVO,
          CLAVE_PADRE: "MP_PRODUCTOS_PRINCIPALES",
          VALOR_PADRE: normalizarTexto(item.producto),
          METADATA_JSON: JSON.stringify({
            productoPrincipal: normalizarTexto(item.producto),
            nivel: "TIPO_MATERIAL"
          }),
          FECHA_CREACION: ahora,
          FECHA_ACTUALIZACION: ahora
        })
      );
    });

    // Subtipo: reconstrucción total desde el árbol del Excel.
    MP_ARBOL_TIPIFICACION_PASO_28D.SUBTIPOS.forEach(function(item, index) {
      filasResultado.push(
        objetoAFilaMotor_(cabeceras, {
          ID_VALOR: generarIdMotor_("VAL"),
          CATALOGO: "MP_SUBTIPOS_MATERIAL",
          CODIGO: normalizarTexto(item.codigo),
          NOMBRE: item.nombre,
          ORDEN: (index + 1) * 10,
          ESTADO: CONFIG.ESTADOS.ACTIVO,
          CLAVE_PADRE: "MP_TIPOS_MATERIAL",
          VALOR_PADRE: normalizarTexto(item.tipo),
          METADATA_JSON: JSON.stringify({
            productoPrincipal: normalizarTexto(item.producto),
            tipoMaterial: normalizarTexto(item.tipo),
            nivel: "SUBTIPO_MATERIAL"
          }),
          FECHA_CREACION: ahora,
          FECHA_ACTUALIZACION: ahora
        })
      );
    });

    // Limpieza física de todo el contenido anterior.
    if (ultimaFila > 1) {
      hoja
        .getRange(2, 1, ultimaFila - 1, ultimaColumna)
        .clearContent();
    }

    if (filasResultado.length) {
      hoja
        .getRange(2, 1, filasResultado.length, cabeceras.length)
        .setValues(filasResultado);
    }

    // Limpia cualquier residuo por si antes existían más filas que ahora.
    const filasSobrantes = Math.max(
      0,
      (ultimaFila - 1) - filasResultado.length
    );

    if (filasSobrantes > 0) {
      hoja
        .getRange(
          filasResultado.length + 2,
          1,
          filasSobrantes,
          ultimaColumna
        )
        .clearContent();
    }

    marcarRevisionDatosMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.CATALOGO_VALORES
    );
    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    marcarVersionCacheMaterialesPrecios_();

    SpreadsheetApp.flush();

    const diagnostico = diagnosticarArbolTipificacionPaso28E();

    if (diagnostico.correcto !== true) {
      throw new Error(
        "La depuración se ejecutó, pero el diagnóstico encontró inconsistencias: " +
        diagnostico.errores.join(" | ")
      );
    }

    return {
      correcto: true,
      paso: "28E",
      productosActivos: diagnostico.resumen.productos,
      tiposActivos: diagnostico.resumen.tipos,
      subtiposActivos: diagnostico.resumen.subtipos,
      filasInactivas: diagnostico.resumen.inactivos,
      filasAntiguas: diagnostico.resumen.noCanonicas,
      duplicados: diagnostico.resumen.duplicados,
      mensaje:
        "Árbol depurado físicamente. No quedan registros inactivos, antiguos ni duplicados " +
        "en Producto principal, Tipo o Subtipo."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Alias de compatibilidad.
 * Si todavía se selecciona la función Paso 28D desde el editor,
 * ejecuta la depuración limpia del Paso 28E.
 */
function reiniciarArbolTipificacionPaso28D() {
  return reiniciarArbolTipificacionPaso28E();
}

/**
 * Diagnóstico estricto del árbol.
 *
 * A diferencia del diagnóstico anterior, revisa directamente APP_CATALOGO_VALORES
 * y falla si encuentra:
 * - filas INACTIVO;
 * - códigos fuera del árbol canónico;
 * - duplicados;
 * - relaciones Padre -> Hijo incorrectas.
 */
function diagnosticarArbolTipificacionPaso28E() {
  const hoja = obtenerHojaMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.CATALOGO_VALORES,
    true
  );

  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 1 || ultimaColumna < 1) {
    throw new Error("APP_CATALOGO_VALORES no está disponible.");
  }

  const datos = hoja
    .getRange(1, 1, ultimaFila, ultimaColumna)
    .getDisplayValues();

  const mapa = crearMapaCabeceras(datos[0]);

  validarCabeceras(
    mapa,
    [
      "CATALOGO",
      "CODIGO",
      "NOMBRE",
      "ESTADO",
      "CLAVE_PADRE",
      "VALOR_PADRE"
    ],
    CONFIG.HOJAS.CATALOGO_VALORES
  );

  const objetivo = {
    MP_PRODUCTOS_PRINCIPALES: true,
    MP_TIPOS_MATERIAL: true,
    MP_SUBTIPOS_MATERIAL: true
  };

  const filas = datos.slice(1)
    .filter(function(fila) {
      return objetivo[normalizarTexto(fila[mapa.CATALOGO] || "")] === true;
    })
    .map(function(fila, index) {
      return {
        fila: index + 2,
        catalogo: normalizarTexto(fila[mapa.CATALOGO] || ""),
        codigo: normalizarTexto(fila[mapa.CODIGO] || ""),
        nombre: String(fila[mapa.NOMBRE] || "").trim(),
        estado: normalizarTexto(fila[mapa.ESTADO] || ""),
        clavePadre: normalizarTexto(fila[mapa.CLAVE_PADRE] || ""),
        valorPadre: normalizarTexto(fila[mapa.VALOR_PADRE] || "")
      };
    });

  const esperados = {
    MP_PRODUCTOS_PRINCIPALES: {},
    MP_TIPOS_MATERIAL: {},
    MP_SUBTIPOS_MATERIAL: {}
  };

  MP_ARBOL_TIPIFICACION_PASO_28D.PRODUCTOS.forEach(function(item) {
    esperados.MP_PRODUCTOS_PRINCIPALES[normalizarTexto(item.codigo)] = {
      padre: "GASODOMESTICOS"
    };
  });

  MP_ARBOL_TIPIFICACION_PASO_28D.TIPOS.forEach(function(item) {
    esperados.MP_TIPOS_MATERIAL[normalizarTexto(item.codigo)] = {
      padre: normalizarTexto(item.producto)
    };
  });

  MP_ARBOL_TIPIFICACION_PASO_28D.SUBTIPOS.forEach(function(item) {
    esperados.MP_SUBTIPOS_MATERIAL[normalizarTexto(item.codigo)] = {
      padre: normalizarTexto(item.tipo)
    };
  });

  const errores = [];
  const vistos = {};
  let inactivos = 0;
  let noCanonicas = 0;
  let duplicados = 0;

  filas.forEach(function(item) {
    const clave = item.catalogo + "|" + item.codigo;

    if (item.estado !== CONFIG.ESTADOS.ACTIVO) {
      inactivos++;
      errores.push(
        "Fila " + item.fila + ": existe un registro no ACTIVO en " +
        item.catalogo + " [" + item.codigo + "]."
      );
    }

    const esperado = esperados[item.catalogo][item.codigo];

    if (!esperado) {
      noCanonicas++;
      errores.push(
        "Fila " + item.fila + ": código fuera del árbol inicial: " +
        item.catalogo + " [" + item.codigo + "]."
      );
    }

    if (vistos[clave]) {
      duplicados++;
      errores.push(
        "Fila " + item.fila + ": código duplicado: " +
        item.catalogo + " [" + item.codigo + "]."
      );
    }
    vistos[clave] = true;

    if (esperado) {
      if (item.catalogo === "MP_PRODUCTOS_PRINCIPALES") {
        if (
          item.clavePadre !== "MP_NEGOCIOS" ||
          item.valorPadre !== "GASODOMESTICOS"
        ) {
          errores.push(
            "Fila " + item.fila + ": Producto principal [" + item.codigo +
            "] no depende correctamente de GASODOMESTICOS."
          );
        }
      } else if (item.catalogo === "MP_TIPOS_MATERIAL") {
        if (
          item.clavePadre !== "MP_PRODUCTOS_PRINCIPALES" ||
          item.valorPadre !== esperado.padre
        ) {
          errores.push(
            "Fila " + item.fila + ": Tipo [" + item.codigo +
            "] no depende del Producto principal esperado [" +
            esperado.padre + "]."
          );
        }
      } else if (item.catalogo === "MP_SUBTIPOS_MATERIAL") {
        if (
          item.clavePadre !== "MP_TIPOS_MATERIAL" ||
          item.valorPadre !== esperado.padre
        ) {
          errores.push(
            "Fila " + item.fila + ": Subtipo [" + item.codigo +
            "] no depende del Tipo esperado [" + esperado.padre + "]."
          );
        }
      }
    }
  });

  Object.keys(esperados).forEach(function(catalogo) {
    Object.keys(esperados[catalogo]).forEach(function(codigo) {
      if (!vistos[catalogo + "|" + codigo]) {
        errores.push(
          "Falta el registro obligatorio " + catalogo + " [" + codigo + "]."
        );
      }
    });
  });

  const resumen = {
    productos: filas.filter(function(item) {
      return item.catalogo === "MP_PRODUCTOS_PRINCIPALES";
    }).length,
    tipos: filas.filter(function(item) {
      return item.catalogo === "MP_TIPOS_MATERIAL";
    }).length,
    subtipos: filas.filter(function(item) {
      return item.catalogo === "MP_SUBTIPOS_MATERIAL";
    }).length,
    inactivos: inactivos,
    noCanonicas: noCanonicas,
    duplicados: duplicados
  };

  const salida = {
    correcto: errores.length === 0,
    paso: "28E",
    resumen: resumen,
    errores: errores
  };

  console.log(JSON.stringify(salida, null, 2));
  Logger.log(JSON.stringify(salida, null, 2));

  return salida;
}

/**
 * Alias de compatibilidad del diagnóstico anterior.
 */
function diagnosticarArbolTipificacionPaso28D() {
  return diagnosticarArbolTipificacionPaso28E();
}

function resolverCodigoCatalogoMaterialPrecio_(codigoCatalogo, valor, etiqueta, obligatorio) {
  const opciones = listarValoresCatalogoAppPrecio_(codigoCatalogo);
  const buscado = normalizarTexto(valor || "");

  if (!buscado) {
    if (obligatorio) {
      throw new Error("El " + etiqueta + " es obligatorio.");
    }
    return null;
  }

  const opcion = opciones.find(function(item) {
    return normalizarTexto(item.id || item.codigo || "") === buscado ||
      normalizarTexto(item.nombre || "") === buscado;
  }) || null;

  if (!opcion) {
    throw new Error(
      "El " + etiqueta + " '" + valor +
      "' no existe o está inactivo en el catálogo " + codigoCatalogo + "."
    );
  }

  return opcion;
}

function reiniciarMaterialesPaso28A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraMaterialesPrecios_();

    const hojas = [
      MP_MODULO_SGT360.HOJAS.LISTA_DETALLE,
      MP_MODULO_SGT360.HOJAS.LISTAS,
      MP_MODULO_SGT360.HOJAS.SOLICITUD_DETALLE,
      MP_MODULO_SGT360.HOJAS.SOLICITUD_HISTORIAL,
      MP_MODULO_SGT360.HOJAS.SOLICITUDES,
      MP_MODULO_SGT360.HOJAS.REL_MATERIAL_COMPONENTES,
      MP_MODULO_SGT360.HOJAS.REL_PROVEEDOR_MATERIAL,
      MP_MODULO_SGT360.HOJAS.REL_NEGOCIO_MATERIAL,
      MP_MODULO_SGT360.HOJAS.MATERIALES
    ];

    const respaldo = crearRespaldoMaterialesPaso28A_(hojas);
    const resultado = {};

    hojas.forEach(function(nombreHoja) {
      resultado[nombreHoja] = limpiarDatosHojaPrecioPaso27L_(nombreHoja);
      marcarRevisionDatosMotor_(MOTOR_SGT360.BASES.OPERATION, nombreHoja);
    });

    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("ALL");
    marcarVersionCacheMaterialesPrecios_();
    marcarVersionCachePreciosMateriales_();
    SpreadsheetApp.flush();

    registrarCambioMotor_(
      MP_MODULO_SGT360.CODIGO,
      "REINICIO_MATERIALES_PASO_28A",
      "MATERIAL",
      "",
      {
        respaldoId: respaldo.id,
        respaldoUrl: respaldo.url,
        hojas: resultado
      }
    );

    return {
      correcto: true,
      paso: "28A",
      mensaje: "Materiales y datos dependientes reiniciados. Los catálogos funcionales se conservaron.",
      respaldo: respaldo,
      hojas: resultado
    };
  } finally {
    bloqueo.releaseLock();
  }
}

function crearRespaldoMaterialesPaso28A_(nombresHojas) {
  const zona = MOTOR_SGT360.ZONA_HORARIA || "America/Lima";
  const marca = Utilities.formatDate(new Date(), zona, "yyyyMMdd_HHmmss");
  const nombre = "BACKUP_Calidda360_Materiales_Paso28A_" + marca;
  const respaldo = SpreadsheetApp.create(nombre);
  const hojaInicial = respaldo.getSheets()[0];
  const libroOperacion = obtenerLibroMotor_(MOTOR_SGT360.BASES.OPERATION);
  let copias = 0;

  (nombresHojas || []).forEach(function(nombreHoja) {
    const origen = libroOperacion.getSheetByName(nombreHoja);
    if (!origen) return;

    const copia = origen.copyTo(respaldo);
    copia.setName(nombreHoja);
    copias++;
  });

  if (copias > 0 && respaldo.getSheets().length > 1) {
    respaldo.deleteSheet(hojaInicial);
  } else {
    hojaInicial.setName("RESPALDO_VACIO");
  }

  SpreadsheetApp.flush();

  const archivo = DriveApp.getFileById(respaldo.getId());
  const idCarpeta = String(CONFIG.CARPETAS.EXPORTACIONES || "").trim();

  if (idCarpeta) {
    try {
      archivo.moveTo(DriveApp.getFolderById(idCarpeta));
    } catch (error) {
      console.warn("No se pudo mover el respaldo a Exportaciones: %s", error.message);
    }
  }

  return {
    id: respaldo.getId(),
    nombre: nombre,
    url: respaldo.getUrl()
  };
}

function actualizarModuloMaterialesPreciosPaso28A() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    asegurarEstructuraMaterialesPrecios_();
    asegurarColumnasCatalogosAppPaso25B_();
    sembrarCatalogosInicialesMaterialesPrecios_();
    invalidarCacheOpcionesMaterialesPrecios_();
    invalidarCacheMotor_("CONFIG");
    marcarVersionCacheMaterialesPrecios_();
    marcarVersionCachePreciosMateriales_();
    SpreadsheetApp.flush();

    return {
      correcto: true,
      paso: "28A",
      cambios: [
        "Plantilla XLSX con hoja DICCIONARIOS",
        "Códigos funcionales de APP_CATALOGO_VALORES",
        "Prevalidación antes de grabar",
        "Confirmación explícita de carga",
        "Carga masiva sin creación automática de maestros técnicos",
        "Creación desde listas homologada al mismo catálogo"
      ],
      mensaje: "Paso 28A preparado. Ejecuta reiniciarMaterialesPaso28A() una sola vez para iniciar limpio."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * PASO 28J — Diagnóstico manual del modelo de precios.
 * No modifica información. Valida proveedor obligatorio, jerarquía oficina/grupo,
 * unicidad de códigos de material y cruces de vigencia por material/proveedor/alcance.
 */
function diagnosticarModeloPreciosPaso28J() {
  const materiales = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.MATERIALES).filter(function(item) {
    return normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  });
  const listas = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTAS).filter(function(item) {
    return normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  });
  const detalles = leerTablaPrecio_(MP_MODULO_SGT360.HOJAS.LISTA_DETALLE).filter(function(item) {
    return normalizarTexto(item.ESTADO || CONFIG.ESTADOS.ACTIVO) === CONFIG.ESTADOS.ACTIVO;
  });

  const errores = [];
  const advertencias = [];
  const materialPorId = {};
  const codigoInterno = {};
  const codigoSap = {};

  materiales.forEach(function(material) {
    const id = String(material.ID_MATERIAL || "").trim();
    if (id) materialPorId[id] = material;

    const interno = normalizarTexto(material.CODIGO_MATERIAL || "");
    const sap = normalizarTexto(material.CODIGO_SAP || "");

    if (interno) {
      if (codigoInterno[interno] && codigoInterno[interno] !== id) {
        errores.push("Código interno duplicado: " + interno + ".");
      } else {
        codigoInterno[interno] = id;
      }
    }

    if (sap && sap !== "EN CREACION") {
      if (codigoSap[sap] && codigoSap[sap] !== id) {
        errores.push("Código SAP duplicado: " + sap + ".");
      } else {
        codigoSap[sap] = id;
      }
    }
  });

  const listaPorId = {};
  listas.forEach(function(lista) {
    const idLista = String(lista.ID_LISTA_PRECIO || "").trim();
    if (idLista) listaPorId[idLista] = lista;

    const proveedor = String(lista.ID_PROVEEDOR || "").trim();
    const oficina = String(lista.ID_OFICINA || "").trim();
    const grupo = String(lista.ID_GRUPO || "").trim();

    if (!proveedor) {
      errores.push("Lista activa sin proveedor: " + (lista.CODIGO_LISTA || idLista || "SIN_ID") + ".");
    }
    if (grupo && !oficina) {
      errores.push("Lista con grupo sin oficina: " + (lista.CODIGO_LISTA || idLista || "SIN_ID") + ".");
    }
  });

  const registrosPrecio = [];
  const duplicadosDetalle = {};

  detalles.forEach(function(detalle) {
    const idLista = String(detalle.ID_LISTA_PRECIO || "").trim();
    const idMaterial = String(detalle.ID_MATERIAL || "").trim();
    const lista = listaPorId[idLista] || null;

    if (!lista) {
      errores.push("Detalle activo sin lista activa: " + (detalle.CODIGO_PRECIO || detalle.ID_DETALLE_PRECIO || "SIN_ID") + ".");
      return;
    }
    if (!materialPorId[idMaterial]) {
      errores.push("Detalle con material inexistente/inactivo: " + (detalle.CODIGO_PRECIO || detalle.ID_DETALLE_PRECIO || "SIN_ID") + ".");
      return;
    }

    const claveDetalle = idLista + "|" + idMaterial;
    if (duplicadosDetalle[claveDetalle]) {
      errores.push("Hay más de un detalle activo para el mismo material dentro de la lista " + (lista.CODIGO_LISTA || idLista) + ".");
    } else {
      duplicadosDetalle[claveDetalle] = true;
    }

    registrosPrecio.push({
      idDetalle: String(detalle.ID_DETALLE_PRECIO || "").trim(),
      idMaterial: idMaterial,
      idProveedor: String(lista.ID_PROVEEDOR || "").trim(),
      idNegocio: String(lista.ID_NEGOCIO || "").trim(),
      idOficina: String(lista.ID_OFICINA || "").trim(),
      idGrupo: String(lista.ID_GRUPO || "").trim(),
      inicio: convertirFechaPrecio_(lista.FECHA_INICIO),
      fin: convertirFechaPrecio_(lista.FECHA_FIN),
      codigoLista: String(lista.CODIGO_LISTA || idLista).trim()
    });
  });

  const porClave = {};
  registrosPrecio.forEach(function(registro) {
    const clave = [
      registro.idMaterial,
      registro.idProveedor,
      registro.idNegocio,
      registro.idOficina,
      registro.idGrupo
    ].join("|");
    if (!porClave[clave]) porClave[clave] = [];
    porClave[clave].push(registro);
  });

  Object.keys(porClave).forEach(function(clave) {
    const grupo = porClave[clave];
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i];
        const b = grupo[j];
        if (!a.inicio || !a.fin || !b.inicio || !b.fin) {
          advertencias.push("No se pudo comprobar vigencia de " + a.codigoLista + " / " + b.codigoLista + ".");
          continue;
        }
        if (fechasSeCruzanPrecio_(a.inicio, a.fin, b.inicio, b.fin)) {
          errores.push(
            "Vigencias superpuestas para el mismo material/proveedor/alcance: " +
            a.codigoLista + " y " + b.codigoLista + "."
          );
        }
      }
    }
  });

  return {
    correcto: errores.length === 0,
    paso: "28J",
    resumen: {
      materialesActivos: materiales.length,
      listasActivas: listas.length,
      detallesActivos: detalles.length,
      errores: errores.length,
      advertencias: advertencias.length
    },
    errores: errores.slice(0, 200),
    advertencias: advertencias.slice(0, 200),
    mensaje: errores.length ?
      "El modelo de precios tiene observaciones bloqueantes. Revisa errores antes de operar cargas nuevas." :
      "El modelo de precios cumple las reglas del Paso 28J."
  };
}
