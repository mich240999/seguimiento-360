/**
 * SGT360 — Entorno y ubicaciones — Paso 30D
 *
 * Responsabilidad:
 * Resuelve bases de configuración, seguridad y operación; administra propiedades,
 * hojas, carpetas y recursos visuales.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/** Entorno, bases, carpetas y credenciales. */
const PROPIEDADES_MOTOR_SGT360 = Object.freeze({
  APP_NAME: "SGT360_APP_NAME",
  APP_VERSION: "SGT360_APP_VERSION",
  ENVIRONMENT: "SGT360_ENVIRONMENT",
  DB_CONFIG_ID: "SGT360_DB_CONFIG_ID",
  DB_SECURITY_ID: "SGT360_DB_SECURITY_ID",
  DB_OPERATION_ID: "SGT360_DB_OPERATION_ID",
  FOLDER_RESOURCES_ID: "SGT360_FOLDER_RESOURCES_ID",
  FOLDER_IMPORTS_ID: "SGT360_FOLDER_IMPORTS_ID",
  FOLDER_EXPORTS_ID: "SGT360_FOLDER_EXPORTS_ID",
  FAVICON_URL: "SGT360_FAVICON_URL",
  INSTALLED: "SGT360_ENGINE_INSTALLED"
});

/**
 * Obtiene propiedad motor. Función interna del motor.
 */
function obtenerPropiedadMotor_(clave, valorPredeterminado) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  return valor === null || valor === undefined || String(valor).trim() === "" ?
    valorPredeterminado : String(valor).trim();
}

/**
 * Resuelve id base motor. Función interna del motor.
 */
function resolverIdBaseMotor_(aliasBase) {
  const alias = normalizarTexto(aliasBase || MOTOR_SGT360.BASES.OPERATION);
  const p = PropertiesService.getScriptProperties();
  const configId = String(p.getProperty(PROPIEDADES_MOTOR_SGT360.DB_CONFIG_ID) || "").trim();
  const ids = {
    CONFIG: configId,
    SECURITY: String(p.getProperty(PROPIEDADES_MOTOR_SGT360.DB_SECURITY_ID) || configId).trim(),
    OPERATION: String(p.getProperty(PROPIEDADES_MOTOR_SGT360.DB_OPERATION_ID) || configId).trim()
  };
  if (!ids[alias]) throw new Error("No se configuró el ID de la base " + alias +
    ". Ejecuta instalarMotorSGT360() o configurarEntornoMotor().");
  return ids[alias];
}

/**
 * Obtiene libro motor. Función interna del motor.
 */
function obtenerLibroMotor_(aliasBase) {
  return SpreadsheetApp.openById(resolverIdBaseMotor_(aliasBase));
}

/**
 * Obtiene alias hoja motor. Función interna del motor.
 */
function obtenerAliasHojaMotor_(nombreHoja) {
  const nombre = String(nombreHoja || "").trim().toUpperCase();
  const seguridad = [CONFIG.HOJAS.USUARIOS, CONFIG.HOJAS.ROLES_SEGURIDAD, CONFIG.HOJAS
    .RECURSOS_SEGURIDAD, CONFIG.HOJAS.PERMISOS_RECURSOS, CONFIG.HOJAS.SESIONES_USUARIOS, CONFIG
    .HOJAS.AUDITORIA_ACCESOS, CONFIG.HOJAS.AUDITORIA_EVENTOS, CONFIG.HOJAS.AUDITORIA_PERMISOS
  ];
  const configuracion = [CONFIG.HOJAS.PARAMETROS, CONFIG.HOJAS.MODULOS, CONFIG.HOJAS.CAMPOS, CONFIG
    .HOJAS.ACCIONES_MODULO, CONFIG.HOJAS.CATALOGOS, CONFIG.HOJAS.CATALOGO_VALORES, CONFIG.HOJAS
    .RECURSOS
  ];
  if (seguridad.indexOf(nombre) !== -1) return MOTOR_SGT360.BASES.SECURITY;
  if (configuracion.indexOf(nombre) !== -1) return MOTOR_SGT360.BASES.CONFIG;
  return MOTOR_SGT360.BASES.OPERATION;
}

/**
 * Obtiene hoja motor. Función interna del motor.
 */
function obtenerHojaMotor_(aliasBase, nombreHoja, requerida) {
  const hoja = obtenerLibroMotor_(aliasBase).getSheetByName(nombreHoja);
  if (!hoja && requerida !== false) throw new Error("No existe la hoja " + nombreHoja +
    " en la base " + aliasBase + ".");
  return hoja;
}

/**
 * Obtiene hoja.
 */
function obtenerHoja(nombreHoja) {
  return obtenerHojaMotor_(obtenerAliasHojaMotor_(nombreHoja), nombreHoja, true);
}

/**
 * Configura entorno motor.
 */
function configurarEntornoMotor(configuracion) {
  configuracion = configuracion || {};
  const p = PropertiesService.getScriptProperties();
  const valores = {};
  const mapa = {
    nombreAplicacion: PROPIEDADES_MOTOR_SGT360.APP_NAME,
    versionAplicacion: PROPIEDADES_MOTOR_SGT360.APP_VERSION,
    entorno: PROPIEDADES_MOTOR_SGT360.ENVIRONMENT,
    idBaseConfiguracion: PROPIEDADES_MOTOR_SGT360.DB_CONFIG_ID,
    idBaseSeguridad: PROPIEDADES_MOTOR_SGT360.DB_SECURITY_ID,
    idBaseOperacion: PROPIEDADES_MOTOR_SGT360.DB_OPERATION_ID,
    idCarpetaRecursos: PROPIEDADES_MOTOR_SGT360.FOLDER_RESOURCES_ID,
    idCarpetaImportaciones: PROPIEDADES_MOTOR_SGT360.FOLDER_IMPORTS_ID,
    idCarpetaExportaciones: PROPIEDADES_MOTOR_SGT360.FOLDER_EXPORTS_ID,
    urlFavicon: PROPIEDADES_MOTOR_SGT360.FAVICON_URL
  };
  Object.keys(mapa).forEach(function(k) {
    if (configuracion[k] !== undefined && configuracion[k] !== null) valores[mapa[k]] = String(
      configuracion[k]).trim();
  });
  if (Object.keys(valores).length) p.setProperties(valores, false);
  invalidarCacheMotor_("ALL");
  return obtenerDiagnosticoEntornoMotor();
}

/**
 * Configura credenciales OAuth motor.
 */
function configurarCredencialesOAuthMotor(configuracion) {
  configuracion = configuracion || {};
  const p = PropertiesService.getScriptProperties();
  const valores = {};
  const mapa = {
    googleClientId: "SGT360_AUTH_GOOGLE_CLIENT_ID",
    googleClientSecret: "SGT360_AUTH_GOOGLE_CLIENT_SECRET",
    googleRedirectUri: "SGT360_AUTH_GOOGLE_REDIRECT_URI",
    googleDominiosPermitidos: "SGT360_AUTH_GOOGLE_DOMINIOS_PERMITIDOS",
    horasSesion: "SGT360_AUTH_HORAS_SESION",
    microsoftClientId: "SGT360_AUTH_MICROSOFT_CLIENT_ID",
    microsoftClientSecret: "SGT360_AUTH_MICROSOFT_CLIENT_SECRET",
    microsoftTenant: "SGT360_AUTH_MICROSOFT_TENANT",
    microsoftTenantId: "SGT360_AUTH_MICROSOFT_TENANT_ID",
    microsoftRedirectUri: "SGT360_AUTH_MICROSOFT_REDIRECT_URI",
    microsoftScopes: "SGT360_AUTH_MICROSOFT_SCOPES",
    microsoftDominiosPermitidos: "SGT360_AUTH_MICROSOFT_DOMINIOS_PERMITIDOS"
  };
  Object.keys(mapa).forEach(function(k) {
    if (configuracion[k] !== undefined && configuracion[k] !== null) valores[mapa[k]] = Array
      .isArray(configuracion[k]) ? configuracion[k].join(",") : String(configuracion[k]).trim();
  });
  p.setProperties(valores, false);
  return {
    correcto: true,
    googleConfigurado: Boolean(p.getProperty("SGT360_AUTH_GOOGLE_CLIENT_ID") && p.getProperty(
      "SGT360_AUTH_GOOGLE_CLIENT_SECRET") && p.getProperty("SGT360_AUTH_GOOGLE_REDIRECT_URI")),
    microsoftConfigurado: Boolean(p.getProperty("SGT360_AUTH_MICROSOFT_CLIENT_ID") && p.getProperty(
      "SGT360_AUTH_MICROSOFT_CLIENT_SECRET") && p.getProperty(
      "SGT360_AUTH_MICROSOFT_REDIRECT_URI"))
  };
}

/**
 * Obtiene diagnostico entorno motor.
 */
function obtenerDiagnosticoEntornoMotor() {
  const p = PropertiesService.getScriptProperties();
  const configuracion = {};
  Object.keys(PROPIEDADES_MOTOR_SGT360).forEach(function(clave) {
    const nombre = PROPIEDADES_MOTOR_SGT360[clave];
    const valor = String(p.getProperty(nombre) || "").trim();
    configuracion[nombre] = /SECRET/i.test(nombre) ? (valor ? "CONFIGURADO" : "") : valor;
  });
  return {
    correcto: Boolean(configuracion.SGT360_DB_CONFIG_ID && configuracion.SGT360_DB_SECURITY_ID &&
      configuracion.SGT360_DB_OPERATION_ID),
    configuracion: configuracion,
    urlWebApp: String(ScriptApp.getService().getUrl() || "").trim(),
    mensaje: "Las direcciones de bases y carpetas se administran desde Propiedades del script."
  };
}

/**
 * Obtiene el recurso visual activo asociado a una clave.
 *
 * @param {string} claveRecurso Clave funcional del recurso.
 * @return {?Object} Recurso activo o null.
 * @private
 */
const RECURSOS_VISUALES_PASO30D = Object.freeze({
  TTL_SEGUNDOS: 21600,
  CHUNK_SIZE: 75000,
  META_SUFFIX: "_META",
  SINGLE_SUFFIX: "_SINGLE",
  CHUNK_SUFFIX: "_CHUNK_"
});

var RECURSOS_VISUALES_MEMORIA_PASO30D_ = {};

/**
 * Lee el catálogo de recursos visuales una sola vez por caché de configuración.
 */
function listarRecursosVisualesMotorPaso30D_() {
  return obtenerOConstruirCacheMotor_(
    CACHE_MOTOR_SGT360.CLAVES.RECURSOS_VISUALES,
    function() {
      const hoja =
        obtenerHojaMotor_(
          MOTOR_SGT360.BASES.CONFIG,
          CONFIG.HOJAS.RECURSOS,
          false
        );

      if (
        !hoja ||
        hoja.getLastRow() < 2
      ) {
        return [];
      }

      const datos =
        hoja
          .getDataRange()
          .getDisplayValues();

      const mapa =
        crearMapaCabeceras(
          datos[0]
        );

      return datos
        .slice(1)
        .map(function(fila) {
          return {
            clave:
              typeof mapa.CLAVE === "number"
                ? normalizarTexto(
                    fila[mapa.CLAVE]
                  )
                : "",

            nombre:
              typeof mapa.NOMBRE === "number"
                ? String(
                    fila[mapa.NOMBRE] || ""
                  ).trim()
                : "",

            tipo:
              typeof mapa.TIPO === "number"
                ? normalizarTexto(
                    fila[mapa.TIPO] || "IMAGEN"
                  )
                : "IMAGEN",

            idArchivo:
              typeof mapa.ID_ARCHIVO === "number"
                ? String(
                    fila[mapa.ID_ARCHIVO] || ""
                  ).trim()
                : "",

            urlPublica:
              typeof mapa.URL_PUBLICA === "number"
                ? String(
                    fila[mapa.URL_PUBLICA] || ""
                  ).trim()
                : "",

            version:
              typeof mapa.VERSION === "number"
                ? Number(
                    fila[mapa.VERSION]
                  ) || 1
                : 1,

            estado:
              typeof mapa.ESTADO === "number"
                ? normalizarTexto(
                    fila[mapa.ESTADO] ||
                    CONFIG.ESTADOS.ACTIVO
                  )
                : CONFIG.ESTADOS.ACTIVO
          };
        })
        .filter(function(item) {
          return Boolean(item.clave);
        });
    },
    300
  );
}

/**
 * Obtiene el recurso visual activo asociado a una clave.
 */
function obtenerRecursoVisualActivoMotor_(claveRecurso) {
  const clave =
    normalizarTexto(
      claveRecurso
    );

  if (!clave) return null;

  return (
    listarRecursosVisualesMotorPaso30D_()
      .find(function(item) {
        return (
          item.clave === clave &&
          item.estado ===
            CONFIG.ESTADOS.ACTIVO
        );
      }) ||
    null
  );
}

/**
 * Extrae un ID de Drive desde URLs heredadas.
 *
 * Permite migrar recursos antiguos que solo tenían URL_PUBLICA.
 */
function extraerIdDriveRecursoVisualPaso30D_(
  valor
) {
  const texto =
    String(valor || "").trim();

  if (!texto) return "";

  const patrones = [
    /\/d\/([A-Za-z0-9_-]{10,})/i,
    /[?&]id=([A-Za-z0-9_-]{10,})/i,
    /thumbnail\?id=([A-Za-z0-9_-]{10,})/i
  ];

  for (
    let i = 0;
    i < patrones.length;
    i++
  ) {
    const coincidencia =
      texto.match(
        patrones[i]
      );

    if (
      coincidencia &&
      coincidencia[1]
    ) {
      return coincidencia[1];
    }
  }

  return "";
}

function esUrlDriveRecursoVisualPaso30D_(
  valor
) {
  const texto =
    String(valor || "")
      .trim()
      .toLowerCase();

  return (
    texto.indexOf(
      "drive.google.com"
    ) !== -1 ||
    texto.indexOf(
      "docs.google.com"
    ) !== -1
  );
}

function claveCacheRecursoVisualPaso30D_(
  idArchivo,
  version
) {
  return normalizarClaveCacheMotor_(
    [
      "SGT360_VIS30D",
      String(idArchivo || "").trim(),
      Number(version) || 1
    ].join("_")
  );
}

function leerDataUrlRecursoVisualCachePaso30D_(
  idArchivo,
  version
) {
  const base =
    claveCacheRecursoVisualPaso30D_(
      idArchivo,
      version
    );

  if (
    RECURSOS_VISUALES_MEMORIA_PASO30D_[
      base
    ]
  ) {
    return (
      RECURSOS_VISUALES_MEMORIA_PASO30D_[
        base
      ]
    );
  }

  const cache =
    CacheService.getScriptCache();

  const metaTexto =
    cache.get(
      base +
      RECURSOS_VISUALES_PASO30D
        .META_SUFFIX
    );

  if (!metaTexto) return "";

  let meta;

  try {
    meta =
      JSON.parse(metaTexto);
  } catch (error) {
    return "";
  }

  if (
    meta.tipo === "SINGLE"
  ) {
    const valor =
      cache.get(
        base +
        RECURSOS_VISUALES_PASO30D
          .SINGLE_SUFFIX
      ) || "";

    if (valor) {
      RECURSOS_VISUALES_MEMORIA_PASO30D_[
        base
      ] = valor;
    }

    return valor;
  }

  const total =
    Number(meta.chunks || 0);

  if (total <= 0) return "";

  const claves = [];

  for (
    let i = 0;
    i < total;
    i++
  ) {
    claves.push(
      base +
      RECURSOS_VISUALES_PASO30D
        .CHUNK_SUFFIX +
      i
    );
  }

  const mapa =
    cache.getAll(claves);

  const partes =
    claves.map(function(clave) {
      return mapa[clave] || "";
    });

  if (
    !partes.length ||
    !partes.every(Boolean)
  ) {
    return "";
  }

  const valor =
    partes.join("");

  RECURSOS_VISUALES_MEMORIA_PASO30D_[
    base
  ] = valor;

  return valor;
}

function guardarDataUrlRecursoVisualCachePaso30D_(
  idArchivo,
  version,
  dataUrl
) {
  const valor =
    String(dataUrl || "");

  if (!valor) return false;

  const base =
    claveCacheRecursoVisualPaso30D_(
      idArchivo,
      version
    );

  RECURSOS_VISUALES_MEMORIA_PASO30D_[
    base
  ] = valor;

  const cache =
    CacheService.getScriptCache();

  const metaKey =
    base +
    RECURSOS_VISUALES_PASO30D
      .META_SUFFIX;

  try {
    if (
      valor.length <=
      CACHE_MOTOR_SGT360
        .TAMANO_MAXIMO_BYTES
    ) {
      cache.put(
        base +
        RECURSOS_VISUALES_PASO30D
          .SINGLE_SUFFIX,
        valor,
        RECURSOS_VISUALES_PASO30D
          .TTL_SEGUNDOS
      );

      cache.put(
        metaKey,
        JSON.stringify({
          tipo: "SINGLE",
          chunks: 1
        }),
        RECURSOS_VISUALES_PASO30D
          .TTL_SEGUNDOS
      );

      return true;
    }

    const partes = [];

    for (
      let i = 0;
      i < valor.length;
      i +=
        RECURSOS_VISUALES_PASO30D
          .CHUNK_SIZE
    ) {
      partes.push(
        valor.substring(
          i,
          i +
            RECURSOS_VISUALES_PASO30D
              .CHUNK_SIZE
        )
      );
    }

    const mapa = {};

    partes.forEach(
      function(parte, indice) {
        mapa[
          base +
          RECURSOS_VISUALES_PASO30D
            .CHUNK_SUFFIX +
          indice
        ] = parte;
      }
    );

    cache.putAll(
      mapa,
      RECURSOS_VISUALES_PASO30D
        .TTL_SEGUNDOS
    );

    cache.put(
      metaKey,
      JSON.stringify({
        tipo: "CHUNKS",
        chunks:
          partes.length
      }),
      RECURSOS_VISUALES_PASO30D
        .TTL_SEGUNDOS
    );

    return true;
  } catch (error) {
    console.warn(
      "No se pudo cachear el recurso visual %s: %s",
      idArchivo,
      error &&
      error.message
        ? error.message
        : String(error)
    );

    // El recurso permanece en memoria durante la ejecución.
    return false;
  }
}

/**
 * Convierte un archivo privado de Drive en una fuente consumible por <img>.
 *
 * El navegador nunca recibe una URL de Drive ni necesita permiso sobre ella.
 */
function obtenerDataUrlArchivoVisualPaso30D_(
  idArchivo,
  version
) {
  const id =
    String(idArchivo || "").trim();

  if (!id) return "";

  const cacheado =
    leerDataUrlRecursoVisualCachePaso30D_(
      id,
      version
    );

  if (cacheado) {
    return cacheado;
  }

  const archivo =
    DriveApp.getFileById(id);

  const blob =
    archivo.getBlob();

  const mime =
    String(
      blob.getContentType() ||
      archivo.getMimeType() ||
      ""
    ).toLowerCase();

  if (
    mime.indexOf("image/") !== 0
  ) {
    throw new Error(
      "El recurso visual " +
      id +
      " no corresponde a una imagen."
    );
  }

  const dataUrl =
    "data:" +
    mime +
    ";base64," +
    Utilities.base64Encode(
      blob.getBytes()
    );

  guardarDataUrlRecursoVisualCachePaso30D_(
    id,
    version,
    dataUrl
  );

  return dataUrl;
}

/**
 * Fuente segura universal de recursos visuales.
 *
 * Drive -> Data URL servida por Apps Script.
 * Externo -> URL externa heredada.
 */
function obtenerFuenteRecursoVisualMotor_(
  claveRecurso
) {
  const recurso =
    obtenerRecursoVisualActivoMotor_(
      claveRecurso
    );

  if (!recurso) return "";

  const idDrive =
    recurso.idArchivo ||
    extraerIdDriveRecursoVisualPaso30D_(
      recurso.urlPublica
    );

  if (idDrive) {
    try {
      return obtenerDataUrlArchivoVisualPaso30D_(
        idDrive,
        recurso.version
      );
    } catch (error) {
      console.warn(
        "No se pudo resolver el recurso visual %s desde Drive: %s",
        recurso.clave,
        error &&
        error.message
          ? error.message
          : String(error)
      );

      return "";
    }
  }

  const externa =
    String(
      recurso.urlPublica || ""
    ).trim();

  if (
    /^https:\/\//i.test(externa) ||
    /^data:image\//i.test(externa)
  ) {
    return externa;
  }

  return "";
}



/**
 * Construye una URL pública versionada para un archivo visual de Drive.
 *
 * La versión evita que el navegador conserve el favicon anterior en caché.
 *
 * @param {string} idArchivo ID del archivo en Drive.
 * @param {number|string} version Versión registrada del recurso.
 * @return {string} URL pública del recurso.
 * @private
 */
function construirUrlPublicaRecursoVisualMotor_(idArchivo, version) {
  const id = String(idArchivo || "").trim();
  if (!id) return "";

  return "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(id) +
    "&sz=w128&v=" +
    encodeURIComponent(String(Number(version) || 1)) +
    "#favicon.png";
}

/**
 * Habilita lectura mediante enlace para un recurso que debe ser consultado
 * directamente por el navegador, como el favicon.
 *
 * @param {GoogleAppsScript.Drive.File} archivo Archivo de Drive.
 * @return {true}
 * @private
 */
function publicarArchivoRecursoVisualMotor_(archivo) {
  if (!archivo || typeof archivo.setSharing !== "function") {
    throw new Error("No fue posible preparar el archivo para lectura pública.");
  }

  try {
    archivo.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    if (typeof archivo.setSecurityUpdateEnabled === "function") {
      try {
        archivo.setSecurityUpdateEnabled(false);
      } catch (errorSeguridad) {
        console.warn(
          "No fue posible desactivar la actualización de seguridad del favicon: %s",
          errorSeguridad.message
        );
      }
    }
  } catch (error) {
    throw new Error(
      "El favicon se guardó en Drive, pero la política del dominio no permite " +
      "habilitar su lectura mediante enlace. Solicita al administrador de Google " +
      "Workspace permitir 'Cualquier persona con el enlace' para la carpeta de " +
      "recursos visuales. Detalle: " + error.message
    );
  }

  return true;
}

/**
 * Obtiene favicon URL motor. Función interna del motor.
 *
 * El favicon se resuelve desde ADM_RECURSOS_VISUALES mediante FAVICON_APP.
 * Si existe un archivo en Drive, se asegura su lectura pública y se construye
 * automáticamente una URL versionada. No requiere que el usuario escriba una URL.
 */
function obtenerFaviconUrlMotor_() {
  try {
    const recurso =
      obtenerRecursoVisualActivoMotor_(
        CONFIG.RECURSOS.CLAVES.FAVICON_APP
      );

    if (!recurso) {
      const heredada =
        obtenerPropiedadMotor_(
          PROPIEDADES_MOTOR_SGT360.FAVICON_URL,
          ""
        );

      return (
        heredada &&
        !esUrlDriveRecursoVisualPaso30D_(
          heredada
        )
          ? heredada
          : ""
      );
    }

    const idDrive =
      recurso.idArchivo ||
      extraerIdDriveRecursoVisualPaso30D_(
        recurso.urlPublica
      );

    // Los favicons respaldados por Drive se inyectan como Data URL
    // desde loaderConfigJson en HTML_000_APP_Index.
    if (idDrive) {
      return "";
    }

    const externa =
      String(
        recurso.urlPublica || ""
      ).trim();

    return /^https:\/\//i.test(externa)
      ? externa
      : "";
  } catch (error) {
    console.warn(
      "No fue posible preparar el favicon externo de la aplicación: %s",
      error &&
      error.message
        ? error.message
        : String(error)
    );

    return "";
  }
}

/**
 * Construye la configuración mínima de la pantalla de carga.
 *
 * Se ejecuta durante doGet para que el logo esté disponible desde el primer
 * render, antes de validar la sesión o solicitar el contexto protegido.
 *
 * Prioridad del logo:
 * 1. LOGO_CARGA
 * 2. LOGO_LOGIN
 * 3. LOGO_HEADER
 * 4. Ícono interno del frontend
 *
 * @return {Object}
 * @private
 */
function obtenerConfiguracionCargaInicialMotor_() {
  const predeterminada = {
    aplicacion: CONFIG.APP.NOMBRE,
    titulo: "Preparando la aplicación",
    subtitulo: "Estamos configurando tu espacio de trabajo.",
    mensajeInicial: "Validando acceso seguro…",
    textoSeguridad: "Conexión protegida",
    colorPrincipal: "#00A1DE",
    logoDataUrl: "",
    claveLogo: "",
    faviconSource: "",
    version: CONFIG.APP.VERSION,
    mostrarVersion: false
  };

  try {
    const parametros = obtenerParametrosCargaInicialMotor_();
    const logo =
      obtenerPrimerRecursoCargaComoDataUrlMotor_([
        CONFIG.RECURSOS.CLAVES.LOGO_CARGA,
        CONFIG.RECURSOS.CLAVES.LOGO_LOGIN,
        CONFIG.RECURSOS.CLAVES.LOGO_HEADER
      ]);

    const faviconSource =
      obtenerFuenteRecursoVisualMotor_(
        CONFIG.RECURSOS.CLAVES.FAVICON_APP
      );

    return {
      aplicacion: limpiarTextoMotor_(CONFIG.APP.NOMBRE, 100) || predeterminada.aplicacion,
      titulo: limpiarTextoMotor_(
        parametros.LOADER_TITULO || predeterminada.titulo,
        120
      ),
      subtitulo: limpiarTextoMotor_(
        parametros.LOADER_SUBTITULO || predeterminada.subtitulo,
        220
      ),
      mensajeInicial: limpiarTextoMotor_(
        parametros.LOADER_MENSAJE_INICIAL || predeterminada.mensajeInicial,
        180
      ),
      textoSeguridad: limpiarTextoMotor_(
        parametros.LOADER_TEXTO_SEGURIDAD || predeterminada.textoSeguridad,
        100
      ),
      colorPrincipal: normalizarColorCargaInicialMotor_(
        parametros.LOADER_COLOR || parametros.THEME_PRIMARY || predeterminada.colorPrincipal,
        predeterminada.colorPrincipal
      ),
      logoDataUrl: logo.dataUrl,
      claveLogo: logo.clave,
      faviconSource: faviconSource,
      version: limpiarTextoMotor_(CONFIG.APP.VERSION, 40),
      mostrarVersion: convertirBooleanoMotor_(
        parametros.LOADER_MOSTRAR_VERSION || "FALSE"
      )
    };
  } catch (error) {
    console.warn(
      "No fue posible preparar la identidad visual del cargador: %s",
      error && error.message ? error.message : String(error)
    );
    return predeterminada;
  }
}

/**
 * Lee una sola vez los parámetros activos requeridos durante doGet.
 *
 * @return {Object<string, string>}
 * @private
 */
function obtenerParametrosCargaInicialMotor_() {
  const resultado = {};
  const hoja = obtenerHojaMotor_(
    MOTOR_SGT360.BASES.CONFIG,
    CONFIG.HOJAS.PARAMETROS,
    false
  );

  if (!hoja || hoja.getLastRow() < 2) return resultado;

  const datos = hoja.getDataRange().getDisplayValues();
  const mapa = crearMapaCabeceras(datos[0]);

  if (
    typeof mapa.CLAVE !== "number" ||
    typeof mapa.VALOR !== "number" ||
    typeof mapa.ESTADO !== "number"
  ) {
    return resultado;
  }

  for (let i = 1; i < datos.length; i++) {
    if (normalizarTexto(datos[i][mapa.ESTADO]) !== CONFIG.ESTADOS.ACTIVO) continue;
    const clave = normalizarTexto(datos[i][mapa.CLAVE]);
    if (clave) resultado[clave] = String(datos[i][mapa.VALOR] || "").trim();
  }

  return resultado;
}

/**
 * Devuelve el primer recurso activo disponible según el orden indicado.
 *
 * Para conservar privacidad y evitar depender de una URL externa, el archivo
 * de Drive se convierte a Data URL. Los recursos pequeños se guardan en caché
 * para reducir lecturas repetidas de Drive.
 *
 * @param {Array<string>} claves Claves ordenadas por prioridad.
 * @return {{dataUrl:string, clave:string}}
 * @private
 */
function obtenerPrimerRecursoCargaComoDataUrlMotor_(
  claves
) {
  const resultadoVacio = {
    dataUrl: "",
    clave: ""
  };

  const prioridades =
    Array.isArray(claves)
      ? claves
          .map(normalizarTexto)
          .filter(Boolean)
      : [];

  for (
    let i = 0;
    i < prioridades.length;
    i++
  ) {
    const clave =
      prioridades[i];

    const fuente =
      obtenerFuenteRecursoVisualMotor_(
        clave
      );

    if (fuente) {
      return {
        dataUrl: fuente,
        clave: clave
      };
    }
  }

  return resultadoVacio;
}

/**
 * Valida un color hexadecimal para inyectarlo como variable CSS.
 *
 * @param {*} valor Color recibido.
 * @param {string} respaldo Color predeterminado.
 * @return {string}
 * @private
 */

function diagnosticarRecursosVisualesPaso30D() {
  invalidarCacheMotor_("CONFIG");

  RECURSOS_VISUALES_MEMORIA_PASO30D_ = {};

  const recursos =
    listarRecursosVisualesMotorPaso30D_()
      .filter(function(item) {
        return (
          item.estado ===
          CONFIG.ESTADOS.ACTIVO
        );
      });

  const resultados =
    recursos.map(function(recurso) {
      const inicio =
        Date.now();

      const idDrive =
        recurso.idArchivo ||
        extraerIdDriveRecursoVisualPaso30D_(
          recurso.urlPublica
        );

      let fuente = "";
      let error = "";

      try {
        fuente =
          obtenerFuenteRecursoVisualMotor_(
            recurso.clave
          );
      } catch (ex) {
        error =
          ex.message ||
          String(ex);
      }

      return {
        clave:
          recurso.clave,
        tipo:
          recurso.tipo,
        version:
          recurso.version,
        origen:
          idDrive
            ? "DRIVE_PRIVADO_DATA_URL"
            : (
                recurso.urlPublica
                  ? "EXTERNO"
                  : "SIN_FUENTE"
              ),
        disponible:
          Boolean(fuente),
        esDataUrl:
          /^data:image\//i.test(
            fuente
          ),
        longitud:
          fuente.length,
        ms:
          Date.now() - inicio,
        error:
          error
      };
    });

  const resultado = {
    correcto:
      resultados.every(function(item) {
        return (
          item.disponible ||
          item.origen === "SIN_FUENTE"
        );
      }),

    paso: "30D",

    total:
      resultados.length,

    recursos:
      resultados,

    mensaje:
      "Los recursos respaldados por Drive deben aparecer como DRIVE_PRIVADO_DATA_URL y no requieren permiso directo del navegador."
  };

  console.log(
    "DIAGNOSTICO_RECURSOS_VISUALES_PASO30D\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarRecursosVisualesPaso30D() {
  invalidarCacheMotor_("CONFIG");

  RECURSOS_VISUALES_MEMORIA_PASO30D_ = {};

  // Eliminar únicamente URLs Drive heredadas de la tabla cuando ya existe
  // un ID_ARCHIVO. URLs externas reales se conservan.
  const hoja =
    obtenerHojaMotor_(
      MOTOR_SGT360.BASES.CONFIG,
      CONFIG.HOJAS.RECURSOS,
      false
    );

  let urlsDriveLimpiadas = 0;

  if (
    hoja &&
    hoja.getLastRow() >= 2
  ) {
    const rango =
      hoja.getDataRange();

    const valores =
      rango.getValues();

    const mapa =
      crearMapaCabeceras(
        valores[0]
      );

    if (
      typeof mapa.ID_ARCHIVO === "number" &&
      typeof mapa.URL_PUBLICA === "number"
    ) {
      let cambio = false;

      for (
        let i = 1;
        i < valores.length;
        i++
      ) {
        const idArchivo =
          String(
            valores[i][
              mapa.ID_ARCHIVO
            ] || ""
          ).trim();

        const url =
          String(
            valores[i][
              mapa.URL_PUBLICA
            ] || ""
          ).trim();

        if (
          idArchivo &&
          url &&
          esUrlDriveRecursoVisualPaso30D_(
            url
          )
        ) {
          valores[i][
            mapa.URL_PUBLICA
          ] = "";

          urlsDriveLimpiadas++;
          cambio = true;
        }
      }

      if (cambio) {
        rango.setValues(valores);
        SpreadsheetApp.flush();
      }
    }
  }

  const faviconProp =
    obtenerPropiedadMotor_(
      PROPIEDADES_MOTOR_SGT360.FAVICON_URL,
      ""
    );

  if (
    faviconProp &&
    esUrlDriveRecursoVisualPaso30D_(
      faviconProp
    )
  ) {
    PropertiesService
      .getScriptProperties()
      .deleteProperty(
        PROPIEDADES_MOTOR_SGT360.FAVICON_URL
      );
  }

  invalidarCacheMotor_("CONFIG");

  const diagnostico =
    diagnosticarRecursosVisualesPaso30D();

  const resultado = {
    correcto:
      diagnostico.correcto,
    paso: "30D",
    urlsDriveLimpiadas:
      urlsDriveLimpiadas,
    recursos:
      diagnostico,
    mensaje:
      "Paso 30D aplicado. Las imágenes de Drive se entregan mediante Apps Script como Data URL; no dependen del permiso directo del usuario sobre Drive."
  };

  console.log(
    "ACTUALIZACION_RECURSOS_VISUALES_PASO30D\n" +
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

function actualizarAplicacionPaso30D() {
  const visuales =
    actualizarRecursosVisualesPaso30D();

  const ventas =
    typeof actualizarModuloVentasContadoPaso30D ===
      "function"
      ? actualizarModuloVentasContadoPaso30D()
      : {
          correcto: false,
          omitido: true,
          mensaje:
            "No se encontró actualizarModuloVentasContadoPaso30D(). Reemplaza primero GS_340."
        };

  return {
    correcto:
      visuales.correcto &&
      ventas.correcto !== false,
    paso: "30D",
    recursosVisuales:
      visuales,
    ventas:
      ventas
  };
}

function normalizarColorCargaInicialMotor_(valor, respaldo) {
  const color = String(valor || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : respaldo;
}

/**
 * Obtiene recurso como datos URL.
 */
function obtenerRecursoComoDataUrl(
  claveRecurso
) {
  return obtenerFuenteRecursoVisualMotor_(
    claveRecurso
  );
}

/**
 * Compatibilidad histórica.
 *
 * Desde Paso 30D NO devuelve una URL directa de Drive.
 * Si el recurso vive en Drive devuelve Data URL; si es externo, devuelve HTTPS.
 */
function obtenerUrlPublicaRecursoVisual(
  claveRecurso
) {
  return obtenerFuenteRecursoVisualMotor_(
    claveRecurso
  );
}
