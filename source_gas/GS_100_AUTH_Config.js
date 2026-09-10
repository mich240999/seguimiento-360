/**
 * SGT360 — Configuración OAuth de Google
 *
 * Responsabilidad:
 * Administra propiedades OAuth, diagnósticos, redirect URI, dominios permitidos y
 * duración de sesiones.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * PASO 13A: configuración base de autenticación con Google.
 *
 * Las credenciales OAuth se guardan en Propiedades del script.
 * El CLIENT_SECRET nunca debe enviarse al navegador ni escribirse
 * directamente dentro de un archivo HTML.
 */

const AUTH_CONFIG_PASO_13 = Object.freeze({
  PROPIEDADES: Object.freeze({
    CLIENT_ID: "SGT360_AUTH_GOOGLE_CLIENT_ID",

    CLIENT_SECRET: "SGT360_AUTH_GOOGLE_CLIENT_SECRET",

    REDIRECT_URI: "SGT360_AUTH_GOOGLE_REDIRECT_URI",

    DOMINIOS_PERMITIDOS: "SGT360_AUTH_GOOGLE_DOMINIOS_PERMITIDOS",

    HORAS_SESION: "SGT360_AUTH_HORAS_SESION"
  }),

  VALORES_PREDETERMINADOS: Object.freeze({
    HORAS_SESION: 8
  }),

  GOOGLE: Object.freeze({
    AUTORIZACION_URL: "https://accounts.google.com/o/oauth2/v2/auth",

    TOKEN_URL: "https://oauth2.googleapis.com/token",

    TOKENINFO_URL: "https://oauth2.googleapis.com/tokeninfo",

    EMISORES_VALIDOS: Object.freeze([
      "accounts.google.com",
      "https://accounts.google.com"
    ]),

    SCOPES: "openid email profile"
  })
});

/**
 * Diagnostica la preparación del proyecto para la autenticación Google.
 *
 * Esta función no crea sesiones ni modifica usuarios.
 *
 * @return {Object}
 */
function diagnosticarConfiguracionAuthPaso13A() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const clientId =
    obtenerPropiedadAuthPaso13A_(
      propiedades,
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .CLIENT_ID
    );

  const clientSecret =
    obtenerPropiedadAuthPaso13A_(
      propiedades,
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .CLIENT_SECRET
    );

  const dominios =
    obtenerDominiosPermitidosAuthPaso13A_(
      propiedades
    );

  const horasSesion =
    obtenerHorasSesionAuthPaso13A_(
      propiedades
    );

  const urlWebApp =
    obtenerUrlWebAppAuthPaso13A_();

  const validacionRedirectUri =
    validarRedirectUriAuthPaso13A_(
      urlWebApp,
      false
    );

  const validacionClientId =
    validarFormatoClientIdAuthPaso13A_(
      clientId,
      false
    );

  const validacionClientSecret =
    validarFormatoClientSecretAuthPaso13A_(
      clientSecret,
      false
    );

  const hojas =
    diagnosticarHojasAuthPaso13A_();

  const recursos =
    diagnosticarRecursosAuthPaso13A_();

  const usuarioActivo =
    String(
      Session
      .getActiveUser()
      .getEmail() || ""
    )
    .trim()
    .toLowerCase();

  const usuarioEfectivo =
    String(
      Session
      .getEffectiveUser()
      .getEmail() || ""
    )
    .trim()
    .toLowerCase();

  const errores = [];

  if (!validacionRedirectUri.valido) {
    errores.push(
      validacionRedirectUri.mensaje
    );
  }

  if (!validacionClientId.valido) {
    errores.push(
      validacionClientId.mensaje
    );
  }

  if (!validacionClientSecret.valido) {
    errores.push(
      validacionClientSecret.mensaje
    );
  }

  hojas
    .filter(function(resultado) {
      return resultado.correcto !== true;
    })
    .forEach(function(resultado) {
      errores.push(
        resultado.mensaje
      );
    });

  if (!recursos.logoLoginConfigurado) {
    errores.push(
      "CONFIG.RECURSOS.CLAVES.LOGO_LOGIN no está disponible."
    );
  }

  return {
    correcto: errores.length === 0,

    paso: "13A",

    modo: "OAUTH_2_AUTHORIZATION_CODE",

    configuracion: {
      clientIdConfigurado: Boolean(clientId),

      clientIdEnmascarado: enmascararClientIdAuthPaso13A_(
        clientId
      ),

      clientSecretConfigurado: Boolean(clientSecret),

      dominiosPermitidos: dominios,

      horasSesion: horasSesion,

      scopes: AUTH_CONFIG_PASO_13
        .GOOGLE
        .SCOPES
    },

    despliegue: {
      urlWebApp: urlWebApp,

      redirectUri: urlWebApp,

      redirectUriProduccion: validacionRedirectUri.valido,

      ejecutarComoRecomendado: "USUARIO_QUE_IMPLEMENTA",

      accesoRecomendado: "CUALQUIER_USUARIO_INCLUSO_ANONIMO",

      justificacion: "El callback OAuth multiproveedor y las sesiones internas requieren acceso público al despliegue; la autorización real se valida contra USUARIOS."
    },

    identidadActual: {
      correoActivo: usuarioActivo,

      correoEfectivo: usuarioEfectivo,

      coincide: Boolean(
        usuarioActivo &&
        usuarioEfectivo &&
        usuarioActivo ===
        usuarioEfectivo
      )
    },

    hojas: hojas,

    recursos: recursos,

    errores: errores,

    mensaje: errores.length === 0 ?
      "La configuración base de autenticación está preparada." :
      (
        "La configuración todavía tiene " +
        errores.length +
        " observación(es)."
      )
  };
}

/**
 * Devuelve únicamente datos públicos requeridos por la pantalla de acceso.
 *
 * No expone el CLIENT_SECRET.
 *
 * @return {Object}
 */
function obtenerConfiguracionPublicaAuthPaso13A() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const clientId =
    obtenerPropiedadAuthPaso13A_(
      propiedades,
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .CLIENT_ID
    );

  validarFormatoClientIdAuthPaso13A_(
    clientId,
    true
  );

  let logoLogin = "";

  if (
    typeof obtenerRecursoComoDataUrl ===
    "function" &&
    CONFIG &&
    CONFIG.RECURSOS &&
    CONFIG.RECURSOS.CLAVES &&
    CONFIG.RECURSOS.CLAVES.LOGO_LOGIN
  ) {
    try {
      logoLogin =
        obtenerRecursoComoDataUrl(
          CONFIG.RECURSOS.CLAVES.LOGO_LOGIN
        ) || "";
    } catch (error) {
      console.warn(
        "No fue posible cargar LOGO_LOGIN: %s",
        error.message
      );
    }
  }

  return {
    aplicacion: {
      nombre: CONFIG.APP.NOMBRE,

      version: CONFIG.APP.VERSION
    },

    google: {
      clientId: clientId,

      scopes: AUTH_CONFIG_PASO_13
        .GOOGLE
        .SCOPES
    },

    recursos: {
      logoLogin: logoLogin
    }
  };
}

/**
 * Guarda o reemplaza la configuración OAuth.
 *
 * Está diseñada para ser invocada manualmente desde el editor
 * durante la instalación. No debe exponerse desde la interfaz pública.
 *
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string|string[]=} dominiosPermitidos
 * @param {number=} horasSesion
 * @return {Object}
 */
function configurarOAuthGooglePaso13A(
  clientId,
  clientSecret,
  dominiosPermitidos,
  horasSesion,
  redirectUri
) {
  validarFormatoClientIdAuthPaso13A_(
    clientId,
    true
  );

  validarFormatoClientSecretAuthPaso13A_(
    clientSecret,
    true
  );

  const dominios =
    normalizarDominiosAuthPaso13A_(
      dominiosPermitidos
    );

  const horas =
    normalizarHorasSesionAuthPaso13A_(
      horasSesion
    );

  const uriRedireccion =
    String(
      redirectUri || ""
    ).trim();

  validarRedirectUriAuthPaso13A_(
    uriRedireccion,
    true
  );

  PropertiesService
    .getScriptProperties()
    .setProperties({
        SGT360_AUTH_GOOGLE_CLIENT_ID: String(clientId).trim(),

        SGT360_AUTH_GOOGLE_CLIENT_SECRET: String(clientSecret).trim(),

        SGT360_AUTH_GOOGLE_REDIRECT_URI: uriRedireccion,

        SGT360_AUTH_GOOGLE_DOMINIOS_PERMITIDOS: dominios.join(","),

        SGT360_AUTH_HORAS_SESION: String(horas)
      },
      false
    );

  return diagnosticarConfiguracionAuthPaso13A();
}

/**
 * Borra exclusivamente las propiedades OAuth del paso 13.
 *
 * @return {Object}
 */
function limpiarConfiguracionOAuthGooglePaso13A() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  Object.keys(
    AUTH_CONFIG_PASO_13.PROPIEDADES
  ).forEach(function(clave) {
    propiedades.deleteProperty(
      AUTH_CONFIG_PASO_13
      .PROPIEDADES[clave]
    );
  });

  return {
    correcto: true,
    paso: "13A",
    mensaje: "Las propiedades OAuth de SEGUIMIENTO 360 fueron eliminadas."
  };
}

/**
 * Obtiene las credenciales privadas para uso exclusivo del servidor.
 *
 * @return {Object}
 * @private
 */
function obtenerCredencialesOAuthPrivadasPaso13_() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const clientId =
    obtenerPropiedadAuthPaso13A_(
      propiedades,
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .CLIENT_ID
    );

  const clientSecret =
    obtenerPropiedadAuthPaso13A_(
      propiedades,
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .CLIENT_SECRET
    );

  validarFormatoClientIdAuthPaso13A_(
    clientId,
    true
  );

  validarFormatoClientSecretAuthPaso13A_(
    clientSecret,
    true
  );

  return {
    clientId: clientId,

    clientSecret: clientSecret,

    dominiosPermitidos: obtenerDominiosPermitidosAuthPaso13A_(
      propiedades
    ),

    horasSesion: obtenerHorasSesionAuthPaso13A_(
      propiedades
    ),

    redirectUri: obtenerUrlWebAppAuthPaso13A_()
  };
}

/**
 * Obtiene la URL actual del despliegue web.
 *
 * @return {string}
 * @private
 */
function obtenerUrlWebAppAuthPaso13A_() {
  const configurada =
    String(
      PropertiesService
      .getScriptProperties()
      .getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .REDIRECT_URI
      ) || ""
    ).trim();

  if (configurada) {
    return configurada;
  }

  try {
    return String(
      ScriptApp
      .getService()
      .getUrl() || ""
    ).trim();
  } catch (error) {
    return "";
  }
}

/**
 * Valida redirect uri autenticación paso13 a. Función interna del motor.
 */
function validarRedirectUriAuthPaso13A_(
  redirectUri,
  lanzarError
) {
  const valor =
    String(
      redirectUri || ""
    ).trim();

  let mensaje = "";
  let valido = true;

  if (!valor) {
    valido = false;
    mensaje =
      "Configura SGT360_AUTH_GOOGLE_REDIRECT_URI con la URL de producción del despliegue web.";
  } else if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i
    .test(valor)
  ) {
    valido = false;

    if (/\/dev(?:\?|$)/i.test(valor)) {
      mensaje =
        "La URI detectada termina en /dev. Copia la URL de producción terminada en /exec desde Administrar implementaciones y guárdala como SGT360_AUTH_GOOGLE_REDIRECT_URI.";
    } else {
      mensaje =
        "SGT360_AUTH_GOOGLE_REDIRECT_URI debe ser la URL completa de producción de Apps Script terminada en /exec.";
    }
  } else {
    mensaje =
      "URI de redireccionamiento de producción válida.";
  }

  if (
    lanzarError &&
    !valido
  ) {
    throw new Error(
      mensaje
    );
  }

  return {
    valido: valido,

    mensaje: mensaje
  };
}

/**
 * Diagnostica las hojas requeridas por sesiones y auditoría.
 *
 * @return {Array<Object>}
 * @private
 */
function diagnosticarHojasAuthPaso13A_() {
  const definiciones = [{
    clave: "USUARIOS",

    cabecerasMinimas: [
      "ID_USUARIO",
      "CORREO",
      "NOMBRE",
      "ROL",
      "ID_PROVEEDOR",
      "ESTADO",
      "TIPO_DOCUMENTO",
      "NUMERO_DOCUMENTO",
      "TELEFONO"
    ]
  }, {
    clave: "SESIONES_USUARIOS",

    cabecerasMinimas: [
      "ID_SESION",
      "ID_USUARIO",
      "CORREO",
      "ROL",
      "FECHA_INICIO",
      "ULTIMA_ACTIVIDAD",
      "FECHA_FIN",
      "ESTADO"
    ]
  }, {
    clave: "AUDITORIA_ACCESOS",

    cabecerasMinimas: [
      "ID_AUDITORIA_ACCESO",
      "FECHA_HORA",
      "ID_USUARIO",
      "CORREO",
      "ROL",
      "ACCION",
      "RESULTADO",
      "ID_SESION"
    ]
  }];

  return definiciones.map(
    function(definicion) {
      const nombreHoja =
        CONFIG.HOJAS[
          definicion.clave
        ];

      const hoja =
        obtenerHojaMotor_(
          MOTOR_SGT360.BASES.SECURITY,
          nombreHoja,
          false
        );

      if (!hoja) {
        return {
          clave: definicion.clave,

          hoja: nombreHoja,

          correcto: false,

          mensaje: "No existe la hoja " +
            nombreHoja +
            "."
        };
      }

      const ultimaColumna =
        hoja.getLastColumn();

      const cabeceras =
        ultimaColumna > 0 ?
        hoja
        .getRange(
          1,
          1,
          1,
          ultimaColumna
        )
        .getDisplayValues()[0]
        .map(function(valor) {
          return String(valor || "")
            .trim()
            .toUpperCase();
        }) :
        [];

      const faltantes =
        definicion
        .cabecerasMinimas
        .filter(function(cabecera) {
          return !cabeceras.includes(
            cabecera
          );
        });

      return {
        clave: definicion.clave,

        hoja: nombreHoja,

        correcto: faltantes.length === 0,

        columnasDetectadas: cabeceras.length,

        faltantes: faltantes,

        mensaje: faltantes.length === 0 ?
          (
            "La hoja " +
            nombreHoja +
            " está disponible."
          ) :
          (
            "La hoja " +
            nombreHoja +
            " no contiene: " +
            faltantes.join(", ") +
            "."
          )
      };
    }
  );
}

/**
 * Diagnostica recursos requeridos para la pantalla de acceso.
 *
 * @return {Object}
 * @private
 */
function diagnosticarRecursosAuthPaso13A_() {
  const claveLogoLogin =
    CONFIG &&
    CONFIG.RECURSOS &&
    CONFIG.RECURSOS.CLAVES ?
    String(
      CONFIG.RECURSOS
      .CLAVES
      .LOGO_LOGIN || ""
    ).trim() :
    "";

  return {
    logoLoginConfigurado: Boolean(claveLogoLogin),

    claveLogoLogin: claveLogoLogin,

    tieneLectorRecursos: typeof obtenerRecursoComoDataUrl ===
      "function"
  };
}

/**
 * Lee una propiedad y normaliza espacios.
 *
 * @param {GoogleAppsScript.Properties.Properties} propiedades
 * @param {string} clave
 * @return {string}
 * @private
 */
function obtenerPropiedadAuthPaso13A_(
  propiedades,
  clave
) {
  return String(
    propiedades.getProperty(
      clave
    ) || ""
  ).trim();
}

/**
 * Valida el formato del OAuth Client ID.
 *
 * @param {string} clientId
 * @param {boolean} lanzarError
 * @return {Object}
 * @private
 */
function validarFormatoClientIdAuthPaso13A_(
  clientId,
  lanzarError
) {
  const valor =
    String(clientId || "").trim();

  const valido =
    /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i
    .test(valor);

  const mensaje =
    valido ?
    "OAuth Client ID válido." :
    (
      "Configura SGT360_AUTH_GOOGLE_CLIENT_ID con un Client ID de aplicación web."
    );

  if (
    lanzarError &&
    !valido
  ) {
    throw new Error(
      mensaje
    );
  }

  return {
    valido: valido,

    mensaje: mensaje
  };
}

/**
 * Valida la presencia del Client Secret.
 *
 * @param {string} clientSecret
 * @param {boolean} lanzarError
 * @return {Object}
 * @private
 */
function validarFormatoClientSecretAuthPaso13A_(
  clientSecret,
  lanzarError
) {
  const valor =
    String(
      clientSecret || ""
    ).trim();

  const valido =
    valor.length >= 16;

  const mensaje =
    valido ?
    "OAuth Client Secret configurado." :
    (
      "Configura SGT360_AUTH_GOOGLE_CLIENT_SECRET en Propiedades del script."
    );

  if (
    lanzarError &&
    !valido
  ) {
    throw new Error(
      mensaje
    );
  }

  return {
    valido: valido,

    mensaje: mensaje
  };
}

/**
 * Obtiene dominios permitidos.
 *
 * Una lista vacía significa que el acceso se controla únicamente
 * mediante la hoja USUARIOS.
 *
 * @param {GoogleAppsScript.Properties.Properties} propiedades
 * @return {Array<string>}
 * @private
 */
function obtenerDominiosPermitidosAuthPaso13A_(
  propiedades
) {
  return normalizarDominiosAuthPaso13A_(
    propiedades.getProperty(
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .DOMINIOS_PERMITIDOS
    )
  );
}

/**
 * Normaliza dominios permitidos.
 *
 * @param {string|string[]=} entrada
 * @return {Array<string>}
 * @private
 */
function normalizarDominiosAuthPaso13A_(
  entrada
) {
  const valores =
    Array.isArray(entrada) ?
    entrada :
    String(entrada || "")
    .split(",");

  const unicos = {};

  valores.forEach(function(valor) {
    const dominio =
      String(valor || "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "");

    if (
      dominio &&
      /^[a-z0-9.-]+\.[a-z]{2,}$/i
      .test(dominio)
    ) {
      unicos[dominio] = true;
    }
  });

  return Object.keys(
    unicos
  ).sort();
}

/**
 * Obtiene la duración de sesión configurada.
 *
 * @param {GoogleAppsScript.Properties.Properties} propiedades
 * @return {number}
 * @private
 */
function obtenerHorasSesionAuthPaso13A_(
  propiedades
) {
  return normalizarHorasSesionAuthPaso13A_(
    propiedades.getProperty(
      AUTH_CONFIG_PASO_13
      .PROPIEDADES
      .HORAS_SESION
    )
  );
}

/**
 * Normaliza la duración entre 1 y 24 horas.
 *
 * @param {number|string=} entrada
 * @return {number}
 * @private
 */
function normalizarHorasSesionAuthPaso13A_(
  entrada
) {
  const numero =
    Number(entrada);

  if (
    Number.isFinite(numero) &&
    numero >= 1 &&
    numero <= 24
  ) {
    return Math.floor(
      numero
    );
  }

  return AUTH_CONFIG_PASO_13
    .VALORES_PREDETERMINADOS
    .HORAS_SESION;
}

/**
 * Enmascara un Client ID para diagnósticos.
 *
 * @param {string} clientId
 * @return {string}
 * @private
 */
function enmascararClientIdAuthPaso13A_(
  clientId
) {
  const valor =
    String(clientId || "").trim();

  if (!valor) {
    return "";
  }

  if (valor.length <= 24) {
    return "********";
  }

  return (
    valor.slice(0, 12) +
    "..." +
    valor.slice(-18)
  );
}

/**
 * Ejecuta el diagnóstico y muestra el resultado completo en el registro.
 *
 * Esta es la función que debe ejecutarse manualmente desde el editor.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoAuthPaso13A() {
  const resultado =
    diagnosticarConfiguracionAuthPaso13A();

  const texto =
    JSON.stringify(
      resultado,
      null,
      2
    );

  console.log(texto);
  Logger.log(texto);

  return resultado;
}
