/**
 * SGT360 — Compuerta de sesiones
 *
 * Responsabilidad:
 * Valida tokens internos, vigencia, usuario, proveedor de identidad y actividad de
 * la sesión.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * PASO 13D.1: compuerta de sesión para la aplicación real.
 *
 * Esta subetapa conserva la implementación como:
 * - Ejecutar como: usuario que accede.
 * - Acceso: usuarios con cuenta Google.
 *
 * La sesión OAuth debe pertenecer al mismo correo que Apps Script
 * identifica mediante Session.getActiveUser().
 */

const AUTH_PASO_13D1 = Object.freeze({
  PREFIJO_TOKEN: "SGT360_",

  PREFIJO_ID_SESION: "SES-",

  ESTADO_ABIERTO: "ABIERTA",

  ESTADO_EXPIRADO: "EXPIRADA",

  ESTADO_BLOQUEADO: "BLOQUEADA",

  SEGUNDOS_HEARTBEAT: 120,

  MAXIMO_TOKEN: 300
});

/**
 * SEGUIMIENTO 360
 * Compuerta de sesión independiente del proveedor de identidad.
 *
 * Sustituye completamente:
 * - validarSesionAplicacionPaso13D1()
 * - leerSesionPaso13D1_()
 *
 * La autenticación se sostiene en el token interno emitido después del
 * callback OAuth, su vigencia y la autorización vigente en USUARIOS.
 * No depende de Session.getActiveUser().
 */
function validarSesionAplicacionPaso13D1(
  solicitud
) {
  const datos =
    normalizarSolicitudSesionPaso13D1_(
      solicitud
    );

  if (!datos.token) {
    return construirSesionNoValidaPaso13D1_(
      "TOKEN_AUSENTE",
      "Debes iniciar sesión."
    );
  }

  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(
    30000
  );

  try {
    const ahora =
      new Date();

    const contexto =
      obtenerContextoSesionesPaso13D1_();

    const idSesion =
      obtenerIdSesionDesdeTokenPaso13D1_(
        datos.token
      );

    const numeroFila =
      buscarFilaSesionPaso13D1_(
        contexto,
        idSesion
      );

    if (!numeroFila) {
      return construirSesionNoValidaPaso13D1_(
        "SESION_NO_ENCONTRADA",
        "La sesión no existe o ya fue eliminada."
      );
    }

    const sesion =
      leerSesionPaso13D1_(
        contexto,
        numeroFila
      );

    if (
      sesion.estado !==
      AUTH_PASO_13D1.ESTADO_ABIERTO
    ) {
      return construirSesionNoValidaPaso13D1_(
        "SESION_NO_ABIERTA",
        sesion.estado ===
        AUTH_PASO_13D1.ESTADO_EXPIRADO ?
        "La sesión expiró. Inicia sesión nuevamente." :
        "La sesión ya no está disponible."
      );
    }

    const configuracion =
      obtenerConfiguracionPrivadaOAuthPaso13C_();

    const fechaExpiracion =
      obtenerFechaExpiracionPaso13D1_(
        sesion.fechaInicio,
        configuracion.horasSesion
      );

    if (
      !fechaExpiracion ||
      fechaExpiracion.getTime() <=
      ahora.getTime()
    ) {
      actualizarEstadoSesionPaso13D1_(
        contexto,
        numeroFila,
        AUTH_PASO_13D1.ESTADO_EXPIRADO,
        ahora
      );

      SpreadsheetApp.flush();

      return construirSesionNoValidaPaso13D1_(
        "SESION_EXPIRADA",
        "La sesión alcanzó su tiempo máximo de vigencia."
      );
    }

    const origenSesion =
      String(
        sesion.origen ||
        ""
      )
      .trim()
      .toUpperCase();

    const proveedoresPermitidos = [
      "OAUTH_GOOGLE",
      "OAUTH_MICROSOFT"
    ];

    if (
      proveedoresPermitidos.indexOf(
        origenSesion
      ) === -1
    ) {
      return construirSesionNoValidaPaso13D1_(
        "ORIGEN_SESION_INVALIDO",
        "El proveedor de identidad de la sesión no es válido."
      );
    }

    const usuario =
      validarUsuarioAutorizadoOAuthPaso13C_(
        sesion.correo
      );

    actualizarActividadPaso13D1_(
      contexto,
      numeroFila,
      usuario,
      datos,
      ahora
    );

    SpreadsheetApp.flush();

    return {
      correcto: true,

      autenticado: true,

      paso: "15C",

      modo: "COMPUERTA_OAUTH_INDEPENDIENTE",

      proveedorIdentidad: origenSesion ===
        "OAUTH_MICROSOFT" ?
        "MICROSOFT" :
        "GOOGLE",

      usuario: {
        idUsuario: usuario.idUsuario,

        correo: usuario.correo,

        nombre: usuario.nombre,

        rol: usuario.rol,

        idProveedor: usuario.idProveedor || ""
      },

      sesion: {
        idSesionEnmascarado: enmascararIdSesionOAuthPaso13C_(
          idSesion
        ),

        fechaInicio: sesion.fechaInicio ?
          sesion.fechaInicio.toISOString() :
          "",

        ultimaActividad: ahora.toISOString(),

        fechaExpiracion: fechaExpiracion.toISOString(),

        estado: AUTH_PASO_13D1.ESTADO_ABIERTO,

        origen: origenSesion
      },

      configuracion: {
        segundosHeartbeat: AUTH_PASO_13D1
          .SEGUNDOS_HEARTBEAT,

        horasMaximas: configuracion.horasSesion
      },

      mensaje: "Sesión OAuth validada correctamente."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Mantiene activa una sesión ya validada.
 *
 * @param {Object} solicitud
 * @return {Object}
 */
function actualizarActividadSesionPaso13D1(
  solicitud
) {
  const resultado =
    validarSesionAplicacionPaso13D1(
      solicitud
    );

  if (
    resultado.correcto !== true ||
    resultado.autenticado !== true
  ) {
    return resultado;
  }

  return {
    correcto: true,

    autenticado: true,

    paso: "13D.1",

    ultimaActividad: resultado.sesion
      .ultimaActividad,

    fechaExpiracion: resultado.sesion
      .fechaExpiracion,

    estado: resultado.sesion
      .estado
  };
}

/**
 * Diagnóstico previo a activar la compuerta.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoProteccionPaso13D1() {
  const diagnostico13C =
    ejecutarDiagnosticoOAuthPaso13C();

  const contexto =
    obtenerContextoSesionesPaso13D1_();

  const correoGoogle =
    obtenerCorreoGoogleActualPaso13D1_();

  const resultado = {
    correcto: diagnostico13C.correcto === true &&
      Boolean(
        correoGoogle
      ),

    paso: "13D.1",

    modo: "COMPUERTA_CON_IDENTIDAD_APPS_SCRIPT",

    identidadGoogle: {
      correoDetectado: correoGoogle,

      disponible: Boolean(
        correoGoogle
      )
    },

    sesiones: {
      hoja: contexto.hoja.getName(),

      columnas: contexto.numeroColumnas,

      registros: Math.max(
        contexto.hoja.getLastRow() - 1,
        0
      )
    },

    implementacionRequerida: {
      ejecutarComo: "USUARIO_QUE_ACCEDE",

      acceso: "USUARIOS_CON_CUENTA_GOOGLE",

      cambiarAhora: false
    },

    mensaje: correoGoogle ?
      "La compuerta del Paso 13D.1 está preparada." :
      "No fue posible detectar el correo activo. Mantén la implementación como usuario que accede."
  };

  console.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

/* =========================================================
 * OPERACIONES INTERNAS
 * ======================================================= */

/**
 * @private
 */
function obtenerContextoSesionesPaso13D1_() {
  return obtenerContextoHojaOAuthPaso13C_(
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
}

/**
 * @private
 */
function normalizarSolicitudSesionPaso13D1_(
  solicitud
) {
  solicitud =
    solicitud || {};

  const token =
    String(
      solicitud.token || ""
    ).trim();

  return {
    token: token.length <=
      AUTH_PASO_13D1.MAXIMO_TOKEN &&
      token.indexOf(
        AUTH_PASO_13D1.PREFIJO_TOKEN
      ) === 0 ?
      token :
      "",

    modulo: limitarTextoOAuthPaso13C_(
        solicitud.modulo ||
        "DASHBOARD",
        100
      )
      .toUpperCase(),

    origen: limitarTextoOAuthPaso13C_(
      solicitud.origen ||
      "WEB_APP",
      500
    ),

    userAgent: limitarTextoOAuthPaso13C_(
      solicitud.userAgent ||
      "",
      500
    )
  };
}

/**
 * @private
 */
function obtenerIdSesionDesdeTokenPaso13D1_(
  token
) {
  return (
    AUTH_PASO_13D1
    .PREFIJO_ID_SESION +
    sha256HexOAuthPaso13C_(
      token
    )
  );
}

/**
 * @private
 */
function buscarFilaSesionPaso13D1_(
  contexto,
  idSesion
) {
  if (
    contexto.hoja.getLastRow() < 2
  ) {
    return 0;
  }

  const ultimaFila =
    contexto.hoja.getLastRow();

  const valores =
    contexto.hoja
    .getRange(
      2,
      contexto.mapa.ID_SESION + 1,
      ultimaFila - 1,
      1
    )
    .getDisplayValues();

  for (
    let indice = 0; indice < valores.length; indice++
  ) {
    if (
      String(
        valores[indice][0] || ""
      )
      .trim()
      .toUpperCase() ===
      idSesion.toUpperCase()
    ) {
      return indice + 2;
    }
  }

  return 0;
}

/**
 * @private
 */
function leerSesionPaso13D1_(
  contexto,
  numeroFila
) {
  const fila =
    contexto.hoja
    .getRange(
      numeroFila,
      1,
      1,
      contexto.numeroColumnas
    )
    .getValues()[0];

  return {
    idSesion: String(
        fila[
          contexto.mapa.ID_SESION
        ] || ""
      )
      .trim()
      .toUpperCase(),

    idUsuario: String(
      fila[
        contexto.mapa.ID_USUARIO
      ] || ""
    ).trim(),

    correo: String(
        fila[
          contexto.mapa.CORREO
        ] || ""
      )
      .trim()
      .toLowerCase(),

    rol: String(
        fila[
          contexto.mapa.ROL
        ] || ""
      )
      .trim()
      .toUpperCase(),

    fechaInicio: convertirFechaPaso13D1_(
      fila[
        contexto.mapa.FECHA_INICIO
      ]
    ),

    ultimaActividad: convertirFechaPaso13D1_(
      fila[
        contexto.mapa.ULTIMA_ACTIVIDAD
      ]
    ),

    fechaFin: convertirFechaPaso13D1_(
      fila[
        contexto.mapa.FECHA_FIN
      ]
    ),

    estado: String(
        fila[
          contexto.mapa.ESTADO
        ] || ""
      )
      .trim()
      .toUpperCase(),

    moduloActual: String(
        fila[
          contexto.mapa.MODULO_ACTUAL
        ] || ""
      )
      .trim()
      .toUpperCase(),

    origen: String(
        fila[
          contexto.mapa.ORIGEN
        ] || ""
      )
      .trim()
      .toUpperCase()
  };
}

/**
 * @private
 */
function actualizarActividadPaso13D1_(
  contexto,
  numeroFila,
  usuario,
  datos,
  ahora
) {
  const rango =
    contexto.hoja.getRange(
      numeroFila,
      1,
      1,
      contexto.numeroColumnas
    );

  const fila =
    rango.getValues()[0];

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ID_USUARIO",
    usuario.idUsuario
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "CORREO",
    usuario.correo
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ROL",
    usuario.rol
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ULTIMA_ACTIVIDAD",
    ahora
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "MODULO_ACTUAL",
    datos.modulo ||
    "DASHBOARD"
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "USER_AGENT",
    datos.userAgent
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "FECHA_ACTUALIZACION",
    ahora
  );

  rango.setValues([
    fila
  ]);
}

/**
 * @private
 */
function actualizarEstadoSesionPaso13D1_(
  contexto,
  numeroFila,
  estado,
  ahora
) {
  const rango =
    contexto.hoja.getRange(
      numeroFila,
      1,
      1,
      contexto.numeroColumnas
    );

  const fila =
    rango.getValues()[0];

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "ESTADO",
    estado
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "FECHA_FIN",
    ahora
  );

  asignarCampoOAuthPaso13C_(
    fila,
    contexto.mapa,
    "FECHA_ACTUALIZACION",
    ahora
  );

  rango.setValues([
    fila
  ]);
}

/**
 * @private
 */
function obtenerFechaExpiracionPaso13D1_(
  fechaInicio,
  horasSesion
) {
  if (
    !fechaInicio ||
    Number.isNaN(
      fechaInicio.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    fechaInicio.getTime() +
    horasSesion *
    60 *
    60 *
    1000
  );
}

/**
 * @private
 */
function obtenerCorreoGoogleActualPaso13D1_() {
  return String(
      Session
      .getActiveUser()
      .getEmail() ||
      ""
    )
    .trim()
    .toLowerCase();
}

/**
 * @private
 */
function convertirFechaPaso13D1_(
  valor
) {
  if (
    Object.prototype.toString.call(
      valor
    ) === "[object Date]" &&
    !Number.isNaN(
      valor.getTime()
    )
  ) {
    return valor;
  }

  if (!valor) {
    return null;
  }

  const fecha =
    new Date(
      valor
    );

  return Number.isNaN(
      fecha.getTime()
    ) ?
    null :
    fecha;
}

/**
 * @private
 */
function construirSesionNoValidaPaso13D1_(
  codigo,
  mensaje
) {
  return {
    correcto: false,

    autenticado: false,

    paso: "13D.1",

    codigo: codigo,

    mensaje: mensaje
  };
}
