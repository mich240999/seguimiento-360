/**
 * SGT360 — Acciones de sesión
 *
 * Responsabilidad:
 * Cierra sesiones, permite cambiar de cuenta y registra las operaciones en
 * auditoría.
 *
 * Convenciones:
 * - Las funciones terminadas en "_" son internas y no deben llamarse desde HTML.
 * - Las operaciones públicas deben pasar por el canal RPC protegido cuando corresponda.
 * - Los IDs, carpetas y credenciales se resuelven mediante Propiedades del script.
 */

/**
 * SEGUIMIENTO 360
 * PASO 13E.1: cierre de sesión y cambio de cuenta multiproveedor.
 *
 * La función pública recibe el token técnico, localiza su hash en
 * SESIONES_USUARIOS y cierra exclusivamente la sesión asociada.
 *
 * No depende de Session.getActiveUser(), por lo que funciona con:
 * - OAUTH_GOOGLE
 * - OAUTH_MICROSOFT
 */

const AUTH_ACCIONES_PASO_13E1 =
  Object.freeze({
    MODO_CERRAR: "CERRAR_SESION",

    MODO_CAMBIAR: "CAMBIAR_CUENTA",

    ACCION_CERRAR: "CERRAR_SESION_OAUTH",

    ACCION_CAMBIAR: "CAMBIAR_CUENTA_OAUTH",

    ESTADO_CERRADO: "CERRADA",

    MAXIMO_TOKEN: 300
  });

/**
 * Cierra la sesión técnica actual.
 *
 * La posesión del token interno válido identifica la sesión que debe cerrarse.
 * No se compara con una cuenta Google ambiental.
 *
 * @param {Object} solicitud
 * @return {Object}
 */
function cerrarSesionAplicacionPaso13E1(
  solicitud
) {
  const datos =
    normalizarCierreSesionPaso13E1_(
      solicitud
    );

  if (!datos.token) {
    return {
      correcto: true,

      sesionEncontrada: false,

      sesionCerrada: false,

      codigo: "TOKEN_AUSENTE",

      modo: datos.modo,

      mensaje: "No había una sesión local que cerrar."
    };
  }

  const bloqueo =
    LockService.getScriptLock();

  bloqueo.waitLock(
    30000
  );

  try {
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
      return {
        correcto: true,

        sesionEncontrada: false,

        sesionCerrada: false,

        codigo: "SESION_NO_ENCONTRADA",

        modo: datos.modo,

        mensaje: "La sesión ya no existe en el registro técnico."
      };
    }

    const sesion =
      leerSesionPaso13D1_(
        contexto,
        numeroFila
      );

    const origenSesion =
      String(
        sesion.origen ||
        "OAUTH_GOOGLE"
      )
      .trim()
      .toUpperCase();

    if (
      origenSesion !==
      "OAUTH_GOOGLE" &&
      origenSesion !==
      "OAUTH_MICROSOFT"
    ) {
      throw crearErrorAccionSesionPaso13E1_(
        "ORIGEN_SESION_INVALIDO",
        "El proveedor de identidad de la sesión no es válido."
      );
    }

    if (
      sesion.estado !==
      AUTH_PASO_13D1
      .ESTADO_ABIERTO
    ) {
      return {
        correcto: true,

        sesionEncontrada: true,

        sesionCerrada: false,

        yaCerrada: true,

        estadoAnterior: sesion.estado,

        estado: sesion.estado,

        proveedorIdentidad: origenSesion ===
          "OAUTH_MICROSOFT" ?
          "MICROSOFT" :
          "GOOGLE",

        modo: datos.modo,

        mensaje: "La sesión ya no estaba abierta."
      };
    }

    const ahora =
      new Date();

    actualizarEstadoSesionPaso13D1_(
      contexto,
      numeroFila,
      AUTH_ACCIONES_PASO_13E1
      .ESTADO_CERRADO,
      ahora
    );

    insertarAuditoriaOAuthSinBloqueoPaso13C_({
      usuario: {
        idUsuario: sesion.idUsuario,

        correo: sesion.correo,

        rol: sesion.rol
      },

      accion: datos.modo ===
        AUTH_ACCIONES_PASO_13E1
        .MODO_CAMBIAR ?
        AUTH_ACCIONES_PASO_13E1
        .ACCION_CAMBIAR :
        AUTH_ACCIONES_PASO_13E1
        .ACCION_CERRAR,

      resultado: AUTH_PASO_13C
        .RESULTADOS_AUDITORIA
        .AUTORIZADO,

      motivo: "",

      origen: origenSesion,

      idSesion: idSesion,

      detalle: {
        modo: datos.modo,

        proveedorIdentidad: origenSesion ===
          "OAUTH_MICROSOFT" ?
          "MICROSOFT" :
          "GOOGLE",

        origenSolicitud: datos.origen,

        estadoAnterior: sesion.estado,

        estadoNuevo: AUTH_ACCIONES_PASO_13E1
          .ESTADO_CERRADO,

        moduloAnterior: sesion.moduloActual,

        userAgent: datos.userAgent,

        fechaCierre: ahora.toISOString()
      }
    });

    SpreadsheetApp.flush();

    return {
      correcto: true,

      sesionEncontrada: true,

      sesionCerrada: true,

      yaCerrada: false,

      estadoAnterior: sesion.estado,

      estado: AUTH_ACCIONES_PASO_13E1
        .ESTADO_CERRADO,

      proveedorIdentidad: origenSesion ===
        "OAUTH_MICROSOFT" ?
        "MICROSOFT" :
        "GOOGLE",

      modo: datos.modo,

      fechaCierre: ahora.toISOString(),

      mensaje: datos.modo ===
        AUTH_ACCIONES_PASO_13E1
        .MODO_CAMBIAR ?
        "La sesión actual fue cerrada. Ya puedes seleccionar otra cuenta." :
        "La sesión fue cerrada correctamente."
    };
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Diagnóstico no destructivo del cierre multiproveedor.
 *
 * @return {Object}
 */
function ejecutarDiagnosticoAccionesSesionPaso13E1() {
  const sesiones =
    obtenerContextoSesionesPaso13D1_();

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

  const dependencias = {
    contextoSesiones: typeof obtenerContextoSesionesPaso13D1_ ===
      "function",

    obtenerIdSesion: typeof obtenerIdSesionDesdeTokenPaso13D1_ ===
      "function",

    buscarSesion: typeof buscarFilaSesionPaso13D1_ ===
      "function",

    leerSesion: typeof leerSesionPaso13D1_ ===
      "function",

    actualizarEstado: typeof actualizarEstadoSesionPaso13D1_ ===
      "function",

    auditoria: typeof insertarAuditoriaOAuthSinBloqueoPaso13C_ ===
      "function"
  };

  const dependenciasCorrectas =
    Object.keys(
      dependencias
    ).every(
      function(clave) {
        return dependencias[
          clave
        ] === true;
      }
    );

  const resultado = {
    correcto: dependenciasCorrectas &&
      sesiones.numeroColumnas ===
      13 &&
      auditoria.numeroColumnas ===
      12,

    paso: "13E.1",

    modo: "CIERRE_Y_CAMBIO_CUENTA_MULTIPROVEEDOR",

    proveedoresAdmitidos: [
      "OAUTH_GOOGLE",
      "OAUTH_MICROSOFT"
    ],

    validacionGoogleAmbiental: false,

    hojas: {
      sesiones: {
        nombre: "SESIONES_USUARIOS",

        columnas: sesiones.numeroColumnas
      },

      auditoria: {
        nombre: "AUDITORIA_ACCESOS",

        columnas: auditoria.numeroColumnas
      }
    },

    dependencias: dependencias,

    acciones: [
      AUTH_ACCIONES_PASO_13E1
      .ACCION_CERRAR,

      AUTH_ACCIONES_PASO_13E1
      .ACCION_CAMBIAR
    ],

    estadoFinal: AUTH_ACCIONES_PASO_13E1
      .ESTADO_CERRADO,

    implementacionRequerida: {
      ejecutarComo: "USUARIO_QUE_IMPLEMENTA",

      acceso: "CUALQUIER_PERSONA"
    },

    mensaje: dependenciasCorrectas ?
      "Las acciones de sesión multiproveedor están preparadas." :
      "Faltan dependencias para las acciones de sesión."
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

/**
 * @private
 */
function normalizarCierreSesionPaso13E1_(
  solicitud
) {
  solicitud =
    solicitud || {};

  const token =
    String(
      solicitud.token || ""
    ).trim();

  const modoSolicitado =
    String(
      solicitud.modo || ""
    )
    .trim()
    .toUpperCase();

  const modo =
    modoSolicitado ===
    AUTH_ACCIONES_PASO_13E1
    .MODO_CAMBIAR ?
    AUTH_ACCIONES_PASO_13E1
    .MODO_CAMBIAR :
    AUTH_ACCIONES_PASO_13E1
    .MODO_CERRAR;

  return {
    token: token.length <=
      AUTH_ACCIONES_PASO_13E1
      .MAXIMO_TOKEN &&
      token.indexOf(
        AUTH_PASO_13D1
        .PREFIJO_TOKEN
      ) === 0 ?
      token :
      "",

    modo: modo,

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
function crearErrorAccionSesionPaso13E1_(
  codigo,
  mensaje
) {
  const error =
    new Error(
      "[AUTH_13E1:" +
      codigo +
      "] " +
      mensaje
    );

  error.codigoAuth =
    codigo;

  return error;
}
