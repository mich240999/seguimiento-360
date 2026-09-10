/**
 * SGT360 — Configuración general
 *
 * Responsabilidad:
 * Define identidad, versión, estados, roles, acciones, recursos visuales y
 * compatibilidad del motor.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * Configuración estática y compatibilidad del motor.
 */
const MOTOR_SGT360 = Object.freeze({
  CODIGO: "SGT360",
  VERSION_MOTOR: "1.0.0",
  ZONA_HORARIA: "America/Lima",
  ESTADOS: Object.freeze({
    ACTIVO: "ACTIVO",
    INACTIVO: "INACTIVO",
    PENDIENTE: "PENDIENTE",
    BLOQUEADO: "BLOQUEADO"
  }),
  ROLES_BASE: Object.freeze({
    SUPERADMIN: "SUPERADMIN",
    ADMIN: "ADMIN"
  }),
  BASES: Object.freeze({
    CONFIG: "CONFIG",
    SECURITY: "SECURITY",
    OPERATION: "OPERATION"
  }),
  TIPOS_RECURSO: Object.freeze(["MODULO", "GRUPO", "ACCION", "CAMPO"]),
  TIPOS_CAMPO: Object.freeze(["TEXT", "NUMBER", "DATE", "DATETIME", "SELECT", "TEXTAREA",
    "CHECKBOX", "EMAIL", "PHONE"
  ]),
  ALCANCES: Object.freeze(["PROPIO", "PROVEEDOR", "GRUPO", "ASIGNADOS", "GLOBAL"])
});

/**
 * Construye configuración compatibilidad motor. Función interna del motor.
 */
function construirConfigCompatibilidadMotor_() {
  const propiedades = PropertiesService.getScriptProperties();
  const appName = String(propiedades.getProperty("SGT360_APP_NAME") || "Seguimiento 360").trim();
  const appVersion = String(propiedades.getProperty("SGT360_APP_VERSION") || "1.0.0").trim();
  const securityDbId = String(propiedades.getProperty("SGT360_DB_SECURITY_ID") || propiedades
    .getProperty("SGT360_DB_CONFIG_ID") || "").trim();
  return Object.freeze({
    APP: Object.freeze({
      NOMBRE: appName,
      VERSION: appVersion
    }),
    SPREADSHEET_ID: securityDbId,
    HOJAS: Object.freeze({
      PARAMETROS: "SYS_PARAMETROS",
      MODULOS: "APP_MODULOS",
      CAMPOS: "APP_CAMPOS",
      ACCIONES_MODULO: "APP_ACCIONES",
      CATALOGOS: "APP_CATALOGOS",
      CATALOGO_VALORES: "APP_CATALOGO_VALORES",
      MENUS: "APP_MODULOS",
      USUARIOS: "SEG_USUARIOS",
      ROLES_SEGURIDAD: "SEG_ROLES",
      RECURSOS_SEGURIDAD: "SEG_RECURSOS",
      PERMISOS_RECURSOS: "SEG_PERMISOS",
      SESIONES_USUARIOS: "SEG_SESIONES",
      AUDITORIA_ACCESOS: "SEG_AUDITORIA_ACCESOS",
      AUDITORIA_EVENTOS: "SEG_AUDITORIA_EVENTOS",
      AUDITORIA_PERMISOS: "SEG_AUDITORIA_PERMISOS",
      RECURSOS: "ADM_RECURSOS_VISUALES",
      PROVEEDORES: "MAE_PROVEEDORES",
      OFICINAS: "MAE_OFICINAS",
      GRUPOS: "MAE_GRUPOS",
      PROVEEDOR_OFICINAS: "REL_PROVEEDOR_OFICINAS"
    }),
    CATALOGOS_SISTEMA: Object.freeze({
      TIPOS_DOCUMENTO_USUARIO: "TIPOS_DOCUMENTO_USUARIO"
    }),
    CARPETAS: Object.freeze({
      RECURSOS_BRANDING: String(propiedades.getProperty("SGT360_FOLDER_RESOURCES_ID") || "")
        .trim(),
      IMPORTACIONES: String(propiedades.getProperty("SGT360_FOLDER_IMPORTS_ID") || "")
      .trim(),
      EXPORTACIONES: String(propiedades.getProperty("SGT360_FOLDER_EXPORTS_ID") || "")
      .trim()
    }),
    ESTADOS: MOTOR_SGT360.ESTADOS,
    ROLES: MOTOR_SGT360.ROLES_BASE,
    RECURSOS: Object.freeze({
      CLAVES: Object.freeze({
        LOGO_HEADER: "LOGO_HEADER",
        LOGO_LOGIN: "LOGO_LOGIN",
        LOGO_CARGA: "LOGO_CARGA",
        LOGO_PDF: "LOGO_PDF",
        BANNER_INICIO: "BANNER_INICIO",
        BANNER_DASHBOARD: "BANNER_DASHBOARD",
        FAVICON_APP: "FAVICON_APP"
      }),
      DICCIONARIO: Object.freeze({
        LOGO_HEADER: Object.freeze({
          nombre: "Logo de navegación",
          tipo: "IMAGEN",
          categoria: "Logo",
          ubicacion: "Barra lateral y encabezado de la aplicación",
          descripcion: "Identidad principal que acompaña la navegación del usuario.",
          formato: "PNG, WebP o SVG con fondo transparente",
          proporcion: "Horizontal o cuadrada",
          estadoUso: "EN_USO"
        }),
        LOGO_LOGIN: Object.freeze({
          nombre: "Logo de inicio de sesión",
          tipo: "IMAGEN",
          categoria: "Logo",
          ubicacion: "Pantalla de acceso",
          descripcion: "Identidad mostrada antes de que el usuario ingrese a la aplicación.",
          formato: "PNG, WebP o SVG con fondo transparente",
          proporcion: "Horizontal",
          estadoUso: "EN_USO"
        }),
        LOGO_CARGA: Object.freeze({
          nombre: "Logo de carga inicial",
          tipo: "IMAGEN",
          categoria: "Logo",
          ubicacion: "Pantalla inicial “Preparando la aplicación”",
          descripcion: "Logo corporativo utilizado únicamente durante el inicio de la aplicación.",
          formato: "PNG, WebP o SVG con fondo transparente",
          proporcion: "Cuadrada o compacta",
          estadoUso: "EN_USO"
        }),
        LOGO_PDF: Object.freeze({
          nombre: "Logo de documentos PDF",
          tipo: "IMAGEN",
          categoria: "Logo",
          ubicacion: "Cabecera de cotizaciones, reportes y documentos PDF",
          descripcion: "Identidad utilizada en documentos generados por la plataforma.",
          formato: "PNG o JPEG",
          proporcion: "Horizontal",
          estadoUso: "EN_USO"
        }),
        FAVICON_APP: Object.freeze({
          nombre: "Ícono de la pestaña",
          tipo: "ICONO",
          categoria: "Ícono",
          ubicacion: "Pestaña del navegador",
          descripcion: "Ícono pequeño que identifica Cálidda 360 en el navegador.",
          formato: "PNG obligatorio",
          proporcion: "Cuadrada; recomendado 128 × 128 px",
          estadoUso: "EN_USO"
        }),
        BANNER_INICIO: Object.freeze({
          nombre: "Banner de comunicación de inicio",
          tipo: "BANNER",
          categoria: "Banner",
          ubicacion: "Pantalla Inicio, debajo del saludo principal",
          descripcion: "Espacio previsto para comunicados, campañas, mantenimientos o mensajes dirigidos a todos los usuarios.",
          formato: "PNG, JPEG o WebP",
          proporcion: "Panorámica; recomendado 3:1 o 16:5",
          estadoUso: "PREPARADO"
        }),
        BANNER_DASHBOARD: Object.freeze({
          nombre: "Banner del dashboard (compatibilidad)",
          tipo: "BANNER",
          categoria: "Banner",
          ubicacion: "Pantalla Inicio",
          descripcion: "Clave anterior conservada para compatibilidad. Para nuevas implementaciones utiliza BANNER_INICIO.",
          formato: "PNG, JPEG o WebP",
          proporcion: "Panorámica; recomendado 3:1 o 16:5",
          estadoUso: "COMPATIBILIDAD"
        })
      }),
      MIME_PERMITIDOS: Object.freeze(["image/png", "image/jpeg", "image/webp",
        "image/svg+xml"
      ]),
      TAMANO_MAXIMO_BYTES: 2 * 1024 * 1024
    })
  });
}
const CONFIG = construirConfigCompatibilidadMotor_();

/**
 * Devuelve el diccionario funcional de recursos visuales.
 *
 * Permite que la interfaz muestre nombres y usos comprensibles sin obligar
 * al administrador a consultar las constantes del código fuente.
 *
 * @return {Array<Object>}
 * @private
 */
function obtenerDiccionarioRecursosVisualesMotor_() {
  const diccionario = CONFIG &&
    CONFIG.RECURSOS &&
    CONFIG.RECURSOS.DICCIONARIO ?
    CONFIG.RECURSOS.DICCIONARIO : {};

  return Object.keys(diccionario).map(function(clave) {
    const definicion = diccionario[clave] || {};

    return {
      clave: clave,
      nombre: String(definicion.nombre || clave).trim(),
      tipo: normalizarTexto(definicion.tipo || "IMAGEN"),
      categoria: String(definicion.categoria || "Imagen").trim(),
      ubicacion: String(definicion.ubicacion || "").trim(),
      descripcion: String(definicion.descripcion || "").trim(),
      formato: String(definicion.formato || "").trim(),
      proporcion: String(definicion.proporcion || "").trim(),
      estadoUso: normalizarTexto(definicion.estadoUso || "EN_USO")
    };
  }).sort(function(a, b) {
    const orden = {
      LOGO_HEADER: 10,
      LOGO_LOGIN: 20,
      LOGO_CARGA: 30,
      LOGO_PDF: 40,
      FAVICON_APP: 50,
      BANNER_INICIO: 60,
      BANNER_DASHBOARD: 70
    };

    return (orden[a.clave] || 999) - (orden[b.clave] || 999);
  });
}

