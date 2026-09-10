/**
 * SGT360 — Autenticación con Microsoft
 *
 * Responsabilidad:
 * Implementa OAuth/OIDC con Microsoft Entra, consulta Graph y crea sesiones
 * internas.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * OAuth 2.0 / OpenID Connect con Microsoft Identity Platform.
 *
 * Requiere las propiedades:
 * - SGT360_AUTH_MICROSOFT_CLIENT_ID
 * - SGT360_AUTH_MICROSOFT_CLIENT_SECRET
 * - SGT360_AUTH_MICROSOFT_TENANT
 * - SGT360_AUTH_MICROSOFT_REDIRECT_URI
 * - SGT360_AUTH_MICROSOFT_SCOPES
 *
 * Opcional:
 * - SGT360_AUTH_MICROSOFT_DOMINIOS_PERMITIDOS
 *
 * Dependencias existentes:
 * - AUTH_PASO_13C
 * - generarTokenAleatorioOAuthPaso13C_
 * - generarCodeVerifierOAuthPaso13C_
 * - base64UrlSinRellenoOAuthPaso13C_
 * - construirUrlOAuthPaso13C_
 * - decodificarPayloadJwtOAuthPaso13C_
 * - obtenerContextoHojaOAuthPaso13C_
 * - asignarCampoOAuthPaso13C_
 * - insertarAuditoriaOAuthSinBloqueoPaso13C_
 * - registrarAuditoriaOAuthPaso13C_
 * - sha256HexOAuthPaso13C_
 * - enmascararIdSesionOAuthPaso13C_
 * - limitarTextoOAuthPaso13C_
 */

const AUTH_MICROSOFT_PASO_15A = Object.freeze({
  PROPIEDADES: Object.freeze({
    CLIENT_ID: "SGT360_AUTH_MICROSOFT_CLIENT_ID",

    CLIENT_SECRET: "SGT360_AUTH_MICROSOFT_CLIENT_SECRET",

    TENANT: "SGT360_AUTH_MICROSOFT_TENANT",

    TENANT_ID: "SGT360_AUTH_MICROSOFT_TENANT_ID",

    REDIRECT_URI: "SGT360_AUTH_MICROSOFT_REDIRECT_URI",

    SCOPES: "SGT360_AUTH_MICROSOFT_SCOPES",

    DOMINIOS_PERMITIDOS: "SGT360_AUTH_MICROSOFT_DOMINIOS_PERMITIDOS"
  }),

  TENANT_PREDETERMINADO: "common",

  SCOPES_PREDETERMINADOS: "openid profile email User.Read",

  ESTADO_TTL_SEGUNDOS: 600,

  DESFASE_RELOJ_SEGUNDOS: 300,

  PREFIJO_STATE: "MICROSOFT.",

  CLAVE_CACHE_ESTADO: "SGT360_AUTH_MS_STATE_",

  GRAPH_ME_URL: "https://graph.microsoft.com/v1.0/me" +
    "?$select=id,displayName,mail,userPrincipalName"
});

/**
 * Comprueba que las propiedades requeridas estén disponibles.
 *
 * No expone el secreto.
 *
 * @return {Object}
 */
function diagnosticarConfiguracionMicrosoftPaso15A() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const configuracion =
    obtenerConfiguracionPrivadaMicrosoftPaso15A_(
      false
    );

  const errores = [];

  if (!configuracion.clientId) {
    errores.push(
      "Falta SGT360_AUTH_MICROSOFT_CLIENT_ID."
    );
  }

  if (!configuracion.clientSecret) {
    errores.push(
      "Falta SGT360_AUTH_MICROSOFT_CLIENT_SECRET."
    );
  }

  if (
    !configuracion.redirectUri ||
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i
    .test(
      configuracion.redirectUri
    )
  ) {
    errores.push(
      "SGT360_AUTH_MICROSOFT_REDIRECT_URI debe ser la URL de producción terminada en /exec."
    );
  }

  if (
    !/^(common|organizations|consumers|[0-9a-f-]{36})$/i
    .test(
      configuracion.tenant
    )
  ) {
    errores.push(
      "SGT360_AUTH_MICROSOFT_TENANT debe ser common, organizations, consumers o un Tenant ID."
    );
  }

  const scopes =
    configuracion.scopes
    .split(/\s+/)
    .filter(Boolean);

  [
    "openid",
    "User.Read"
  ].forEach(function(scope) {
    if (
      scopes.indexOf(scope) === -1
    ) {
      errores.push(
        "El scope " +
        scope +
        " es obligatorio."
      );
    }
  });

  return {
    correcto: errores.length === 0,

    proveedor: "MICROSOFT",

    clientIdConfigurado: Boolean(
      configuracion.clientId
    ),

    clientIdEnmascarado: enmascararClientIdMicrosoftPaso15A_(
      configuracion.clientId
    ),

    clientSecretConfigurado: Boolean(
      configuracion.clientSecret
    ),

    tenant: configuracion.tenant,

    tenantIdReferencia: configuracion.tenantId,

    redirectUri: configuracion.redirectUri,

    scopes: configuracion.scopes,

    dominiosPermitidos: configuracion.dominiosPermitidos,

    autorizacionUrl: configuracion.autorizacionUrl,

    tokenUrl: configuracion.tokenUrl,

    graphMeUrl: AUTH_MICROSOFT_PASO_15A
      .GRAPH_ME_URL,

    errores: errores,

    mensaje: errores.length === 0 ?
      "La configuración Microsoft está preparada." :
      (
        "La configuración Microsoft tiene " +
        errores.length +
        " observación(es)."
      )
  };
}

/**
 * Ejecuta el diagnóstico Microsoft y publica el detalle completo en el
 * registro de ejecución de Apps Script.
 *
 * Esta función es el punto recomendado para realizar la prueba manual desde
 * el editor. Mantiene diagnosticarConfiguracionMicrosoftPaso15A() como una
 * función reutilizable que únicamente construye y devuelve el resultado.
 *
 * Uso:
 * 1. Seleccionar ejecutarDiagnosticoMicrosoftPaso15A en el editor.
 * 2. Presionar Ejecutar.
 * 3. Revisar el panel Registro de ejecución.
 *
 * El Client Secret nunca se incluye en la salida. Solo se informa si está
 * configurado.
 *
 * @return {Object} Resultado completo del diagnóstico Microsoft.
 */
function ejecutarDiagnosticoMicrosoftPaso15A() {
  const resultado =
    diagnosticarConfiguracionMicrosoftPaso15A();

  const detalle =
    JSON.stringify(
      resultado,
      null,
      2
    );

  console.log(detalle);
  Logger.log(detalle);

  return resultado;
}

/**
 * Indica si Microsoft puede mostrarse como proveedor de acceso.
 *
 * @return {boolean}
 * @private
 */
function estaConfiguradoMicrosoftPaso15A_() {
  try {
    return (
      diagnosticarConfiguracionMicrosoftPaso15A()
      .correcto === true
    );
  } catch (error) {
    return false;
  }
}

/**
 * Prepara una solicitud OAuth Microsoft de un solo uso.
 *
 * @param {Object=} datosCliente
 * @return {Object}
 */
function crearSolicitudOAuthMicrosoftPaso15A(
  datosCliente
) {
  const configuracion =
    obtenerConfiguracionPrivadaMicrosoftPaso15A_(
      true
    );

  const datos =
    normalizarDatosClienteMicrosoftPaso15A_(
      datosCliente
    );

  const state =
    AUTH_MICROSOFT_PASO_15A
    .PREFIJO_STATE +
    generarTokenAleatorioOAuthPaso13C_(
      "STATE"
    );

  const nonce =
    generarTokenAleatorioOAuthPaso13C_(
      "NONCE"
    );

  const codeVerifier =
    generarCodeVerifierOAuthPaso13C_();

  const codeChallenge =
    base64UrlSinRellenoOAuthPaso13C_(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        codeVerifier,
        Utilities.Charset.UTF_8
      )
    );

  const ahora =
    new Date();

  const vence =
    new Date(
      ahora.getTime() +
      AUTH_MICROSOFT_PASO_15A
      .ESTADO_TTL_SEGUNDOS *
      1000
    );

  const contexto = {
    proveedor: "MICROSOFT",

    state: state,

    nonce: nonce,

    codeVerifier: codeVerifier,

    creadoEn: ahora.toISOString(),

    venceEn: vence.toISOString(),

    origen: datos.origen,

    userAgent: datos.userAgent
  };

  CacheService
    .getScriptCache()
    .put(
      obtenerClaveEstadoMicrosoftPaso15A_(
        state
      ),
      JSON.stringify(
        contexto
      ),
      AUTH_MICROSOFT_PASO_15A
      .ESTADO_TTL_SEGUNDOS
    );

  const parametros = {
    client_id: configuracion.clientId,

    response_type: "code",

    redirect_uri: configuracion.redirectUri,

    response_mode: "query",

    scope: configuracion.scopes,

    state: state,

    nonce: nonce,

    prompt: "select_account",

    code_challenge: codeChallenge,

    code_challenge_method: "S256"
  };

  return {
    correcto: true,

    proveedor: "MICROSOFT",

    urlAutorizacion: construirUrlOAuthPaso13C_(
      configuracion.autorizacionUrl,
      parametros
    ),

    venceEn: vence.toISOString(),

    almacenamiento: {
      claveToken: AUTH_PASO_13C
        .ALMACENAMIENTO_NAVEGADOR
        .TOKEN,

      claveSesion: AUTH_PASO_13C
        .ALMACENAMIENTO_NAVEGADOR
        .SESION
    },

    mensaje: "Solicitud OAuth Microsoft preparada."
  };
}

/**
 * Procesa el callback OAuth de Microsoft.
 *
 * @param {Object} parametros
 * @return {Object}
 * @private
 */
function procesarCallbackOAuthMicrosoftPaso15A_(
  parametros
) {
  let contextoEstado = null;
  let identidad = null;
  let usuario = null;

  try {
    const state =
      String(
        parametros &&
        parametros.state ||
        ""
      ).trim();

    if (
      !state ||
      state.indexOf(
        AUTH_MICROSOFT_PASO_15A
        .PREFIJO_STATE
      ) !== 0
    ) {
      throw crearErrorMicrosoftPaso15A_(
        "STATE_AUSENTE",
        "La respuesta de Microsoft no contiene un estado de seguridad válido."
      );
    }

    contextoEstado =
      consumirEstadoMicrosoftPaso15A_(
        state
      );

    const errorMicrosoft =
      String(
        parametros.error || ""
      ).trim();

    if (errorMicrosoft) {
      const descripcion =
        limitarTextoOAuthPaso13C_(
          parametros.error_description ||
          "",
          500
        );

      throw crearErrorMicrosoftPaso15A_(
        errorMicrosoft ===
        "access_denied" ?
        "ACCESO_CANCELADO" :
        "ERROR_MICROSOFT",
        errorMicrosoft ===
        "access_denied" ?
        "El acceso con Microsoft fue cancelado." :
        (
          "Microsoft no pudo completar el inicio de sesión." +
          (
            descripcion ?
            " " + descripcion :
            ""
          )
        )
      );
    }

    const codigo =
      String(
        parametros.code || ""
      ).trim();

    if (!codigo) {
      throw crearErrorMicrosoftPaso15A_(
        "CODIGO_AUSENTE",
        "Microsoft no devolvió el código de autorización."
      );
    }

    const configuracion =
      obtenerConfiguracionPrivadaMicrosoftPaso15A_(
        true
      );

    const tokens =
      intercambiarCodigoMicrosoftPaso15A_(
        codigo,
        contextoEstado,
        configuracion
      );

    const claims =
      validarClaimsIdTokenMicrosoftPaso15A_(
        tokens.id_token,
        contextoEstado,
        configuracion
      );

    const perfil =
      obtenerPerfilMicrosoftPaso15A_(
        tokens.access_token
      );

    identidad =
      construirIdentidadMicrosoftPaso15A_(
        perfil,
        claims
      );

    validarDominioMicrosoftPaso15A_(
      identidad.email,
      configuracion.dominiosPermitidos
    );

    usuario =
      validarUsuarioMicrosoftPaso15A_(
        identidad.email
      );

    const sesion =
      crearSesionMicrosoftPaso15A_(
        usuario,
        identidad,
        contextoEstado,
        configuracion.horasSesion
      );

    return {
      correcto: true,

      proveedor: "MICROSOFT",

      estado: "SESION_CREADA",

      usuario: {
        idUsuario: usuario.idUsuario,

        correo: usuario.correo,

        nombre: usuario.nombre,

        rol: usuario.rol,

        idProveedor: usuario.idProveedor || "",

        proveedorIdentidad: "MICROSOFT"
      },

      sesion: {
        token: sesion.token,

        idSesionEnmascarado: enmascararIdSesionOAuthPaso13C_(
          sesion.idSesion
        ),

        fechaInicio: sesion.fechaInicio.toISOString(),

        fechaExpiracion: sesion.fechaExpiracion.toISOString(),

        horasVigencia: configuracion.horasSesion
      },

      almacenamiento: {
        claveToken: AUTH_PASO_13C
          .ALMACENAMIENTO_NAVEGADOR
          .TOKEN,

        claveSesion: AUTH_PASO_13C
          .ALMACENAMIENTO_NAVEGADOR
          .SESION
      },

      urlRetorno: construirUrlRetornoMicrosoftPaso23AR1_("OK"),

      mensaje: "La cuenta Microsoft fue validada y la sesión técnica se creó correctamente."
    };
  } catch (error) {
    const codigoError =
      String(
        error &&
        error.codigoOAuth ||
        "ERROR_MICROSOFT"
      ).trim();

    const mensaje =
      obtenerMensajeSeguroMicrosoftPaso15A_(
        error
      );

    registrarAuditoriaOAuthPaso13C_({
      usuario: usuario || {
        correo: identidad &&
          identidad.email ||
          ""
      },

      accion: "INICIAR_SESION_OAUTH",

      resultado: codigoError ===
        "ACCESO_CANCELADO" ?
        AUTH_PASO_13C
        .RESULTADOS_AUDITORIA
        .DENEGADO :
        AUTH_PASO_13C
        .RESULTADOS_AUDITORIA
        .ERROR,

      motivo: mensaje,

      origen: "OAUTH_MICROSOFT",

      detalle: {
        codigo: codigoError,

        microsoftObjectId: identidad &&
          identidad.objectId ||
          "",

        microsoftTenantId: identidad &&
          identidad.tenantId ||
          "",

        userAgent: contextoEstado &&
          contextoEstado.userAgent ||
          ""
      }
    });

    return {
      correcto: false,

      proveedor: "MICROSOFT",

      estado: "ERROR",

      codigo: codigoError,

      mensaje: mensaje,

      urlRetorno: construirUrlRetornoMicrosoftPaso23AR1_("ERROR")
    };
  }
}

/**
 * Intercambia el código por tokens Microsoft.
 *
 * @private
 */
function intercambiarCodigoMicrosoftPaso15A_(
  codigo,
  contextoEstado,
  configuracion
) {
  const respuesta =
    UrlFetchApp.fetch(
      configuracion.tokenUrl, {
        method: "post",

        contentType: "application/x-www-form-urlencoded",

        payload: {
          client_id: configuracion.clientId,

          client_secret: configuracion.clientSecret,

          code: codigo,

          redirect_uri: configuracion.redirectUri,

          grant_type: "authorization_code",

          code_verifier: contextoEstado.codeVerifier,

          scope: configuracion.scopes
        },

        muteHttpExceptions: true
      }
    );

  const codigoHttp =
    respuesta.getResponseCode();

  const datos =
    parsearJsonMicrosoftPaso15A_(
      respuesta.getContentText()
    );

  if (
    codigoHttp < 200 ||
    codigoHttp >= 300
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "INTERCAMBIO_TOKEN_FALLIDO",
      "No fue posible completar la validación con Microsoft. " +
      limitarTextoOAuthPaso13C_(
        datos.error_description ||
        datos.error ||
        "Respuesta no válida del servidor de tokens.",
        500
      )
    );
  }

  if (!datos.access_token) {
    throw crearErrorMicrosoftPaso15A_(
      "ACCESS_TOKEN_AUSENTE",
      "Microsoft no devolvió el token de acceso requerido."
    );
  }

  if (!datos.id_token) {
    throw crearErrorMicrosoftPaso15A_(
      "ID_TOKEN_AUSENTE",
      "Microsoft no devolvió el token de identidad requerido."
    );
  }

  return datos;
}

/**
 * Valida las claims críticas del ID token recibido directamente
 * desde el endpoint HTTPS de Microsoft.
 *
 * La identidad autorizada se obtiene después mediante Microsoft Graph /me,
 * que valida el access token. El ID token se usa para comprobar nonce,
 * audiencia, vigencia y registrar identificadores externos.
 *
 * @private
 */
function validarClaimsIdTokenMicrosoftPaso15A_(
  idToken,
  contextoEstado,
  configuracion
) {
  const payload =
    decodificarPayloadJwtOAuthPaso13C_(
      idToken
    );

  const ahoraSegundos =
    Math.floor(
      Date.now() / 1000
    );

  const audiencias =
    Array.isArray(
      payload.aud
    ) ?
    payload.aud :
    [
      String(
        payload.aud || ""
      )
    ];

  if (
    audiencias.indexOf(
      configuracion.clientId
    ) === -1
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "AUDIENCIA_INVALIDA",
      "El token Microsoft no pertenece al cliente configurado."
    );
  }

  if (
    String(
      payload.nonce || ""
    ) !==
    String(
      contextoEstado.nonce || ""
    )
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "NONCE_INVALIDO",
      "La respuesta Microsoft no corresponde a la solicitud iniciada."
    );
  }

  const expiracion =
    Number(
      payload.exp || 0
    );

  if (
    !expiracion ||
    expiracion <
    ahoraSegundos -
    AUTH_MICROSOFT_PASO_15A
    .DESFASE_RELOJ_SEGUNDOS
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "TOKEN_EXPIRADO",
      "El token de identidad Microsoft ya venció."
    );
  }

  const emisor =
    String(
      payload.iss || ""
    ).trim();

  if (
    !/^https:\/\/login\.microsoftonline\.com\/[^/]+\/v2\.0$/i
    .test(
      emisor
    )
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "EMISOR_INVALIDO",
      "El emisor del token Microsoft no es válido."
    );
  }

  return {
    sub: String(
      payload.sub || ""
    ).trim(),

    oid: String(
      payload.oid || ""
    ).trim(),

    tid: String(
      payload.tid || ""
    ).trim(),

    email: String(
        payload.email ||
        payload.preferred_username ||
        ""
      )
      .trim()
      .toLowerCase(),

    preferredUsername: String(
        payload.preferred_username ||
        ""
      )
      .trim()
      .toLowerCase(),

    name: String(
      payload.name || ""
    ).trim(),

    issuer: emisor
  };
}

/**
 * Obtiene el perfil del usuario autenticado mediante Microsoft Graph.
 *
 * @private
 */
function obtenerPerfilMicrosoftPaso15A_(
  accessToken
) {
  const respuesta =
    UrlFetchApp.fetch(
      AUTH_MICROSOFT_PASO_15A
      .GRAPH_ME_URL, {
        method: "get",

        headers: {
          Authorization: "Bearer " +
            accessToken,

          Accept: "application/json"
        },

        muteHttpExceptions: true
      }
    );

  const codigoHttp =
    respuesta.getResponseCode();

  const datos =
    parsearJsonMicrosoftPaso15A_(
      respuesta.getContentText()
    );

  if (
    codigoHttp < 200 ||
    codigoHttp >= 300
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "PERFIL_MICROSOFT_FALLIDO",
      "No fue posible obtener el perfil Microsoft. " +
      limitarTextoOAuthPaso13C_(
        datos.error &&
        datos.error.message ||
        "Microsoft Graph rechazó la solicitud.",
        500
      )
    );
  }

  if (!datos.id) {
    throw crearErrorMicrosoftPaso15A_(
      "ID_MICROSOFT_AUSENTE",
      "Microsoft Graph no devolvió el identificador del usuario."
    );
  }

  return datos;
}

/**
 * Consolida el perfil Graph con las claims OIDC.
 *
 * @private
 */
function construirIdentidadMicrosoftPaso15A_(
  perfil,
  claims
) {
  const correo = [
      perfil.mail,
      perfil.userPrincipalName
    ]
    .map(function(valor) {
      return String(
          valor || ""
        )
        .trim()
        .toLowerCase();
    })
    .find(function(valor) {
      return (
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/
        .test(
          valor
        )
      );
    }) || "";

  if (!correo) {
    throw crearErrorMicrosoftPaso15A_(
      "CORREO_AUSENTE",
      "Microsoft Graph no devolvió un correo utilizable para vincular la cuenta con USUARIOS."
    );
  }

  return {
    email: correo,

    name: String(
      perfil.displayName ||
      claims.name ||
      ""
    ).trim(),

    objectId: String(
      perfil.id ||
      ""
    ).trim(),

    tenantId: String(
      claims.tid || ""
    ).trim(),

    subject: String(
      claims.sub || ""
    ).trim(),

    issuer: String(
      claims.issuer || ""
    ).trim()
  };
}

/**
 * Valida el dominio del correo si existe una lista de dominios.
 *
 * @private
 */
function validarDominioMicrosoftPaso15A_(
  correo,
  dominiosPermitidos
) {
  if (
    !Array.isArray(
      dominiosPermitidos
    ) ||
    dominiosPermitidos.length === 0
  ) {
    return;
  }

  const dominio =
    String(
      correo || ""
    )
    .trim()
    .toLowerCase()
    .split("@")
    .pop();

  if (
    !dominio ||
    dominiosPermitidos.indexOf(
      dominio
    ) === -1
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "DOMINIO_NO_AUTORIZADO",
      "La cuenta Microsoft no pertenece a un dominio autorizado."
    );
  }
}

/**
 * Autoriza el correo contra la hoja USUARIOS existente.
 *
 * @private
 */
function validarUsuarioMicrosoftPaso15A_(
  correo
) {
  const usuario =
    buscarUsuarioPorCorreo(
      correo
    );

  if (!usuario) {
    throw crearErrorMicrosoftPaso15A_(
      "USUARIO_NO_REGISTRADO",
      "La cuenta Microsoft no está registrada en " +
      CONFIG.APP.NOMBRE +
      "."
    );
  }

  const estado =
    String(
      usuario.estado || ""
    )
    .trim()
    .toUpperCase();

  if (
    estado !==
    String(
      CONFIG.ESTADOS.ACTIVO
    )
    .trim()
    .toUpperCase()
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "USUARIO_INACTIVO",
      "La cuenta Microsoft está inactiva en " +
      CONFIG.APP.NOMBRE +
      "."
    );
  }

  return {
    idUsuario: String(
      usuario.idUsuario || ""
    ).trim(),

    correo: String(
        usuario.correo || correo
      )
      .trim()
      .toLowerCase(),

    nombre: String(
      usuario.nombre || ""
    ).trim(),

    rol: String(
        usuario.rol || ""
      )
      .trim()
      .toUpperCase(),

    idProveedor: String(
      usuario.idProveedor || ""
    ).trim(),

    estado: estado
  };
}

/**
 * Crea una sesión interna compatible con la compuerta actual.
 *
 * @private
 */
function crearSesionMicrosoftPaso15A_(
  usuario,
  identidad,
  contextoEstado,
  horasSesion
) {
  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(
    30000
  );

  try {
    const ahora =
      new Date();

    const fechaExpiracion =
      new Date(
        ahora.getTime() +
        horasSesion *
        60 *
        60 *
        1000
      );

    const token =
      AUTH_PASO_13C
      .PREFIJO_TOKEN +
      generarTokenAleatorioOAuthPaso13C_(
        "SESSION"
      );

    const idSesion =
      AUTH_PASO_13C
      .PREFIJO_ID_SESION +
      sha256HexOAuthPaso13C_(
        token
      );

    const contextoSesiones =
      obtenerContextoHojaOAuthPaso13C_(
        "SESIONES_USUARIOS",
        [
          "ID_SESION",
          "ID_USUARIO",
          "CORREO",
          "ROL",
          "FECHA_INICIO",
          "ULTIMA_ACTIVIDAD",
          "FECHA_FIN",
          "ESTADO",
          "MODULO_ACTUAL",
          "ORIGEN",
          "USER_AGENT",
          "FECHA_CREACION",
          "FECHA_ACTUALIZACION"
        ]
      );

    const filaSesion =
      new Array(
        contextoSesiones.numeroColumnas
      ).fill("");

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ID_SESION",
      idSesion
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ID_USUARIO",
      usuario.idUsuario
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "CORREO",
      usuario.correo
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ROL",
      usuario.rol
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "FECHA_INICIO",
      ahora
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ULTIMA_ACTIVIDAD",
      ahora
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "FECHA_FIN",
      ""
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ESTADO",
      AUTH_PASO_13C
      .ESTADOS_SESION
      .ABIERTA
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "MODULO_ACTUAL",
      "AUTH"
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "ORIGEN",
      "OAUTH_MICROSOFT"
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "USER_AGENT",
      limitarTextoOAuthPaso13C_(
        contextoEstado.userAgent,
        500
      )
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "FECHA_CREACION",
      ahora
    );

    asignarCampoOAuthPaso13C_(
      filaSesion,
      contextoSesiones.mapa,
      "FECHA_ACTUALIZACION",
      ahora
    );

    contextoSesiones.hoja.appendRow(
      filaSesion
    );

    insertarAuditoriaOAuthSinBloqueoPaso13C_({
      usuario: usuario,

      accion: "INICIAR_SESION_OAUTH",

      resultado: AUTH_PASO_13C
        .RESULTADOS_AUDITORIA
        .AUTORIZADO,

      motivo: "",

      origen: "OAUTH_MICROSOFT",

      idSesion: idSesion,

      detalle: {
        microsoftObjectId: identidad.objectId,

        microsoftTenantId: identidad.tenantId,

        microsoftSubject: identidad.subject,

        issuer: identidad.issuer,

        fechaExpiracion: fechaExpiracion.toISOString(),

        origenInicial: contextoEstado.origen
      }
    });

    SpreadsheetApp.flush();

    return {
      token: token,

      idSesion: idSesion,

      fechaInicio: ahora,

      fechaExpiracion: fechaExpiracion
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Lee y valida las propiedades privadas Microsoft.
 *
 * @param {boolean} lanzarError
 * @return {Object}
 * @private
 */
function obtenerConfiguracionPrivadaMicrosoftPaso15A_(
  lanzarError
) {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const obtener =
    function(clave) {
      return String(
        propiedades.getProperty(
          clave
        ) || ""
      ).trim();
    };

  const clientId =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .CLIENT_ID
    );

  const clientSecret =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .CLIENT_SECRET
    );

  const tenant =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .TENANT
    ) ||
    AUTH_MICROSOFT_PASO_15A
    .TENANT_PREDETERMINADO;

  const tenantId =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .TENANT_ID
    );

  const redirectUri =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .REDIRECT_URI
    );

  const scopes =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .SCOPES
    ) ||
    AUTH_MICROSOFT_PASO_15A
    .SCOPES_PREDETERMINADOS;

  const dominiosPermitidos =
    obtener(
      AUTH_MICROSOFT_PASO_15A
      .PROPIEDADES
      .DOMINIOS_PERMITIDOS
    )
    .split(",")
    .map(function(valor) {
      return String(
          valor || ""
        )
        .trim()
        .toLowerCase()
        .replace(
          /^@+/,
          ""
        );
    })
    .filter(Boolean);

  const horasPropiedad =
    Number(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .HORAS_SESION
      )
    );

  const horasSesion =
    Number.isFinite(
      horasPropiedad
    ) &&
    horasPropiedad > 0 &&
    horasPropiedad <= 24 ?
    horasPropiedad :
    AUTH_CONFIG_PASO_13
    .VALORES_PREDETERMINADOS
    .HORAS_SESION;

  const base =
    "https://login.microsoftonline.com/" +
    tenant;

  const configuracion = {
    clientId: clientId,

    clientSecret: clientSecret,

    tenant: tenant,

    tenantId: tenantId,

    redirectUri: redirectUri,

    scopes: scopes,

    dominiosPermitidos: Array.from(
      new Set(
        dominiosPermitidos
      )
    ),

    horasSesion: horasSesion,

    autorizacionUrl: base +
      "/oauth2/v2.0/authorize",

    tokenUrl: base +
      "/oauth2/v2.0/token"
  };

  if (lanzarError) {
    const diagnostico =
      diagnosticarConfiguracionMicrosoftPaso15A();

    if (
      diagnostico.correcto !== true
    ) {
      throw crearErrorMicrosoftPaso15A_(
        "CONFIGURACION_INCOMPLETA",
        diagnostico.errores.join(" ")
      );
    }
  }

  return configuracion;
}

/**
 * Consume el state Microsoft una sola vez.
 *
 * @private
 */
function consumirEstadoMicrosoftPaso15A_(
  state
) {
  const cache =
    CacheService.getScriptCache();

  const clave =
    obtenerClaveEstadoMicrosoftPaso15A_(
      state
    );

  const texto =
    cache.get(
      clave
    );

  cache.remove(
    clave
  );

  if (!texto) {
    throw crearErrorMicrosoftPaso15A_(
      "STATE_VENCIDO",
      "La solicitud Microsoft venció o ya fue utilizada. Regresa al inicio e inténtalo nuevamente."
    );
  }

  let contexto = null;

  try {
    contexto =
      JSON.parse(
        texto
      );
  } catch (error) {
    contexto = null;
  }

  if (
    !contexto ||
    contexto.proveedor !==
    "MICROSOFT" ||
    String(
      contexto.state || ""
    ) !==
    String(
      state || ""
    )
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "STATE_INVALIDO",
      "El estado de seguridad Microsoft no es válido."
    );
  }

  const vence =
    new Date(
      contexto.venceEn
    );

  if (
    Number.isNaN(
      vence.getTime()
    ) ||
    vence.getTime() <
    Date.now()
  ) {
    throw crearErrorMicrosoftPaso15A_(
      "STATE_VENCIDO",
      "La solicitud Microsoft venció. Regresa al inicio e inténtalo nuevamente."
    );
  }

  return contexto;
}

/**
 * Obtiene clave estado Microsoft paso15 a. Función interna del motor.
 */
function obtenerClaveEstadoMicrosoftPaso15A_(
  state
) {
  return (
    AUTH_MICROSOFT_PASO_15A
    .CLAVE_CACHE_ESTADO +
    sha256HexOAuthPaso13C_(
      state
    )
  );
}

/**
 * Normaliza datos cliente Microsoft paso15 a. Función interna del motor.
 */
function normalizarDatosClienteMicrosoftPaso15A_(
  datosCliente
) {
  const datos =
    datosCliente &&
    typeof datosCliente ===
    "object" ?
    datosCliente :
    {};

  return {
    origen: limitarTextoOAuthPaso13C_(
      datos.origen ||
      "WEB_APP",
      500
    ),

    userAgent: limitarTextoOAuthPaso13C_(
      datos.userAgent ||
      "",
      500
    )
  };
}

/**
 * Ejecuta parsear json Microsoft paso15 a. Función interna del motor.
 */
function parsearJsonMicrosoftPaso15A_(
  texto
) {
  try {
    return JSON.parse(
      texto || "{}"
    );
  } catch (error) {
    return {};
  }
}

/**
 * Crea error Microsoft paso15 a. Función interna del motor.
 */
function crearErrorMicrosoftPaso15A_(
  codigo,
  mensaje
) {
  const error =
    new Error(
      mensaje ||
      "No fue posible completar el acceso con Microsoft."
    );

  error.codigoOAuth =
    String(
      codigo ||
      "ERROR_MICROSOFT"
    );

  return error;
}

/**
 * Obtiene mensaje seguro Microsoft paso15 a. Función interna del motor.
 */
function obtenerMensajeSeguroMicrosoftPaso15A_(
  error
) {
  const mensaje =
    String(
      error &&
      error.message ||
      "No fue posible completar el acceso con Microsoft."
    ).trim();

  return limitarTextoOAuthPaso13C_(
    mensaje,
    700
  );
}

/**
 * Obtiene redirect uri seguro Microsoft paso15 a. Función interna del motor.
 */
function obtenerRedirectUriSeguroMicrosoftPaso15A_() {
  const configuracion =
    obtenerConfiguracionPrivadaMicrosoftPaso15A_(
      false
    );

  if (
    /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i
    .test(
      configuracion.redirectUri
    )
  ) {
    return configuracion.redirectUri;
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
 * Construye una URL de retorno limpia para el callback Microsoft.
 * @private
 */
function construirUrlRetornoMicrosoftPaso23AR1_(estado) {
  const base = String(obtenerRedirectUriSeguroMicrosoftPaso15A_() || "")
    .trim()
    .replace(/[?#].*$/, "");
  const resultado = normalizarTexto(estado) === "ERROR" ? "error" : "ok";
  return base + "?oauth=" + resultado + "&provider=microsoft";
}

/**
 * Ejecuta enmascarar client id Microsoft paso15 a. Función interna del motor.
 */
function enmascararClientIdMicrosoftPaso15A_(
  clientId
) {
  const valor =
    String(
      clientId || ""
    ).trim();

  if (valor.length <= 12) {
    return valor ?
      "********" :
      "";
  }

  return (
    valor.slice(0, 6) +
    "..." +
    valor.slice(-6)
  );
}
