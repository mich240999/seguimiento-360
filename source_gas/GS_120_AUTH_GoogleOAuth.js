/**
 * SGT360 — Autenticación con Google
 *
 * Responsabilidad:
 * Implementa Authorization Code, PKCE, validación OIDC, creación de sesión y
 * auditoría.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * PASO 13C: OAuth 2.0 Authorization Code + OpenID Connect.
 *
 * Alcance de este paso:
 * - genera state, nonce y PKCE;
 * - intercambia el código con Google;
 * - valida las afirmaciones de identidad;
 * - autoriza el correo contra USUARIOS;
 * - crea una sesión técnica;
 * - registra auditoría;
 * - mantiene la aplicación normal sin bloqueo hasta el Paso 13D.
 */

const AUTH_PASO_13C = Object.freeze({
  ESTADO_TTL_SEGUNDOS: 600,

  DESFASE_RELOJ_SEGUNDOS: 300,

  CLAVE_CACHE_ESTADO: "SGT360_AUTH_STATE_",

  PREFIJO_TOKEN: "SGT360_",

  PREFIJO_ID_SESION: "SES-",

  PREFIJO_ID_AUDITORIA: "AUD-",

  ESTADOS_SESION: Object.freeze({
    ABIERTA: "ABIERTA",

    CERRADA: "CERRADA",

    EXPIRADA: "EXPIRADA",

    BLOQUEADA: "BLOQUEADA"
  }),

  RESULTADOS_AUDITORIA: Object.freeze({
    AUTORIZADO: "AUTORIZADO",

    DENEGADO: "DENEGADO",

    ERROR: "ERROR"
  }),

  ALMACENAMIENTO_NAVEGADOR: Object.freeze({
    TOKEN: "SGT360_AUTH_TOKEN_V1",

    SESION: "SGT360_AUTH_SESSION_V1"
  })
});

/**
 * Prepara una solicitud OAuth de un solo uso.
 *
 * La URL resultante puede colocarse en un enlace target="_top".
 *
 * @param {Object=} datosCliente
 * @return {Object}
 */
function crearSolicitudOAuthPaso13C(
  datosCliente
) {
  const configuracion =
    obtenerConfiguracionPrivadaOAuthPaso13C_();

  const datos =
    normalizarDatosClienteOAuthPaso13C_(
      datosCliente
    );

  const state =
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
      AUTH_PASO_13C
      .ESTADO_TTL_SEGUNDOS *
      1000
    );

  const contexto = {
    state: state,

    nonce: nonce,

    codeVerifier: codeVerifier,

    creadoEn: ahora.toISOString(),

    venceEn: vence.toISOString(),

    origen: datos.origen,

    userAgent: datos.userAgent
  };

  const cache =
    CacheService.getScriptCache();

  cache.put(
    obtenerClaveCacheEstadoOAuthPaso13C_(
      state
    ),
    JSON.stringify(
      contexto
    ),
    AUTH_PASO_13C
    .ESTADO_TTL_SEGUNDOS
  );

  const parametros = {
    client_id: configuracion.clientId,

    redirect_uri: configuracion.redirectUri,

    response_type: "code",

    scope: AUTH_CONFIG_PASO_13
      .GOOGLE
      .SCOPES,

    state: state,

    nonce: nonce,

    prompt: "select_account",

    access_type: "online",

    code_challenge: codeChallenge,

    code_challenge_method: "S256"
  };

  return {
    correcto: true,

    paso: "13C",

    urlAutorizacion: construirUrlOAuthPaso13C_(
      AUTH_CONFIG_PASO_13
      .GOOGLE
      .AUTORIZACION_URL,
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

    mensaje: "Solicitud OAuth preparada."
  };
}

/**
 * Procesa la respuesta enviada por Google al redirect URI.
 *
 * Esta función se invoca exclusivamente desde doGet.
 *
 * @param {Object} parametros
 * @return {Object}
 * @private
 */
function procesarCallbackOAuthPaso13C_(
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

    if (!state) {
      throw crearErrorOAuthPaso13C_(
        "STATE_AUSENTE",
        "La respuesta de Google no contiene un estado de seguridad válido."
      );
    }

    contextoEstado =
      consumirEstadoOAuthPaso13C_(
        state
      );

    const errorGoogle =
      String(
        parametros.error || ""
      ).trim();

    if (errorGoogle) {
      const descripcion =
        limitarTextoOAuthPaso13C_(
          parametros.error_description ||
          "",
          500
        );

      throw crearErrorOAuthPaso13C_(
        errorGoogle === "access_denied" ?
        "ACCESO_CANCELADO" :
        "ERROR_GOOGLE",
        errorGoogle === "access_denied" ?
        "El acceso con Google fue cancelado." :
        (
          "Google no pudo completar el inicio de sesión." +
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
      throw crearErrorOAuthPaso13C_(
        "CODIGO_AUSENTE",
        "Google no devolvió el código de autorización."
      );
    }

    const configuracion =
      obtenerConfiguracionPrivadaOAuthPaso13C_();

    const tokens =
      intercambiarCodigoOAuthPaso13C_(
        codigo,
        contextoEstado,
        configuracion
      );

    identidad =
      validarIdTokenOAuthPaso13C_(
        tokens.id_token,
        contextoEstado,
        configuracion
      );

    validarDominioOAuthPaso13C_(
      identidad,
      configuracion.dominiosPermitidos
    );

    usuario =
      validarUsuarioAutorizadoOAuthPaso13C_(
        identidad.email
      );

    const sesion =
      crearSesionOAuthPaso13C_(
        usuario,
        identidad,
        contextoEstado,
        configuracion.horasSesion
      );

    return {
      correcto: true,

      paso: "13C",

      estado: "SESION_CREADA",

      usuario: {
        idUsuario: usuario.idUsuario,

        correo: usuario.correo,

        nombre: usuario.nombre,

        rol: usuario.rol,

        idProveedor: usuario.idProveedor || "",

        imagenGoogle: identidad.picture || ""
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

      urlRetorno: configuracion.redirectUri +
        "?oauth=ok",

      mensaje: "La cuenta fue validada y la sesión técnica se creó correctamente."
    };
  } catch (error) {
    const codigoError =
      String(
        error &&
        error.codigoOAuth ||
        "ERROR_OAUTH"
      ).trim();

    const mensaje =
      obtenerMensajeSeguroErrorOAuthPaso13C_(
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

      origen: contextoEstado &&
        contextoEstado.origen ||
        "WEB_APP",

      detalle: {
        codigo: codigoError,

        googleSub: identidad &&
          identidad.sub ||
          "",

        userAgent: contextoEstado &&
          contextoEstado.userAgent ||
          ""
      }
    });

    return {
      correcto: false,

      paso: "13C",

      estado: "ERROR",

      codigo: codigoError,

      mensaje: mensaje,

      urlRetorno: obtenerRedirectUriSeguroOAuthPaso13C_() +
        "?oauth=error"
    };
  }
}

/**
 * Serializa de forma segura el resultado inyectado en HTML.
 *
 * @param {Object} resultado
 * @return {string}
 * @private
 */
function serializarResultadoCallbackAuthPaso13C_(
  resultado
) {
  return JSON.stringify(
      resultado || {}
    )
    .replace(
      /</g,
      "\\u003c"
    )
    .replace(
      />/g,
      "\\u003e"
    )
    .replace(
      /&/g,
      "\\u0026"
    )
    .replace(
      /\u2028/g,
      "\\u2028"
    )
    .replace(
      /\u2029/g,
      "\\u2029"
    );
}

/**
 * Diagnóstico previo al uso del botón OAuth.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoOAuthPaso13C() {
  const configuracionBase =
    diagnosticarConfiguracionAuthPaso13A();

  const configuracion =
    obtenerConfiguracionPrivadaOAuthPaso13C_();

  const sesiones =
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

  const auditoria =
    obtenerContextoHojaOAuthPaso13C_(
      "AUDITORIA_ACCESOS",
      [
        "ID_AUDITORIA_ACCESO",
        "FECHA_HORA",
        "ID_USUARIO",
        "CORREO",
        "ROL",
        "MODULO",
        "ACCION",
        "RESULTADO",
        "MOTIVO",
        "ORIGEN",
        "ID_SESION",
        "DETALLE"
      ]
    );

  const tokenPrueba =
    generarTokenAleatorioOAuthPaso13C_(
      "CACHE"
    );

  const clavePrueba =
    obtenerClaveCacheEstadoOAuthPaso13C_(
      tokenPrueba
    );

  const cache =
    CacheService.getScriptCache();

  cache.put(
    clavePrueba,
    "OK",
    60
  );

  const cacheCorrecta =
    cache.get(
      clavePrueba
    ) === "OK";

  cache.remove(
    clavePrueba
  );

  const resultado = {
    correcto: configuracionBase.correcto === true &&
      cacheCorrecta,

    paso: "13C",

    flujo: "AUTHORIZATION_CODE_OIDC_PKCE",

    configuracion: {
      clientIdConfigurado: Boolean(
        configuracion.clientId
      ),

      redirectUri: configuracion.redirectUri,

      horasSesion: configuracion.horasSesion,

      dominiosPermitidos: configuracion.dominiosPermitidos,

      prompt: "select_account",

      pkce: "S256"
    },

    hojas: {
      sesionesUsuarios: {
        correcto: true,

        columnas: sesiones.numeroColumnas
      },

      auditoriaAccesos: {
        correcto: true,

        columnas: auditoria.numeroColumnas
      }
    },

    cacheEstado: {
      correcto: cacheCorrecta,

      vigenciaSegundos: AUTH_PASO_13C
        .ESTADO_TTL_SEGUNDOS
    },

    mensaje: cacheCorrecta ?
      "El flujo OAuth del Paso 13C está preparado." :
      "No fue posible validar el almacenamiento temporal de state."
  };

  const texto =
    JSON.stringify(
      resultado,
      null,
      2
    );

  console.log(texto);

  return resultado;
}

/* =========================================================
 * INTERCAMBIO Y VALIDACIÓN DE IDENTIDAD
 * ======================================================= */

/**
 * Intercambia el código por tokens.
 *
 * @private
 */
function intercambiarCodigoOAuthPaso13C_(
  codigo,
  contextoEstado,
  configuracion
) {
  const respuesta =
    UrlFetchApp.fetch(
      AUTH_CONFIG_PASO_13
      .GOOGLE
      .TOKEN_URL, {
        method: "post",

        contentType: "application/x-www-form-urlencoded",

        payload: {
          code: codigo,

          client_id: configuracion.clientId,

          client_secret: configuracion.clientSecret,

          redirect_uri: configuracion.redirectUri,

          grant_type: "authorization_code",

          code_verifier: contextoEstado.codeVerifier
        },

        muteHttpExceptions: true
      }
    );

  const codigoHttp =
    respuesta.getResponseCode();

  const texto =
    respuesta.getContentText();

  let datos = {};

  try {
    datos =
      JSON.parse(
        texto || "{}"
      );
  } catch (error) {
    datos = {};
  }

  if (
    codigoHttp < 200 ||
    codigoHttp >= 300
  ) {
    const descripcion =
      limitarTextoOAuthPaso13C_(
        datos.error_description ||
        datos.error ||
        "Respuesta no válida del servidor de tokens.",
        500
      );

    throw crearErrorOAuthPaso13C_(
      "INTERCAMBIO_TOKEN_FALLIDO",
      "No fue posible completar la validación con Google. " +
      descripcion
    );
  }

  if (!datos.id_token) {
    throw crearErrorOAuthPaso13C_(
      "ID_TOKEN_AUSENTE",
      "Google no devolvió el token de identidad requerido."
    );
  }

  return datos;
}

/**
 * Decodifica y valida las afirmaciones del ID token recibido directamente
 * desde el endpoint de tokens de Google.
 *
 * @private
 */
function validarIdTokenOAuthPaso13C_(
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

  const emisores =
    AUTH_CONFIG_PASO_13
    .GOOGLE
    .EMISORES_VALIDOS;

  if (
    !emisores.includes(
      String(
        payload.iss || ""
      )
    )
  ) {
    throw crearErrorOAuthPaso13C_(
      "EMISOR_INVALIDO",
      "El emisor del token de identidad no es válido."
    );
  }

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
    !audiencias.includes(
      configuracion.clientId
    )
  ) {
    throw crearErrorOAuthPaso13C_(
      "AUDIENCIA_INVALIDA",
      "El token de identidad no pertenece al cliente OAuth de Seguimiento 360."
    );
  }

  if (
    payload.azp &&
    String(
      payload.azp
    ) !==
    configuracion.clientId
  ) {
    throw crearErrorOAuthPaso13C_(
      "PRESENTADOR_INVALIDO",
      "El presentador autorizado del token no coincide con el cliente OAuth."
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
    AUTH_PASO_13C
    .DESFASE_RELOJ_SEGUNDOS
  ) {
    throw crearErrorOAuthPaso13C_(
      "TOKEN_EXPIRADO",
      "El token de identidad ya venció."
    );
  }

  const emitidoEn =
    Number(
      payload.iat || 0
    );

  if (
    emitidoEn &&
    emitidoEn >
    ahoraSegundos +
    AUTH_PASO_13C
    .DESFASE_RELOJ_SEGUNDOS
  ) {
    throw crearErrorOAuthPaso13C_(
      "FECHA_TOKEN_INVALIDA",
      "La fecha de emisión del token no es válida."
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
    throw crearErrorOAuthPaso13C_(
      "NONCE_INVALIDO",
      "La respuesta de identidad no corresponde a la solicitud iniciada."
    );
  }

  if (!payload.sub) {
    throw crearErrorOAuthPaso13C_(
      "SUB_AUSENTE",
      "Google no devolvió el identificador estable de la cuenta."
    );
  }

  const correo =
    String(
      payload.email || ""
    )
    .trim()
    .toLowerCase();

  if (!correo) {
    throw crearErrorOAuthPaso13C_(
      "CORREO_AUSENTE",
      "Google no devolvió el correo de la cuenta."
    );
  }

  const correoVerificado =
    payload.email_verified === true ||
    String(
      payload.email_verified || ""
    ).toLowerCase() === "true";

  if (!correoVerificado) {
    throw crearErrorOAuthPaso13C_(
      "CORREO_NO_VERIFICADO",
      "La cuenta de Google no tiene un correo verificado."
    );
  }

  return {
    sub: String(
      payload.sub
    ),

    email: correo,

    emailVerified: true,

    name: String(
      payload.name || ""
    ).trim(),

    picture: String(
      payload.picture || ""
    ).trim(),

    hd: String(
        payload.hd || ""
      )
      .trim()
      .toLowerCase(),

    issuer: String(
      payload.iss
    )
  };
}

/**
 * Decodifica únicamente el payload JWT.
 *
 * El token fue recibido directamente del endpoint HTTPS de Google mediante
 * un intercambio autenticado con el client secret. Luego se validan sus
 * afirmaciones críticas.
 *
 * @private
 */
function decodificarPayloadJwtOAuthPaso13C_(
  token
) {
  const partes =
    String(
      token || ""
    ).split(".");

  if (partes.length !== 3) {
    throw crearErrorOAuthPaso13C_(
      "JWT_INVALIDO",
      "El token de identidad no tiene una estructura válida."
    );
  }

  try {
    const bytes =
      Utilities.base64DecodeWebSafe(
        completarRellenoBase64OAuthPaso13C_(
          partes[1]
        )
      );

    const texto =
      Utilities.newBlob(
        bytes
      ).getDataAsString(
        "UTF-8"
      );

    return JSON.parse(
      texto
    );
  } catch (error) {
    throw crearErrorOAuthPaso13C_(
      "JWT_NO_DECODIFICABLE",
      "No fue posible leer el token de identidad."
    );
  }
}

/**
 * Valida el dominio cuando existe una lista de dominios de Workspace.
 *
 * @private
 */
function validarDominioOAuthPaso13C_(
  identidad,
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

  if (
    !identidad.hd ||
    !dominiosPermitidos.includes(
      identidad.hd
    )
  ) {
    throw crearErrorOAuthPaso13C_(
      "DOMINIO_NO_AUTORIZADO",
      "La cuenta seleccionada no pertenece a un dominio autorizado."
    );
  }
}

/**
 * Autoriza el correo contra la hoja USUARIOS.
 *
 * @private
 */
function validarUsuarioAutorizadoOAuthPaso13C_(
  correo
) {
  const usuario =
    buscarUsuarioPorCorreo(
      correo
    );

  if (!usuario) {
    throw crearErrorOAuthPaso13C_(
      "USUARIO_NO_REGISTRADO",
      "La cuenta seleccionada no está registrada en Seguimiento 360."
    );
  }

  const estado =
    String(
      usuario.estado || ""
    )
    .trim()
    .toUpperCase();

  const estadoActivo =
    String(
      CONFIG.ESTADOS.ACTIVO
    )
    .trim()
    .toUpperCase();

  if (estado !== estadoActivo) {
    throw crearErrorOAuthPaso13C_(
      "USUARIO_INACTIVO",
      "La cuenta seleccionada está inactiva en Seguimiento 360."
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

/* =========================================================
 * SESIONES Y AUDITORÍA
 * ======================================================= */

/**
 * Crea la sesión y la auditoría bajo un mismo bloqueo.
 *
 * @private
 */
function crearSesionOAuthPaso13C_(
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
      "OAUTH_GOOGLE"
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

    contextoSesiones.hoja
      .appendRow(
        filaSesion
      );

    insertarAuditoriaOAuthSinBloqueoPaso13C_({
      usuario: usuario,

      accion: "INICIAR_SESION_OAUTH",

      resultado: AUTH_PASO_13C
        .RESULTADOS_AUDITORIA
        .AUTORIZADO,

      motivo: "",

      origen: "OAUTH_GOOGLE",

      idSesion: idSesion,

      detalle: {
        googleSub: identidad.sub,

        issuer: identidad.issuer,

        dominioWorkspace: identidad.hd,

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
 * Registra una auditoría con bloqueo propio.
 *
 * @private
 */
function registrarAuditoriaOAuthPaso13C_(
  evento
) {
  const bloqueo =
    LockService.getScriptLock();

  if (
    !bloqueo.tryLock(
      10000
    )
  ) {
    console.warn(
      "No se pudo adquirir bloqueo para registrar auditoría OAuth."
    );

    return;
  }

  try {
    insertarAuditoriaOAuthSinBloqueoPaso13C_(
      evento
    );

    SpreadsheetApp.flush();
  } catch (error) {
    console.warn(
      "No se pudo registrar auditoría OAuth: %s",
      error.message
    );
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Inserta una fila de auditoría.
 *
 * @private
 */
function insertarAuditoriaOAuthSinBloqueoPaso13C_(
  evento
) {
  const contexto =
    obtenerContextoHojaOAuthPaso13C_(
      "AUDITORIA_ACCESOS",
      [
        "ID_AUDITORIA_ACCESO",
        "FECHA_HORA",
        "ID_USUARIO",
        "CORREO",
        "ROL",
        "MODULO",
        "ACCION",
        "RESULTADO",
        "MOTIVO",
        "ORIGEN",
        "ID_SESION",
        "DETALLE"
      ]
    );

  const usuario =
    evento.usuario || {};

  const fila =
    new Array(
      contexto.numeroColumnas
    ).fill("");

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ID_AUDITORIA_ACCESO",
    AUTH_PASO_13C
    .PREFIJO_ID_AUDITORIA +
    Utilities.getUuid()
    .toUpperCase()
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "FECHA_HORA",
    new Date()
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ID_USUARIO",
    usuario.idUsuario || ""
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "CORREO",
    usuario.correo || ""
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ROL",
    usuario.rol || ""
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "MODULO",
    "AUTH"
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ACCION",
    evento.accion ||
    "INICIAR_SESION_OAUTH"
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "RESULTADO",
    evento.resultado ||
    AUTH_PASO_13C
    .RESULTADOS_AUDITORIA
    .ERROR
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "MOTIVO",
    limitarTextoOAuthPaso13C_(
      evento.motivo,
      500
    )
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ORIGEN",
    limitarTextoOAuthPaso13C_(
      evento.origen ||
      "WEB_APP",
      150
    )
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ID_SESION",
    evento.idSesion || ""
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "DETALLE",
    limitarTextoOAuthPaso13C_(
      typeof evento.detalle ===
      "string" ?
      evento.detalle :
      JSON.stringify(
        evento.detalle || {}
      ),
      5000
    )
  );

  contexto.hoja.appendRow(
    fila
  );
}

/* =========================================================
 * CONFIGURACIÓN, CACHE Y UTILIDADES
 * ======================================================= */

/**
 * Lee y valida las propiedades privadas.
 *
 * @private
 */
function obtenerConfiguracionPrivadaOAuthPaso13C_() {
  const propiedades =
    PropertiesService
    .getScriptProperties();

  const clientId =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .CLIENT_ID
      ) || ""
    ).trim();

  const clientSecret =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .CLIENT_SECRET
      ) || ""
    ).trim();

  const redirectUri =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .REDIRECT_URI
      ) || ""
    ).trim();

  if (!clientId) {
    throw crearErrorOAuthPaso13C_(
      "CLIENT_ID_AUSENTE",
      "Falta configurar el ID de cliente OAuth."
    );
  }

  if (!clientSecret) {
    throw crearErrorOAuthPaso13C_(
      "CLIENT_SECRET_AUSENTE",
      "Falta configurar el secreto del cliente OAuth."
    );
  }

  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i
    .test(
      redirectUri
    )
  ) {
    throw crearErrorOAuthPaso13C_(
      "REDIRECT_URI_INVALIDA",
      "La URI de redireccionamiento debe ser la URL de producción terminada en /exec."
    );
  }

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

  const dominiosPermitidos =
    String(
      propiedades.getProperty(
        AUTH_CONFIG_PASO_13
        .PROPIEDADES
        .DOMINIOS_PERMITIDOS
      ) || ""
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
    .filter(function(valor) {
      return Boolean(valor);
    });

  return {
    clientId: clientId,

    clientSecret: clientSecret,

    redirectUri: redirectUri,

    horasSesion: horasSesion,

    dominiosPermitidos: Array.from(
      new Set(
        dominiosPermitidos
      )
    )
  };
}

/**
 * Consume state una sola vez.
 *
 * @private
 */
function consumirEstadoOAuthPaso13C_(
  state
) {
  const cache =
    CacheService.getScriptCache();

  const clave =
    obtenerClaveCacheEstadoOAuthPaso13C_(
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
    throw crearErrorOAuthPaso13C_(
      "STATE_VENCIDO",
      "La solicitud de acceso venció o ya fue utilizada. Regresa al inicio e inténtalo nuevamente."
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
    String(
      contexto.state || ""
    ) !==
    String(
      state || ""
    )
  ) {
    throw crearErrorOAuthPaso13C_(
      "STATE_INVALIDO",
      "El estado de seguridad de la solicitud no es válido."
    );
  }

  const vence =
    new Date(
      contexto.venceEn
    );

  if (
    !vence ||
    Number.isNaN(
      vence.getTime()
    ) ||
    vence.getTime() <
    Date.now()
  ) {
    throw crearErrorOAuthPaso13C_(
      "STATE_VENCIDO",
      "La solicitud de acceso venció. Regresa al inicio e inténtalo nuevamente."
    );
  }

  return contexto;
}

/**
 * Obtiene la estructura validada de una hoja.
 *
 * @private
 */
function obtenerContextoHojaOAuthPaso13C_(
  claveConfig,
  cabecerasRequeridas
) {
  const nombreHoja =
    CONFIG.HOJAS[
      claveConfig
    ];

  const hoja =
    obtenerHojaMotor_(
      MOTOR_SGT360.BASES.SECURITY,
      nombreHoja,
      false
    );

  if (!hoja) {
    throw crearErrorOAuthPaso13C_(
      "HOJA_AUSENTE",
      "No existe la hoja " +
      nombreHoja +
      "."
    );
  }

  const ultimaColumna =
    hoja.getLastColumn();

  if (ultimaColumna <= 0) {
    throw crearErrorOAuthPaso13C_(
      "CABECERAS_AUSENTES",
      "La hoja " +
      nombreHoja +
      " no tiene cabeceras."
    );
  }

  const cabeceras =
    hoja
    .getRange(
      1,
      1,
      1,
      ultimaColumna
    )
    .getDisplayValues()[0]
    .map(function(valor) {
      return String(
          valor || ""
        )
        .trim()
        .toUpperCase();
    });

  const mapa = {};

  cabeceras.forEach(
    function(cabecera, indice) {
      if (cabecera) {
        mapa[cabecera] =
          indice;
      }
    }
  );

  const faltantes =
    cabecerasRequeridas.filter(
      function(cabecera) {
        return typeof mapa[
            cabecera
          ] !==
          "number";
      }
    );

  if (faltantes.length > 0) {
    throw crearErrorOAuthPaso13C_(
      "CABECERAS_INCOMPATIBLES",
      "La hoja " +
      nombreHoja +
      " no contiene: " +
      faltantes.join(", ") +
      "."
    );
  }

  return {
    hoja: hoja,

    mapa: mapa,

    numeroColumnas: cabeceras.length
  };
}

/**
 * Construye una URL con parámetros codificados.
 *
 * @private
 */
function construirUrlOAuthPaso13C_(
  baseUrl,
  parametros
) {
  const query =
    Object.keys(
      parametros
    )
    .filter(function(clave) {
      return parametros[clave] !==
        undefined &&
        parametros[clave] !==
        null &&
        String(
          parametros[clave]
        ) !== "";
    })
    .map(function(clave) {
      return (
        encodeURIComponent(
          clave
        ) +
        "=" +
        encodeURIComponent(
          String(
            parametros[clave]
          )
        )
      );
    })
    .join("&");

  return baseUrl +
    "?" +
    query;
}

/**
 * Genera material aleatorio basado en UUIDs del servidor.
 *
 * @private
 */
function generarTokenAleatorioOAuthPaso13C_(
  etiqueta
) {
  const material = [
    etiqueta || "TOKEN",
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(
      Date.now()
    )
  ].join("|");

  return base64UrlSinRellenoOAuthPaso13C_(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      material,
      Utilities.Charset.UTF_8
    )
  );
}

/**
 * Genera un code_verifier PKCE de 128 caracteres válidos.
 *
 * @private
 */
function generarCodeVerifierOAuthPaso13C_() {
  return (
    Utilities.getUuid()
    .replace(
      /-/g,
      ""
    ) +
    Utilities.getUuid()
    .replace(
      /-/g,
      ""
    ) +
    Utilities.getUuid()
    .replace(
      /-/g,
      ""
    ) +
    Utilities.getUuid()
    .replace(
      /-/g,
      ""
    )
  );
}

/**
 * Hash SHA-256 hexadecimal.
 *
 * @private
 */
function sha256HexOAuthPaso13C_(
  valor
) {
  return Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(
        valor || ""
      ),
      Utilities.Charset.UTF_8
    )
    .map(function(byte) {
      const normalizado =
        byte < 0 ?
        byte + 256 :
        byte;

      return (
        "0" +
        normalizado.toString(16)
      ).slice(-2);
    })
    .join("")
    .toUpperCase();
}

/**
 * Base64 URL-safe sin padding.
 *
 * @private
 */
function base64UrlSinRellenoOAuthPaso13C_(
  bytes
) {
  return Utilities
    .base64EncodeWebSafe(
      bytes
    )
    .replace(
      /=+$/g,
      ""
    );
}

/**
 * Completa padding base64.
 *
 * @private
 */
function completarRellenoBase64OAuthPaso13C_(
  valor
) {
  let texto =
    String(
      valor || ""
    );

  while (
    texto.length % 4 !== 0
  ) {
    texto += "=";
  }

  return texto;
}

/**
 * Clave corta de cache derivada de state.
 *
 * @private
 */
function obtenerClaveCacheEstadoOAuthPaso13C_(
  state
) {
  return (
    AUTH_PASO_13C
    .CLAVE_CACHE_ESTADO +
    sha256HexOAuthPaso13C_(
      state
    ).slice(
      0,
      48
    )
  );
}

/**
 * Normaliza metadatos del navegador.
 *
 * @private
 */
function normalizarDatosClienteOAuthPaso13C_(
  datos
) {
  datos =
    datos || {};

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
 * Asigna un valor por cabecera.
 *
 * @private
 */
function asignarCampoOAuthPaso13C_(
  fila,
  mapa,
  cabecera,
  valor
) {
  const indice =
    mapa[
      cabecera
    ];

  if (
    typeof indice !==
    "number"
  ) {
    throw crearErrorOAuthPaso13C_(
      "CABECERA_AUSENTE",
      "No existe la cabecera " +
      cabecera +
      "."
    );
  }

  fila[indice] =
    valor;
}

/**
 * Error tipado.
 *
 * @private
 */
function crearErrorOAuthPaso13C_(
  codigo,
  mensaje
) {
  const error =
    new Error(
      mensaje
    );

  error.codigoOAuth =
    codigo;

  return error;
}

/**
 * Mensaje apto para la interfaz.
 *
 * @private
 */
function obtenerMensajeSeguroErrorOAuthPaso13C_(
  error
) {
  const mensaje =
    String(
      error &&
      error.message ||
      "No fue posible completar el inicio de sesión."
    ).trim();

  return limitarTextoOAuthPaso13C_(
    mensaje,
    700
  );
}

/**
 * Limita texto.
 *
 * @private
 */
function limitarTextoOAuthPaso13C_(
  valor,
  maximo
) {
  return String(
      valor || ""
    )
    .trim()
    .slice(
      0,
      maximo
    );
}

/**
 * Enmascara ID técnico.
 *
 * @private
 */
function enmascararIdSesionOAuthPaso13C_(
  idSesion
) {
  const texto =
    String(
      idSesion || ""
    );

  if (texto.length <= 24) {
    return texto;
  }

  return (
    texto.slice(
      0,
      14
    ) +
    "..." +
    texto.slice(
      -8
    )
  );
}

/**
 * Devuelve una ruta segura aun cuando la configuración esté incompleta.
 *
 * @private
 */
function obtenerRedirectUriSeguroOAuthPaso13C_() {
  try {
    return obtenerConfiguracionPrivadaOAuthPaso13C_()
      .redirectUri;
  } catch (error) {
    return ScriptApp
      .getService()
      .getUrl();
  }
}
